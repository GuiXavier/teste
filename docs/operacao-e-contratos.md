# Operação e contratos existentes

> Registro do levantamento inicial (0.1.0). Para as mudanças de catálogo da versão 0.1.1, consulte [Prioridade 1 implementada](prioridade1-implementada.md), que prevalece sobre os trechos alterados deste documento.

## Executar e empacotar

Backend do PC, a partir da raiz:

```powershell
node server/server.js
```

Porta padrão 8099, alterável por `PORT`. Inicia recarga da fonte e pode validar automaticamente listas públicas; não executado nesta análise para não consumir conexões reais do provedor. `server/package.json` permite também `npm start` dentro de server e não exige instalar dependências do app local.

Para produzir pacote sem instalar, com a CLI webOS já configurada:

```powershell
ares-package app services
```

O comando existente `./build.ps1` **empacota e instala** no dispositivo `tv`; com `-Launch`, também abre. Não foi usado nesta análise. Verificar aparelho e fonte antes de testar uma versão. O backend local não serve arquivos estáticos: visitar `/` nele retorna erro de rota, não abre a interface.

## Controle remoto

| Tecla | Ação atual |
|---|---|
| Cima/baixo | Move seleção da lista |
| Esquerda/direita | Troca categoria com debounce |
| OK | Reproduz item; série abre lista de episódios |
| CH+/CH− | Move e ativa item |
| Verde | Alterna TV → Filmes → Séries |
| Azul | Abre Settings; dentro dele fecha |
| Amarelo | Alterna HUD de logs |
| Vermelho | Reabre canal atual e reinicia a contagem de tentativas |
| Play/Pause | Chamadas separadas de play e pause |
| Stop | Para player/monitor e fecha registro de playback; debounce pendente é uma lacuna |
| Back | Em Settings sai/termina edição; fora dele cancela retry, fecha playback e flush, sem navegação completa |
| Avançar/recuar/dígitos | Mapeados em Keys, sem ação implementada |

## Convenções de callback

Não são uniformes, o que já causou o erro de poda:

- API/Catalog: normalmente `(erro, dados)`; `Catalog.arrancar` entrega um único objeto de resultado.
- DB: `(erro, resultado)`, frequentemente erro textual.
- Sync: `(erro, relato)`; atualmente o relato pode conter erros mesmo com primeiro argumento null.
- Luna.call/Luna.service: `(resultado, erro)`, ordem inversa.
- ChannelList loader: somente `lista` ou null.
- DB.pruneSource: `(erro, quantidadeRemovida)`.

Ao extrair módulos, normalizar isso ou criar adapters explícitos em cada fronteira.

## API HTTP implementada

As rotas estão em `server/server.js`. Método abaixo indica uso previsto ou verificação real. Muitos GETs respondem sem verificar método; “qualquer” não é recomendação de uso.

| Caminho | Método/entrada | Saída e efeito |
|---|---|---|
| `/api/health` | leitura | ok, canais/categorias, carregamento, validação, fonte e resumo auth |
| `/api/categories` | type=live/vod/series; alive=0 opcional | array `{id,name,count}`; live inclui `__all__`; VOD/séries count pode ser null |
| `/api/channels` | type, category, q, limit, offset, alive | `{total,offset,items}`; limite máximo 500; VOD/séries exigem categoria |
| `/api/play/:id` | ID já conhecido em memória/cache | decisão de motor, URLs, probe, prazos ou naoTocavel; arquivo pode fazer GET Range ao provedor |
| `/api/series/:id` | ID s-prefixed ou externo | `{info,seasons,totalEpisodios}`; guarda episódios para play |
| `/api/diag` | url | etapas DNS/TCP/HTTP/JSON; não autentica conta real |
| `/api/sources` | GET | lista sem password, com hasPassword |
| `/api/sources` | POST JSON type/name/url/username/password | salva fonte, retorna `{ok,id}`; não ativa |
| `/api/sources/test` | POST JSON de fonte | autentica sem salvar; M3U auth atual não baixa/valida a playlist |
| `/api/sources/:id/secret` | leitura, sem restrição de método | devolve username/password/url reais; sem autenticação no estado atual |
| `/api/sources/:id/activate` | cliente usa POST; rota não restringe | ativa no disco, agenda reload e responde antes da conclusão |
| `/api/sources/:id` | DELETE | remove do disco; não recarrega STATE |
| `/api/config` | GET/POST | consulta/altera opções conhecidas e grava config.json |
| `/api/attrs` | leitura | censo de atributos EXTINF; porcentagem e amostra |
| `/api/reload` | cliente pode usar GET | agenda recarga, responde ok antes de terminar |
| `/api/validate` | forcar=1 opcional | inicia sondagem em massa conforme regras; mutante |
| `/api/log` | POST `{events:[...]}` | imprime, grava JSONL e inclui playbacks no array de relatório |
| `/api/report` | leitura | resumo dos playbacks recebidos desde início do processo |
| `/proxy` | url, ua e ref opcionais; Range repassado | mídia/manifesto reescrito e CORS |
| `/logo` | url; w é ignorado | corpo original da imagem com cache |
| `OPTIONS` | qualquer caminho | CORS GET,POST,OPTIONS; omite DELETE na lista permitida |

Não há endpoints locais para EPG, favoritos, histórico de retomada, remux, transcode, legenda ou `/api/probe`. O probe é interno ao `/api/play`. Não copiar URLs do Nodecast supondo equivalência.

### Item de catálogo retornado pelo HTTP

Campos principais: `id`, `name`, `url`, `headers`, `category`, `categories`, `kind`, `container`, `playable`, `status`, `logo`. Complementos: `rating`, `plot`, `tvgId`, `chno`, `catchup/catchupDays`, `categorySource`, `lang/country/format/network/website/officialName`.

Observações: a URL live/filme pode incorporar credenciais; a URL de logo HTTP já aponta para o PC. Xtream live não define `kind` no provider, mas a rota normaliza para live. Não há atributo universal de sourceId nessa resposta.

### Decisão de reprodução

```json
{
  "id": "x123",
  "name": "Canal de exemplo",
  "direct": "https://example.invalid/live.m3u8",
  "proxied": "http://localhost:8099/proxy?url=...",
  "preferred": "native",
  "fallback": "hlsjs",
  "needsHeaders": false,
  "probe": null,
  "note": null
}
```

É exemplo fictício. `startupMs/maxRetry` são opcionais; `naoTocavel:true` e motores null recusam item. `fallback:null` significa que não existe alternativa anunciada. Modo local pode usar a mesma estrutura com proxied null.

## Serviço Luna

Prefixo `luna://com.iptv.tvapp.service/`. O serviço acrescenta `returnValue:true` nas respostas; falhas retornam `returnValue:false,erro`. `Luna.service` traduz falha para o segundo argumento do callback.

| Método | Entrada | Resultado |
|---|---|---|
| `ping` | vazio | Node/plataforma, RSS/heap, uptime |
| `config` | patch de config | configuração em memória durante a vida do serviço |
| `fetch` | url, maxBytes, timeoutMs, headers, perChannel | status, tipo, bytes, ms, body textual |
| `m3u` | url, offset, limit, timeoutMs | total, categorias, descartados, offset, items |
| `xtream` | url, username, password, acao, categoria, offset, limit, serieId | arrays paginados em items/total/offset, objetos em dados |
| `probeFile` | url, perChannel | ok, status, contentType, ftyp, moovNoInicio ou erro |

`xtream.acao`: auth, categorias, canais, vodCats, vod, serieCats, series, serieInfo. Resposta já normalizada pelo sources.js: **não normalizar novamente usando stream_id/category_id crus**. A correção dessa duplicação aparece explicitamente no Sync atual.

Credenciais trafegam do app ao serviço na mensagem Luna. O método auth não cria sessão persistente reutilizada pelas próximas mensagens. Há cache de algumas ações de listas, não de autenticação nem de sérieInfo.

## Observabilidade e significado das métricas

Registro Log: seq/ts/level/tag/msg/data/session. Eventos incluem boot/device/network/storage/health, category.load, lista.pagina, play/player, metadata, firstframe, playback, stall/retry/startup, sync.concluida e serie.aberta.

`tPlayApi` é o tempo de resolver Catalog.play. `tMeta` mede metadata a partir do início da tentativa; no fallback esse relógio é reiniciado. `tFirstFrame` vem do monitor após ele começar; não inclui necessariamente API/debounce. `stalls/reloads/fallback/audioOnly/error/endedBy` qualificam a sessão. Não somar indiscriminadamente tempos medidos de origens diferentes nem interpretar avanço de currentTime como prova visual de imagem.

Logs têm timestamps UTC e são gravados por data UTC. O resumo em São Paulo converte UTC−3. Valores de nomes/URLs nos logs originais são dados do usuário; relatórios novos exportam contagens e campos selecionados.
