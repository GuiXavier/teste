/*
 * service.js — backend EMBUTIDO, roda no Node.js da propria TV.
 *
 * Regras da plataforma (pesquisadas na documentacao da LG):
 *   - webOS 6.x roda Node.js v8.12.0: nada de ?. ?? replaceAll,
 *     fs.mkdirSync({recursive}) ou modulos com addon C/C++
 *   - NAO pode abrir servidor HTTP/TCP ("webOS TV cannot be used as
 *     a server") — so responde pelo barramento Luna
 *   - morre apos ~5s ocioso; idleTimeout estende. Fica vivo enquanto
 *     houver mensagem sem resposta, entao fetch longo esta seguro
 *   - PODE fazer requisicao HTTP/HTTPS de SAIDA sem CORS: e isto que
 *     resolve o player_api.php e o M3U de dentro da TV
 *
 * O que ele NAO faz, de proposito: proxy de video. O stream vai do
 * provedor para o <video> nativo sem passar por aqui. O servico so
 * lida com METADADOS: listas, categorias, temporadas, sonda de arquivo.
 */
var Service = require("webos-service");
var http = require("http");
var https = require("https");
var urlmod = require("url");
var zlib = require("zlib");
var crypto = require("crypto");
var config = require("./lib/config");
var sources = require("./lib/sources");
var playlist = require("./lib/playlist");

var service = new Service("com.iptv.tvapp.service");
/* segundos ociosos antes de encerrar; a LG recomenda nao ficar vivo a toa */
service.activityManager.idleTimeout = 60;

var MAX_BYTES = 40 * 1024 * 1024;
var TEMPO_MAX = 60000;

/* -------------------------------------------------------------- cache
 * O app pagina 400 por vez. Sem cache, CADA pagina refaz a chamada
 * inteira no Xtream — get_live_streams nao tem offset. Para 3333
 * canais isso sao ~9 round-trips de 3s cada = 27s por sync.
 *
 * Com cache de 5 min, a primeira pagina paga o custo e as 8 seguintes
 * saem do processo local. O servico morre apos 60s ocioso (idleTimeout),
 * entao a memoria e liberada sozinha quando o app nao esta sincronizando.
 */
var CACHE = {};
/* 10 min: uma colecao inteira de filmes pode render varias paginas, e
   perder o cache no meio obrigaria a rebaixar tudo do provedor. */
var CACHE_TTL = 10 * 60 * 1000;
function chaveCache(p) {
  return crypto.createHash("sha256").update(JSON.stringify([p.url, p.username, p.password, p.headers || null, p.container || null, p.acao, p.categoria || "all"])).digest("hex");
}
function comCache(p, carregar, cb) {
  var k = chaveCache(p);
  var hit = CACHE[k];
  if (hit && (Date.now() - hit.at) < CACHE_TTL) {
    return cb(null, hit.data, hit.snapshot);
  }
  carregar(function (e, dados) {
    if (!e && dados) {
      /* poda FIFO quando o cache cresce: 12 entradas x ~3000 itens
         ja da mais que o heap confortavel do Node 8 da TV */
      var chaves = Object.keys(CACHE);
      if (chaves.length >= 12) { delete CACHE[chaves[0]]; }
      CACHE[k] = { at: Date.now(), data: dados, snapshot: crypto.createHash("sha256").update(JSON.stringify(dados)).digest("hex") };
    }
    cb(e, dados, !e && CACHE[k] ? CACHE[k].snapshot : null);
  });
}

/* ---------------------------------------------------------------- util */
function ok(msg, obj) { obj = obj || {}; obj.returnValue = true; msg.respond(obj); }
function falha(msg, erro, extra) {
  var o = extra || {};
  o.returnValue = false;
  o.erro = (erro && erro.message) ? erro.message : String(erro);
  msg.respond(o);
}

/* GET com redirecionamento, descompressao, teto de bytes e de tempo TOTAL */
var mediaFile = require("./lib/mediaFile");
function fetchText(target, opt, cb) {
  mediaFile.fetchBuffer(target, opt, function (e, buffer, response) {
    cb(e, buffer ? buffer.toString("utf8") : null, response);
  });
}

/* ------------------------------------------------------------ metodos */

/* diagnostico: prova que o servico subiu e diz o que tem */
service.register("ping", function (msg) {
  var m = process.memoryUsage();
  ok(msg, {
    node: process.version,
    plataforma: process.platform + "/" + process.arch,
    rssMB: Math.round(m.rss / 1048576),
    heapMB: Math.round(m.heapUsed / 1048576),
    uptimeS: Math.round(process.uptime())
  });
});

/* configura UA/Referer para as proximas chamadas desta vida do servico */
service.register("config", function (msg) {
  ok(msg, { config: config.set(msg.payload || {}) });
});

/* GET generico: o app usa para o que nao tem metodo proprio */
service.register("fetch", function (msg) {
  var p = msg.payload || {};
  if (!p.url) { return falha(msg, "url obrigatoria"); }
  var t0 = Date.now();
  fetchText(p.url, { maxBytes: p.maxBytes, timeoutMs: p.timeoutMs,
                     extraHeaders: p.headers, perChannel: p.perChannel },
    function (err, body, r) {
      if (err) { return falha(msg, err); }
      ok(msg, { status: r.statusCode, tipo: r.headers["content-type"] || null,
                bytes: Buffer.byteLength(body, "utf8"), ms: Date.now() - t0,
                body: body });
    });
});

/* baixa e PARSEIA uma playlist M3U; devolve por pagina */
service.register("m3u", function (msg) {
  var p = msg.payload || {};
  if (!p.url) { return falha(msg, "url obrigatoria"); }
  var t0 = Date.now();
  var cacheParams = { url: p.url, acao: "m3u", headers: p.headers };
  comCache(cacheParams, function (next) {
    fetchText(p.url, { timeoutMs: p.timeoutMs || 60000, perChannel: p.headers }, function (err, body, response) {
      if (err || !response || response.statusCode !== 200) { return next(err || new Error("HTTP M3U invalido")); }
      if (!playlist.isPlaylist(body)) { return next(new Error("resposta nao e uma playlist M3U")); }
      var parsed = playlist.parse(body);
      if (parsed.parseErrors) { return next(new Error("playlist incompleta ou malformada")); }
      parsed.channels.forEach(function (item) { var own = item.headers || {}; item.headers = Object.assign({}, p.headers || {}); Object.keys(own).forEach(function (k) { if (own[k]) { item.headers[k] = own[k]; } }); });
      next(null, parsed);
    });
  }, function (err, r, snapshot) {
    if (err) { return falha(msg, err); }
    var off = p.offset || 0, lim = p.limit || 500;
    ok(msg, { sourceId: p.sourceId, snapshot: snapshot, total: r.channels.length, categorias: r.categories,
              descartados: r.descartados, ms: Date.now() - t0,
              offset: off, items: r.channels.slice(off, off + lim) });
  });
});

/* Xtream: uma porta para todas as chamadas do provedor */
var PROVIDERS = Object.create(null);
function providerFor(p, cb) {
  var key = chaveCache({ url: p.url, username: p.username, password: p.password, headers: p.headers });
  var entry = PROVIDERS[key];
  if (entry && entry.waiters) { entry.waiters.push(cb); return; }
  if (entry && Date.now() - entry.at < CACHE_TTL && p.acao !== "auth") { return cb(null, entry.provider, entry.info); }
  var keys = Object.keys(PROVIDERS);
  if (keys.length >= 12) { keys.some(function (k) { if (!PROVIDERS[k].waiters) { delete PROVIDERS[k]; return true; } return false; }); }
  var prov = sources.create({ type: "xtream", url: p.url, username: p.username, password: p.password, headers: p.headers, container: p.container });
  entry = PROVIDERS[key] = { provider: prov, waiters: [cb], at: 0 };
  prov.auth(function (e, info) {
    if (!e && (!info || !info.ok)) { e = new Error("autenticacao recusada"); }
    var callbacks = entry.waiters; entry.waiters = null;
    if (e) { delete PROVIDERS[key]; }
    else { entry.info = info; entry.at = Date.now(); }
    callbacks.forEach(function (fn) { fn(e, prov, info); });
  });
}
service.register("xtream", function (msg) {
  var p = msg.payload || {};
  if (!p.url || !p.username) { return falha(msg, "url e username obrigatorios"); }
  var t0 = Date.now();

  function devolve(err, dados, snapshot) {
    if (err) { return falha(msg, err); }
    var out = { ms: Date.now() - t0, sourceId: p.sourceId, container: p.container, snapshot: snapshot || null };
    if (Array.isArray(dados)) {
      var off = p.offset || 0, lim = p.limit || 400;
      out.total = dados.length;
      out.offset = off;
      out.items = dados.slice(off, off + lim);
    } else { out.dados = dados; }
    ok(msg, out);
  }
  function cacheado(fn) { comCache(p, fn, devolve); }

  providerFor(p, function (e, prov, auth) {
  if (e) { return falha(msg, e); }
  p.container = prov.container;
  switch (p.acao) {
    case "auth":       return devolve(null, auth);
    case "categorias": return cacheado(function (cb) { prov.getCategories(cb); });
    case "canais":     return cacheado(function (cb) { prov.getChannels({ category: p.categoria }, cb); });
    case "vodCats":    return cacheado(function (cb) { prov.getVodCategories(cb); });
    case "vod":        return cacheado(function (cb) { prov.getVod({ category: p.categoria }, cb); });
    case "serieCats":  return cacheado(function (cb) { prov.getSeriesCategories(cb); });
    case "series":     return cacheado(function (cb) { prov.getSeries({ category: p.categoria }, cb); });
    case "serieInfo":  return prov.getSeriesInfo(p.serieId, devolve);
    default:           return falha(msg, "acao desconhecida: " + p.acao);
  }
  });
});

/* sonda de ARQUIVO (filme/episodio): moov no inicio ou no fim? */
service.register("probeFile", function (msg) {
  var p = msg.payload || {};
  if (!p.url) { return falha(msg, "url obrigatoria"); }
  mediaFile.probeFile(p.url, p.perChannel, function (e, result) { ok(msg, result); });
});
