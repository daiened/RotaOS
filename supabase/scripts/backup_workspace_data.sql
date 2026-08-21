-- RotaOS: execute PRIMEIRO no SQL Editor do Supabase.
-- O resultado desta consulta e um arquivo SQL de restauracao.
-- No resultado, use Download CSV e salve a coluna backup_sql como .sql.
-- Nao execute a limpeza antes de guardar esse arquivo.

select backup_sql
from (
  select 10 as position, format(
    'insert into public.service_orders (id, owner_id, external_id, internal_id, address, neighborhood, region, source_team, requested_at, service, service_code, detail, sync_state, complaint_count, source_hash, first_seen_at, last_seen_at, changed_at, latest_complaint_at, created_at, updated_at) values (%s, %L, %L, %L, %L, %L, %L, %L, %L::timestamptz, %L, %L, %L, %L, %s, %L, %L::timestamptz, %L::timestamptz, %L::timestamptz, %L::timestamptz, %L::timestamptz, %L::timestamptz);',
    id, owner_id, external_id, internal_id, address, neighborhood, region, source_team, requested_at, service, service_code, detail, sync_state, complaint_count, source_hash, first_seen_at, last_seen_at, changed_at, latest_complaint_at, created_at, updated_at
  ) as backup_sql
  from public.service_orders

  union all

  select 20, format(
    'insert into public.order_events (id, owner_id, service_order_id, event_type, previous_hash, current_hash, created_at) values (%s, %L, %s, %L, %L, %L, %L::timestamptz);',
    id, owner_id, service_order_id, event_type, previous_hash, current_hash, created_at
  )
  from public.order_events

  union all

  select 30, format(
    'insert into public.sync_runs (id, owner_id, captured_count, new_count, changed_count, unchanged_count, complaint_count, created_at) values (%s, %L, %s, %s, %s, %s, %s, %L::timestamptz);',
    id, owner_id, captured_count, new_count, changed_count, unchanged_count, complaint_count, created_at
  )
  from public.sync_runs

  union all

  select 40, format(
    'insert into public.file_import_orders (id, owner_id, external_id, account_code, address, neighborhood, region, latitude, longitude, complement, requested_at, service_type, observation, source_hash, file_name, imported_at, created_at, updated_at) values (%s, %L, %L, %L, %L, %L, %L, %L::double precision, %L::double precision, %L, %L::timestamptz, %L, %L, %L, %L, %L::timestamptz, %L::timestamptz, %L::timestamptz);',
    id, owner_id, external_id, account_code, address, neighborhood, region, latitude, longitude, complement, requested_at, service_type, observation, source_hash, file_name, imported_at, created_at, updated_at
  )
  from public.file_import_orders
) as backup
order by position, backup_sql;

-- Caso seja necessario restaurar, execute o arquivo salvo e depois ajuste as sequencias:
-- select setval(pg_get_serial_sequence('public.service_orders', 'id'), coalesce((select max(id) from public.service_orders), 1), true);
-- select setval(pg_get_serial_sequence('public.order_events', 'id'), coalesce((select max(id) from public.order_events), 1), true);
-- select setval(pg_get_serial_sequence('public.sync_runs', 'id'), coalesce((select max(id) from public.sync_runs), 1), true);
-- select setval(pg_get_serial_sequence('public.file_import_orders', 'id'), coalesce((select max(id) from public.file_import_orders), 1), true);
