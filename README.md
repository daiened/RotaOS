# RotaOS

Planejamento de rotas, revisão de Ordens de Serviço e acompanhamento da produção das equipes.

## O que já funciona

- revisão da rota real usada na validação;
- recebimento de OS selecionadas ou visíveis no Procesa pela extensão local;
- leitura dos detalhes disponíveis no modo de impressão;
- agrupamento de OS que têm o mesmo endereço;
- importação de relatório de produção em XLSX, XLS ou CSV;
- classificação assistida e estimativa de valores;
- exportação da atualização em CSV;
- sincronização opcional com uma cópia de teste do Google Sheets;
- preparação do resumo da rota para WhatsApp.

A extensão é inicialmente somente leitura: ela não guarda login/senha e não distribui OS no Procesa.

## Desenvolvimento

Requer Node.js 22 ou superior.

```bash
pnpm install
pnpm dev
```

Validação de produção:

```bash
pnpm build
node --test tests/rendered-html.test.mjs
```

As instruções da extensão estão em `extension/README.md`. O conector de teste da planilha está em `integration/google-apps-script/README.md`.
