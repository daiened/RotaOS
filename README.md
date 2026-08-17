# RotaOS

Protótipo de planejamento de rotas para equipes que executam Ordens de Serviço da CESAMA.

O painel foi criado para validar o fluxo de importação de OS, filtros por região, data e tipo de serviço, visualização geográfica e distribuição entre equipes.

> Estado atual: protótipo visual. A leitura real de PDF, geocodificação, otimização de rotas, persistência e integração com o Procesa ainda serão implementadas.

## Desenvolvimento

Requer Node.js 22 ou superior.

```bash
pnpm install
pnpm dev
```

Para validar a versão de produção:

```bash
pnpm build
pnpm start
```
