-- =============================================================================
-- Tier 3: service tickets, serial tracking, quotes
-- =============================================================================

-- -----------------------------------------------------------------------------
-- products: serial tracking opt-in
-- -----------------------------------------------------------------------------
alter table public.products
  add column if not exists tracks_serials boolean not null default false;

-- -----------------------------------------------------------------------------
-- product_serials: one row per physical unit (only for tracks_serials products)
-- -----------------------------------------------------------------------------
do $$ begin
  create type serial_status as enum ('available', 'sold', 'in_service', 'returned', 'damaged');
exception when duplicate_object then null; end $$;

create table if not exists public.product_serials (
  id                uuid primary key default gen_random_uuid(),
  product_id        uuid not null references public.products(id) on delete cascade,
  serial_number     text not null,
  status            serial_status not null default 'available',
  -- Provenance: how it came in
  grn_id            uuid references public.goods_receipts(id) on delete set null,
  received_at       timestamptz,
  unit_cost         numeric(12, 2),
  -- Outgoing: where it went
  invoice_id        uuid references public.invoices(id) on delete set null,
  sold_at           timestamptz,
  customer_id       uuid references public.customers(id) on delete set null,
  -- Service trace
  service_ticket_id uuid,                                       -- forward ref; FK added later
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create unique index if not exists product_serials_unique
  on public.product_serials (product_id, serial_number);

create index if not exists product_serials_status_idx on public.product_serials (status);
create index if not exists product_serials_serial_idx on public.product_serials (serial_number);

drop trigger if exists product_serials_updated_at on public.product_serials;
create trigger product_serials_updated_at before update on public.product_serials
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- service_tickets (light board)
-- -----------------------------------------------------------------------------
do $$ begin
  create type ticket_status as enum (
    'received', 'diagnosed', 'awaiting_parts', 'in_progress', 'ready', 'delivered', 'cancelled'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.service_tickets (
  id                   uuid primary key default gen_random_uuid(),
  ticket_number        text not null unique,                  -- e.g. 'SVC/25-26/0001'
  customer_id          uuid references public.customers(id) on delete set null,
  customer_snapshot    jsonb,
  -- Device the customer brought in
  device_type          text,                                  -- e.g. 'Laptop', 'Desktop', 'Printer'
  device_brand         text,
  device_model         text,
  serial_number        text,                                  -- the physical serial, free-form
  accessories          text,                                  -- 'charger, bag'
  problem_description  text not null,
  -- Workflow
  status               ticket_status not null default 'received',
  technician_id        uuid references auth.users(id) on delete set null,
  estimated_charge     numeric(12, 2),                        -- quoted to customer
  received_at          timestamptz not null default now(),
  estimated_ready_at   date,
  delivered_at         timestamptz,
  -- Misc
  notes                text,                                  -- general notes (timeline lives in service_ticket_notes)
  created_by           uuid references auth.users(id),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists service_tickets_status_idx on public.service_tickets (status);
create index if not exists service_tickets_customer_idx on public.service_tickets (customer_id);
create index if not exists service_tickets_received_idx on public.service_tickets (received_at desc);

drop trigger if exists service_tickets_updated_at on public.service_tickets;
create trigger service_tickets_updated_at before update on public.service_tickets
  for each row execute function public.set_updated_at();

-- Forward-add the FK from product_serials → service_tickets now that the table exists
do $$ begin
  alter table public.product_serials
    add constraint product_serials_service_ticket_fk
    foreign key (service_ticket_id) references public.service_tickets(id) on delete set null;
exception when duplicate_object then null; end $$;

-- -----------------------------------------------------------------------------
-- service_ticket_notes: timeline / status updates
-- -----------------------------------------------------------------------------
create table if not exists public.service_ticket_notes (
  id              uuid primary key default gen_random_uuid(),
  ticket_id       uuid not null references public.service_tickets(id) on delete cascade,
  -- For status-change rows, status_change is set. For free notes, body is set.
  status_change   ticket_status,
  body            text,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now()
);

create index if not exists service_ticket_notes_ticket_idx
  on public.service_ticket_notes (ticket_id, created_at desc);

-- Ticket numbering
create or replace function public.next_ticket_seq(p_fy text)
returns integer language plpgsql as $$
declare v integer;
begin
  insert into public.invoice_counters (fy_code, next_value)
    values ('SVC/' || p_fy, 1)
    on conflict (fy_code) do nothing;
  update public.invoice_counters
    set next_value = next_value + 1
    where fy_code = 'SVC/' || p_fy
    returning next_value - 1 into v;
  return v;
end; $$;

-- -----------------------------------------------------------------------------
-- quotes + quote_lines
-- -----------------------------------------------------------------------------
do $$ begin
  create type quote_status as enum ('draft', 'sent', 'accepted', 'rejected', 'expired', 'converted');
exception when duplicate_object then null; end $$;

create table if not exists public.quotes (
  id                  uuid primary key default gen_random_uuid(),
  quote_number        text not null unique,                  -- 'LC/Q/25-26/0001'
  quote_date          date not null default current_date,
  valid_until         date,
  customer_id         uuid references public.customers(id) on delete set null,
  customer_snapshot   jsonb,
  business_snapshot   jsonb,
  status              quote_status not null default 'draft',
  currency            text not null default 'INR',
  is_inter_state      boolean not null default false,
  subtotal            numeric(12, 2) not null default 0,
  cgst_total          numeric(12, 2) not null default 0,
  sgst_total          numeric(12, 2) not null default 0,
  igst_total          numeric(12, 2) not null default 0,
  discount_total      numeric(12, 2) not null default 0,
  grand_total         numeric(12, 2) not null default 0,
  notes               text,
  -- Convert-to-invoice trace
  converted_invoice_id uuid references public.invoices(id) on delete set null,
  created_by          uuid references auth.users(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists quotes_date_idx on public.quotes (quote_date desc);
create index if not exists quotes_status_idx on public.quotes (status);
create index if not exists quotes_customer_idx on public.quotes (customer_id);

drop trigger if exists quotes_updated_at on public.quotes;
create trigger quotes_updated_at before update on public.quotes
  for each row execute function public.set_updated_at();

create table if not exists public.quote_lines (
  id              uuid primary key default gen_random_uuid(),
  quote_id        uuid not null references public.quotes(id) on delete cascade,
  product_id      uuid references public.products(id) on delete set null,
  product_name    text not null,
  hsn_code        text,
  qty             numeric(12, 3) not null,
  unit_price      numeric(12, 2) not null,
  discount_amount numeric(12, 2) not null default 0,
  taxable_amount  numeric(12, 2) not null,
  gst_rate        numeric(5, 2) not null,
  cgst_amount     numeric(12, 2) not null default 0,
  sgst_amount     numeric(12, 2) not null default 0,
  igst_amount     numeric(12, 2) not null default 0,
  line_total      numeric(12, 2) not null,
  created_at      timestamptz not null default now()
);

create index if not exists quote_lines_quote_idx on public.quote_lines (quote_id);

create or replace function public.next_quote_seq(p_fy text)
returns integer language plpgsql as $$
declare v integer;
begin
  insert into public.invoice_counters (fy_code, next_value)
    values ('Q/' || p_fy, 1)
    on conflict (fy_code) do nothing;
  update public.invoice_counters
    set next_value = next_value + 1
    where fy_code = 'Q/' || p_fy
    returning next_value - 1 into v;
  return v;
end; $$;
