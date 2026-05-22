-- =============================================================================
-- Tier 1 retail backend: stock, customers, invoices, GST
-- =============================================================================

-- Extensions (must come before any index that uses them)
create extension if not exists pg_trgm;

-- -----------------------------------------------------------------------------
-- products: add stock + tax columns
-- -----------------------------------------------------------------------------
alter table public.products
  add column if not exists stock_qty integer not null default 0,
  add column if not exists reorder_level integer not null default 0,
  add column if not exists cost_price numeric(12, 2),
  add column if not exists hsn_code text,
  add column if not exists gst_rate numeric(5, 2) not null default 18.00;

-- status column is now derived from stock_qty; we keep the column for back-compat
-- but stop writing to it. UI computes the badge from quantity.

create index if not exists products_stock_qty_idx on public.products (stock_qty);

-- -----------------------------------------------------------------------------
-- business_settings: singleton row (one shop, one row)
-- -----------------------------------------------------------------------------
create table if not exists public.business_settings (
  id              integer primary key default 1,
  legal_name      text not null default 'Laxmi Computers',
  address_line1   text,
  address_line2   text,
  city            text,
  state           text,                              -- e.g. 'Maharashtra' — used for intra/inter-state GST
  state_code      text,                              -- 2-digit GST state code, e.g. '27'
  pincode         text,
  gstin           text,
  pan             text,
  phone           text,
  email           text,
  default_currency text not null default 'INR',      -- 'INR' or 'USD'
  invoice_prefix  text not null default 'LC',
  logo_url        text,
  updated_at      timestamptz not null default now(),

  constraint business_settings_singleton check (id = 1)
);

insert into public.business_settings (id) values (1)
  on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- customers
-- -----------------------------------------------------------------------------
create table if not exists public.customers (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  phone           text,
  email           text,
  gstin           text,
  state           text,
  state_code      text,
  address_line1   text,
  address_line2   text,
  city            text,
  pincode         text,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index if not exists customers_phone_uidx
  on public.customers (phone)
  where phone is not null;

create index if not exists customers_name_trgm_idx
  on public.customers using gin (name gin_trgm_ops);

-- -----------------------------------------------------------------------------
-- stock_movements: immutable ledger; products.stock_qty is the running sum
-- -----------------------------------------------------------------------------
do $$ begin
  create type stock_movement_reason as enum (
    'sale', 'purchase', 'return_in', 'return_out', 'adjustment', 'damage', 'opening'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.stock_movements (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid not null references public.products(id) on delete restrict,
  qty_delta       integer not null,                  -- positive = in, negative = out
  reason          stock_movement_reason not null,
  ref_table       text,                              -- e.g. 'invoices'
  ref_id          uuid,                              -- FK target
  note            text,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now()
);

create index if not exists stock_movements_product_idx
  on public.stock_movements (product_id, created_at desc);

create index if not exists stock_movements_ref_idx
  on public.stock_movements (ref_table, ref_id);

-- -----------------------------------------------------------------------------
-- invoices + invoice_lines
-- -----------------------------------------------------------------------------
do $$ begin
  create type invoice_status as enum ('draft', 'issued', 'paid', 'cancelled', 'refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_method as enum ('cash', 'card', 'upi', 'bank_transfer', 'credit', 'mixed');
exception when duplicate_object then null; end $$;

create table if not exists public.invoices (
  id                  uuid primary key default gen_random_uuid(),
  invoice_number      text not null unique,                  -- e.g. 'LC/25-26/0001'
  invoice_date        date not null default current_date,
  customer_id         uuid references public.customers(id) on delete set null,
  customer_snapshot   jsonb,                                 -- denormalized for historical accuracy
  business_snapshot   jsonb not null,                        -- denormalized business_settings at issue time
  status              invoice_status not null default 'issued',
  payment_method      payment_method,
  currency            text not null default 'INR',
  is_inter_state      boolean not null default false,        -- true → IGST, false → CGST+SGST
  subtotal            numeric(12, 2) not null default 0,     -- sum of line amounts (pre-tax)
  cgst_total          numeric(12, 2) not null default 0,
  sgst_total          numeric(12, 2) not null default 0,
  igst_total          numeric(12, 2) not null default 0,
  discount_total      numeric(12, 2) not null default 0,
  round_off           numeric(6, 2) not null default 0,
  grand_total         numeric(12, 2) not null,
  amount_paid         numeric(12, 2) not null default 0,
  notes               text,
  created_by          uuid references auth.users(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists invoices_date_idx on public.invoices (invoice_date desc);
create index if not exists invoices_customer_idx on public.invoices (customer_id);
create index if not exists invoices_status_idx on public.invoices (status);

create table if not exists public.invoice_lines (
  id              uuid primary key default gen_random_uuid(),
  invoice_id      uuid not null references public.invoices(id) on delete cascade,
  product_id      uuid references public.products(id) on delete set null,
  -- Snapshot fields so historical invoices don't drift when products change
  product_name    text not null,
  hsn_code        text,
  qty             numeric(12, 3) not null,
  unit_price      numeric(12, 2) not null,           -- pre-tax
  discount_amount numeric(12, 2) not null default 0,
  taxable_amount  numeric(12, 2) not null,           -- qty * unit_price - discount
  gst_rate        numeric(5, 2) not null,
  cgst_amount     numeric(12, 2) not null default 0,
  sgst_amount     numeric(12, 2) not null default 0,
  igst_amount     numeric(12, 2) not null default 0,
  line_total      numeric(12, 2) not null,           -- taxable_amount + taxes
  created_at      timestamptz not null default now()
);

create index if not exists invoice_lines_invoice_idx on public.invoice_lines (invoice_id);
create index if not exists invoice_lines_product_idx on public.invoice_lines (product_id);

-- -----------------------------------------------------------------------------
-- invoice_counters: per financial-year sequence (avoids races)
-- -----------------------------------------------------------------------------
create table if not exists public.invoice_counters (
  fy_code     text primary key,                      -- e.g. '25-26'
  next_value  integer not null default 1
);

-- Atomic next-number function. Pass FY code (e.g. '25-26'); returns next int.
create or replace function public.next_invoice_seq(p_fy text)
returns integer
language plpgsql
as $$
declare
  v integer;
begin
  insert into public.invoice_counters (fy_code, next_value)
    values (p_fy, 1)
    on conflict (fy_code) do nothing;

  update public.invoice_counters
    set next_value = next_value + 1
    where fy_code = p_fy
    returning next_value - 1 into v;

  return v;
end;
$$;

-- -----------------------------------------------------------------------------
-- updated_at triggers
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;

drop trigger if exists business_settings_updated_at on public.business_settings;
create trigger business_settings_updated_at before update on public.business_settings
  for each row execute function public.set_updated_at();

drop trigger if exists customers_updated_at on public.customers;
create trigger customers_updated_at before update on public.customers
  for each row execute function public.set_updated_at();

drop trigger if exists invoices_updated_at on public.invoices;
create trigger invoices_updated_at before update on public.invoices
  for each row execute function public.set_updated_at();
