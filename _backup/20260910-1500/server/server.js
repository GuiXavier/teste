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

var PLAYBACKS = [];   /* registros de reproducao recebidos da TV */

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

function reload(cb) {
  var src = sourceStore.active();
  STATE.source = src;
  console.log("[fonte] " + src.name + "  (" + src.type + ")");

  if (src.type === "xtream") { return reloadXtream(src, cb); }

  /* fonte sem VOD: zera para nao mostrar filme de outro provedor */
  STATE.movieCats = []; STATE.moviesByCat = {};
  STATE.seriesCats = []; STATE.seriesByCat = {};
  STATE.provider = null;

  console.log("[playlist] baixando " + src.url + " ...");
  playlist.load(DATA, function (err, data) {
    if (err) { console.log("[playlist] erro:", err.message); if (cb) cb(err); return; }
    STATE.channels = data.channels;
    STATE.categories = data.categories;
    STATE.loadedAt = new Date().toISOString();
    console.log("[playlist] " + data.channels.length + " canais, " +
                data.categories.length + " categorias");
    /* cruza com o banco do iptv-org: categorias de verdade, site,
       rede, idioma e formato. A playlist so tem 5 atributos. */
    enrich.load(DATA, function (eerr, index) {
      if (eerr) { console.log("[enrich] indisponivel:", eerr.message); return; }
      var st = enrich.apply(STATE.channels, index);
      var cats = {};
      STATE.channels.forEach(function (c) {
        (c.categories || [c.category]).forEach(function (k) { cats[k] = 1; });
      });
      STATE.categories = Object.keys(cats).sort();
      console.log("[enrich] " + st.casados + " casados com o banco, " +
                  st.naoEncontrados + " sem registro");
      console.log("[enrich] categoria: " + st.categoriasDoBanco + " do banco, " +
                  st.daPlaylist + " da playlist, " + st.inferidas + " inferidas, " +
                  st.semNenhuma + " em Outros  ->  " + STATE.categories.length + " categorias");
    });

    if (data.descartados) {
      var d = data.descartados;
      var tot = d.semNome + d.spam + d.adulto + d.urlDuplicada;
      if (tot > 0) {
        console.log("[playlist] descartados: " + d.spam + " spam, " + d.adulto +
                    " adulto, " + d.semNome + " sem nome, " + d.urlDuplicada + " url duplicada");
      }
    }
    if (cb) cb(null);
  }, src.url);
}

/* Xtream: autentica, baixa categorias e canais pela API */
function reloadXtream(src, cb) {
  var prov = sources.create(src);
  STATE.provider = prov;
  prov.auth(function (err, info) {
    if (err) { console.log("[xtream] falha na autenticacao:", err.message); if (cb) cb(err); return; }
    STATE.auth = info;
    console.log("[xtream] " + (info.ok ? "autenticado" : "NEGADO") +
                "  status=" + info.status +
                "  conexoes=" + info.activeConnections + "/" + info.maxConnections +
                "  formato=" + info.container +
                (info.expiraEm ? ("  expira=" + info.expiraEm.slice(0, 10)) : ""));
    if (!info.ok) { if (cb) cb(new Error("conta " + (info.status || "negada"))); return; }

    prov.getCategories(function (e2, cats) {
      if (e2) { console.log("[xtream] categorias:", e2.message); }
      prov.getChannels({}, function (e3, chans) {
        if (e3) { console.log("[xtream] canais:", e3.message); if (cb) cb(e3); return; }
        var mapa = {};
        (cats || []).forEach(function (c) { mapa[c.id] = c.name; });
        chans.forEach(function (c) {
          var nome = mapa[c.category] || "Outros";
          c.category = nome; c.categories = [nome]; c.categorySource = "xtream";
        });
        STATE.channels = chans;
        var set = {};
        chans.forEach(function (c) { set[c.category] = 1; });
        STATE.categories = Object.keys(set).sort();
        STATE.loadedAt = new Date().toISOString();
        console.log("[xtream] " + chans.length + " canais ao vivo, " +
                    STATE.categories.length + " categorias");

        /* FILMES e SERIES. Sao secoes separadas na API do Xtream; sem
           estas chamadas o provedor parece so ter TV ao vivo. */
        carregarVod(prov, function () {
          carregarSeries(prov, function () {
            if (cb) cb(null);
          });
        });
      });
    });
  });
}


function nomearCategorias(itens, cats) {
  var mapa = {};
  (cats || []).forEach(function (c) { mapa[c.id] = c.name; });
  itens.forEach(function (x) { x.category = mapa[x.category] || "Outros"; });
  var set = {};
  itens.forEach(function (x) { set[x.category] = 1; });
  return Object.keys(set).sort();
}

function carregarVod(prov, cb) {
  if (typeof prov.getVodCategories !== "function") { return cb(); }
  prov.getVodCategories(function (e1, cats) {
    if (e1 || !cats) {
      console.log("[xtream] filmes indisponiveis" + (e1 ? (": " + e1.message) : ""));
      return cb();
    }
    STATE.movieCats = cats;
    STATE.moviesByCat = {};
    console.log("[xtream] " + cats.length + " categorias de filme (itens sob demanda)");
    cb();
  });
}

function carregarSeries(prov, cb) {
  if (typeof prov.getSeriesCategories !== "function") { return cb(); }
  prov.getSeriesCategories(function (e1, cats) {
    if (e1 || !cats) {
      console.log("[xtream] series indisponiveis" + (e1 ? (": " + e1.message) : ""));
      return cb();
    }
    STATE.seriesCats = cats;
    STATE.seriesByCat = {};
    console.log("[xtream] " + cats.length + " categorias de serie (itens sob demanda)");
    cb();
  });
}

/* Busca uma categoria de filme ou serie e guarda em cache.
   E aqui que o catalogo cresce, um pedaco de cada vez. */
function buscarCategoria(tipo, catId, cb) {
  var cache = (tipo === "vod") ? STATE.moviesByCat : STATE.seriesByCat;
  if (cache[catId]) { return cb(null, cache[catId]); }
  var prov = STATE.provider;
  if (!prov) { return cb(null, []); }

  var metodo = (tipo === "vod") ? "getVod" : "getSeries";
  if (typeof prov[metodo] !== "function") { return cb(null, []); }

  var t0 = Date.now();
  prov[metodo]({ category: catId }, function (err, itens) {
    if (err || !itens) {
      console.log("[xtream] categoria " + catId + " falhou: " + (err ? err.message : "vazia"));
      return cb(null, []);
    }
    var nome = null, lista = (tipo === "vod") ? STATE.movieCats : STATE.seriesCats, i;
    for (i = 0; i < lista.length; i++) {
      if (String(lista[i].id) === String(catId)) { nome = lista[i].name; break; }
    }
    itens.forEach(function (x) { x.category = nome || "Outros"; });
    cache[catId] = itens;
    var ruins = itens.filter(function (x) { return x.playable === false; }).length;
    console.log("[xtream] " + (tipo === "vod" ? "filmes" : "series") + " / " +
                (nome || catId) + ": " + itens.length + " itens em " +
                (Date.now() - t0) + "ms" +
                (ruins ? ("  (" + ruins + " em container que a TV nao toca)") : ""));
    cb(null, itens);
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
      STATE.validating = false;
      console.log("[validador] concluido — " + stats.alive + " vivos, " +
                  stats.dead + " mortos de " + stats.total);
      try {
        fs.writeFileSync(path.join(DATA, "status.json"),
          JSON.stringify(STATE.channels.map(function (c) {
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

function buildReport() {
  var byChannel = {}, byEngine = {}, errors = [];
  PLAYBACKS.forEach(function (p2) {
    var c = byChannel[p2.channel] || (byChannel[p2.channel] = {
      canal: p2.channel, categoria: p2.category, tentativas: 0, ok: 0,
      firstFrames: [], stalls: 0, fallbacks: 0, erros: [] });
    c.tentativas++;
    if (p2.tFirstFrame) { c.ok++; c.firstFrames.push(p2.tFirstFrame); }
    c.stalls += (p2.stalls || 0);
    if (p2.fallback) { c.fallbacks++; }
    if (p2.error) { c.erros.push(p2.error); errors.push({ canal: p2.channel, erro: p2.error }); }

    var eng = p2.engine || "?";
    var b = byEngine[eng] || (byEngine[eng] = { n: 0, ok: 0, firstFrames: [], metas: [], stalls: 0 });
    b.n++;
    if (p2.tFirstFrame) { b.ok++; b.firstFrames.push(p2.tFirstFrame); }
    if (p2.tMeta) { b.metas.push(p2.tMeta); }
    b.stalls += (p2.stalls || 0);
  });

  var canais = Object.keys(byChannel).map(function (k) {
    var c = byChannel[k];
    return { canal: c.canal, categoria: c.categoria, tentativas: c.tentativas,
             tocaram: c.ok, primeiroFrameMediana: median(c.firstFrames),
             travamentos: c.stalls, fallbacks: c.fallbacks,
             ultimoErro: c.erros.length ? c.erros[c.erros.length - 1] : null };
  }).sort(function (a, b2) { return b2.tentativas - a.tentativas; });

  var motores = Object.keys(byEngine).map(function (k) {
    var b = byEngine[k];
    return { motor: k, testes: b.n, tocaram: b.ok,
             metaMediana: median(b.metas), primeiroFrameMediana: median(b.firstFrames),
             travamentos: b.stalls };
  });

  return { sessoes: PLAYBACKS.length, canais: canais, motores: motores,
           erros: errors.slice(-40) };
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
        return { id: c.id, name: c.name,
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
    }).map(function (k) { return { id: k, name: k, count: counts[k] }; });
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
        responder(itens || []);
      });
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
        var a = c.attrs || {}, db = c.db || {};
        return {
          id: c.id, name: c.name, category: c.category,
          kind: c.kind || "live",
          container: c.container || null,
          playable: (c.playable === undefined ? true : c.playable),
          rating: c.rating || null,
          plot: c.plot || null,
          categorySource: c.categorySource || null,
          status: c.status,
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
          logo: c.logo ? (urlBase + "/logo?url=" + encodeURIComponent(c.logo) + "&w=160") : null
        };
      });
      json(res, 200, { total: filtered.length, offset: offset, items: items });
    }
  }

  /* --- decisao de reproducao: url + motor recomendado --- */
  if (p.indexOf("/api/play/") === 0) {
    var id = decodeURIComponent(p.slice("/api/play/".length));
    var ch = null, i;
    var todos = STATE.channels.concat(itensEmCache()).concat(STATE.episodeCache || []);
    for (i = 0; i < todos.length; i++) {
      if (todos[i].id === id) { ch = todos[i]; break; }
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
    var qs = "";
    if (per) {
      if (per.userAgent) { qs += "&ua=" + encodeURIComponent(per.userAgent); }
      if (per.referer) { qs += "&ref=" + encodeURIComponent(per.referer); }
    }
    /* Num provedor Xtream a sonda sai caro: o log de 23:04 mediu
       tPlayApi de ate 3216ms, e cada sondagem gasta uma das 4 conexoes
       da conta. A lista e curada e o formato ja veio do proprio
       allowed_output_formats. Vai direto na decisao padrao. */
    if (STATE.source && STATE.source.type === "xtream") {
      var ext = String(ch.url || "").toLowerCase();
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
    var num = sid.charAt(0) === "s" ? sid.slice(1) : sid;
    return STATE.provider.getSeriesInfo(num, function (err, info) {
      if (err) { return json(res, 502, { error: err.message }); }
      /* guarda os episodios para o /api/play conseguir resolver depois */
      STATE.episodeCache = [];
      info.seasons.forEach(function (t) {
        t.episodes.forEach(function (e) { STATE.episodeCache.push(e); });
      });
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
  if (p.indexOf("/api/sources/") === 0 && p.indexOf("/activate") > 0) {
    var aid = decodeURIComponent(p.slice("/api/sources/".length, p.indexOf("/activate")));
    if (!sourceStore.byId(aid)) {
      return json(res, 404, { error: "fonte nao encontrada: " + aid });
    }
    var at = sourceStore.activate(aid);
    console.log("[fonte] ativada: " + at.name);
    reload(function () { startValidation(); });
    return json(res, 200, { ok: true, active: at.id });
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
  if (p === "/api/reload") { reload(function () {}); return json(res, 200, { ok: true }); }
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
      var evts = pkt.events || [];
      var file = path.join(LOGS, "app-" + new Date().toISOString().slice(0, 10) + ".jsonl");
      var out = "";
      evts.forEach(function (e) {
        out += JSON.stringify(e) + "\n";
        printEvent(e);
        if (e.tag === "playback" && e.data) { PLAYBACKS.push(e.data); }
      });
      try { fs.appendFileSync(file, out, "utf8"); } catch (e2) {}
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
      console.log("[validador] iniciando verificacao em segundo plano...");
      startValidation();
    }
  });
  /* revalida a cada 30 min */
  setInterval(function () { startValidation(); }, 30 * 60 * 1000);
});
