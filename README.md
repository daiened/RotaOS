# RotaOS

Planejamento e revisão de rotas de Ordens de Serviço, com sincronização incremental e sugestão explicável por equipe.

## O que já funciona

- recebimento de OS selecionadas ou visíveis no Procesa pela extensão local;
- tela principal única com mapa ilustrativo e divisão das OS por equipe;
- configuração local do nome, cor e tipos de serviço de cada equipe;
- capacidade máxima diária por equipe;
- seleção por checkbox para calcular somente as OS marcadas;
- filtros de OS novas, alteradas, conferidas e com reclamação;
- foco inicial em S025, S200 X e S201 X;
- sugestão independente da seleção manual, baseada em recência e quantidade de reclamações;
- explicação sob demanda do motivo de cada sugestão;
- ordenação por cabeçalho, período e paginação do grid;
- acumulação de todas as páginas do filtro atual pela extensão;
- leitura dos detalhes disponíveis no modo de impressão;
- agrupamento de OS que têm o mesmo endereço;
- seleção e filtros simples por serviço e alertas;
- organização inicial por endereço e bairro;
- revisão da sequência e dos pontos que pedem atenção;
- exportação de um resumo da rota;
- preparação do resumo da rota para WhatsApp.

A extensão é inicialmente somente leitura: ela não guarda login/senha e não distribui OS no Procesa.

O endereço oficial e único é <https://daiened.github.io/RotaOS/>. O esquema para Supabase está em `supabase/schema.sql`. Enquanto as credenciais do banco não forem configuradas, a tela informa claramente que está em modo de demonstração e conserva a base apenas naquele navegador.

A arquitetura aprovada e as regras de sincronização estão descritas em `docs/architecture.md`.

Custos, ganhos, mapa geográfico real e envio de volta ao Procesa continuam fora da interface enquanto o planejamento é validado.

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

As instruções da extensão estão em `extension/README.md`.
