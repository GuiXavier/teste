# Estudo das referências e aplicação ao app webOS

O **Nodecast TV oferece o maior conjunto de ideias diretamente adaptáveis ao backend JavaScript**, principalmente EPG, histórico, favoritos e processamento de mídia. O **Hypnotix ajuda na organização de provedores e na experiência de navegação**, mas depende de Python/GTK/mpv. O **SFVIP-Player disponibilizado é incompleto**: serve como referência limitada de estrutura e configurações, sem código suficiente para estudar seu motor de reprodução.

O app local já tem decisões adequadas ao seu alvo: navegação por controle remoto, lista virtualizada, persistência IndexedDB, catálogo sob demanda e serviço Luna. Os projetos externos devem complementar essa base. Não foi estabelecida genealogia de trechos: sem histórico Git do app recebido, semelhança de recursos não prova qual código foi copiado originalmente.

## Revisões estudadas

| Repositório | Commit consultado | Arquivos | Base técnica |
|---|---|---:|---|
| [Nodecast TV](https://github.com/technomancer702/nodecast-tv/tree/0e26a90dae211cf9ed4c7adc8941ec9fbddec972) | `0e26a90dae211cf9ed4c7adc8941ec9fbddec972` | 66 | Node ≥18, Express, SQLite, JavaScript no navegador, FFmpeg |
| [Hypnotix](https://github.com/linuxmint/hypnotix/tree/0e0fa1c7596f7925c715c36efb0e4be53a3bde43) | `0e0fa1c7596f7925c715c36efb0e4be53a3bde43` | 107 | Python, GTK, libmpv, empacotamento Debian |
| [SFVIP-Player](https://github.com/austintools/SFVIP-Player/tree/0e634fea82b2e38c10615d7195862a4e06ddf2f9) | `0e634fea82b2e38c10615d7195862a4e06ddf2f9` | 11 | C#, WPF, .NET Framework 4.7.2, dependências nativas ausentes |

Levantamento em 11/09/2026. Cópias em `docs/referencias/`; nenhum desses runtimes foi instalado ou executado. Os dossiês [Nodecast](arquivos-nodecast-tv.md), [Hypnotix](arquivos-hypnotix.md) e [SFVIP](arquivos-SFVIP-Player.md) relacionam **cada arquivo presente**, sua finalidade, tamanho, linhas e pontos de entrada identificáveis. Inventários adicionais registram SHA-256. As conclusões abaixo vêm de inspeção de código, não de testes funcionais desses aplicativos.

## Matriz de aproveitamento

| Recurso | Situação no app | Referência útil | Adaptação proposta | Ordem |
|---|---|---|---|---|
| Integridade de sincronização | Poda prematura reproduzida; sem exclusão mútua | Nodecast `syncService.js` | Trava por fonte, gerações completas, preservação em erro | Primeiro |
| Identidade entre fontes | IDs sem fonte | SQLite/favoritos do Nodecast | Chave fonte + tipo + ID externo; não copiar chave incompleta de items/history | Primeiro |
| Cadastro sem PC | Settings depende de HTTP | Hypnotix, gerência de provedores | CRUD local e validação pelo Luna | Primeiro |
| Favoritos | Apenas object store preparado | Nodecast e Hypnotix | IndexedDB, ação no controle e lista própria | Após integridade |
| Continuar assistindo | Apenas object store preparado | Nodecast WatchPage/history | Progresso periódico, identidade completa, retomada explícita | Após integridade |
| Próximo episódio | Lista existe; avanço automático ausente | Nodecast WatchPage | Ordenação temporada/episódio, cancelamento e tokens | Após histórico |
| EPG | URL XMLTV existe; guia ausente | Nodecast epgParser/EpgGuide | Importação limitada, índice temporal e navegação por foco | Próxima expansão |
| M3U grande | Parser em memória e cache global | Nodecast m3uParser | Leitura incremental no serviço/backend, atributos preservados | Com correção do parser |
| Busca | Busca local com problema de offset | Hypnotix/Nodecast | Normalização e paginação corretas antes de ampliar UI | Após integridade |
| Legendas/áudio | Sem controles completos | Nodecast VideoPlayer/subtitle | Descobrir suporte do motor ativo na TV | Posterior |
| Remux/transcode | Proxy HLS; sem conversão | Nodecast probe/remux/transcode | Recurso opcional do PC, com limites de CPU/disco | Posterior |
| PiP/equalizador | Ausente | SFVIP apenas enum/descrição | Sem implementação aproveitável comprovada nesse repositório | Não priorizar |

## Nodecast TV: pontos úteis e limites

### Catálogo e sincronização

[syncService.js](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/syncService.js) mantém um conjunto de sincronizações ativas por fonte, divide inserções em lotes e usa transações SQLite. É uma referência para impedir concorrência e separar preparação/publicação de um catálogo. O app deve manter seu carregamento de filmes e séries sob demanda: importar todos os itens como no Nodecast aumenta memória, tráfego e tempo de inicialização na TV.

[sqlite.js](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/db/sqlite.js) reúne categorias, itens, programas EPG, estado de sync, favoritos e histórico. O esquema ajuda a explicitar entidades, mas não deve ser transplantado literalmente: chaves de itens usam fonte e ID sem tipo; o histórico também não oferece a identidade completa necessária ao nosso cenário. A unicidade de favoritos incluindo usuário, fonte, item e tipo é uma referência mais adequada.

**Aplicação concreta:** evoluir `app/js/db.js` e `sync.js` com `sourceId`, `type`, `providerId` e chave interna estável, uma geração de sincronização e `lastAttempt` separado de `lastSuccess`. Converter os dois testes de poda em regressões que exigem preservação durante falhas. Não adotar a estratégia de exclusão antecipada observada na importação de EPG externa.

### Favoritos, progresso e episódios

[WatchPage.js](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/pages/WatchPage.js) salva progresso periodicamente, calcula o próximo episódio por temporada/número e oferece uma contagem regressiva cancelável. São fluxos úteis para completar as stores já criadas no app. [favorites.js](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/routes/favorites.js) e [history.js](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/routes/history.js) mostram os contratos HTTP correspondentes.

**Aplicação concreta:** métodos locais `favoriteSet/list` e `historyPut/get`, com chave fonte/tipo/item e pequenos snapshots de título/logo. Salvar posição de VOD quando duração for finita e ao pausar/trocar; não usar posição de live como retomada. Tornar retomada e próximo episódio operáveis por OK/BACK. Tokens de reprodução precisam impedir que o término de A avance a série após o usuário já selecionar B. Limiares de “concluído” e retenção devem ser decisões explícitas do produto.

### EPG

[epgParser.js](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/epgParser.js) usa SAX, interpreta datas XMLTV com fuso e oferece interfaces de coleta e lotes. [EpgGuide.js](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/EpgGuide.js) organiza canais em linhas e programas em uma escala temporal. Isso fornece uma referência concreta para o guia que falta no app.

Há dois cuidados identificados: o gerador de lotes usa um único `pendingBatch`, que pode ser substituído se o parser continuar produzindo enquanto o consumidor está suspenso; e a sincronização remove programas anteriores antes de concluir o download. A virtualização de linhas do guia também não elimina o custo de filtrar o conjunto de programas repetidamente.

**Aplicação concreta:** primeiro exibir “agora/próximo”. Manter `tvg-id`/`epg_channel_id` e um mapa de canais; não pressupor que o ID de stream seja o ID XMLTV. Fazer parsing fora da UI, em lotes com controle de fluxo, guardar timestamps UTC e converter apenas na apresentação. Indexar por fonte/canal/início, limitar janela temporal e substituir dados somente após carga válida. Depois construir uma grade com foco por controle remoto, evitando carregar toda a programação na memória da página. Testar fusos, programas sobrepostos, XML truncado, canal sem correspondência e troca de fonte.

### M3U

[m3uParser.js](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/m3uParser.js) demonstra leitura incremental com `readline`, lotes e suporte a `EXTGRP`. [m3uXtreamAdapter.js](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/m3uXtreamAdapter.js) normaliza listas para um contrato comum de catálogo.

O parser externo extrai um conjunto limitado de atributos; usar a última vírgula como separador também não constitui um parser geral de aspas. Nosso parser já guarda atributos extras e múltiplos grupos, que devem ser preservados. A melhoria deve reconhecer o separador fora de aspas e acrescentar diretivas de headers somente com um contrato claro de reprodução. APIs modernas e optional chaining desse projeto não são compatíveis diretamente com o serviço Node 8 indicado no app.

### Reprodução, análise de mídia e conversão

[VideoPlayer.js](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/public/js/components/VideoPlayer.js) concentra controles e estratégias de reprodução. [probe.js](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/routes/probe.js) usa ffprobe para inspecionar streams; [transcodeSession.js](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/transcodeSession.js) cria sessões FFmpeg/HLS; [hwDetect.js](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/services/hwDetect.js) examina aceleradores disponíveis. [proxy.js](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/server/routes/proxy.js) inclui encaminhamento de headers de range que falta ao proxy local.

**Aproveitamento imediato:** estudar `Content-Range`/`Accept-Ranges`, encerramento de sessões e classificação de falhas. Antes de acrescentar motores, corrigir timers e respostas antigas do player atual. Uma matriz genérica de codecs de navegador não certifica o decodificador da LG; a decisão deve considerar contêiner, áudio, vídeo, motor e evidência da TV.

**Aproveitamento posterior:** remux quando codecs forem compatíveis e apenas o contêiner exigir mudança; transcode quando houver incompatibilidade real. Isso exigiria PC/servidor com FFmpeg, limites de sessões, tempo, disco e cancelamento. O código externo reutiliza sessão por URL e mantém segmentos em disco; opções, isolamento e limites precisam de revisão. A URL persistida pode conter credenciais. Essa expansão deve permanecer opcional para conservar o modo local da TV.

### Interface, autenticação e implantação

As páginas Live/Movies/Series, SourceManager e Settings fornecem referências de organização. A interface de navegador não resolve automaticamente foco, retorno entre telas e limites de memória webOS. Reaproveitar estados e fluxos, mantendo componentes adequados ao controle remoto.

O Nodecast inclui autenticação, contas e implantação Docker. Esses módulos demonstram separação de responsabilidades, mas sua presença não prova segurança integral. No app atual, proteger rotas sensíveis, restringir destinos de proxy e evitar exposição de credenciais são problemas concretos descritos em [continuidade](continuidade.md); importar toda a pilha de login não é pré-requisito para corrigir esses pontos.

## Hypnotix: pontos úteis e limites

### Provedores e catálogo

[common.py](https://github.com/linuxmint/hypnotix/blob/0e0fa1c7596f7925c715c36efb0e4be53a3bde43/usr/lib/hypnotix/common.py) reúne modelos, gerenciamento de provedores, leitura M3U, grupos e favoritos. [xtream.py](https://github.com/linuxmint/hypnotix/blob/0e0fa1c7596f7925c715c36efb0e4be53a3bde43/usr/lib/hypnotix/xtream.py) fornece autenticação, categorias, lives, VOD, séries e episódios. A separação entre configuração do provedor e itens normalizados é útil para completar o cadastro local da TV.

O cliente distingue tipos e busca episódios sob demanda, mas carrega grandes conjuntos de outros itens e usa caches em arquivo. Não substituir a paginação/IndexedDB do app por listas Python em memória. Há estruturas mutáveis no escopo de classe que merecem cuidado ao adaptar estado por instância; o filtro adulto existe, mas sua presença não significa ativação por padrão. Os métodos relacionados a EPG não demonstram, sozinhos, um guia completo implementado.

**Aplicação concreta:** dar à fonte local um ciclo criar → validar → salvar → sincronizar → ativar, com erro visível e sem depender do PC. Compartilhar normalização entre os adaptadores existentes do PC e Luna, que hoje já duplicam arquivos, mas manter transporte e persistência próprios de cada ambiente.

### Navegação, favoritos e estados do player

[hypnotix.py](https://github.com/linuxmint/hypnotix/blob/0e0fa1c7596f7925c715c36efb0e4be53a3bde43/usr/lib/hypnotix/hypnotix.py) coordena páginas, navegação de retorno, favoritos, busca e reprodução. [hypnotix.ui](https://github.com/linuxmint/hypnotix/blob/0e0fa1c7596f7925c715c36efb0e4be53a3bde43/usr/share/hypnotix/hypnotix.ui) descreve a interface GTK. É uma referência para estados explícitos de tela e retorno, uma lacuna atual do fluxo de séries/BACK.

**Aplicação concreta:** manter uma pilha pequena com tipo, categoria, série e posição de foco; BACK volta ao contexto anterior; recuperar posição após sair do player. Favoritos devem apontar para identidade estável e conservar um snapshot para explicar itens removidos. A busca deve normalizar consulta e nome de forma equivalente, sem copiar diferenças de normalização encontradas no código externo.

A integração mpv permite observar propriedades de reprodução e coordenar parada/carregamento. O conceito de ciclo de vida é útil, mas as chamadas GTK/mpv não se aplicam ao `<video>` webOS. A implementação local precisa continuar usando eventos de mídia, cancelamento explícito e telemetria própria.

### Recursos auxiliares

O projeto contém traduções gettext, atalhos, estilos, ícones, lançadores e empacotamento Debian. O dossiê individualiza esses arquivos. São referência para localização e ajuda contextual, não peças de execução no webOS. A biblioteca [mpv.py](https://github.com/linuxmint/hypnotix/blob/0e0fa1c7596f7925c715c36efb0e4be53a3bde43/usr/lib/hypnotix/mpv.py) usa `ctypes` e libmpv; não pode ser inserida como biblioteca JavaScript no app.

## SFVIP-Player: o que é realmente possível estudar

[SFVipPlayer.csproj](https://github.com/austintools/SFVIP-Player/blob/0e634fea82b2e38c10615d7195862a4e06ddf2f9/SFVipPlayer.csproj) lista 112 referências a arquivos de construção, das quais 105 estão ausentes nesta árvore. Há referências a player, controles, banco, configurações e recursos sem implementação disponível, além de caminhos de DLLs externos. A lista exata está em [sfvip-arquivos-ausentes.json](sfvip-arquivos-ausentes.json).

Os arquivos presentes permitem verificar bootstrap WPF, manifesto, configurações estáticas, opções `--sub`/`--file` e enumeração de estados de tela. `App.xaml.cs` contém marcadores de descompilação e depende de classes ausentes. Declarar uma opção de legenda ou um estado PiP não implementa esses recursos. Os recursos anunciados no README, como playlists inteligentes ou equalizador, não foram corroborados pelo código fornecido.

**Aproveitamento:** pequena referência de categorias de configuração e estados de tela. **Limite:** não há base suficiente para extrair algoritmo de buffering, troca de canal, EPG ou integração mpv funcional. Não foram baixados nem executados binários de releases para tentar suprir o código ausente.

## Compatibilidade e licenças dos arquivos

O alvo documentado do app é Chromium 79/serviço Node 8.12; Nodecast declara Node ≥18; Hypnotix depende de GTK/Python; SFVIP depende de WPF/Windows. A transferência deve ser feita por recurso e contrato, com implementação e validação próprias do ambiente de destino.

O Nodecast declara `GPL-3.0-only` em [package.json](https://github.com/technomancer702/nodecast-tv/blob/0e26a90dae211cf9ed4c7adc8941ec9fbddec972/package.json). Hypnotix declara GPL-3+ em [debian/copyright](https://github.com/linuxmint/hypnotix/blob/0e0fa1c7596f7925c715c36efb0e4be53a3bde43/debian/copyright), enquanto o cabeçalho da biblioteca incorporada `mpv.py` declara AGPL versão 3 ou posterior. SFVIP contém uma [licença MIT](https://github.com/austintools/SFVIP-Player/blob/0e634fea82b2e38c10615d7195862a4e06ddf2f9/LICENSE), que não estabelece a licença das DLLs ausentes. Essas são declarações dos arquivos observados; ao reutilizar código, registrar a origem e conferir a licença específica do componente, incluindo dependências e recursos.

## Sequência de implementação recomendada

1. Corrigir integridade, identidade de itens, cache por fonte e corridas de callbacks/timers. Validar os casos isolados e depois na TV.
2. Concluir cadastro e boot locais, comprovar funcionamento com PC desligado e acertar BACK/foco de séries.
3. Implementar favoritos e histórico sobre a identidade corrigida; depois retomada e próximo episódio.
4. Acrescentar EPG agora/próximo com importação transacional e limites; construir a grade depois.
5. Avaliar legendas, seleção de áudio e remux/transcode opcional apenas com casos reais de mídia que justifiquem a expansão.

Critérios detalhados e evidências do app estão em [continuidade.md](continuidade.md). Nenhuma dessas propostas foi incorporada ao runtime nesta etapa de documentação.
