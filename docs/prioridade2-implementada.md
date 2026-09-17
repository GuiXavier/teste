# Prioridade 2 — reprodução e autonomia

Entrega dos fontes em 12/09/2026: **0.1.2**, build **0912-p2**, IndexedDB **v2**. C07–C11 implementados. O relatório automatizado contém 50 testes aprovados, incluindo as regressões da Prioridade 1. Não houve acesso ao provedor real, instalação na TV ou geração de IPK; o pacote antigo da raiz não contém estas mudanças.

## O que mudou

| Item | Comportamento entregue | Verificação |
|---|---|---|
| C07 | Cada pedido de reprodução e navegação invalida a geração anterior. STOP cancela o debounce de 400 ms, retentativas, fallback e callbacks pendentes. Páginas atrasadas não entram na lista nova. O player cancela timers e listeners de cada sessão e protege callbacks de instâncias HLS destruídas. | A lento → B rápido; STOP durante debounce e pedido em andamento; fallback pendente; retry/manifesto de HLS antigo; categoria e página fora de ordem. |
| C08 | O banco e a fonte local abrem antes da consulta ao PC. Modo padrão local, sem endereço privado fixo. Disponibilidade exige health confirmado, expira em 30 s e invalida ao trocar endereço ou simular PC desligado. Health tem teto de 3 s, sem bloquear a abertura local. | Ordem banco → cache → lista → health; coalescência/expiração de health; mudança de PC durante resposta; leitura local com rede simulada indisponível. |
| C09 | Cadastro, edição, teste, remoção e ativação de fontes em IndexedDB. Xtream/M3U podem ser configurados no primeiro uso pela TV. O cadastro antigo migra de `fonteLocal` e essa preferência é limpa após persistência. Logos preservam a origem; URLs antigas de proxy são desembrulhadas na leitura. | Migração, cadastro/remoção, reinício de contexto com mesmo banco, lives/VOD/episódios salvos sem acesso ao PC; preservação de rascunho durante resposta atrasada. |
| C10 | Serviço mantém provedor autenticado por credenciais/cabeçalhos, negocia formato antes das consultas e reutiliza a negociação por até 5 min. Ao reiniciar, autentica novamente. O formato acompanha respostas Luna e o resultado da sincronização para persistir no cadastro. User-Agent/Referer seguem a fonte, APIs e itens. | Provedor real com transporte simulado aceitando somente TS; operações sucessivas e reinício do serviço; headers nas requisições; URLs TS; decisão de proxy para cabeçalhos obrigatórios. |
| C11 | PC e TV compartilham transporte binário e inspeção de atoms MP4. Amostragem e limite de download são distintos. HTTP e Content-Range são validados. A amostra retida não passa de 64 KiB, inclusive com chunk enorme e servidor ignorando Range. | Faststart, `mdat` antes de `moov`, texto `moov` dentro de payload, atom inválido, HTML, 404, Range incorreto, chunk de 2 MiB e limite de resposta completa. |

## Uso na TV

1. Aperte **AZUL**. Em **Cadastro da fonte**, escolha Xtream ou playlist M3U e preencha os dados.
2. **Testar pela TV** verifica acesso pelo serviço local. O teste não depende de cadastrar a fonte no PC.
3. **Salvar e sincronizar esta fonte** publica o catálogo na TV e ativa o modo local após sucesso. **Salvar fonte na TV** apenas persiste o cadastro; **Usar** ativa um catálogo já salvo ou faz a primeira sincronização.
4. Feche a configuração para assistir. Filmes são carregados por categoria e episódios ao abrir a série; depois ficam disponíveis no banco para consultas subsequentes.
5. O endereço do **PC opcional** é salvo mesmo quando o PC está indisponível. **Importar cadastros do PC** é uma operação explícita. **Simular PC desligado** bloqueia o transporte HTTP do catálogo, preservando Luna e o banco.

Remover um cadastro não remove seu cache, favoritos ou histórico; a fonte ativa precisa ser substituída antes de remover seu cadastro. Alterações de endpoint, tipo, credenciais ou cabeçalhos recebem nova identidade para não ativar URLs antigas com uma configuração diferente. O cadastro anterior permanece disponível. Credenciais locais ficam em IndexedDB, sem criptografia adicional.

## Decisão de transporte e reprodução

Dados disponíveis são lidos do banco antes de qualquer consulta à rede. Categoria VOD/séries já carregada pode atualizar em segundo plano quando expira. Episódios salvos são reutilizados. Operações que precisam baixar dados tentam Luna com a configuração local; se falhar, só tentam HTTP quando o PC está confirmado disponível. A operação inteira é refeita pelo transporte alternativo: não se combinam páginas de snapshots diferentes. A publicação transacional da Prioridade 1 continua protegendo o catálogo anterior.

O HTTP continua exigindo que a fonte exista e esteja ativa no servidor com a mesma identidade. Uma fonte criada apenas na TV não é cadastrada automaticamente no PC. Nesse caso, a tentativa HTTP pode falhar com divergência de fonte e o cache anterior permanece preservado.

Streams comuns usam reprodução nativa direta. HLS de reserva só é anunciado com PC confirmado; a disponibilidade é reavaliada antes do fallback. Uma consulta de disponibilidade para operações futuras não atrasa a reprodução direta. TS bruto não é enviado ao HLS.js. Arquivos usam prazo inicial de 45 s, reduzido para 25 s somente quando a sonda identifica `moov` no início, e uma retentativa.

Fontes com User-Agent/Referer personalizados exigem proxy para o vídeo: HLS usa HLS.js pelo PC; TS/arquivos usam a URL do proxy no player nativo. Sem PC, a interface informa a dependência e não tenta uma URL direta sem os cabeçalhos exigidos. O proxy repassa Range/Content-Range e encerra o upstream quando o cliente fecha. Não foi criado proxy de vídeo na TV.

Logos usam URL direta sem PC; quando há PC confirmado, podem usar seu cache `/logo`. Não foi implementado um armazenamento binário permanente de logos na TV. Um logo remoto ainda depende da rede e das permissões do servidor de origem.

## Arquivos e contratos alterados

| Arquivos | Responsabilidade nesta entrega |
|---|---|
| `app/js/app.js` | Tokens de play/navegação, cancelamento, boot local, tratamento de recusa e build. Também corrige contagem exibida e categoria ainda não carregada. |
| `app/js/player/Player.js` | Ciclo de vida por sessão, cancelamento de timers/listeners, guards HLS e URL nativa via proxy. |
| `app/js/ui/ChannelList.js` | Geração da lista ao substituir fonte de paginação. |
| `app/js/api.js` | `available()`, `check(cb, force)`, expiração/isolamento de disponibilidade e `probeFile`. |
| `app/js/catalog.js` | Inicialização assíncrona, CRUD/ativação/teste local, migração, cache primeiro, transporte por operação, logos e política de reprodução. |
| `app/js/platform/db.js` | `sources(cb)` e `saveSource(source, active, cb)`; fonte e marcador `activeSource` na mesma transação. |
| `app/js/platform/sync.js` | Credenciais/cabeçalhos/formato nas chamadas Luna e formato negociado no resultado de sync. |
| `app/js/ui/Settings.js` | Cadastro local, PC opcional, importação explícita e rascunho preservado em atualizações assíncronas. |
| `server/lib/mediaFile.js`, `services/lib/mediaFile.js` | Módulo idêntico para transporte limitado e leitura binária. |
| `server/lib/probe.js`, `services/service.js` | Sondas compartilhadas; no serviço, cache de provedores autenticados e headers do M3U. |
| `server/lib/sources.js`, `services/lib/sources.js` | Configuração de formato/cabeçalhos por instância e headers nos itens normalizados. |
| `server/lib/playlist.js`, `services/lib/playlist.js` | Headers na busca/redirecionamento e na identidade do cache. |
| `server/server.js` | Headers efetivos por fonte, política de play, logo original e rota de sonda de arquivo. |
| `server/lib/sourceStore.js`, `server/lib/proxy.js` | Persistência de headers e repasse de Range/cancelamento para reprodução nativa pelo proxy. |
| `app/appinfo.json`, `services/package.json` | Versão 0.1.2. |

`Catalog.init(cb)` agora conclui depois de ler o banco. Novos métodos: `listSources`, `saveSource`, `testSource`, `removeSource`, `activateSource`, `logoURL`. Os callbacks do catálogo seguem `(erro, resultado)`; `arrancar` mantém seu objeto `{pronto, motivo, canais, doBanco}`. Luna mantém `(resultado, erro)` no wrapper da plataforma.

Nova rota: **POST `/api/probe-file`**, corpo `{url, perChannel}`. A resposta da sonda inclui `ok`, `moovNoInicio` (`true`/`false`/`null`), bytes, tipo e informações de Range quando disponíveis. A inspeção lê tamanhos de atoms de 32/64 bits dentro de limites numéricos; não verifica codec, DRM, integridade do arquivo completo nem presença de imagem decodificável. HTTP 200 sem Range é aceito para amostragem limitada, não interpretado como suporte a seek. Downloads completos acima do teto retornam erro.

## Evidências e limites

- [Relatório de validação](validacao-prioridade2.json) e [saída dos testes](testes-prioridade2.tap).
- Reproduzir na raiz: `node docs/validar-prioridade2.cjs`; os testes usam dados fictícios e rede simulada. Dependências de desenvolvimento estão em `tests/package-lock.json`.
- Sintaxe própria do app verificada como ES5 e serviço como ES2017; igualdade dos módulos compartilhados verificada. Isso não substitui execução em Chromium 79/Node 8 do aparelho.
- A simulação de reinício reutiliza IndexedDB com `fake-indexeddb`; o DOM de configuração e o player são simulados. Reprodução, teclado webOS, codecs, memória e desempenho precisam do aparelho real.
- Validação física pendente: instalar app **e serviço** novos; primeiro cadastro sem PC; reiniciar com PC desligado; abrir live/VOD/episódios salvos; abrir categoria nova via Luna; testar TS, MP4 e fonte com Referer; fazer zap e STOP. Não há confirmação de imagem real nesta entrega.

Os inventários originais, backups, logs, credenciais do provedor e o relatório histórico da Prioridade 1 foram preservados. A próxima etapa funcional continua sendo [Prioridade 3](continuidade.md).
