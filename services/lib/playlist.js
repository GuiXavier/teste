/*
 * playlist — download e parse de M3U.
 *
 * Reescrito com as regras do Hypnotix (Linux Mint, GPLv3), que roda em
 * milhoes de maquinas ha anos e ja tropecou em tudo isso:
 *   - EXTINF por regex, nao por split de virgula
 *   - tvg-name tem PRIORIDADE sobre o texto depois da virgula
 *   - extrai TODOS os atributos chave="valor", nao so tres fixos
 *   - descarta canal com "***" no nome (spam do provedor)
 *   - ignora URL duplicada depois de um mesmo EXTINF
 *   - valida que o corpo baixado E uma playlist antes de aceitar
 *   - confere o tamanho contra o content-length e descarta truncado
 *   - grupo catch-all para canal sem categoria
 *   - group-title com ";" vira varias categorias
 */

var https = require("https");
var http = require("http");
var fs = require("fs");
var path = require("path");
var urlmod = require("url");
var config = require("./config");
var crypto = require("crypto");

var SRC = "https://iptv-org.github.io/iptv/countries/br.m3u";
var TTL = 6 * 3600 * 1000;
var CATCH_ALL = "Sem categoria";     /* o xEverythingElse do Hypnotix */

var EXTINF = /^#EXTINF:(-?\d+)\s*(.*?),(.*)$/;
var PARAMS = /(\S+)="(.*?)"/g;
var ADULT = /\b(xxx|adult|porn|erotic|18\+)\b/i;

function fetchText(target, cb, depth, perChannel) {
  depth = depth || 0;
  if (depth > 5) { return cb(new Error("muitos redirecionamentos")); }
  var cfg = config.get();
  var mod = target.indexOf("https:") === 0 ? https : http;
  var opts;
  try { opts = urlmod.parse(target); } catch (e) { return cb(e); }
  opts.headers = config.headers(null, perChannel);
  opts.rejectUnauthorized = false;

  var done = false;
  function fin(e, d) { if (!done) { done = true; cb(e, d); } }

  var req = mod.request(opts, function (r) {
    if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) {
      done = true; r.resume(); req.destroy();
      return fetchText(urlmod.resolve(target, r.headers.location), cb, depth + 1, perChannel);
    }
    if (r.statusCode !== 200) { r.resume(); req.destroy(); return fin(new Error("HTTP " + r.statusCode)); }

    /* Hypnotix confere o total baixado e APAGA se veio truncado.
       Sem isso, meia playlist fica em cache por 6 horas. */
    var esperado = parseInt(r.headers["content-length"] || "0", 10);
    var got = 0, buf = "";
    r.setEncoding("utf8");
    req.setTimeout(cfg.readTimeoutMs, function () { req.destroy(); fin(new Error("timeout de leitura")); });
    r.on("data", function (c) { got += Buffer.byteLength(c, "utf8"); buf += c; });
    r.on("end", function () {
      if (esperado > 0 && got !== esperado) {
        return fin(new Error("download truncado: " + got + " de " + esperado + " bytes"));
      }
      fin(null, buf);
    });
    r.on("aborted", function () { fin(new Error("download interrompido")); });
    r.on("error", function (e) { fin(e); });
  });
  req.setTimeout(cfg.connectTimeoutMs, function () { req.destroy(); fin(new Error("timeout de conexao")); });
  req.on("error", function (e) { fin(e); });
  req.end();
}

/* check_playlist() do Hypnotix: exige as DUAS marcas. Sem isso, uma
   pagina de erro em HTML vira "playlist com 0 canais". */
function isPlaylist(text) {
  return text.indexOf("#EXTM3U") >= 0 && text.indexOf("#EXTINF") >= 0;
}

function parseAttrs(s) {
  var out = {}, m;
  PARAMS.lastIndex = 0;
  while ((m = PARAMS.exec(s)) !== null) { out[m[1].toLowerCase()] = m[2]; }
  return out;
}

function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "canal";
}

function parse(text) {
  var cfg = config.get();
  var lines = text.split("\n");
  var channels = [], seen = {}, pend = null, i, parseErrors = 0;
  var descartados = { semNome: 0, spam: 0, adulto: 0, urlDuplicada: 0 };

  for (i = 0; i < lines.length; i++) {
    var L = lines[i].replace(/\r$/, "").trim();
    if (!L || L.indexOf("#EXTM3U") === 0) { continue; }

    if (L.indexOf("#EXTINF") === 0) {
      if (pend && !pend.used) { parseErrors++; }
      var m = EXTINF.exec(L);
      if (!m) { parseErrors++; pend = null; continue; }
      var attrs = parseAttrs(m[2]);
      var titulo = (m[3] || "").trim();
      /* Hypnotix: tvg-name TEM PRIORIDADE sobre o texto apos a virgula */
      var nome = (attrs["tvg-name"] && attrs["tvg-name"].trim()) || titulo;
      var flagged = /\[Not 24\/7\]|\[Geo-blocked\]/i.test(nome);
      nome = nome.replace(/\s*\[(Not 24\/7|Geo-blocked)\]/gi, "").trim();

      pend = {
        name: nome, logo: attrs["tvg-logo"] || null,
        tvgId: attrs["tvg-id"] || null, tvgChno: attrs["tvg-chno"] || null,
        rawGroup: (attrs["group-title"] || "").trim(),
        /* A playlist manda cabecalhos POR CANAL quando a origem exige.
           Ignorar isso = 403 em canal que funcionaria. O <video> nativo
           NAO consegue mandar Referer, entao esses canais tem que ir
           obrigatoriamente pelo proxy. */
        headers: {
          referer: attrs["http-referrer"] || attrs["http-referer"] || null,
          userAgent: attrs["http-user-agent"] || null
        },
        attrs: attrs, flagged: flagged, used: false
      };
      continue;
    }

    if (L.charAt(0) === "#") { continue; }
    if (!pend) { continue; }
    if (pend.used) { descartados.urlDuplicada++; continue; }
    if (!pend.name) { descartados.semNome++; pend = null; continue; }
    if (pend.name.indexOf("***") >= 0) { descartados.spam++; pend = null; continue; }
    if (cfg.hideAdultContent && (ADULT.test(pend.name) || ADULT.test(pend.rawGroup))) {
      descartados.adulto++; pend = null; continue;
    }

    /* "Animation;Kids;Religious" gerava 3 categorias de 1 canal cada.
       Split resolve: o canal aparece nas tres, com contagem real. */
    var cats;
    if (pend.rawGroup) {
      cats = cfg.splitCategories
        ? pend.rawGroup.split(";").map(function (x) { return x.trim(); }).filter(Boolean)
        : [pend.rawGroup.replace(/;/g, " ").replace(/\s{2,}/g, " ")];
    } else { cats = []; }
    /* o iptv-org usa a STRING "Undefined" como group-title, nao vazio.
       Sem isso, "Undefined" virava a 2a maior categoria da lista. */
    cats = cats.filter(function (k) { return !/^(undefined|uncategorized|n\/a|-)$/i.test(k); });
    if (!cats.length) { cats = [CATCH_ALL]; }

    var id = "m" + crypto.createHash("sha256").update(L).digest("hex");
    if (seen[id]) { descartados.urlDuplicada++; pend.used = true; continue; }
    seen[id] = true;

    channels.push({
      id: id, providerId: "m3u:" + id.slice(1), name: pend.name, url: L,
      logo: pend.logo, tvgId: pend.tvgId, tvgChno: pend.tvgChno,
      category: cats[0], categories: cats,
      /* Guarda o resto do EXTINF. Hoje ignoramos, mas ai esta o
         catchup/timeshift, idioma, pais e numero de canal. Melhor
         carregar junto do que ter que reprocessar a playlist depois. */
      attrs: pend.attrs,
      headers: (pend.headers.referer || pend.headers.userAgent) ? pend.headers : null,
      status: pend.flagged ? "suspect" : "unknown", checkedAt: null
    });
    pend.used = true;   /* mantem para contar URLs extras do mesmo EXTINF */
  }

  var catset = {};
  if (pend && !pend.used) { parseErrors++; }
  channels.forEach(function (c) { c.categories.forEach(function (k) { catset[k] = 1; }); });
  return { channels: channels, categories: Object.keys(catset).sort(), descartados: descartados, parseErrors: parseErrors };
}

exports.parse = parse;
exports.isPlaylist = isPlaylist;
exports.CATCH_ALL = CATCH_ALL;

exports.load = function (dataDir, cb, srcUrl, sourceId, perChannel) {
  var parsed = urlmod.parse(srcUrl || SRC); parsed.hash = null;
  var target = urlmod.format(parsed);
  var identity = crypto.createHash("sha256").update(JSON.stringify([sourceId || "", target, perChannel || null])).digest("hex");
  var cache = path.join(dataDir, "playlist-" + identity + ".json"), old = null;
  function result(entry, stale) {
    var out = parse(entry.text); out.stale = stale;
    out.cache = { identity: identity, fetchedAt: entry.fetchedAt, stale: stale }; return out;
  }
  try {
    var entry = JSON.parse(fs.readFileSync(cache, "utf8"));
    if (entry.identity === identity && isPlaylist(entry.text) && !parse(entry.text).parseErrors && entry.sha256 === crypto.createHash("sha256").update(entry.text).digest("hex")) {
      old = entry;
      if (Date.now() - entry.fetchedAt < TTL) { return cb(null, result(entry, false)); }
    }
  } catch (e) {}
  fetchText(target, function (err, text) {
    if (err || !text) {
      if (old) { return cb(null, result(old, true)); }
      return cb(err || new Error("playlist vazia"));
    }
    if (!isPlaylist(text) || parse(text).parseErrors) {
      return cb(new Error("resposta nao e uma playlist M3U (pagina de erro?)"));
    }
    var fresh = { version: 1, identity: identity, fetchedAt: Date.now(), text: text,
      sha256: crypto.createHash("sha256").update(text).digest("hex") };
    var tmp = cache + "." + crypto.randomBytes(8).toString("hex") + ".tmp";
    try { fs.writeFileSync(tmp, JSON.stringify(fresh), "utf8"); fs.renameSync(tmp, cache); }
    catch (e3) { try { fs.unlinkSync(tmp); } catch (ignore) {} return cb(e3); }
    cb(null, result(fresh, false));
  }, 0, perChannel);
};
