-- =============================================================================
-- Day-end Z-report: cash drawer reconciliation at shift close
-- =============================================================================

create table if not exists public.z_reports (
  id              uuid primary key default gen_random_uuid(),
  z_number        text not null unique,                  -- 'Z/25-26/0001'
  report_date     date not null,
  opening_float   numeric(12, 2) not null default 0,     -- cash in drawer at start of shift
  -- Snapshot of computed totals (recomputed at finalize time, then frozen)
  invoice_count   integer not null default 0,
  cash_sales      numeric(12, 2) not null default 0,
  upi_sales       numeric(12, 2) not null default 0,
  card_sales      numeric(12, 2) not null default 0,
  bank_sales      numeric(12, 2) not null default 0,
  credit_sales    numeric(12, 2) not null default 0,
  net_taxable     numeric(12, 2) not null default 0,
  gst_collected   numeric(12, 2) not null default 0,
  gross_total     numeric(12, 2) not null default 0,
  -- Cash reconciliation
  expected_cash   numeric(12, 2) not null default 0,     -- opening_float + cash_sales
  counted_cash    numeric(12, 2) not null default 0,     -- what the cashier actually counted
  variance        numeric(12, 2) not null default 0,     -- counted - expected (negative = short)
  notes           text,
  closed_by       uuid references auth.users(id),
  closed_at       timestamptz not null default now()
);

create index if not exists z_reports_date_idx on public.z_reports (report_date desc);

-- Per-FY sequence
create or replace function public.next_z_seq(p_fy text)
returns integer language plpgsql as $$
declare v integer;
begin
  insert into public.invoice_counters (fy_code, next_value)
    values ('Z/' || p_fy, 1)
    on conflict (fy_code) do nothing;
  update public.invoice_counters
    set next_value = next_value + 1
    where fy_code = 'Z/' || p_fy
    returning next_value - 1 into v;
  return v;
end; $$;

-- RLS
alter table public.z_reports enable row level security;

drop policy if exists z_reports_select_staff on public.z_reports;
create policy z_reports_select_staff on public.z_reports for select using (public.is_active_staff());

-- Anyone can close their own shift
drop policy if exists z_reports_insert_staff on public.z_reports;
create policy z_reports_insert_staff on public.z_reports for insert with check (public.is_active_staff());

-- Once closed, only admin can edit (e.g. fix a typo in notes or variance reason)
drop policy if exists z_reports_update_admin on public.z_reports;
create policy z_reports_update_admin on public.z_reports for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists z_reports_delete_admin on public.z_reports;
create policy z_reports_delete_admin on public.z_reports for delete using (public.is_admin());
