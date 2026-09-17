# IPTV para LG webOS

**Atualização em 15/09/2026:** versão **0.1.8** — avanço de filme sem falso "canal fora do ar", sincronização de filmes/séries numa requisição só e busca em memória. A 0.1.7 trouxe assistente de primeiro início com autenticação e sincronização completa. A 0.1.6 trouxe busca geral, controles de player (avançar/voltar/pausar), avanço automático de episódio e download completo do catálogo. A 0.1.5 trouxe a interface no desenho do nodecast-tv (navbar, home de trilhas, grade de pôsteres, ficha do título, tela cheia por OK/duplo clique e botão de próximo episódio aos 95%). Panorama completo em [estado do projeto](docs/ESTADO-DO-PROJETO.md); a entrega da interface em [interface-nodecast-portada.md](docs/interface-nodecast-portada.md). O texto abaixo é o README original do esqueleto e descreve a versão 0.1.0; para retomar o trabalho use a [memória técnica](docs/README.md).

**Atualização em 13/09/2026:** fontes na versão **0.1.4**, com favoritos por fonte e continuar assistindo implementados. Consulte a [entrega da biblioteca pessoal](docs/favoritos-e-continuar-assistindo.md) e a [memória técnica](docs/README.md). A validação física na TV permanece pendente. O IPK antigo da raiz foi preservado; o estado do novo pacote está no relatório da entrega.

Base medida na **LG 43UP7500PSF**, webOS 6.5.3, **Chromium 79**, painel 4K
(viewport CSS 1920×1080 @ dpr 2), 4 núcleos, heap JS de 347 MB.

Visual derivado do design system do **nodecast-tv** (GPL-3.0). Como este
projeto reaproveita esse CSS, ele herda a GPL-3.0.

---

## Estrutura

```
server/                backend Node, sem dependências
  server.js            API + proxy + logos
  lib/playlist.js      baixa e parseia o iptv-org (cache 6h)
  lib/validator.js     testa streams em paralelo, marca os mortos
  lib/proxy.js         proxy CORS com reescrita de m3u8

app/                   app webOS (ES5 puro, sem build)
  appinfo.json         com requiredACG: []
  index.html
  css/tokens.css       paleta e escala do nodecast, adaptadas
  css/tv.css           layout, foco, overscan
  js/platform/keys.js  keycodes MEDIDOS no controle
  js/platform/luna.js  PalmServiceBridge sem webOSTV.js
  js/platform/store.js DB8 com fallback
  js/player/Player.js  nativo primeiro, hls.js de reserva
  js/player/HealthMonitor.js   watchdog de currentTime
  js/nav/Spatial.js    navegação por D-pad
  js/ui/ChannelList.js lista virtualizada
  js/api.js  js/app.js
```

---

## Como rodar

**1. Backend** (fica aberto):

```powershell
cd server
node server.js
```

Ele baixa a playlist, valida os streams em segundo plano e imprime a URL.

**2. App:**

```powershell
cd ..
ares-package app
ares-install -d tv com.iptv.tvapp_0.1.0_all.ipk
ares-launch -d tv com.iptv.tvapp
```

**3. Apontar o app para o backend.** Por enquanto está no `app.js`, função
`resolveBackend()` — grave a origem com `Store.pref("backend", "http://IP:8099")`
ou sirva os estáticos pelo próprio backend. É o primeiro TODO.

---

## Decisões que vieram de medição, não de opinião

**Player nativo primeiro.** Mediana de 1500 ms até a imagem contra 2001 ms
do hls.js, e 5/5 de confiabilidade em repetições. O `meta` do hls.js chega
antes, mas ele congela ~1,5 s enchendo buffer antes de exibir.

**hls.js sempre pelo proxy.** Ele busca o manifesto por XHR e é barrado por
CORS na maioria dos canais. Com o proxy, 5/5 tocaram.

**`.ts` cru só toca no nativo.** O hls.js precisa de playlist. O backend
devolve `fallback: null` nesses casos.

**Virtualizar a lista é requisito, não otimização.** Medimos 324 ms para
montar 2000 `div` vazias. 7000 canais de uma vez trava a TV por segundos.

**Nada de canvas sobre o vídeo.** `drawImage(video)` devolve preto em 100%
dos 70 testes, nos dois pipelines: o vídeo vive num plano de overlay de
hardware. Sem thumbnail, screenshot ou filtro no cliente.

**Saúde pelo `currentTime`.** Todos os contadores do Chromium ficam zerados
no caminho nativo (frames, bytes de vídeo, bytes de áudio). O avanço do
`currentTime` é a única sonda que funciona nos dois caminhos.

**O `currentTime` nativo anda em degraus de 200 ms** (no MSE são ~33 ms).
Barra de progresso precisa interpolar.

**Logos em 2×.** dpr 2: um slot de 56 px precisa de imagem de 112 px.

---

## CSS: o que não existe no Chromium 79

| Recurso | Chegou em | Use |
|---|---|---|
| `gap` em flexbox | 84 | `margin` ou `display:grid` |
| `inset` | 87 | `top/right/bottom/left` |
| `aspect-ratio` | 88 | `padding-top` percentual |
| `:is()` / `:where()` | 88 | seletores repetidos |
| `content-visibility` | 85 | virtualização manual |

JS: `?.`, `??` e `||=` também não existem. O código está em ES5 puro, sem
build. Se você adicionar dependências, use
`esbuild --target=chrome79 --bundle` — mas lembre que ele transpila
**sintaxe**, não APIs: `String.replaceAll`, `Array.at`, `Object.hasOwn`,
`Promise.any` e `structuredClone` continuam ausentes e precisam de polyfill.

---

## Barramento Luna

Funcionam **sem declarar ACG**:

- `PalmSystem.deviceInfo` — modelo, tipo de painel, resolução física
- `systemproperty/getSystemInfo` — UHD, sdkVersion, boardType
- `connectionmanager/getStatus` — Wi-Fi vs cabo, IP, DNS
- `com.webos.audio/getVolume`

Negados sem ACG: `settingsservice`, `applicationManager`.

O **DB8 responde** — o erro "kind not registered" significa que falta
registrar a schema com `putKind`, não que o acesso foi negado.

---

## Telemetria

O app manda tudo para o backend. Três saídas simultâneas:

- **console do `node server.js`** — ao vivo, com `[ERRO]` e `[avis]` marcados
- **`server/logs/app-AAAA-MM-DD.jsonl`** — um evento por linha
- **HUD na TV** — tecla **AZUL**, últimas 26 linhas + métricas ao vivo

Captura `window.onerror` e `unhandledrejection`, então erro de JS que
ninguém tratou também aparece — importante numa TV sem console acessível.

Cada canal assistido vira um registro `playback`:

```json
{"channel":"A&E","engine":"native","tMeta":900,"tFirstFrame":1500,
 "stalls":0,"fallback":false,"error":null,"durationMs":42000}
```

`GET /api/report` resume: taxa de sucesso por canal, mediana de primeiro
frame por motor, travamentos e últimos erros. É o VProbe, só que
alimentado por uso real em vez de bateria de teste.

Teclas novas: **AZUL** liga/desliga o HUD · **AMARELO** força o envio da fila.

---

## Herdado do nodecast-tv

Depois de estudar o código deles, três coisas foram adotadas:

**Config de recuperação do hls.js.** `nudgeOffset: 0.2` e `nudgeMaxRetry: 6`
fazem o hls.js destravar sozinho empurrando o `currentTime`, sem recarregar
o canal. Mais `fragLoadingMaxRetry: 6`, `levelLoadingMaxRetry: 4` e
`manifestLoadingMaxRetry: 4`.

**Escada de erros.** `MEDIA_ERROR` chama `recoverMediaError()` com cooldown
de 5 s em vez de recarregar. `NETWORK_ERROR` tenta 3 vezes com atraso
crescente e depois troca para o proxy. O contador reseta por **tempo**
(30 s sem erro), não por evento.

**Sonda antes de tocar.** O `/api/probe` deles usa ffprobe; aqui o
`lib/probe.js` lê o `CODECS` do `#EXT-X-STREAM-INF` e decide o motor sem
depender de ffmpeg.

## Herdado do Hypnotix (Linux Mint, GPLv3)

O player padrão do Mint roda em milhões de máquinas há anos. As regras de
negócio dele já sobreviveram ao mundo real:

**User-Agent e Referer configuráveis** (`lib/config.js`). Muitos provedores
bloqueiam por UA ou exigem Referer. Padrão `Mozilla/5.0`, igual ao deles.
`POST /api/config` altera em tempo real; proxy, validador e sonda usam.

**Validar antes de aceitar.** `isPlaylist()` exige `#EXTM3U` **e** `#EXTINF`.
Sem isso uma página de erro em HTML vira "playlist com 0 canais".

**Integridade do download.** Compara o baixado com o `content-length` e
recusa se veio truncado — antes, meia playlist ficava 6 h em cache.

**Parser por regex.** `tvg-name` tem prioridade sobre o texto após a
vírgula, e todos os atributos `chave="valor"` são extraídos (não só três
fixos) — então `tvg-chno`, `catchup` e o que vier são preservados.

**Filtros do mundo real.** Descarta nome com `***` (spam de provedor),
ignora URL extra depois de um mesmo `#EXTINF`, e esconde conteúdo adulto
por padrão.

**Grupo catch-all** para canal sem categoria, no lugar do `xEverythingElse`.

**`group-title` com `;` vira várias categorias.** `"Animation;Kids;Religious"`
gerava três categorias de um canal cada; agora o canal aparece nas três com
contagem real.

**Timeouts separados** para conectar e para ler, como o `(5, 120)` deles.

## Fontes: pronto para Xtream e M3U

`server/lib/sources.js` segue o padrão do `M3uXtreamAdapter` do nodecast:
todo provedor expõe a mesma interface, então o app da TV tem **um caminho
de código só**.

```
auth(cb)  getCategories(cb)  getChannels(opts, cb)
buildStreamUrl(id, type, container)  getXmltvUrl()
```

Implementado: `iptv-org`. Com esqueleto pronto: `xtream`, `m3u`.

O protocolo Xtream já está codificado:

```
auth       {base}/player_api.php?username=U&password=P
categorias ...&action=get_live_categories
canais     ...&action=get_live_streams[&category_id=N]
stream     {base}/live/{U}/{P}/{stream_id}.m3u8
EPG        {base}/xmltv.php?username=U&password=P
```

Senhas nunca voltam ao cliente — `sources.sanitize()` troca por bolinhas.

---

## TODO

- [ ] Tela de configuração do endereço do backend pelo controle
- [ ] EPG (`iptv-org/epg`) no backend + grade na UI
- [ ] Favoritos e histórico no DB8
- [ ] Busca por teclado na tela
- [ ] Pré-carregar o canal vizinho para acelerar o zapping
- [ ] Redimensionar logos de verdade no servidor (hoje só cacheia)
- [ ] Backoff no `HealthMonitor` em vez de reabrir direto
- [ ] Reter o `catIndex` e o último canal entre sessões
