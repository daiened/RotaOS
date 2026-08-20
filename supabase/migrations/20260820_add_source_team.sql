-- Guarda somente a equipe que já aparece no Procesa, sem confundí-la com
-- uma equipe cadastrada no RotaOS.
alter table public.service_orders
  add column if not exists source_team text;
