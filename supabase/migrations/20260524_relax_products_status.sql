-- The `status` column on products is now derived from stock_qty in the UI.
-- We no longer write to it, so the NOT NULL constraint causes inserts to fail.
-- Make it nullable with a sensible default so existing rows and any code still
-- reading it keep working until we drop the column entirely.

alter table public.products
  alter column status drop not null,
  alter column status set default 'In Stock';
