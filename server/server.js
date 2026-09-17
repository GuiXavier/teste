#!/usr/bin/env node
/*
 * IPTV TV — backend
 * ------------------------------------------------------------------
 * Faz o trabalho pesado para a TV nao precisar fazer:
 *   - baixa e parseia a playlist iptv-org (uma vez, em cache)
 *   - valida os streams em segundo plano e marca os mortos
 *   - serve JSON paginado e minusculo
 *   - proxy CORS com reescrita de m3u8 (para o hls.js)
 *   - proxy de logos (a TV nao aguenta 200 PNGs em tamanho original)
 *
 * node server.js          porta padrao 8099
 */

var http = require("http");
var url = require("url");
var path = require("path");
var fs = require("fs");
var os = require("os");

var playlist = require("./lib/playlist");
var validator = require("./lib/validator");
var proxy = require("./lib/proxy");
var config = require("./lib/config");
var enrich = require("./lib/enrich");
var sources = require("./lib/sources");
var sourceStore = require("./lib/sourceStore");
var diag = require("./lib/diag");
var prober = require("./lib/probe");

var PORT = parseInt(process.env.PORT || "8099", 10);
var DATA = path.join(__dirname, "data");
var LOGS = path.join(__dirname, "logs");
if (!fs.existsSync(DATA)) { fs.mkdirSync(DATA, { recursive: true }); }
if (!fs.existsSync(LOGS)) { fs.mkdirSync(LOGS, { recursive: true }); }

var playbackHistory = require("./lib/playbackHistory").create(DATA, {logsDir:LOGS});

var STATE = {
  channels: [],
  categories: [],
  /* Filmes e series NAO sao carregados de uma vez. Um provedor tem
     dezenas de milhares de filmes; get_vod_streams sem category_id
     devolve o catalogo inteiro e a resposta nunca terminava.
     Guardamos so as CATEGORIAS e buscamos cada uma sob demanda. */
  movieCats: [], moviesByCat: {},
  seriesCats: [], seriesByCat: {},
  provider: null,
  loadedAt: null,
  validating: false,
  source: null,
  auth: null
};

function json(res, code, body) {
  var s = JSON.stringify(body);
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(s),
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-cache"
  });
  res.end(s);
}

function localIPs() {
  var out = [], ifs = os.networkInterfaces();
  Object.keys(ifs).forEach(function (n) {
    ifs[n].forEach(function (a) {
      if (a.family === "IPv4" && !a.internal) { out.push({ name: n, ip: a.address }); }
    });
  });
  return out;
}

/* ---------------- carga inicial ---------------- */

var reloadQueue = [], reloadBusy = false;
function sourceHeaders(src) {
  var global = config.get ? config.get() : {}, headers = {};
  if (global.referer) { headers.referer = global.referer; }
  if (global.userAgent && global.userAgent !== "Mozilla/5.0") { headers.userAgent = global.userAgent; }
  return Object.assign(headers, src.headers || {});
}
function newState(src) {
  return { channels: [], categories: [], movieCats: [], moviesByCat: Object.create(null), seriesCats: [], seriesByCat: Object.create(null),
    provider: null, loadedAt: null, validating: false, source: src, auth: null, episodeCache: [],
    generation: require("crypto").randomBytes(16).toString("hex"), stale: false };
}
function reload(cb, candidate, activate) {
  reloadQueue.push({ cb: cb || function () {}, src: candidate, activate: activate });
  pumpReload();
}
function pumpReload() {
  if (reloadBusy || !reloadQueue.length) { return; }
  reloadBusy = true;
  var job = reloadQueue.shift(), src = job.src || sourceStore.active();
  if (src) { src = Object.assign({}, src, { headers: sourceHeaders(src) }); }
  var next = newState(src);
  var finished = false;
  function finish(err) {
    if (finished) { return; } finished = true;
    if (!err) {
      try { if (job.activate) { sourceStore.activate(src.id); } }
      catch (e) { err = e; }
    }
    if (!err) { next.loadedAt = new Date().toISOString(); STATE = next; }
    reloadBusy = false;
    job.cb(err, err ? null : { sourceId: src.id, generation: next.generation });
    pumpReload();
  }
  if (!src) { return finish(new Error("nenhuma fonte configurada")); }
  if (src.type === "xtream") {
    var prov;
    try { prov = sources.create(src); } catch (e) { return finish(e); }
    next.provider = prov;
    return prov.auth(function (err, info) {
      if (err || !info || !info.ok) { return finish(err || new Error("autenticacao negada")); }
      next.auth = info;
      prov.getCategories(function (e2, cats) {
        if (e2 || !validCategories(cats)) { return finish(e2 || new Error("categorias invalidas")); }
        prov.getChannels({}, function (e3, chans) {
          if (e3 || !validItems(chans, "live")) { return finish(e3 || new Error("canais invalidos")); }
          var map = Object.create(null);
          cats.forEach(function (c) { map[c.id] = c.name; });
          chans.forEach(function (c) { c.categoryId = c.category; c.category = map[c.category] || "Outros"; c.categories = [c.category]; });
          next.channels = chans;
          next.categories = Array.from(new Set(chans.map(function (c) { return c.category; }))).sort();
          prov.getVodCategories(function (e4, vc) {
            if (e4 || !validCategories(vc)) { return finish(e4 || new Error("categorias de filmes invalidas")); }
            next.movieCats = vc;
            prov.getSeriesCategories(function (e5, sc) {
              if (e5 || !validCategories(sc)) { return finish(e5 || new Error("categorias de series invalidas")); }
              next.seriesCats = sc; finish(null);
            });
          });
        });
      });
    });
  }
  playlist.load(DATA, function (err, data) {
    if (err || !data || !validItems(data.channels, "live")) { return finish(err || new Error("playlist invalida")); }
    next.channels = data.channels; next.categories = data.categories; next.stale = !!data.stale;
    next.channels.forEach(function (c) { var own = c.headers || {}; c.headers = Object.assign({}, src.headers); Object.keys(own).forEach(function (k) { if (own[k]) { c.headers[k] = own[k]; } }); });
    /* Enriquecer antes da publicacao: a pagina 2 nunca muda de categorias. */
    enrich.load(DATA, function (ee, index) {
      if (!ee) {
        enrich.apply(next.channels, index);
        var set = Object.create(null);
        next.channels.forEach(function (c) { (c.categories || [c.category]).forEach(function (k) { set[k] = 1; }); });
        next.categories = Object.keys(set).sort();
      }
      finish(null);
    });
  }, src.url, src.id, src.headers);
}
function validCategories(cats) {
  var seen = Object.create(null);
  return Array.isArray(cats) && cats.every(function (c) {
    if (!c || c.id === undefined || c.id === null || /^(undefined|null|)$/.test(String(c.id)) || !c.name || seen[c.id]) { return false; }
    seen[c.id] = true; return true;
  });
}
function validItems(items, type) {
  var seen = Object.create(null);
  return Array.isArray(items) && items.every(function (c) {
    if (!c || !c.id || /undefined|null/.test(String(c.id)) || seen[c.id] || (type !== "series" && !/^https?:\/\//.test(c.url || ""))) { return false; }
    seen[c.id] = true; return true;
  });
}
function decodeItemId(id) {
  if (String(id).slice(0, 3) !== "k2:") { return null; }
  try { var a = JSON.parse(id.slice(3)); return Array.isArray(a) && a.length === 3 ? a : null; } catch (e) { return null; }
}
function transportItem(item, state, type) {
  var out = Object.assign({}, item), old = decodeItemId(item.id);
  type = type || (item.kind === "episode" ? "episodes" : item.kind || "live");
  var raw = item.providerId;
  if (raw === undefined || raw === null) {
    raw = old ? old[2] : (type === "series" ? item.seriesId : type === "episodes" ? item.episodeId : item.streamId);
    if (raw === undefined || raw === null) { raw = /^[xvse]\d+$/.test(item.id) ? item.id.slice(1) : type === "live" && item.url ? "m3u:" + require("crypto").createHash("sha256").update(item.url).digest("hex") : item.id; }
  }
  out.providerId = String(raw); out.legacyId = item.legacyId || item.id;
  out.kind = type === "episodes" ? "episode" : type;
  out.id = "k2:" + JSON.stringify([state.source.id, type, String(raw)]);
  out.sourceId = state.source.id; out.generation = state.generation;
  return out;
}

/* Busca uma categoria de filme ou serie e guarda em cache.
   E aqui que o catalogo cresce, um pedaco de cada vez. */
function buscarCategoria(tipo, catId, cb, snapshot) {
  snapshot = snapshot || STATE;
  var cache = (tipo === "vod") ? snapshot.moviesByCat : snapshot.seriesByCat;
  if (cache[catId]) { return cb(null, cache[catId]); }
  var prov = snapshot.provider;
  if (!prov) { return cb(null, []); }

  var metodo = (tipo === "vod") ? "getVod" : "getSeries";
  if (typeof prov[metodo] !== "function") { return cb(null, []); }

  var t0 = Date.now();
  prov[metodo]({ category: catId }, function (err, itens) {
    if (err || !itens) {
      console.log("[xtream] categoria " + catId + " falhou: " + (err ? err.message : "vazia"));
      return cb(err || new Error("categoria sem resposta"));
    }
    if (!validItems(itens, tipo)) { return cb(new Error("itens invalidos")); }
    var nome = null, lista = (tipo === "vod") ? snapshot.movieCats : snapshot.seriesCats, i;
    for (i = 0; i < lista.length; i++) {
      if (String(lista[i].id) === String(catId)) { nome = lista[i].name; break; }
    }
    itens.forEach(function (x) { x.categoryId = String(catId); x.category = nome || "Outros"; });
    /* Requisicoes concorrentes compartilham a primeira colecao publicada. */
    if (!cache[catId]) { cache[catId] = itens; }
    var ruins = itens.filter(function (x) { return x.playable === false; }).length;
    console.log("[xtream] " + (tipo === "vod" ? "filmes" : "series") + " / " +
                (nome || catId) + ": " + itens.length + " itens em " +
                (Date.now() - t0) + "ms" +
                (ruins ? ("  (" + ruins + " em container que a TV nao toca)") : ""));
    cb(null, cache[catId]);
  });
}

/* tudo que ja esta em cache, para o /api/play resolver por id */
function itensEmCache() {
  var out = [], k;
  for (k in STATE.moviesByCat) { if (STATE.moviesByCat.hasOwnProperty(k)) { out = out.concat(STATE.moviesByCat[k]); } }
  for (k in STATE.seriesByCat) { if (STATE.seriesByCat.hasOwnProperty(k)) { out = out.concat(STATE.seriesByCat[k]); } }
  return out;
}

/* escolhe a colecao conforme ?type= */
function colecao(tipo) {
  if (tipo === "vod" || tipo === "series") {
    var cats = (tipo === "vod") ? STATE.movieCats : STATE.seriesCats;
    var cache = (tipo === "vod") ? STATE.moviesByCat : STATE.seriesByCat;
    var itens = [], k;
    for (k in cache) { if (cache.hasOwnProperty(k)) { itens = itens.concat(cache[k]); } }
    return { itens: itens, cats: cats, sobDemanda: true };
  }
  return { itens: STATE.channels, cats: STATE.categories, sobDemanda: false };
}

function startValidation(forcar) {
  var validatingState = STATE;
  if (STATE.validating) { return; }

  /* Varredura em massa faz sentido numa lista PUBLICA (o iptv-org tinha
     27% de canais mortos). Num provedor PAGO nao faz:
       - a lista e curada, quase tudo funciona
       - com max_connections: 4 sobram 3 para validar
       - 10 mil canais / 3 conexoes = perto de uma hora
       - e enquanto isso voce fica sem conexao para assistir
     Para Xtream a validacao e SOB DEMANDA: a sonda do /api/play
     verifica o canal no instante em que voce vai abri-lo. */
  var src = STATE.source || {};
  if (!forcar && src.type === "xtream") {
    console.log("[validador] pulado: fonte Xtream com " + STATE.channels.length +
                " canais. Validacao sob demanda ao abrir cada canal.");
    console.log("[validador] para forcar mesmo assim: GET /api/validate?forcar=1");
    return;
  }
  if (!forcar && STATE.channels.length > 3000) {
    console.log("[validador] pulado: " + STATE.channels.length +
                " canais e demais para varredura. GET /api/validate?forcar=1 para forcar.");
    return;
  }

  STATE.validating = true;
  console.log("[validador] iniciando verificacao em segundo plano...");
  /* Numa conta Xtream com max_connections: 1, abrir 8 conexoes
     simultaneas derruba a sessao do usuario ou o bloqueia. */
  var conc = 8;
  if (STATE.auth && STATE.auth.maxConnections) {
    conc = Math.max(1, Math.min(8, STATE.auth.maxConnections - 1));
    console.log("[validador] limitado a " + conc + " conexoes (conta permite " +
                STATE.auth.maxConnections + ")");
  }
  validator.run(STATE.channels, {
    concurrency: conc,
    timeoutMs: 6000,
    onProgress: function (done, total, alive) {
      if (done % 25 === 0 || done === total) {
        console.log("[validador] " + done + "/" + total + "  vivos: " + alive);
      }
    },
    onDone: function (stats) {
      validatingState.validating = false;
      console.log("[validador] concluido — " + stats.alive + " vivos, " +
                  stats.dead + " mortos de " + stats.total);
      try {
        fs.writeFileSync(path.join(DATA, "status.json"),
          JSON.stringify(validatingState.channels.map(function (c) {
            return { id: c.id, status: c.status, checkedAt: c.checkedAt };
          })), "utf8");
      } catch (e) {}
    }
  });
}

/* ---------------- servidor ---------------- */

function base(req) { return "http://" + (req.headers.host || ("localhost:" + PORT)); }


/* ---------------- telemetria ---------------- */

function pad(s, n) { s = String(s); while (s.length < n) { s += " "; } return s; }

function printEvent(e) {
  var mark = e.level === "error" ? "[ERRO] " : (e.level === "warn" ? "[avis] " : "       ");
  var t = (e.ts || "").slice(11, 19);
  var extra = "";
  if (e.data) {
    try {
      extra = JSON.stringify(e.data);
      if (extra.length > 150) { extra = extra.slice(0, 147) + "..."; }
    } catch (x) { extra = ""; }
  }
  console.log("  " + mark + t + "  " + pad(e.tag, 14) + pad(e.msg, 26) + extra);
}

function median(a) {
  if (!a.length) { return null; }
  var s = a.slice().sort(function (x, y) { return x - y; });
  return Math.round(s[Math.floor(s.length / 2)]);
}

function buildReport() { return playbackHistory.report(); }
function diagnosticFor(item) {
  var out = Object.assign({},item.diagnostic || {}), saved = playbackHistory.diagnostic(item.id);
  ["playback","lastFailure"].forEach(function (key) { if (saved[key] && (!out[key] || saved[key].at > out[key].at)) { out[key] = saved[key]; } });
  return out;
}

var server = http.createServer(function (req, res) {
  var u = url.parse(req.url, true);
  /* Um erro numa rota nao pode matar o backend: em 09/09 uma colisao de
     nome em sources.js derrubou o processo inteiro e a TV ficou sem app. */
  try { return rotear(req, res, u); }
  catch (e) {
    console.log("[erro] " + (u.pathname || "?") + " -> " + e.message);
    try { json(res, 500, { error: e.message }); } catch (x) {}
  }
});

function rotear(req, res, u) {
  var p = u.pathname;
  var requestState = STATE;
  if ((p === "/api/categories" || p === "/api/channels" || p.indexOf("/api/play/") === 0 || p.indexOf("/api/series/") === 0) && !requestState.loadedAt) {
    return json(res, 503, { error: "catalogo ainda nao carregado" });
  }
  if (u.query.sync === "1" || u.query.sourceId) {
    if (!u.query.sourceId) { return json(res, 400, { error: "sourceId obrigatorio para sincronizar" }); }
    if (!requestState.source || requestState.source.id !== u.query.sourceId || !requestState.loadedAt) {
      return json(res, 409, { error: "fonte solicitada nao e o catalogo ativo carregado" });
    }
    if (u.query.generation && u.query.generation !== requestState.generation) {
      return json(res, 409, { error: "geracao do catalogo mudou; reinicie a sincronizacao" });
    }
    if (u.query.sync === "1" && requestState.stale) { return json(res, 503, { error: "cache vencido: sincronizacao destrutiva recusada" }); }
  }
  /* Contrato de sincronizacao separado da listagem visual: sem esconder
     mortos, sem __all__ artificial e com fonte/geracao em cada resposta. */
  if (u.query.sync === "1" && (p === "/api/categories" || p === "/api/channels")) {
    var syncType = u.query.type || "live";
    if (["live", "vod", "series"].indexOf(syncType) < 0) { return json(res, 400, { error: "tipo invalido" }); }
    function syncReply(items, paginate) {
      if (requestState !== STATE) { return json(res, 409, { error: "catalogo mudou durante a consulta" }); }
      var off = paginate ? Number(u.query.offset || 0) : 0;
      var lim = paginate ? Math.min(Number(u.query.limit || 500), 500) : items.length;
      if (!Number.isInteger(off) || off < 0 || !Number.isInteger(lim) || lim < (paginate ? 1 : 0)) { return json(res, 400, { error: "paginacao invalida" }); }
      json(res, 200, { sourceId: requestState.source.id, generation: requestState.generation,
        snapshot: require("crypto").createHash("sha256").update(JSON.stringify(items)).digest("hex"),
        total: items.length, offset: off, items: items.slice(off, off + lim) });
    }
    if (p === "/api/categories") {
      return syncReply(syncType === "live" ? requestState.categories.map(function (c) { return { id: c, name: c }; }) :
        (syncType === "vod" ? requestState.movieCats : requestState.seriesCats), false);
    }
    if (syncType === "live") { return syncReply(requestState.channels, true); }
    var requestedCat = u.query.category;
    var availableCats = syncType === "vod" ? requestState.movieCats : requestState.seriesCats;
    if (!availableCats.some(function (c) { return String(c.id) === requestedCat; })) { return json(res, 404, { error: "categoria inexistente" }); }
    return buscarCategoria(syncType, requestedCat, function (e, items) {
      if (e) { return json(res, 502, { error: e.message }); }
      syncReply(items, true);
    }, requestState);
  }
  if (p === "/api/probe-file" && req.method === "POST") {
    var probeBody = "";
    req.on("data", function (c) { probeBody += c; if (probeBody.length > 100000) { req.destroy(); } });
    req.on("end", function () {
      var data;
      try { data = JSON.parse(probeBody); } catch (e) { return json(res, 400, { error: "JSON invalido" }); }
      if (!data.url) { return json(res, 400, { error: "URL obrigatoria" }); }
      prober.probeFile(data.url, data.perChannel || null, function (e, result) { json(res, e ? 502 : 200, e ? { error: e.message } : result); });
    });
    return;
  }

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
    });
    res.end(); return;
  }

  /* --- proxy de midia (CORS + reescrita de playlist) --- */
  if (p === "/proxy" && u.query.url) {
    /* cabecalhos do canal viajam na propria URL para os segmentos
       reescritos tambem os carregarem */
    var per = null;
    if (u.query.ua || u.query.ref) {
      per = { userAgent: u.query.ua || null, referer: u.query.ref || null };
    }
    return proxy.media(req, res, u.query.url, base(req), 0, per);
  }
  /* --- proxy de logo --- */
  if (p === "/logo" && u.query.url) {
    return proxy.logo(req, res, u.query.url);
  }

  /* --- saude --- */
  if (p === "/api/health") {
    return json(res, 200, {
      ok: true, channels: STATE.channels.length,
      categories: STATE.categories.length,
      loadedAt: STATE.loadedAt, validating: STATE.validating,
      generation: STATE.generation || null,
      movieCategories: STATE.movieCats.length,
      seriesCategories: STATE.seriesCats.length,
      source: STATE.source ? { id: STATE.source.id, name: STATE.source.name,
                               type: STATE.source.type } : null,
      auth: STATE.auth ? { status: STATE.auth.status,
                           maxConnections: STATE.auth.maxConnections,
                           expiraEm: STATE.auth.expiraEm } : null,
      /* num provedor pago nao validamos em massa: "unknown" nao e morto */
      alive: STATE.channels.filter(function (c) { return c.status !== "dead"; }).length
    });
  }

  /* --- categorias --- */
  if (p === "/api/categories") {
    var only = u.query.alive !== "0";
    var tipo = u.query.type || "live";
    var col = colecao(tipo);

    /* vod e series: a lista de categorias vem do provedor; a contagem
       so existe depois que a categoria for aberta */
    if (col.sobDemanda) {
      var cacheC = (tipo === "vod") ? STATE.moviesByCat : STATE.seriesByCat;
      var saida = col.cats.map(function (c) {
        var carregada = cacheC[c.id];
        return { id: c.id, name: c.name, sourceId: requestState.source.id, generation: requestState.generation,
                 count: carregada ? carregada.length : null,
                 carregada: !!carregada };
      });
      return json(res, 200, saida);
    }

    var counts = {};
    col.itens.forEach(function (c) {
      if (only && c.status === "dead") { return; }
      /* um canal pode estar em varias categorias (group-title com ";") */
      var cats = c.categories || [c.category];
      cats.forEach(function (k) { counts[k] = (counts[k] || 0) + 1; });
    });
    /* "Outros" e o balde do que nao tem categoria: sempre por ultimo */
    var list = Object.keys(counts).sort(function (a2, b2) {
      if (a2 === "Outros") { return 1; }
      if (b2 === "Outros") { return -1; }
      return a2 < b2 ? -1 : (a2 > b2 ? 1 : 0);
    }).map(function (k) { return { id: k, name: k, count: counts[k], sourceId: requestState.source.id, generation: requestState.generation }; });
    /* conta a colecao DESTA secao, nao sempre os canais ao vivo */
    list.unshift({ id: "__all__", name: "Todos", count:
      col.itens.filter(function (c) { return !only || c.status !== "dead"; }).length });
    return json(res, 200, list);
  }

  /* --- lista paginada de canais --- */
  if (p === "/api/channels") {
    var cat = u.query.category || "__all__";
    var q = (u.query.q || "").toLowerCase();
    var limit = Math.min(parseInt(u.query.limit || "200", 10), 500);
    var offset = parseInt(u.query.offset || "0", 10);
    var hideDead = u.query.alive !== "0";
    var tipoL = u.query.type || "live";
    var colL = colecao(tipoL);
    var urlBase = base(req);

    /* Filmes e series sao buscados por categoria, no momento em que a
       categoria e aberta. Pedir o catalogo inteiro travava o backend. */
    if (colL.sobDemanda) {
      if (!u.query.category || u.query.category === "__all__") {
        return json(res, 200, { total: 0, offset: 0, items: [],
                                nota: "escolha uma categoria" });
      }
      return buscarCategoria(tipoL, u.query.category, function (e, itens) {
        if (e) { return json(res, 502, { error: e.message }); }
        if (requestState !== STATE) { return json(res, 409, { error: "catalogo mudou durante a consulta" }); }
        responder(itens || []);
      }, requestState);
    }
    return responder(colL.itens);

    function responder(lista) {
      var filtered = lista.filter(function (c) {
        /* "unknown" e o estado normal num provedor pago: nao validamos
           em massa. So esconde o que foi testado e falhou. */
        if (hideDead && c.status === "dead") { return false; }
        if (!colL.sobDemanda && cat !== "__all__") {
          var cats = c.categories || [c.category];
          if (cats.indexOf(cat) < 0) { return false; }
        }
        if (q && c.name.toLowerCase().indexOf(q) < 0) { return false; }
        return true;
      });

      var items = filtered.slice(offset, offset + limit).map(function (c) {
        c = transportItem(c, requestState, tipoL);
        var a = c.attrs || {}, db = c.db || {};
        return {
          id: c.id, providerId: c.providerId, sourceId: c.sourceId, generation: c.generation, name: c.name, category: c.category,
          /* A URL vai junto: sem ela o item sincronizado no IndexedDB
             da TV fica sem o que tocar (modo local, 11/09: todos os
             canais com SRC_NOT_SUPPORTED por direct=""). */
          url: c.url || null,
          headers: c.headers || null,
          categories: c.categories || null,
          kind: c.kind || "live",
          container: c.container || null,
          playable: (c.playable === undefined ? true : c.playable),
          rating: c.rating || null,
          plot: c.plot || null,
          categorySource: c.categorySource || null,
          status: c.status,
          checkedAt: c.checkedAt || null,
          diagnostic: diagnosticFor(c),
          chno: c.tvgChno || null,
          tvgId: c.tvgId || null,
          catchup: c.catchup || a["catchup"] || a["catchup-type"] || null,
          catchupDays: c.catchupDays || a["catchup-days"] || null,
          lang: (db.languages && db.languages[0]) || a["tvg-language"] || null,
          country: db.country || a["tvg-country"] || null,
          format: db.format || null,
          network: db.network || null,
          website: db.website || null,
          officialName: db.officialName || null,
          logoOriginal: c.logoOriginal || c.logo || null,
          logo: c.logo ? (urlBase + "/logo?url=" + encodeURIComponent(c.logo) + "&w=160") : null
        };
      });
      json(res, 200, { sourceId: requestState.source.id, generation: requestState.generation, total: filtered.length, offset: offset, items: items });
    }
  }

  /* --- decisao de reproducao: url + motor recomendado --- */
  if (p.indexOf("/api/play/") === 0) {
    var id = decodeURIComponent(p.slice("/api/play/".length));
    var identity = decodeItemId(id);
    if (!identity || !requestState.source || identity[0] !== requestState.source.id) { return json(res, 409, { error: "item sem identidade valida para a fonte atual; atualize a lista" }); }
    var ch = null, i;
    var todos = STATE.channels.concat(itensEmCache()).concat(STATE.episodeCache || []);
    for (i = 0; i < todos.length; i++) {
      var candidate = transportItem(todos[i], requestState);
      if (candidate.id === id) { ch = candidate; break; }
    }
    if (!ch) { return json(res, 404, { error: "item nao encontrado" }); }
    if (ch.playable === false) {
      return json(res, 200, { id: ch.id, name: ch.name, direct: ch.url,
                              preferred: null, fallback: null,
                              note: "container ." + ch.container + " nao toca nesta TV",
                              naoTocavel: true });
    }

    var b = base(req);
    var per = ch.headers || null;
    var needsHeaders = !!(per && (per.userAgent || per.referer));
    var qs = "";
    if (per) {
      if (per.userAgent) { qs += "&ua=" + encodeURIComponent(per.userAgent); }
      if (per.referer) { qs += "&ref=" + encodeURIComponent(per.referer); }
    }
    if (needsHeaders) {
      var viaProxy = b + "/proxy?url=" + encodeURIComponent(ch.url) + qs;
      var headerHls = /\.m3u8(\?|$)/i.test(ch.url);
      return json(res, 200, { id: ch.id, name: ch.name, direct: ch.url, proxied: viaProxy,
        nativeUrl: headerHls ? null : viaProxy, preferred: headerHls ? "hlsjs" : "native", fallback: null,
        startupMs: 45000, maxRetry: 1, needsHeaders: true, note: "Esta fonte depende do proxy do PC." });
    }
    /* Num provedor Xtream a sonda sai caro: o log de 23:04 mediu
       tPlayApi de ate 3216ms, e cada sondagem gasta uma das 4 conexoes
       da conta. A lista e curada e o formato ja veio do proprio
       allowed_output_formats. Vai direto na decisao padrao. */
    if (STATE.source && STATE.source.type === "xtream") {
      var ext = String(ch.url || "").toLowerCase();
      var ehHls = /\.m3u8(\?|$)/.test(ext);
      var ehArquivo = (ch.kind === "vod" || ch.kind === "episode") && !ehHls;

      /* ARQUIVO (filme/episodio): o hls.js NAO toca mp4/mkv/avi.
         O nodecast-tv ja separava os dois caminhos:
             if (looksLikeHls) playHls() else video.src = url
         Cair para o hls.js num filme e 8 segundos perdidos garantidos —
         foi o que derrubou 7 dos 10 filmes no log de 10/09. */
      if (ehArquivo) {
        return prober.probeFile(ch.url, per, function (e2, f) {
          /* MP4 sem faststart precisa buscar o moov no fim do arquivo
             antes de qualquer coisa. Da o prazo que isso exige. */
          var prazo = 45000;
          var nota = null;
          if (f && f.ok && f.moovNoInicio) { prazo = 25000; }
          if (f && !f.ok) { nota = f.erro || "arquivo nao respondeu"; }
          else if (f && !f.moovNoInicio) { nota = "arquivo sem faststart: abertura lenta"; }

          json(res, 200, {
            id: ch.id, name: ch.name, direct: ch.url,
            proxied: b + "/proxy?url=" + encodeURIComponent(ch.url) + qs,
            preferred: "native",
            fallback: null,            /* hls.js nao toca arquivo */
            startupMs: prazo,          /* o app usa isto no watchdog */
            maxRetry: 1,               /* recomecar o download nao ajuda */
            note: nota, needsHeaders: !!per,
            probe: f || null
          });
        });
      }

      var soNativo = /\.ts(\?|$)/.test(ext);
      return json(res, 200, {
        id: ch.id, name: ch.name, direct: ch.url,
        proxied: b + "/proxy?url=" + encodeURIComponent(ch.url) + qs,
        preferred: "native",
        fallback: soNativo ? null : "hlsjs",
        note: soNativo ? "MPEG-TS cru: so o player nativo" : null,
        needsHeaders: !!per, probe: null
      });
    }

    /* Sonda o manifesto antes de decidir. Ideia do /api/probe do
       nodecast-tv, aqui sem ffmpeg: o CODECS do #EXT-X-STREAM-INF basta. */
    prober.probe(ch.url, function (err, info) {
      var d = info && info.decision ? info.decision : { engine: "native", fallback: "hlsjs" };
      json(res, 200, {
        id: ch.id, name: ch.name,
        direct: ch.url,
        proxied: b + "/proxy?url=" + encodeURIComponent(ch.url) + qs,
        preferred: d.engine,
        fallback: d.fallback,
        note: d.why || null,
        needsHeaders: !!per,
        probe: info ? { container: info.container, master: info.master,
                        variants: info.variants,
                        codecs: info.codecs ? info.codecs.raw : null,
                        resolution: info.resolution,
                        error: info.error || null } : null
      });
    }, per);
    return;
  }






  /* --- temporadas e episodios de uma serie (sob demanda) --- */
  if (p.indexOf("/api/series/") === 0) {
    var sid = decodeURIComponent(p.slice("/api/series/".length));
    if (!STATE.provider || typeof STATE.provider.getSeriesInfo !== "function") {
      return json(res, 400, { error: "fonte atual nao tem series" });
    }
    var seriesIdentity = decodeItemId(sid);
    if (seriesIdentity && (seriesIdentity[0] !== requestState.source.id || seriesIdentity[1] !== "series")) { return json(res, 409, { error: "serie pertence a outra fonte/tipo" }); }
    if (!seriesIdentity && u.query.sync !== "1") { return json(res, 409, { error: "serie sem identidade; atualize a lista" }); }
    var num = seriesIdentity ? seriesIdentity[2] : sid.replace(/^s(?=\d)/, "");
    return requestState.provider.getSeriesInfo(num, function (err, info) {
      if (err) { return json(res, 502, { error: err.message }); }
      if (requestState !== STATE) { return json(res, 409, { error: "catalogo mudou durante a consulta" }); }
      info.sourceId = requestState.source.id; info.generation = requestState.generation;
      info.seasons.forEach(function (t) { t.episodes = t.episodes.map(function (ep) { return transportItem(ep, requestState, "episodes"); }); });
      /* guarda os episodios para o /api/play conseguir resolver depois */
      /* ACUMULA em vez de substituir: abrir outra serie apagava os
         episodios da anterior e o retry dava "item nao encontrado".
         Mapa por id, com teto para nao crescer sem limite. */
      STATE.episodeCache = STATE.episodeCache || [];
      var vistos = {};
      STATE.episodeCache.forEach(function (e) { vistos[e.id] = true; });
      info.seasons.forEach(function (t) {
        t.episodes.forEach(function (e) {
          if (!vistos[e.id]) { STATE.episodeCache.push(e); vistos[e.id] = true; }
        });
      });
      if (STATE.episodeCache.length > 5000) {
        STATE.episodeCache = STATE.episodeCache.slice(-5000);
      }
      json(res, 200, info);
    });
  }

  /* --- diagnostico de conectividade por etapa --- */
  if (p === "/api/diag" && u.query.url) {
    return diag.etapas(u.query.url, function (r) { json(res, 200, r); });
  }

  /* --- fontes (iptv-org, Xtream, M3U) --- */
  if (p === "/api/sources" && req.method === "GET") {
    return json(res, 200, sourceStore.sanitizeList());
  }
  if (p === "/api/sources" && req.method === "POST") {
    var sbody = "";
    req.on("data", function (c) { sbody += c; if (sbody.length > 1e5) { req.destroy(); } });
    req.on("end", function () {
      var d;
      try { d = JSON.parse(sbody); } catch (e) { return json(res, 400, { error: "json" }); }
      if (!d.type || !d.url) { return json(res, 400, { error: "type e url sao obrigatorios" }); }
      var novo = sourceStore.add(d);
      console.log("[fonte] adicionada: " + novo.name + " (" + novo.type + ")");
      json(res, 200, { ok: true, id: novo.id });
    });
    return;
  }
  /* testa credenciais SEM salvar */
  if (p === "/api/sources/test" && req.method === "POST") {
    var tbody = "";
    req.on("data", function (c) { tbody += c; if (tbody.length > 1e5) { req.destroy(); } });
    req.on("end", function () {
      var d;
      try { d = JSON.parse(tbody); } catch (e) { return json(res, 400, { error: "json" }); }
      var prov;
      try { prov = sources.create(d); }
      catch (e) { return json(res, 200, { ok: false, erro: "fonte invalida: " + e.message }); }
      if (!prov || typeof prov.auth !== "function") {
        return json(res, 200, { ok: false, erro: "tipo de fonte sem autenticacao: " + d.type });
      }
      prov.auth(function (err, info) {
        if (err) { return json(res, 200, { ok: false, erro: err.message }); }
        json(res, 200, {
          ok: !!info.ok, status: info.status || null,
          maxConnections: (info.maxConnections === undefined ? null : info.maxConnections),
          /* 0 e falsy: com "|| null" uma conta sem conexao ativa
             reportava null em vez de zero */
          activeConnections: (info.activeConnections === undefined ? null : info.activeConnections),
          expiraEm: info.expiraEm || null, teste: !!info.teste,
          formatos: info.formatos || null, servidor: info.servidor || null
        });
      });
    });
    return;
  }
  /* A TV precisa da senha para o JS Service autenticar sozinho no
     provedor. A listagem esconde senhas; esta rota entrega a de UMA
     fonte, para o app guardar no IndexedDB. E a credencial do proprio
     usuario, na propria rede. */
  if (p.indexOf("/api/sources/") === 0 && p.indexOf("/secret") > 0) {
    var sid2 = decodeURIComponent(p.slice("/api/sources/".length, p.indexOf("/secret")));
    var srcS = sourceStore.byId(sid2);
    if (!srcS) { return json(res, 404, { error: "fonte nao encontrada" }); }
    return json(res, 200, { id: srcS.id, username: srcS.username || null,
                            password: srcS.password || null, url: srcS.url, headers: sourceHeaders(srcS) });
  }
  if (p.indexOf("/api/sources/") === 0 && p.indexOf("/activate") > 0) {
    var aid = decodeURIComponent(p.slice("/api/sources/".length, p.indexOf("/activate")));
    if (!sourceStore.byId(aid)) {
      return json(res, 404, { error: "fonte nao encontrada: " + aid });
    }
    return reload(function (e, identity) {
      if (e) { return json(res, 502, { error: e.message }); }
      json(res, 200, { ok: true, active: identity.sourceId, sourceId: identity.sourceId, generation: identity.generation });
      startValidation();
    }, sourceStore.byId(aid), true);
  }
  if (p.indexOf("/api/sources/") === 0 && req.method === "DELETE") {
    var did = decodeURIComponent(p.slice("/api/sources/".length));
    sourceStore.remove(did);
    return json(res, 200, { ok: true });
  }

  /* --- censo de atributos: o que a fonte manda que ignoramos? --- */
  if (p === "/api/attrs") {
    var conta = {}, exemplos = {}, total = 0;
    STATE.channels.forEach(function (c) {
      total++;
      var a = c.attrs || {}, k;
      for (k in a) {
        if (a.hasOwnProperty(k)) {
          conta[k] = (conta[k] || 0) + 1;
          if (!exemplos[k] && a[k]) { exemplos[k] = String(a[k]).slice(0, 60); }
        }
      }
    });
    var lista = Object.keys(conta).sort(function (x, y) { return conta[y] - conta[x]; })
      .map(function (k) {
        return { atributo: k, canais: conta[k],
                 pct: Math.round(conta[k] / total * 100), exemplo: exemplos[k] || null };
      });
    return json(res, 200, { totalCanais: total, atributos: lista });
  }

  /* --- configuracao de rede (User-Agent, Referer, timeouts) --- */
  if (p === "/api/config" && req.method === "GET") {
    return json(res, 200, config.get());
  }
  if (p === "/api/config" && req.method === "POST") {
    var cbody = "";
    req.on("data", function (c) { cbody += c; if (cbody.length > 1e5) { req.destroy(); } });
    req.on("end", function () {
      var patch;
      try { patch = JSON.parse(cbody); } catch (e) { return json(res, 400, { error: "json" }); }
      var novo = config.set(patch);
      console.log("[config] atualizado:", JSON.stringify(novo));
      json(res, 200, novo);
    });
    return;
  }

  /* --- recarregar / validar sob demanda --- */
  if (p === "/api/reload") { return reload(function (e, identity) { json(res, e ? 502 : 200, e ? { error: e.message } : { ok: true, sourceId: identity.sourceId, generation: identity.generation }); }); }
  if (p === "/api/validate") {
    startValidation(u.query.forcar === "1");
    return json(res, 200, { ok: true, validando: STATE.validating });
  }


  /* --- telemetria vinda da TV --- */
  if (p === "/api/log" && req.method === "POST") {
    var body = "";
    req.on("data", function (c) { body += c; if (body.length > 4e6) { req.destroy(); } });
    req.on("end", function () {
      var pkt;
      try { pkt = JSON.parse(body); } catch (e) { return json(res, 400, { error: "json" }); }
      var evts = pkt.events;
      if (!Array.isArray(evts) || evts.length > 400 || !evts.every(function (e) { return e && typeof e.tag === "string" && typeof e.msg === "string" && typeof e.ts === "string"; })) { return json(res,400,{error:"eventos invalidos"}); }
      try { playbackHistory.append(evts); } catch (error) { return json(res,503,{error:"nao foi possivel persistir historico"}); }
      var file = path.join(LOGS, "app-" + new Date().toISOString().slice(0, 10) + ".jsonl");
      var out = "";
      evts.forEach(function (e) {
        out += JSON.stringify(e) + "\n";
        printEvent(e);
      });
      try { fs.appendFileSync(file, out, "utf8"); } catch (e2) { return json(res,503,{error:"nao foi possivel persistir log"}); }
      json(res, 200, { ok: true, n: evts.length });
    });
    return;
  }

  /* --- resumo do uso real --- */
  if (p === "/api/report") {
    return json(res, 200, buildReport());
  }

  json(res, 404, { error: "rota desconhecida" });
}

/* Ultima linha de defesa. Preferimos um backend que loga e continua
   do que um que morre e deixa a TV sem lista de canais. */
process.on("uncaughtException", function (e) {
  console.log("[EXCECAO NAO TRATADA] " + e.message);
  console.log(String(e.stack || "").split("\n").slice(1, 4).join("\n"));
});
process.on("unhandledRejection", function (r) {
  console.log("[PROMISE REJEITADA] " + r);
});

server.listen(PORT, "0.0.0.0", function () {
  console.log("");
  console.log("=========================================================");
  console.log("  IPTV backend   porta " + PORT);
  console.log("=========================================================");
  localIPs().forEach(function (x) {
    console.log("   http://" + x.ip + ":" + PORT + "   (" + x.name + ")");
  });
  console.log("   logs em: " + LOGS);
  console.log("");
  reload(function (err) {
    if (!err) {
    
      startValidation();
    }
  });
  /* revalida a cada 30 min */
  setInterval(function () { startValidation(); }, 30 * 60 * 1000);
});
