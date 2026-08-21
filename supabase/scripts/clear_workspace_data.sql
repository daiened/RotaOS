-- RotaOS: execute SOMENTE depois de salvar o backup gerado por backup_workspace_data.sql.
-- Limpa as duas bases (Planejamento e Importacao) e os historicos das coletas.
-- Equipes, configuracoes e usuarios NAO sao apagados.

begin;

delete from public.order_events;
delete from public.service_orders;
delete from public.sync_runs;
delete from public.file_import_orders;

commit;
