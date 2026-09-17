# Validação na TV — 14/09/2026

Em andamento. Build **0.1.4-7bb2975a416c**, LG **43UP7500PSF**, webOS **6.5.3**, firmware **03.53.45**.

## Evidências confirmadas

- A tentativa inicial de abertura retornou `not exist`; o app não constava na listagem de instalados. A causa de sua ausência não foi determinada.
- O mesmo IPK foi reinstalado com sucesso. Depois disso, o app apareceu na listagem de instalados e na de apps em execução.
- O diagnóstico da página confirmou a identidade do build, modo local, fonte configurada e catálogo com **3.348 canais**.
- O usuário confirmou que a interface está visível na TV, porém sem imagem do canal testado.
- O evento da tecla **1** marcou o primeiro item, antes não favorito; a estrela apareceu e o registro foi confirmado no IndexedDB.
- A seção Favoritos identificou a fonte e mostrou o item marcado.
- Após recarregar a página do app na TV, o favorito e a navegação permaneceram disponíveis.
- VOLTAR encerrou a tentativa de reprodução: vídeo pausado, atributo `src` removido e mensagem de encerramento.
- O favorito criado pelo teste foi removido; a lista voltou a zero itens, preservando a situação anterior.
- A autenticação da fonte pelo serviço Luna retornou sucesso com `API.available() === false`. Isso comprova acesso sem o backend disponível, não um teste com o computador fisicamente desligado.

Os eventos de controle foram enviados ao próprio app pelo console de desenvolvimento da TV. Isso exercita seus tratadores reais, mas não substitui a verificação física de todas as teclas do controle.

## Falha de reprodução investigada

Foram tentados A&E [FHD], BAND NEWS [FHD] e um filme da categoria Documentários. Nos pontos observados, o vídeo ficou sem metadados e sem avanço de tempo (`currentTime: 0`, dimensões zero). O fluxo de novas tentativas foi acionado.

A própria TV, pelo serviço Luna, recebeu:

- Playlist de BAND NEWS: **HTTP 200**, `application/x-mpegurl`, seis entradas de mídia, sem criptografia declarada.
- Primeiro segmento dessa playlist: **HTTP 200**, `video/mp2t`.
- MP4 público usado como controle: **HTTP 206**, `video/mp4`.

O vídeo de controle foi aberto em um elemento temporário, separado do player e da biblioteca do app, e também não avançou no teste inicial. O arquivo é o exemplo da [documentação LG sobre retomada](https://webostv.developer.lge.com/develop/guides/resuming-media-with-mediaoption). Foi feita comparação com `source` e tipo `video/mp4` explícito.

Esses resultados distinguem acesso HTTP de reprodução efetiva. Não comprovam que todos os dados do stream estejam corretos, nem determinam por si sós a causa da falha do motor de mídia.

## Ainda não certificados

### Atualização após reiniciar o app e relato do usuário

O app foi encerrado e reaberto pela ferramenta LG, mantendo-se listado em execução. Depois, o usuário relatou que reiniciou seu servidor Node e teve a impressão de que a reprodução voltou.

A medição seguinte confirmou **GLOBO RPC CASCAVEL [FHD]** com tempo avançando, **1280 × 720**, motor **native**, `fallback:false`, sem URL de proxy e `API.available():false`. Portanto, essa reprodução observada é direta. A sequência temporal não permite concluir que o reinício do servidor tenha sido sua causa.

A ausência de imagem dos testes iniciais não deve ser generalizada para todos os canais ou tratada como falha definitiva do player. Os testes de VOD e retomada prosseguem.

### Filme e retomada real

O filme **Toda a Beleza e Dor (2022)** passou a reproduzir pelo motor nativo, em **1920 × 1080**, duração informada de **7.316,459 segundos**, sem novas tentativas. Foram registrados:

| Teste | Evidência |
|---|---|
| Reprodução do filme | `currentTime:45.15`, vídeo não pausado, overlay vazio |
| STOP e gravação | Posição observada e persistida iguais: **69,621 s** |
| Oferta de retomada | Diálogo com Continuar e Assistir do início; foco em Continuar |
| Retomada | Pedido de **69,621 s**; medição seguinte **75,526 s**, vídeo Full HD, não pausado, sem seek pendente |
| Assistir do início | Posição zero confirmada no IndexedDB antes de abrir o vídeo |
| Reprodução do começo | Medição seguinte **23,603 s**, Full HD, não pausado |

Isso valida o salvamento e a retomada reais de um filme neste aparelho.

O aplicativo foi posteriormente **encerrado durante a reprodução e aberto novamente**, sem reinstalação. O banco recuperou **128,911 s** do filme, a fonte foi restaurada e o vídeo permaneceu parado. Ao pressionar OK, o diálogo ofereceu continuar a partir dos dois minutos salvos. VOLTAR cancelou a escolha. Esse teste verifica encerramento/reabertura do app; não equivale a desligar fisicamente a TV.

- Imagem e som de todos os conteúdos testados; um canal teve reprodução temporal e dimensões confirmadas na atualização acima.
- Retomada real de um filme/episódio após assistir e reiniciar.
- Suspensão e retorno com vídeo funcionando.
- Funcionamento com o computador fisicamente desligado.
- Isolamento com duas fontes reais na TV (coberto por testes automatizados locais).

Os 78 testes automatizados da entrega continuam aprovados. Nenhuma alteração de credenciais, firmware ou proteção de acesso foi realizada durante estes testes.
