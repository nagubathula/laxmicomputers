-- =============================================================================
-- Tier 4: Row-Level Security + audit log
--
-- IMPORTANT: Once this runs, every table query must be matched by a policy or
-- returns empty. Test thoroughly in a staging branch first if possible.
--
-- Policy strategy:
--   - anon role gets SELECT on products + business_settings only (public storefront)
--   - authenticated role gets fine-grained policies by current_user_role()
--   - DML actions (recordStockMovement, createInvoice, etc.) run as the cashier's
--     session, so they need INSERT/UPDATE permission via policies
--   - Sequence functions (next_invoice_seq, next_po_seq, …) are SECURITY DEFINER
--     so they bypass RLS on invoice_counters — no policy needed there
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Role helpers (security definer so policies can call without recursion)
-- -----------------------------------------------------------------------------
create or replace function public.current_user_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select role::text from public.profiles where user_id = auth.uid()), 'cashier')
$$;

create or replace function public.is_active_staff()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select is_active from public.profiles where user_id = auth.uid()),
    false
  )
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select role = 'admin' and is_active from public.profiles where user_id = auth.uid()),
    false
  )
$$;

create or replace function public.is_manager_or_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select role in ('admin', 'manager') and is_active from public.profiles where user_id = auth.uid()),
    false
  )
$$;

grant execute on function public.current_user_role() to anon, authenticated;
grant execute on function public.is_active_staff() to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_manager_or_admin() to anon, authenticated;

-- -----------------------------------------------------------------------------
-- audit_log: who-did-what
-- -----------------------------------------------------------------------------
create table if not exists public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references auth.users(id) on delete set null,
  actor_email text,
  actor_role  text,
  action      text not null,                  -- e.g. 'product.delete', 'user.role_change', 'invoice.cancel'
  entity_type text,                            -- e.g. 'product', 'invoice'
  entity_id   text,                            -- usually a uuid, kept as text for flexibility
  details     jsonb,                           -- before/after, or any extras
  created_at  timestamptz not null default now()
);

create index if not exists audit_log_created_idx on public.audit_log (created_at desc);
create index if not exists audit_log_actor_idx on public.audit_log (actor_id);
create index if not exists audit_log_entity_idx on public.audit_log (entity_type, entity_id);

-- Helper RPC: called from server actions. SECURITY DEFINER so it bypasses RLS for
-- the insert and grabs the email from auth.users (which is otherwise locked down).
create or replace function public.log_audit(
  p_action text,
  p_entity_type text default null,
  p_entity_id text default null,
  p_details jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_role  text;
begin
  if auth.uid() is null then return; end if;
  select email into v_email from auth.users where id = auth.uid();
  select role::text into v_role from public.profiles where user_id = auth.uid();
  insert into public.audit_log (actor_id, actor_email, actor_role, action, entity_type, entity_id, details)
    values (auth.uid(), v_email, v_role, p_action, p_entity_type, p_entity_id, p_details);
end;
$$;

grant execute on function public.log_audit(text, text, text, jsonb) to authenticated;

-- -----------------------------------------------------------------------------
-- get_user_emails: admin-only RPC for the Users page (since RLS blocks auth.users)
-- -----------------------------------------------------------------------------
create or replace function public.get_user_emails(p_user_ids uuid[])
returns table (id uuid, email text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden';
  end if;
  return query select u.id, u.email::text from auth.users u where u.id = any(p_user_ids);
end;
$$;

grant execute on function public.get_user_emails(uuid[]) to authenticated;

-- =============================================================================
-- Enable RLS on every table
-- =============================================================================
alter table public.products              enable row level security;
alter table public.business_settings     enable row level security;
alter table public.customers             enable row level security;
alter table public.stock_movements       enable row level security;
alter table public.invoices              enable row level security;
alter table public.invoice_lines         enable row level security;
alter table public.invoice_counters      enable row level security;
alter table public.suppliers             enable row level security;
alter table public.purchase_orders       enable row level security;
alter table public.purchase_order_lines  enable row level security;
alter table public.goods_receipts        enable row level security;
alter table public.goods_receipt_lines   enable row level security;
alter table public.service_tickets       enable row level security;
alter table public.service_ticket_notes  enable row level security;
alter table public.product_serials       enable row level security;
alter table public.quotes                enable row level security;
alter table public.quote_lines           enable row level security;
alter table public.profiles              enable row level security;
alter table public.audit_log             enable row level security;

-- =============================================================================
-- POLICIES
-- Idempotent pattern: drop-if-exists then create.
-- =============================================================================

-- ----- products: public read, manager+admin write, admin delete ----------------
drop policy if exists products_select_public on public.products;
create policy products_select_public on public.products for select using (true);

drop policy if exists products_insert_mgr on public.products;
create policy products_insert_mgr on public.products for insert with check (public.is_manager_or_admin());

drop policy if exists products_update_mgr on public.products;
create policy products_update_mgr on public.products for update using (public.is_manager_or_admin()) with check (public.is_manager_or_admin());

drop policy if exists products_delete_admin on public.products;
create policy products_delete_admin on public.products for delete using (public.is_admin());

-- ----- business_settings: public read, admin write -----------------------------
drop policy if exists settings_select_public on public.business_settings;
create policy settings_select_public on public.business_settings for select using (true);

drop policy if exists settings_update_admin on public.business_settings;
create policy settings_update_admin on public.business_settings for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists settings_insert_admin on public.business_settings;
create policy settings_insert_admin on public.business_settings for insert with check (public.is_admin());

-- ----- customers: all active staff -------------------------------------------
drop policy if exists customers_select_staff on public.customers;
create policy customers_select_staff on public.customers for select using (public.is_active_staff());

drop policy if exists customers_insert_staff on public.customers;
create policy customers_insert_staff on public.customers for insert with check (public.is_active_staff());

drop policy if exists customers_update_staff on public.customers;
create policy customers_update_staff on public.customers for update using (public.is_active_staff()) with check (public.is_active_staff());

drop policy if exists customers_delete_admin on public.customers;
create policy customers_delete_admin on public.customers for delete using (public.is_admin());

-- ----- stock_movements: read all staff; INSERT all staff; no UPDATE/DELETE -----
drop policy if exists stockmv_select_staff on public.stock_movements;
create policy stockmv_select_staff on public.stock_movements for select using (public.is_active_staff());

drop policy if exists stockmv_insert_staff on public.stock_movements;
create policy stockmv_insert_staff on public.stock_movements for insert with check (public.is_active_staff());

-- (no update/delete policies → those operations are forbidden = immutable ledger)

-- ----- invoices + invoice_lines: cashier can read & create; manager/admin can update; admin deletes
drop policy if exists invoices_select_staff on public.invoices;
create policy invoices_select_staff on public.invoices for select using (public.is_active_staff());

drop policy if exists invoices_insert_staff on public.invoices;
create policy invoices_insert_staff on public.invoices for insert with check (public.is_active_staff());

drop policy if exists invoices_update_mgr on public.invoices;
create policy invoices_update_mgr on public.invoices for update using (public.is_manager_or_admin()) with check (public.is_manager_or_admin());

drop policy if exists invoices_delete_admin on public.invoices;
create policy invoices_delete_admin on public.invoices for delete using (public.is_admin());

drop policy if exists invoice_lines_select_staff on public.invoice_lines;
create policy invoice_lines_select_staff on public.invoice_lines for select using (public.is_active_staff());

drop policy if exists invoice_lines_insert_staff on public.invoice_lines;
create policy invoice_lines_insert_staff on public.invoice_lines for insert with check (public.is_active_staff());

drop policy if exists invoice_lines_update_mgr on public.invoice_lines;
create policy invoice_lines_update_mgr on public.invoice_lines for update using (public.is_manager_or_admin()) with check (public.is_manager_or_admin());

drop policy if exists invoice_lines_delete_admin on public.invoice_lines;
create policy invoice_lines_delete_admin on public.invoice_lines for delete using (public.is_admin());

-- ----- invoice_counters: nothing direct; sequence RPCs are SECURITY DEFINER ----
-- We still need a no-op policy or all rows are invisible. Allow staff to read.
drop policy if exists counters_select_staff on public.invoice_counters;
create policy counters_select_staff on public.invoice_counters for select using (public.is_active_staff());
-- No INSERT/UPDATE/DELETE policies — only RPCs touch this table.

-- ----- suppliers: manager/admin -----------------------------------------------
drop policy if exists suppliers_select_mgr on public.suppliers;
create policy suppliers_select_mgr on public.suppliers for select using (public.is_manager_or_admin());

drop policy if exists suppliers_insert_mgr on public.suppliers;
create policy suppliers_insert_mgr on public.suppliers for insert with check (public.is_manager_or_admin());

drop policy if exists suppliers_update_mgr on public.suppliers;
create policy suppliers_update_mgr on public.suppliers for update using (public.is_manager_or_admin()) with check (public.is_manager_or_admin());

drop policy if exists suppliers_delete_admin on public.suppliers;
create policy suppliers_delete_admin on public.suppliers for delete using (public.is_admin());

-- ----- purchase_orders & lines: manager/admin ---------------------------------
drop policy if exists po_select_mgr on public.purchase_orders;
create policy po_select_mgr on public.purchase_orders for select using (public.is_manager_or_admin());

drop policy if exists po_insert_mgr on public.purchase_orders;
create policy po_insert_mgr on public.purchase_orders for insert with check (public.is_manager_or_admin());

drop policy if exists po_update_mgr on public.purchase_orders;
create policy po_update_mgr on public.purchase_orders for update using (public.is_manager_or_admin()) with check (public.is_manager_or_admin());

drop policy if exists po_delete_admin on public.purchase_orders;
create policy po_delete_admin on public.purchase_orders for delete using (public.is_admin());

drop policy if exists po_lines_select_mgr on public.purchase_order_lines;
create policy po_lines_select_mgr on public.purchase_order_lines for select using (public.is_manager_or_admin());

drop policy if exists po_lines_insert_mgr on public.purchase_order_lines;
create policy po_lines_insert_mgr on public.purchase_order_lines for insert with check (public.is_manager_or_admin());

drop policy if exists po_lines_update_mgr on public.purchase_order_lines;
create policy po_lines_update_mgr on public.purchase_order_lines for update using (public.is_manager_or_admin()) with check (public.is_manager_or_admin());

drop policy if exists po_lines_delete_admin on public.purchase_order_lines;
create policy po_lines_delete_admin on public.purchase_order_lines for delete using (public.is_admin());

-- ----- goods_receipts + lines: manager/admin ----------------------------------
drop policy if exists grn_select_mgr on public.goods_receipts;
create policy grn_select_mgr on public.goods_receipts for select using (public.is_manager_or_admin());

drop policy if exists grn_insert_mgr on public.goods_receipts;
create policy grn_insert_mgr on public.goods_receipts for insert with check (public.is_manager_or_admin());

drop policy if exists grn_update_mgr on public.goods_receipts;
create policy grn_update_mgr on public.goods_receipts for update using (public.is_manager_or_admin()) with check (public.is_manager_or_admin());

drop policy if exists grn_delete_admin on public.goods_receipts;
create policy grn_delete_admin on public.goods_receipts for delete using (public.is_admin());

drop policy if exists grn_lines_select_mgr on public.goods_receipt_lines;
create policy grn_lines_select_mgr on public.goods_receipt_lines for select using (public.is_manager_or_admin());

drop policy if exists grn_lines_insert_mgr on public.goods_receipt_lines;
create policy grn_lines_insert_mgr on public.goods_receipt_lines for insert with check (public.is_manager_or_admin());

drop policy if exists grn_lines_delete_admin on public.goods_receipt_lines;
create policy grn_lines_delete_admin on public.goods_receipt_lines for delete using (public.is_admin());

-- ----- service_tickets + notes: any active staff ------------------------------
drop policy if exists tickets_select_staff on public.service_tickets;
create policy tickets_select_staff on public.service_tickets for select using (public.is_active_staff());

drop policy if exists tickets_insert_staff on public.service_tickets;
create policy tickets_insert_staff on public.service_tickets for insert with check (public.is_active_staff());

drop policy if exists tickets_update_staff on public.service_tickets;
create policy tickets_update_staff on public.service_tickets for update using (public.is_active_staff()) with check (public.is_active_staff());

drop policy if exists tickets_delete_admin on public.service_tickets;
create policy tickets_delete_admin on public.service_tickets for delete using (public.is_admin());

drop policy if exists ticket_notes_select_staff on public.service_ticket_notes;
create policy ticket_notes_select_staff on public.service_ticket_notes for select using (public.is_active_staff());

drop policy if exists ticket_notes_insert_staff on public.service_ticket_notes;
create policy ticket_notes_insert_staff on public.service_ticket_notes for insert with check (public.is_active_staff());

drop policy if exists ticket_notes_delete_admin on public.service_ticket_notes;
create policy ticket_notes_delete_admin on public.service_ticket_notes for delete using (public.is_admin());

-- ----- product_serials: any active staff (POS marks them sold) ---------------
drop policy if exists serials_select_staff on public.product_serials;
create policy serials_select_staff on public.product_serials for select using (public.is_active_staff());

drop policy if exists serials_insert_staff on public.product_serials;
create policy serials_insert_staff on public.product_serials for insert with check (public.is_active_staff());

drop policy if exists serials_update_staff on public.product_serials;
create policy serials_update_staff on public.product_serials for update using (public.is_active_staff()) with check (public.is_active_staff());

drop policy if exists serials_delete_admin on public.product_serials;
create policy serials_delete_admin on public.product_serials for delete using (public.is_admin());

-- ----- quotes + lines: any active staff --------------------------------------
drop policy if exists quotes_select_staff on public.quotes;
create policy quotes_select_staff on public.quotes for select using (public.is_active_staff());

drop policy if exists quotes_insert_staff on public.quotes;
create policy quotes_insert_staff on public.quotes for insert with check (public.is_active_staff());

drop policy if exists quotes_update_staff on public.quotes;
create policy quotes_update_staff on public.quotes for update using (public.is_active_staff()) with check (public.is_active_staff());

drop policy if exists quotes_delete_admin on public.quotes;
create policy quotes_delete_admin on public.quotes for delete using (public.is_admin());

drop policy if exists quote_lines_select_staff on public.quote_lines;
create policy quote_lines_select_staff on public.quote_lines for select using (public.is_active_staff());

drop policy if exists quote_lines_insert_staff on public.quote_lines;
create policy quote_lines_insert_staff on public.quote_lines for insert with check (public.is_active_staff());

drop policy if exists quote_lines_delete_admin on public.quote_lines;
create policy quote_lines_delete_admin on public.quote_lines for delete using (public.is_admin());

-- ----- profiles: self-read; admin manages all --------------------------------
drop policy if exists profiles_select_self_or_admin on public.profiles;
create policy profiles_select_self_or_admin on public.profiles for select
  using (user_id = auth.uid() or public.is_admin());

-- Manager/admin can see all profiles (needed for technician dropdowns)
drop policy if exists profiles_select_mgr on public.profiles;
create policy profiles_select_mgr on public.profiles for select using (public.is_manager_or_admin());

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles for update using (public.is_admin()) with check (public.is_admin());

-- INSERT happens via the on_auth_user_created trigger which is security definer; no policy needed for normal users.
-- We still need ONE permissive insert policy so the trigger function's insert (acting as the caller) succeeds for admin manual inserts.
drop policy if exists profiles_insert_admin on public.profiles;
create policy profiles_insert_admin on public.profiles for insert with check (public.is_admin() or auth.uid() = user_id);

drop policy if exists profiles_delete_admin on public.profiles;
create policy profiles_delete_admin on public.profiles for delete using (public.is_admin());

-- ----- audit_log: admin reads; staff insert via RPC --------------------------
drop policy if exists audit_select_admin on public.audit_log;
create policy audit_select_admin on public.audit_log for select using (public.is_admin());

-- INSERTs happen via the log_audit() SECURITY DEFINER function. No direct insert policy needed.
-- (and no update/delete — audit log is append-only)
