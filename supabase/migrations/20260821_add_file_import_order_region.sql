alter table public.file_import_orders
  add column if not exists region text;

alter table public.file_import_orders
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;
