# Conector da planilha de produção

Este conector deve ser instalado **somente em uma cópia de teste** da planilha. Ele cria/atualiza a aba `IMPORTACAO ROTAOS` e não mexe nas demais abas.

1. Faça uma cópia da planilha de produção.
2. Na cópia, abra **Extensões → Apps Script**.
3. Substitua o conteúdo de `Code.gs` pelo arquivo deste diretório.
4. Execute `setupRotaOS` uma vez e conceda a permissão solicitada.
5. Em **Implantar → Nova implantação**, escolha **App da Web**, execução como você e acesso apenas às pessoas autorizadas.
6. Copie a URL terminada em `/exec` e cole em **RotaOS → Integrações → Planilha de Produção**.

Durante a validação, mantenha a planilha original apenas para consulta.
