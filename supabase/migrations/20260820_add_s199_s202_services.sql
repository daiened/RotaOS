alter table public.service_orders
  drop constraint if exists service_orders_service_code_check;

alter table public.service_orders
  add constraint service_orders_service_code_check
  check (service_code in ('S025', 'S199 X', 'S200 X', 'S201 X', 'S202 X'));
