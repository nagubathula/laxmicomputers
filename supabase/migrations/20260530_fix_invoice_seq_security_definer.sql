-- Fix: next_invoice_seq must run as the function owner (postgres) so it can
-- INSERT/UPDATE invoice_counters without being blocked by RLS.
-- The table has only a SELECT policy for staff; writes must go via this function.
create or replace function public.next_invoice_seq(p_fy text)
returns integer
language plpgsql
security definer                          -- runs as postgres, bypasses RLS
set search_path = public
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
