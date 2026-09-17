# Prioridade 3 — interface e diagnóstico

Fontes atualizados para **0.1.3** em 12/09/2026. C12–C21 implementados e cobertos por testes de regressão. O identificador completo desta entrega está no [relatório de validação](validacao-prioridade3.json) e no [manifesto de conteúdo](../build-manifest.json). App e serviço mantêm IndexedDB v2.

## Comportamento entregue

| Item | Implementação | Evidência |
|---|---|---|
| C12 | Categoria sem contagem mostra “—”. Após carregar, faixa, status e evento `category.load` usam o total real. | Contagem nula/ausente e atualização após carregar. |
| C13 | Uma única categoria de filmes/séries com contagem desconhecida pode ser aberta. | Categoria única VOD com `count:null`. |
| C14 | VOLTAR encerra a reprodução e mantém a lista atual. O próximo VOLTAR sai dos episódios para a categoria de séries, restaurando índice e rolagem. Funciona também enquanto os episódios carregam. Configuração preserva a navegação ao fechar se a fonte continua a mesma. | Episódio → lista → categoria com foco na série; resposta antiga de episódios descartada. |
| C15 | A faixa desloca horizontalmente a categoria selecionada para a janela visível. | Elemento fora da faixa provoca deslocamento calculado pelas posições reais. |
| C16 | Dados assíncronos não recriam campos em edição. Rascunho e seleção são mantidos. Revisões de edição/consulta impedem que respostas antigas alterem o novo formulário. Campos têm labels associados. | Atualização atrasada com campo focado; senha/rascunho preservados; resultado de teste de fonte antiga ignorado. |
| C17 | Busca percorre a fonte desde o início, aplicando offset somente aos resultados filtrados. A faixa já havia sido corrigida na P1; foram removidos código/comentário obsoletos e incluída regressão explícita. | Termos esparsos, múltiplas páginas, fonte diferente, categoria e posições com lacunas. |
| C18 | Sessões têm `playbackId`, fonte, build e motivo de encerramento. Suspensão, fechamento, fim natural e falha terminal encerram uma vez. Posição e navegação são salvas. Ao retornar, não há retomada automática da sessão antiga. | Visibility/pagehide/unload sem duplicação; fim/erro; nova sessão após retorno; checkpoint de término abrupto. |
| C19 | `/api/report` agrega histórico compacto persistido, com publicação atômica e deduplicação. Primeiro início pode importar logs antigos. Falha de disco não confirma recebimento. Playback pendente de envio fica numa fila local. | Reinício, reenvio, nomes iguais com IDs diferentes, retenção, erro de escrita, JSONL interrompido e confirmação do envio. |
| C20 | Acesso de rede, reprodução observada e última falha são registros independentes, com data e origem. A lista e o HUD mostram o diagnóstico. A sonda não declara reprodução nem imagem. | Acesso sem reprodução; preservação de observação anterior; diagnóstico local persistido e relatório por identidade. |
| C21 | Verificador cobre app, biblioteca HLS, serviço, backend e scripts. Build usa hash do conteúdo. Auditoria compara manifesto; instalação/abertura só seguem se o comando anterior teve sucesso. | Manifesto determinístico, arquivo alterado, dependência ausente e código de saída nativo não zero. |

## Navegação e encerramento

**VOLTAR durante reprodução:** para o player e deixa o foco na lista. **VOLTAR na lista de episódios:** retorna à categoria de séries, com o índice/rolagem de origem. **VOLTAR na lista principal:** permanece no catálogo e indica como trocar categoria/seção; não fecha o aplicativo. A saída do app continua pelos controles do sistema da TV.

**AZUL** abre configurações; **AMARELO** alterna diagnóstico; **VERDE** troca TV/Filmes/Séries; **VERMELHO** recarrega o item atual. Os quatro atalhos do rodapé também aceitam clique. A ajuda inclui VOLTAR. As cores/códigos do controle da LG foram mantidos.

Navegação e posição ficam em preferências pequenas (`lastView`, `lastPlayback`). Não se gravam URLs ou senhas nesses checkpoints. `activePlayback` guarda um checkpoint periódico de até 15 s para recuperar um relato interrompido no próximo início. Suspensão/fechamento normal registra a posição no evento. Essas informações não implementam ainda “continuar assistindo” nem seek automático: isso pertence à etapa de favoritos/histórico de uso.

Depois de ocultar/suspender a janela, timers e player param; ao voltar, a lista é restaurada e o usuário escolhe quando reproduzir. Alteração do catálogo pode mudar qual item ocupa um índice salvo; remoção de itens limita o índice ao tamanho atual.

## Diagnóstico: o que os registros significam

`diagnostic.access` contém `{ok, at, origin, reason}`. A origem atual é `sonda-HTTP-PC`: houve acesso aos bytes iniciais ou a um manifesto. Isso não comprova segmentos, decodificação, áudio ou imagem.

`diagnostic.playback` contém `{at, origin, engine, evidence, audioOnly}`. `evidence:currentTime` representa avanço do relógio de mídia observado no player. O nome legado `tFirstFrame` foi mantido no protocolo por compatibilidade, mas **não é prova de um frame de imagem visível** no pipeline nativo da LG. `diagnostic.lastFailure` conserva data, origem e motivo da falha, sem apagar a observação anterior. A interface usa a evidência mais recente para a indicação de estado; detalhes ficam na linha/título e no HUD.

O app conserva até 500 diagnósticos locais em `meta:playbackDiagnostics`, sem alterar o esquema do banco. A falha desse histórico opcional não impede abrir o catálogo. O backend junta diagnóstico de acesso ao histórico de playback pelo ID canônico; registros antigos sem fonte não permitem reconstruir a identidade com a mesma precisão.

## Histórico persistente e limites

- Arquivo criado **ao executar o backend**: `server/data/playback-history.json`. A tarefa não iniciou o backend real nem criou esse arquivo com os dados do usuário.
- Retenção: até 30 dias, 10.000 registros e 32 MiB. A escrita usa temporário e rename; a memória só é atualizada após sucesso. IDs de playback repetidos não são contados novamente. O relatório agrupa por ID/fonte, sem misturar canais apenas por terem o mesmo nome.
- Primeiro início sem esse arquivo: importa até 30 arquivos `app-AAAA-MM-DD.jsonl`, lendo no máximo os 2 MiB finais de cada um e 16 MiB no total. Linhas acima de 64 KiB/incompletas são ignoradas. `imported` informa arquivos/bytes lidos, linhas inválidas e leitura parcial. Os logs originais não são alterados ou removidos.
- Na TV, `playbackOutbox` mantém os 100 playbacks mais recentes ainda sem confirmação, inclusive após reinício. A confirmação só remove registros após resposta `{ok:true}`. Falha/timeout deixa o playback para o próximo envio. Eventos comuns de debug continuam sendo uma fila transitória. Limite/indisponibilidade de armazenamento e término abrupto podem perder eventos além dessas janelas; não há promessa de captura infalível.
- `/api/log` responde erro quando não consegue persistir histórico/log. `/api/report` preserva os campos anteriores e acrescenta identidade, diagnóstico, retenção e importação. Os arquivos JSONL brutos mantêm sua política anterior; a retenção nova se aplica ao histórico compacto.

## Build e auditoria

`scripts/verify-project.cjs` analisa sintaxe do app próprio como ES5, HLS como ES2019, serviço como ES2017 e backend/scripts Node no runtime de desenvolvimento. Verifica sintaxe PowerShell pelo parser, referências do HTML, require relativo do serviço, igualdade dos módulos compartilhados, versões app/serviço e alguns usos de API/CSS incompatíveis. Esses testes são estáticos: não certificam APIs nativas, codecs ou desempenho do aparelho.

`build-manifest.json` registra hashes individuais e SHA-256 do conjunto. `app/js/build-info.js` leva a identidade para os eventos/HUD do app. O arquivo gerado é excluído do próprio cálculo para evitar autorreferência. Documentação, backups, logs, dados e credenciais não são considerados prova de versão. O verificador inclui `corrigir.ps1` para sintaxe/identidade, mas **não executa nem moderniza seu procedimento antigo de movimentação de arquivos**.

Na raiz, com as dependências de desenvolvimento de `tests` instaladas:

```powershell
node scripts/verify-project.cjs --write  # atualizar manifesto apos editar fontes
node docs/validar-prioridade3.cjs        # testes isolados + relatorio
.\auditar.ps1                           # conferir conteudo sem alterar arquivos
.\build.ps1 -CheckOnly                  # verificar sem empacotar ou acessar TV
.\build.ps1 -PackageOnly                # gerar somente pacote novo
.\build.ps1 -Launch -Device tv          # empacotar, instalar e abrir
```

Build completo executa testes antes de empacotar app **e serviço**. Cada execução usa pasta nova em `.artifacts`, seleciona somente o pacote da versão atual nessa pasta e registra hash/resultado. Falha de empacotamento ou instalação impede as etapas seguintes; falha ao abrir também resulta em erro. `-CheckOnly` e auditoria foram executados nesta tarefa. Não foi executado deploy. O IPK 0.1.0 da raiz continua sendo o pacote antigo.

## Arquivos novos e principais alterações

| Grupo | Arquivos |
|---|---|
| Interface/navegação | `app/js/app.js`, `app/js/ui/ChannelList.js`, `app/js/ui/Settings.js`, `app/index.html`, `app/css/tv.css` |
| Sessão/diagnóstico local | `app/js/platform/Log.js`, novo `app/js/platform/Diagnostics.js`, `app/js/catalog.js`, `app/js/player/Player.js`, `app/js/platform/db.js` |
| Histórico/sonda do PC | novo `server/lib/playbackHistory.js`, `server/server.js`, `server/lib/validator.js` |
| Build | novos `scripts/verify-project.cjs`, `scripts/native-tools.ps1`, `build-manifest.json`, `app/js/build-info.js`; `build.ps1`, `auditar.ps1`, versões app/serviço e `.gitignore` |
| Testes/documentação | novo `tests/interface-diagnostics.test.cjs`, ajustes nos testes anteriores, `docs/validar-prioridade3.cjs` e relatórios P3 |

## Validação executada e o que falta

Veja [resultados e hashes](validacao-prioridade3.json) e [saída integral dos testes](testes-prioridade3.tap). A suíte preserva as regressões P1/P2 e adiciona os cenários acima, com dados fictícios, IndexedDB simulado e transportes sem acesso à conta real.

Foi conferida uma prévia estática local em **1920×1080**, com abertura do cadastro e edição/navegação do rascunho. A tela ficou legível, sem sobreposição observada nesse cenário. Essa prévia usou Chromium de desktop, catálogo vazio e nenhum stream real.

Ainda é necessário validar no aparelho: VOLTAR e foco em lista extensa, faixa com muitas categorias, teclado webOS, suspensão/reabertura, fim de vídeo, consumo de memória, fluxo real de instalação e reprodução. Nenhum resultado automatizado foi tratado como confirmação de imagem na TV.

A próxima etapa planejada é **favoritos e continuar assistindo**, usando os IDs estabilizados e as stores existentes. As limitações de segurança já documentadas permanecem fora desta entrega.
