# App: todos os arquivos atuais

> Registro do levantamento inicial (0.1.0). Para as mudanças de catálogo da versão 0.1.1, consulte [Prioridade 1 implementada](prioridade1-implementada.md), que prevalece sobre os trechos alterados deste documento.

Complemento semântico do [inventário integral](inventario-app-local.md), que traz tamanho, SHA-256 e linhas de funções para cada arquivo. Os 39 arquivos históricos são tratados individualmente na [comparação de backups](backups-comparados.md); cada um conserva o papel do respectivo arquivo atual, com as diferenças indicadas ali.

## Interface e identidade

| Arquivo | O que faz | Integração e observações |
|---|---|---|
| `app/appinfo.json` | Identidade, versão, ponto de entrada, resolução, ícones e flags webOS | `inspectable:true`, `requiredACG:[]`, `disableBackHistoryAPI:true`; permissões não foram revalidadas no aparelho |
| `app/index.html` | DOM de topo, categorias, lista, vídeo, status e ajuda de teclas | Carrega 15 scripts, incluindo hls.js e Spatial; Settings/HUD são criados dinamicamente |
| `app/css/tokens.css` | Cores derivadas de Nodecast, tipografia, espaçamento, overscan, foco | Sidebar 620 px; linha 76 px deve coincidir com ChannelList; comentários de compatibilidade não são testes atuais |
| `app/css/tv.css` | Layout flex, lista virtual, vídeo 16:9, HUD, Settings e skeletons | Usa margens no flex; `.cat-strip` esconde overflow, sem rolagem programática para a categoria selecionada |
| `app/hls.min.js` | Biblioteca HLS empacotada para fallback via MSE | Dependência minificada, não código autoral do app; comentários do Player mencionam 1.5.7. Não atualizada nesta análise |
| `app/icon.png` | Ícone pequeno do app | Recurso binário, não código; usado pelo manifesto |
| `app/largeIcon.png` | Ícone grande do app | Recurso binário, não código; usado pelo manifesto |

## Orquestração e acesso a dados

### `app/js/app.js`

Controla o ciclo de vida da experiência: `boot`, `resolveBackend`, categorias, troca de seções, abertura de séries, seleção/reprodução, overlays, retentativas e telemetria. `pbStart/pbFinish` delimitam sessões; `playChannelNow` pede a decisão ao Catalog e configura o monitor. `onKey` é o roteador efetivo de navegação, não Spatial.

As funções de categoria compartilham `categories/catIndex`; as de reprodução compartilham `currentChannel/pb/retryTimer`. Callbacks assíncronos não carregam geração de seleção. Isso permite aplicar resposta antiga a estado novo. `cat.total` é usado no texto/log, mas o contrato retorna `count`. Uma única categoria VOD com `count:null` é tratada como coleção vazia por `trocarSecao`.

`serieAberta` é preenchida mas não implementa a volta aos resultados; BACK fecha o registro de playback e envia logs, sem navegar à lista anterior ou parar o player. STOP não cancela o debounce que já tinha selecionado um próximo canal. A mensagem inicial ainda diz AZUL para o log, contradizendo o mapeamento real.

### `app/js/api.js`

Único cliente HTTP do frontend. `req` usa XMLHttpRequest com timeout 15 s e corpo `text/plain` contendo JSON, para evitar preflight. Devolve `Error` em HTTP fora de 2xx, erro de rede e timeout; JSON inválido em resposta 2xx vira `null`, sem erro explícito. Tem wrappers para health/categorias/canais/play/séries/configuração/fontes/segredo/ativação.

Simulação de PC desligado falha todas as requisições por esse wrapper, salvo `/api/log`; o Log possui transporte próprio e continua enviando. Não há abort exposto, token de requisição, timeout por operação nem proteção contra resposta de geração anterior. Não oferece wrapper de exclusão de fonte, apesar da rota DELETE do servidor.

### `app/js/catalog.js`

Fachada com `categories`, `channels`, `seriesInfo`, `play`, `sincronizar`, `arrancar`, modo/fonte e escolha de origem. Modo servidor delega ao API; local consulta DB e usa Sync sob demanda. Traduz ID de categoria Xtream para nome antes de consultar o índice local. Agrupa episódios por temporada; procura ID em quatro stores para resolver a reprodução.

Decisão local replica parcialmente o servidor, mas sem probe HLS e com heurística de disponibilidade do PC baseada em endereço configurado. Arquivos podem receber probeFile Luna. `continuarSync` salva fonte/credenciais antes do sucesso; `arrancar` usa existência de live como sinal de banco pronto, inadequado para fonte exclusivamente VOD. `categories` ignora falha de contagem do total e pode informar zero. A UI ainda depende da lista de fontes do PC para uma configuração inicial completa.

## Plataforma

### `app/js/platform/db.js`

Implementa `open/criarStores`, CRUD, lotes, preparo de índices, consulta paginada, contagem, poda, episódios, categorias e metadados. `preparar` anexa `sourceId`, `pos`, `nameLower` e `catKeys`; `query` usa cursores e `advance`, e busca substring percorre o índice. `resumo` agrega contagens. `wipe` existe, mas não está ligado a botão no app.

Limites: `id` global por store não inclui fonte; query de todos com busca começa o range em `offset` e também pula `offset` resultados filtrados; isso torna a paginação de busca incorreta. `onblocked` zera a fila de callbacks e `onsuccess` posterior pressupõe a fila ainda existente. `putMany` instala `onerror` e `onabort` sem trava única; nem todos os erros síncronos de transação/put são capturados. São pontos de revisão, além da poda reproduzida no Sync.

### `app/js/platform/sync.js`

Define adapters `origemHttp`/`origemLuna`. `baixarTudo` busca páginas, elimina IDs com `undefined`, converte categoria, grava posições e acumula IDs mantidos. `fonte` sincroniza live, atualiza contagens e traz categorias VOD/séries; `categoria` atualiza itens de uma categoria com TTL; `serie` grava episódios.

Regras existentes: 400 itens por resposta Luna, 500 HTTP, repetição de página vazia até duas vezes, poda não executada se erro explícito ou zero itens. Defeitos reproduzidos: página curta ou vazia intermediária pode concluir “sem erro” com lista incompleta e permitir poda; callback da poda é passado com assinatura errada. Filtrar IDs antes de avançar `offset` também pode encurtar a página e truncar a carga. Erros acumulados em `relato.erros` não viram erro no callback final; o marcador de sync é atualizado mesmo com falhas parciais.

### `app/js/platform/store.js`

Wrapper legado DB8: tenta `putKind`, permite `putChannels` e expõe `usingDb8`. Preferências pequenas sempre usam `localStorage` via `pref`. A mensagem “DB8 indisponível — memória” do app não descreve corretamente a persistência efetiva do catálogo IndexedDB. `putChannels` não é chamado pelo fluxo de catálogo atual.

### `app/js/platform/luna.js`

`call` cria PalmServiceBridge, parseia JSON e garante callback uma vez por timeout. `service` resolve `returnValue:false` e acrescenta prefixo do JS Service. Helpers leem painel, propriedades de sistema, rede e volume. Há API de alterar volume, sem ligação no controle principal. Timeout não cancela a requisição subjacente; timers também não são liberados explicitamente na resposta antecipada.

### `app/js/platform/keys.js`

Constantes do controle: setas/OK/BACK, quatro cores, transporte, CH+/− e dígitos. `isDigit/digit` são utilitários. FWD/REW/dígitos têm códigos mas não ações em `app.js`; existência da constante não significa função implementada.

### `app/js/platform/Log.js`

Fila de até 300 eventos, ring de 40 e HUD com 26 últimas linhas, `sessionId`, sequências e timestamps UTC. Envia lote após 1,5 s por XHR com timeout 8 s; o lote perdido não é recolocado. Instala `window.onerror`, `unhandledrejection`, `beforeunload` e `visibilitychange`. Flush em saída não garante entrega, pois continua sendo XHR assíncrono. O HUD escapa mensagem/payload, mas as estatísticas interpoladas não passam pelo mesmo escape.

## Reprodução e navegação

### `app/js/player/Player.js`

Escuta loadedmetadata/playing/waiting/error, limpa mídia com `stop`, escolhe nativo/HLS e tenta recuperação de rede/mídia. `switchToFallback` permite uma troca; `_fail` agenda fallback com 120 ms. `_hlsConfig` limita buffers, configura live edge, retries e nudge. `_startNative` sempre usa `direct`, mesmo quando `needsHeaders` é verdadeiro.

Timers de fallback/startLoad não pertencem a uma sessão cancelável. `stop` não limpa `current`; callback de fallback antigo pode iniciar HLS depois de STOP/troca de canal. A contagem de recuperação usa janelas temporais, mas não é um simples cooldown de 5 s como o README antigo sugere. As estratégias e capacidades efetivas precisam ser verificadas na TV.

### `app/js/player/HealthMonitor.js`

Separa partida/travamento, observa currentTime/readyState/dimensões/buffer e emite firstFrame, audioOnly, timeout, stall, recover, tick. `setStartup` permite prazo fixo para arquivos. Detecção “somente áudio” por dimensões zero é heurística, não inspeção de faixas. Relatos de “primeiro frame” medem avanço temporal após iniciar o monitor, não latência completa do botão até imagem (excluem debounce e API).

### `app/js/ui/ChannelList.js`

Lista virtual esparsa com `setSource`, `setItems`, carregamento por página, placeholders, seleção/ativação e descarte de páginas longe da janela. Nome/metadados usam text nodes; logo falho some. ROW_H=76, OVERSCAN=6 e três páginas de margem no cache. Episódios entram por `setItems`, que mantém o array completo dessa série. Callback `_loadPage` não é invalidado por `setSource`, podendo misturar conteúdo antigo.

### `app/js/ui/Settings.js`

Monta campos e botões em três colunas; input real abre o teclado do sistema. `carregar` busca fontes/config/health e resumo/meta local em paralelo; cada resposta chama `render`, reconstruindo campos e podendo apagar o que está sendo digitado. Nova fonte é apenas Xtream. Simulação, modo e sync ficam em Diagnóstico. Teste do JS Service faz ping seguido de fetch de playlist pública.

Ativação da fonte no servidor retorna antes da recarga terminar. Fechar configurações pode carregar categorias antigas. A lista de fontes só vem do PC; iniciar app local sem PC não permite reconfiguração completa de fontes. Valores de fontes são inseridos via HTML, ao contrário dos text nodes da ChannelList.

### `app/js/nav/Spatial.js`

Algoritmo genérico de foco direcional por retângulos: distância na direção + três vezes o desvio lateral. Ignora ocultos/desabilitados e dispara callbacks. Está carregado no HTML, mas a navegação principal usa `onKey` e Settings; é infraestrutura disponível, ainda não integrada a uma grade real.

## Backend do PC

### `server/server.js`

Ponto de entrada, HTTP e estado. `reload/reloadXtream` autenticam/carregam; `carregarVod/carregarSeries` trazem categorias; `buscarCategoria` baixa sob demanda; `colecao/itensEmCache` organizam consultas. `startValidation` evita varredura Xtream automática e listas >3.000. `rotear` centraliza todos os contratos listados no documento de operação. Telemetria é impressa, persistida JSONL e resumida em memória.

Não serve HTML/CSS/JS. Escuta em todas as interfaces, com CORS `*` e sem autenticação. Algumas ações mutantes não verificam o método HTTP; o try/catch externo só cobre execução síncrona da rota, não todos os callbacks. `uncaughtException` registra e mantém o processo. Troca de fonte não é uma substituição atômica de STATE; `episodeCache` e alguns estados de autenticação/catálogos podem sobreviver indevidamente. `nomearCategorias` existe sem uso no fluxo atual.

### `server/lib/sources.js`

Factory de IptvOrgProvider/M3uProvider/XtreamProvider. Xtream implementa auth, categorias e streams live/VOD/séries, informações VOD/séries, construção de URL e XMLTV. Prefixos normalizam tipos de item. `_api` aplica headers, timeout de inatividade 15 s e total 45 s, teto aproximado 40 milhões de caracteres e parse JSON. Não segue redirecionamento na API Xtream. `buildStreamUrl` não codifica usuário/senha como segmentos de URL. Filtro adulto M3U não se aplica automaticamente ao caminho Xtream. Comentários “esqueleto” estão obsoletos.

### `server/lib/sourceStore.js`

Lê/persiste fontes em JSON, cria ID slug com sufixo, ativa uma fonte, remove e restaura padrão quando necessário. `sanitizeList` devolve `hasPassword` mas oculta campo password. `sources.sanitize` é outra função, não a usada nessa listagem. Gravações de disco têm falhas engolidas e não são atômicas. Excluir a fonte ativa no disco não chama reload no roteador.

### `server/lib/config.js`

Defaults e persistência de UA, Referer, timeouts e flags de parser. `headers` aplica padrão global → por canal → extras. `set` só aceita chaves conhecidas, mas sem validar tipos/faixas. Algumas opções declaradas não são utilizadas nos caminhos com timeout fixo, especialmente Xtream.

### `server/lib/playlist.js`

Download com redirects, valida marcas M3U, parseia EXTINF/atributos, filtra spam/adulto, descarta URL extra após EXTINF e divide multicategorias. Prioriza `tvg-name`, guarda atributos e headers. Sem grupo válido usa “Sem categoria”; o enriquecimento posterior pode converter para “Outros”. IDs slug com sufixo dependem da ordem de duplicatas. `EXTVLCOPT`, `KODIPROP` e `EXTGRP` não são interpretados. `load` usa um único `playlist.m3u` para todas as fontes. Conferência de tamanho tolera até 5% de diferença, não é igualdade exata. Downloads não têm teto de bytes nem prazo total global.

### `server/lib/proxy.js`

`rewriteM3U8` resolve URLs relativas de linhas e de KEY/MAP/MEDIA/I-FRAME-STREAM-INF/SESSION-KEY. Propaga UA/Referer para URLs reescritas. `media` trata redirects/descompressão/CORS e encaminha Range da requisição, mas omite Content-Range/Accept-Ranges na resposta e não cancela upstream ao desconectar cliente. Não impõe limite de corpo de manifesto. `logo` guarda corpo em memória e ignora o parâmetro `w`; não segue redirects de imagem.

### `server/lib/probe.js`

Lê início com Range, identifica manifesto master/CODECS/RESOLUTION e decide motor. Para MP4 procura marcas `ftyp/moov/mdat` nos primeiros 64 KB convertidos em texto; é heurística. Probes HLS usam TTL de 10 min por URL, sem headers na chave. A lista TV_OK_VIDEO é uma política/relato do código, não foi recertificada. Não existe rota `/api/probe` no backend local: essas funções são usadas dentro de `/api/play`.

### `server/lib/validator.js`

Sonda poucos bytes, valida marca EXTM3U para URL M3U8 e qualquer conteúdo não vazio para demais URLs. Uma segunda tentativa dobra prazo, salvo 404/410/URL inválida. `run` controla concorrência e altera status dos objetos de canal. “ok” significa acessibilidade da sonda, não garantia de decodificação ou continuidade da transmissão.

### `server/lib/enrich.js`

Baixa/cacheia channels.csv e feeds.csv do iptv-org por 24 h; mantém índice em memória sem nova expiração enquanto o processo vive. Parser CSV lida com aspas/aspas duplicadas por linha, não registros multilinha. Cruza ID/feed, anexa país/idioma/formato/rede/site e cascata categorias banco → playlist → inferência → Outros. Canal encerrado vira dead, mas uma validação posterior pode sobrescrever o status. Não possui timeout de download explícito.

### `server/lib/diag.js`

Separa DNS, TCP, HTTP e parse JSON. Faz uma requisição de diagnóstico a player_api.php com credenciais fictícias fixas; não autentica a conta do usuário. Seu caminho HTTP ignora caminho fornecido na URL. Acesso disponível na API, sem botão direto em Settings. Limite de corpo aborta request; revisar finalização do callback nesse caminho.

### `server/package.json`

Manifesto do backend: `start`, Node >=18, GPL-3.0-only, sem dependências. Não há script de testes/lint; verificações da análise foram adicionadas apenas em `docs/`.

## Serviço embutido

| Arquivo | Responsabilidade e limites |
|---|---|
| `services/service.js` | Registra ping/config/fetch/m3u/xtream/probeFile. Cache Xtream 5 min/12 entradas, idle 60 s; fetch com redirects, gzip/deflate, limites. `maxBytes` pode virar erro antes de entregar amostra se um chunk ultrapassar o limite; probe usa status/content-type sem a mesma validação HTTP do PC. Sem servidor/proxy de mídia |
| `services/lib/config.js` | Configuração apenas em memória, interface compatível com a do PC; não persiste rede nem herda automaticamente o Settings do backend. O comentário de envio a cada chamada não está integralmente realizado pelo Sync |
| `services/lib/sources.js` | Cópia byte a byte de `server/lib/sources.js` no levantamento. Isso ajuda a manter formato, mas exige sincronizar futuras alterações nos dois arquivos |
| `services/lib/playlist.js` | Mesma lógica do parser do PC; única diferença encontrada é a quebra de linha final. O método `load` com disco/recursive permanece no arquivo, mas o serviço usa `parse/isPlaylist`, não esse caminho |
| `services/package.json` | Nome do serviço, versão 0.1.0, main service.js; depende do `webos-service` do ambiente, sem instalação local feita aqui |
| `services/services.json` | Registro do serviço `com.iptv.tvapp.service` no pacote webOS |

## Dados, evidências e ferramentas

| Arquivo | Conteúdo e uso |
|---|---|
| `server/data/sources.json` | Configuração real de duas fontes e credencial Xtream ativa. Valores sensíveis mantidos só no original |
| `server/data/playlist.m3u` | Cache de playlist pública; 392 canais após filtros do parser atual. Não é snapshot do catálogo Xtream ativo |
| `server/data/status.json` | Resultado histórico de validação: 285 ok/107 dead; não é reaplicado pelo boot do backend |
| `server/data/db-channels.csv` | Dados iptv-org de canais; 31.208 registros além do cabeçalho, usados no enriquecimento |
| `server/data/db-feeds.csv` | Dados iptv-org de feeds; 44.593 registros além do cabeçalho, usados em idioma/formato/região |
| `server/logs/app-2026-09-11.jsonl` | 239 eventos parseáveis de uma sessão; base do resumo de funcionamento, não um histórico de todo o desenvolvimento |
| `README.md` | Documento original com medições e decisões históricas; vários TODOs e explicações ficaram ultrapassados |
| `build.ps1` | Verifica presença e alguns padrões incompatíveis, empacota app+serviço, instala e opcionalmente abre. É deploy, não só build; avisos de sintaxe não bloqueiam; lista required omite Log.js; não checa sucesso de install/launch antes de “Pronto” |
| `auditar.ps1` | Auditoria antiga por nomes/tamanhos/marcadores, extras, Downloads e bloqueios de arquivo. Não certifica comportamento e marcará docs/referencias como extras; não usar isso como motivo para apagá-los |
| `corrigir.ps1` | Ferramenta de reorganização de arquivos soltos: copia backup, move/substitui, remove duplicata, desbloqueia arquivos e executa auditoria. Não foi executada; não necessária para este levantamento |
| `com.iptv.tvapp_0.1.0_all.ipk` | Artefato AR com control/data tar.gz; inclui app e serviço, JavaScript minificado, marcador 0911-1709. Não instalado nem reconstruído nesta tarefa |

## Backups, um por um

O [quadro de 39 comparações](backups-comparados.md) lista todos os caminhos, se são idênticos, adições/remoções e símbolos novos no arquivo atual. Ele permite localizar a versão anterior de cada função sem tratar uma pasta parcial como release completo. O [JSON correspondente](backups-comparados.json) também registra símbolos que desapareceram. Nenhum backup foi restaurado, editado ou removido.
