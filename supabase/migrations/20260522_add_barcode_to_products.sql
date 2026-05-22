-- Add barcode column to products
alter table public.products
  add column if not exists barcode text;

-- Optional: index for fast lookups by barcode (e.g. scan-to-find)
create index if not exists products_barcode_idx
  on public.products (barcode)
  where barcode is not null;
