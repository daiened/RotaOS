# Arquitetura do RotaOS

## Fonte de verdade

O grid do RotaOS consulta o PostgreSQL. Uma coleta da extensão nunca substitui diretamente a base exibida.

```text
Procesa autenticado
  → extensão coleta S025, S200 X e S201 X
  → API autenticada do RotaOS valida e recebe lotes
  → PostgreSQL faz upsert pelo número único da OS
  → histórico registra inclusão, alteração e nova reclamação
  → grid consulta a base com filtros, ordenação e paginação
```

## Regras de sincronização

- OS inexistente: inserir e marcar como nova.
- Mesmo número com conteúdo diferente: atualizar o estado atual e registrar um evento no histórico.
- Mesmo número e mesmo conteúdo: atualizar apenas `last_seen_at`.
- OS ausente em uma coleta parcial: não apagar nem arquivar automaticamente.
- OS não encontrada em uma varredura completa equivalente: marcar para revisão.
- Repetições entre páginas e datas: eliminar pelo identificador único antes do upsert.

## Segurança

- A extensão não contém senha do Procesa nem chave administrativa do banco.
- A extensão envia lotes para um endpoint autenticado e limitado aos formatos esperados.
- A chave secreta do Supabase existe somente no backend.
- O frontend usa autenticação e políticas RLS.
- O banco armazena somente os serviços necessários ao trabalho da Camilla nesta fase.

## Consultas do grid

Filtros, ordenação e paginação devem ser executados no banco quando a conexão online estiver ativa. A interface DEV atual reproduz esse comportamento em memória para validar a experiência antes da integração definitiva.
