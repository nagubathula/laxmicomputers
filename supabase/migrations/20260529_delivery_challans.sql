-- =============================================================================
-- Delivery Challans (DC) — Rule 55 compliant
--
-- A Delivery Challan accompanies goods leaving the shop when an invoice can't
-- be raised at that moment (e.g. sale-on-approval, job work, sample, partial
-- delivery to B2B customer). It does NOT collect GST — the invoice that
-- follows later does. Stock decrements when the DC posts; the eventual
-- invoice MUST NOT decrement again.
-- =============================================================================

-- Add 'delivery' to the stock movement reason enum
do $$ begin
  alter type stock_movement_reason add value if not exists 'delivery';
exception when others then null; end $$;

-- Reasons for transporting goods under Rule 55
do $$ begin
  create type dc_reason as enum (
    'sale',           -- B2B partial delivery
    'sale_on_approval',
    'job_work',
    'sample',
    'replacement',
    'return',         -- goods being sent back to supplier
    'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type dc_status as enum ('open', 'delivered', 'invoiced', 'cancelled');
exception when duplicate_object then null; end $$;

create table if not exists public.delivery_challans (
  id                  uuid primary key default gen_random_uuid(),
  dc_number           text not null unique,                  -- 'DC/25-26/0001'
  dc_date             date not null default current_date,
  customer_id         uuid references public.customers(id) on delete set null,
  customer_snapshot   jsonb,
  business_snapshot   jsonb not null,
  reason              dc_reason not null default 'sale',
  status              dc_status not null default 'open',
  -- Transport details (Rule 55)
  vehicle_number      text,
  transport_mode      text,                                  -- 'Road', 'Rail', 'Air', etc.
  lr_number           text,                                  -- lorry-receipt / consignment note number
  -- Indicative values (no tax on the DC itself)
  goods_value         numeric(12, 2) not null default 0,     -- sum of qty * unit_price
  -- Conversion trace
  converted_invoice_id uuid references public.invoices(id) on delete set null,
  notes               text,
  created_by          uuid references auth.users(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists dc_date_idx on public.delivery_challans (dc_date desc);
create index if not exists dc_status_idx on public.delivery_challans (status);
create index if not exists dc_customer_idx on public.delivery_challans (customer_id);

drop trigger if exists dc_updated_at on public.delivery_challans;
create trigger dc_updated_at before update on public.delivery_challans
  for each row execute function public.set_updated_at();

create table if not exists public.delivery_challan_lines (
  id              uuid primary key default gen_random_uuid(),
  dc_id           uuid not null references public.delivery_challans(id) on delete cascade,
  product_id      uuid references public.products(id) on delete set null,
  product_name    text not null,
  hsn_code        text,
  qty             numeric(12, 3) not null,
  unit_price      numeric(12, 2) not null default 0,         -- indicative; no GST applied here
  line_total      numeric(12, 2) not null default 0,
  created_at      timestamptz not null default now()
);

create index if not exists dc_lines_dc_idx on public.delivery_challan_lines (dc_id);
create index if not exists dc_lines_product_idx on public.delivery_challan_lines (product_id);

-- Numbering
create or replace function public.next_dc_seq(p_fy text)
returns integer language plpgsql as $$
declare v integer;
begin
  insert into public.invoice_counters (fy_code, next_value)
    values ('DC/' || p_fy, 1)
    on conflict (fy_code) do nothing;
  update public.invoice_counters
    set next_value = next_value + 1
    where fy_code = 'DC/' || p_fy
    returning next_value - 1 into v;
  return v;
end; $$;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.delivery_challans       enable row level security;
alter table public.delivery_challan_lines  enable row level security;

drop policy if exists dc_select_staff on public.delivery_challans;
create policy dc_select_staff on public.delivery_challans for select using (public.is_active_staff());

drop policy if exists dc_insert_staff on public.delivery_challans;
create policy dc_insert_staff on public.delivery_challans for insert with check (public.is_active_staff());

drop policy if exists dc_update_staff on public.delivery_challans;
create policy dc_update_staff on public.delivery_challans for update using (public.is_active_staff()) with check (public.is_active_staff());

drop policy if exists dc_delete_admin on public.delivery_challans;
create policy dc_delete_admin on public.delivery_challans for delete using (public.is_admin());

drop policy if exists dc_lines_select_staff on public.delivery_challan_lines;
create policy dc_lines_select_staff on public.delivery_challan_lines for select using (public.is_active_staff());

drop policy if exists dc_lines_insert_staff on public.delivery_challan_lines;
create policy dc_lines_insert_staff on public.delivery_challan_lines for insert with check (public.is_active_staff());

drop policy if exists dc_lines_delete_admin on public.delivery_challan_lines;
create policy dc_lines_delete_admin on public.delivery_challan_lines for delete using (public.is_admin());
