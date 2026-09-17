/* Proxy CORS com reescrita de m3u8 + proxy de logos.
   Sem reescrita, o hls.js busca o manifesto pelo proxy mas os segmentos
   direto na origem -> CORS de novo. */
var http = require("http");
var https = require("https");
var zlib = require("zlib");
var urlmod = require("url");
var config = require("./config");

function cors(res, extra) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  if (extra) { Object.keys(extra).forEach(function (k) { res.setHeader(k, extra[k]); }); }
}

function wrap(baseUrl, target, perChannel) {
  var u = baseUrl + "/proxy?url=" + encodeURIComponent(target);
  /* propaga os cabecalhos do canal para os segmentos tambem, senao
     o manifesto passa e os .ts levam 403 */
  if (perChannel) {
    if (perChannel.userAgent) { u += "&ua=" + encodeURIComponent(perChannel.userAgent); }
    if (perChannel.referer) { u += "&ref=" + encodeURIComponent(perChannel.referer); }
  }
  return u;
}

function rewriteM3U8(body, origin, baseUrl, perChannel) {
  return body.split("\n").map(function (line) {
    var t = line.replace(/\r$/, "");
    if (/^#EXT-X-(KEY|MAP|MEDIA|I-FRAME-STREAM-INF|SESSION-KEY)/.test(t)) {
      return t.replace(/URI="([^"]+)"/g, function (m, u) {
        return 'URI="' + wrap(baseUrl, urlmod.resolve(origin, u), perChannel) + '"';
      });
    }
    if (!t || t.charAt(0) === "#") { return t; }
    return wrap(baseUrl, urlmod.resolve(origin, t), perChannel);
  }).join("\n");
}

function media(req, res, target, baseUrl, depth, perChannel) {
  depth = depth || 0;
  if (depth > 5) { cors(res); res.writeHead(508); return res.end("loop"); }
  var mod = target.indexOf("https:") === 0 ? https : http;
  var opts;
  try { opts = urlmod.parse(target); } catch (e) { cors(res); res.writeHead(400); return res.end("url"); }
  /* User-Agent e Referer configuraveis: muitos provedores bloqueiam por
     UA ou exigem Referer. O Hypnotix expoe os dois como preferencia. */
  opts.headers = config.headers(null, perChannel);
  if (req.headers.range) { opts.headers.Range = req.headers.range; }
  opts.rejectUnauthorized = false;
  opts.timeout = 15000;

  var up = mod.request(opts, function (r) {
    if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) {
      r.resume();
      return media(req, res, urlmod.resolve(target, r.headers.location), baseUrl, depth + 1, perChannel);
    }
    var ct = (r.headers["content-type"] || "").toLowerCase();
    var isPl = ct.indexOf("mpegurl") >= 0 || ct.indexOf("m3u") >= 0 || /\.m3u8?(\?|$)/i.test(target);
    var enc = (r.headers["content-encoding"] || "").toLowerCase();
    var stream = r;
    if (enc === "gzip") { stream = r.pipe(zlib.createGunzip()); }
    else if (enc === "deflate") { stream = r.pipe(zlib.createInflate()); }
    else if (enc === "br" && zlib.createBrotliDecompress) { stream = r.pipe(zlib.createBrotliDecompress()); }

    if (isPl) {
      var buf = ""; stream.setEncoding("utf8");
      stream.on("data", function (c) { buf += c; });
      stream.on("end", function () {
        cors(res, { "Content-Type": "application/vnd.apple.mpegurl", "Cache-Control": "no-cache" });
        res.writeHead(r.statusCode);
        res.end(rewriteM3U8(buf, target, baseUrl, perChannel));
      });
      stream.on("error", function () { try { cors(res); res.writeHead(502); res.end(); } catch (e) {} });
    } else {
      cors(res, { "Content-Type": r.headers["content-type"] || "application/octet-stream" });
      if (!enc && r.headers["content-length"]) { res.setHeader("Content-Length", r.headers["content-length"]); }
      if (!enc && r.headers["content-range"]) { res.setHeader("Content-Range", r.headers["content-range"]); }
      if (r.headers["accept-ranges"]) { res.setHeader("Accept-Ranges", r.headers["accept-ranges"]); }
      res.writeHead(r.statusCode);
      stream.pipe(res);
    }
  });
  up.on("timeout", function () { up.destroy(); });
  res.once("close", function () { up.destroy(); });
  up.on("error", function (e) { try { cors(res); res.writeHead(502); res.end(e.message); } catch (x) {} });
  up.end();
}

/* Logos: repassa com CORS e cache longo.
   TODO: redimensionar de verdade (sharp) — por ora so cacheia.
   A TV tem dpr 2, entao peca 2x o tamanho do slot. */
var logoCache = {};
function logo(req, res, target) {
  var hit = logoCache[target];
  if (hit && (Date.now() - hit.at) < 24 * 3600 * 1000) {
    cors(res, { "Content-Type": hit.ct, "Cache-Control": "public, max-age=86400" });
    res.writeHead(200); return res.end(hit.body);
  }
  var mod = target.indexOf("https:") === 0 ? https : http;
  var opts;
  try { opts = urlmod.parse(target); } catch (e) { cors(res); res.writeHead(400); return res.end(); }
  opts.headers = config.headers();
  opts.rejectUnauthorized = false;
  opts.timeout = 8000;
  var up = mod.request(opts, function (r) {
    if (r.statusCode !== 200) { r.resume(); cors(res); res.writeHead(404); return res.end(); }
    var chunks = [];
    r.on("data", function (c) { chunks.push(c); });
    r.on("end", function () {
      var body = Buffer.concat(chunks);
      var ct = r.headers["content-type"] || "image/png";
      if (Object.keys(logoCache).length < 800) { logoCache[target] = { body: body, ct: ct, at: Date.now() }; }
      cors(res, { "Content-Type": ct, "Cache-Control": "public, max-age=86400" });
      res.writeHead(200); res.end(body);
    });
  });
  up.on("timeout", function () { up.destroy(); });
  up.on("error", function () { try { cors(res); res.writeHead(404); res.end(); } catch (e) {} });
  up.end();
}

exports.media = media;
exports.logo = logo;
exports.rewriteM3U8 = rewriteM3U8;
