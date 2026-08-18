# RotaOS

Protótipo focado em planejamento e revisão de rotas de Ordens de Serviço.

## O que já funciona

- recebimento de OS selecionadas ou visíveis no Procesa pela extensão local;
- tela principal com mapa ilustrativo e divisão das OS por equipe;
- configuração local do nome, cor e tipos de serviço de cada equipe;
- seleção por checkbox para calcular somente as OS marcadas;
- leitura dos detalhes disponíveis no modo de impressão;
- agrupamento de OS que têm o mesmo endereço;
- seleção e filtros simples por serviço e alertas;
- organização inicial por endereço e bairro;
- revisão da sequência e dos pontos que pedem atenção;
- exportação de um resumo da rota;
- preparação do resumo da rota para WhatsApp.

A extensão é inicialmente somente leitura: ela não guarda login/senha e não distribui OS no Procesa.

Produção, custos e ganhos estão fora da interface enquanto o módulo de planejamento é validado.

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
