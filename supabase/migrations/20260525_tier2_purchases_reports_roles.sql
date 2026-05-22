-- =============================================================================
-- Tier 2: suppliers, purchase orders, goods receipts, user profiles & roles
-- =============================================================================

-- -----------------------------------------------------------------------------
-- profiles: per-user role for access control
-- -----------------------------------------------------------------------------
do $$ begin
  create type user_role as enum ('admin', 'manager', 'cashier');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  role        user_role not null default 'cashier',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Auto-create a profile row for any new auth user, default role = cashier.
-- First user in the system gets promoted to admin (so initial setup works).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_count int;
  v_role user_role;
begin
  select count(*) into v_count from public.profiles;
  v_role := case when v_count = 0 then 'admin'::user_role else 'cashier'::user_role end;
  insert into public.profiles (user_id, role) values (new.id, v_role)
    on conflict (user_id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for any existing users (idempotent)
insert into public.profiles (user_id, role)
select u.id,
       case when (select count(*) from public.profiles) = 0
              and u.id = (select id from auth.users order by created_at asc limit 1)
            then 'admin'::user_role
            else 'cashier'::user_role end
from auth.users u
on conflict (user_id) do nothing;

-- Promote the very first existing user to admin if no admin exists yet
update public.profiles
   set role = 'admin'
 where user_id = (select id from auth.users order by created_at asc limit 1)
   and not exists (select 1 from public.profiles where role = 'admin');

-- -----------------------------------------------------------------------------
-- suppliers
-- -----------------------------------------------------------------------------
create table if not exists public.suppliers (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  contact_person  text,
  phone           text,
  email           text,
  gstin           text,
  state           text,
  state_code      text,
  address_line1   text,
  address_line2   text,
  city            text,
  pincode         text,
  payment_terms   text,                           -- e.g. 'Net 30'
  notes           text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists suppliers_name_trgm_idx on public.suppliers using gin (name gin_trgm_ops);

-- -----------------------------------------------------------------------------
-- purchase_orders + po_lines
-- -----------------------------------------------------------------------------
do $$ begin
  create type po_status as enum ('draft', 'sent', 'partial', 'received', 'cancelled');
exception when duplicate_object then null; end $$;

create table if not exists public.purchase_orders (
  id                uuid primary key default gen_random_uuid(),
  po_number         text not null unique,            -- e.g. 'PO/25-26/0001'
  supplier_id       uuid references public.suppliers(id) on delete restrict,
  supplier_snapshot jsonb,
  status            po_status not null default 'draft',
  order_date        date not null default current_date,
  expected_date     date,
  subtotal          numeric(12, 2) not null default 0,
  cgst_total        numeric(12, 2) not null default 0,
  sgst_total        numeric(12, 2) not null default 0,
  igst_total        numeric(12, 2) not null default 0,
  grand_total       numeric(12, 2) not null default 0,
  is_inter_state    boolean not null default false,
  notes             text,
  created_by        uuid references auth.users(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists po_supplier_idx on public.purchase_orders (supplier_id);
create index if not exists po_status_idx on public.purchase_orders (status);
create index if not exists po_order_date_idx on public.purchase_orders (order_date desc);

create table if not exists public.purchase_order_lines (
  id                uuid primary key default gen_random_uuid(),
  po_id             uuid not null references public.purchase_orders(id) on delete cascade,
  product_id        uuid not null references public.products(id) on delete restrict,
  product_name      text not null,
  hsn_code          text,
  qty_ordered       numeric(12, 3) not null,
  qty_received      numeric(12, 3) not null default 0,
  unit_cost         numeric(12, 2) not null,
  gst_rate          numeric(5, 2) not null default 0,
  taxable_amount    numeric(12, 2) not null,
  cgst_amount       numeric(12, 2) not null default 0,
  sgst_amount       numeric(12, 2) not null default 0,
  igst_amount       numeric(12, 2) not null default 0,
  line_total        numeric(12, 2) not null,
  created_at        timestamptz not null default now()
);

create index if not exists po_lines_po_idx on public.purchase_order_lines (po_id);
create index if not exists po_lines_product_idx on public.purchase_order_lines (product_id);

-- PO numbering sequence (FY-based, like invoices)
create or replace function public.next_po_seq(p_fy text)
returns integer language plpgsql as $$
declare v integer;
begin
  insert into public.invoice_counters (fy_code, next_value)
    values ('PO/' || p_fy, 1)
    on conflict (fy_code) do nothing;
  update public.invoice_counters
    set next_value = next_value + 1
    where fy_code = 'PO/' || p_fy
    returning next_value - 1 into v;
  return v;
end; $$;

-- GRN numbering
create or replace function public.next_grn_seq(p_fy text)
returns integer language plpgsql as $$
declare v integer;
begin
  insert into public.invoice_counters (fy_code, next_value)
    values ('GRN/' || p_fy, 1)
    on conflict (fy_code) do nothing;
  update public.invoice_counters
    set next_value = next_value + 1
    where fy_code = 'GRN/' || p_fy
    returning next_value - 1 into v;
  return v;
end; $$;

-- -----------------------------------------------------------------------------
-- goods_receipts + grn_lines
-- -----------------------------------------------------------------------------
create table if not exists public.goods_receipts (
  id                uuid primary key default gen_random_uuid(),
  grn_number        text not null unique,              -- 'GRN/25-26/0001'
  supplier_id       uuid references public.suppliers(id) on delete set null,
  supplier_snapshot jsonb,
  po_id             uuid references public.purchase_orders(id) on delete set null,
  receipt_date      date not null default current_date,
  invoice_ref       text,                              -- supplier's invoice number
  notes             text,
  created_by        uuid references auth.users(id),
  created_at        timestamptz not null default now()
);

create index if not exists grn_supplier_idx on public.goods_receipts (supplier_id);
create index if not exists grn_po_idx on public.goods_receipts (po_id);
create index if not exists grn_date_idx on public.goods_receipts (receipt_date desc);

create table if not exists public.goods_receipt_lines (
  id                uuid primary key default gen_random_uuid(),
  grn_id            uuid not null references public.goods_receipts(id) on delete cascade,
  po_line_id        uuid references public.purchase_order_lines(id) on delete set null,
  product_id        uuid not null references public.products(id) on delete restrict,
  product_name      text not null,
  qty_received      numeric(12, 3) not null,
  unit_cost         numeric(12, 2) not null,
  created_at        timestamptz not null default now()
);

create index if not exists grn_lines_grn_idx on public.goods_receipt_lines (grn_id);
create index if not exists grn_lines_product_idx on public.goods_receipt_lines (product_id);

-- -----------------------------------------------------------------------------
-- Reporting views
-- -----------------------------------------------------------------------------

-- Daily sales: one row per day, totals for invoices issued/paid
create or replace view public.v_daily_sales as
select
  invoice_date              as day,
  count(*)                  as invoice_count,
  sum(subtotal)             as subtotal,
  sum(cgst_total + sgst_total + igst_total) as tax_total,
  sum(grand_total)          as grand_total,
  sum(case when payment_method = 'cash' then grand_total else 0 end) as cash_total,
  sum(case when payment_method = 'upi'  then grand_total else 0 end) as upi_total,
  sum(case when payment_method = 'card' then grand_total else 0 end) as card_total,
  sum(case when payment_method = 'bank_transfer' then grand_total else 0 end) as bank_total,
  sum(case when payment_method = 'credit' then grand_total else 0 end) as credit_total
from public.invoices
where status not in ('cancelled')
group by invoice_date
order by invoice_date desc;

-- Per-product sales aggregated (used for top sellers + slow movers + margin)
create or replace view public.v_product_sales as
select
  p.id                        as product_id,
  p.name                      as product_name,
  p.category                  as category,
  p.cost_price                as cost_price,
  p.stock_qty                 as stock_qty,
  coalesce(sum(il.qty), 0)    as qty_sold,
  coalesce(sum(il.taxable_amount), 0) as revenue,
  coalesce(sum(il.taxable_amount) - sum(il.qty * coalesce(p.cost_price, 0)), 0) as gross_margin,
  max(i.invoice_date)         as last_sold_at
from public.products p
left join public.invoice_lines il on il.product_id = p.id
left join public.invoices i on i.id = il.invoice_id and i.status not in ('cancelled')
group by p.id, p.name, p.category, p.cost_price, p.stock_qty;

-- -----------------------------------------------------------------------------
-- updated_at triggers (using helper from Tier 1)
-- -----------------------------------------------------------------------------
drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists suppliers_updated_at on public.suppliers;
create trigger suppliers_updated_at before update on public.suppliers
  for each row execute function public.set_updated_at();

drop trigger if exists purchase_orders_updated_at on public.purchase_orders;
create trigger purchase_orders_updated_at before update on public.purchase_orders
  for each row execute function public.set_updated_at();
