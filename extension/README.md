# Ponte do Procesa para o RotaOS

Extensão local e somente leitura que coleta apenas S025, S200 e S201, elimina duplicações e prepara os dados para sincronização com o RotaOS.

## Sincronização

- **Enviar selecionadas:** envia apenas as caixas marcadas e atendidas pela Camilla na página atual.
- **Todas as páginas do filtro:** percorre a paginação disponível, elimina números repetidos e abre a base acumulada no RotaOS.
- **Abrir base acumulada:** retoma uma coleta preservada caso a paginação pare ou a página seja recarregada.

O filtro de período continua sendo escolhido no Procesa durante a fase de teste. No desenho definitivo, o período do grid consulta o banco e a extensão fica responsável por manter a base atualizada.

## Instalação de teste

1. Abra `chrome://extensions` no Chrome.
2. Ative **Modo do desenvolvedor**.
3. Clique em **Carregar sem compactação**.
4. Selecione esta pasta `extension`.
5. Recarregue a página de Operações do Procesa.

Ao atualizar a extensão, volte a `chrome://extensions`, clique em **Recarregar** no cartão do RotaOS e depois recarregue a página do Procesa.

A extensão não guarda login ou senha e não distribui OS. Ela usa apenas a sessão que já está aberta no navegador para ler os dados escolhidos. A paginação automática apenas navega entre as páginas do resultado atual.
