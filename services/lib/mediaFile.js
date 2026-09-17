/* Transporte binario limitado e leitura de atoms MP4. Compartilhado com a TV. */
var http = require("http"), https = require("https"), urlmod = require("url"), zlib = require("zlib");
var config = require("./config");
function fetchBuffer(target, opt, cb, depth, deadline) {
  opt = opt || {}; depth = depth || 0; deadline = deadline || Date.now() + (opt.timeoutMs || 10000);
  if (depth > 5 || Date.now() >= deadline) { return cb(new Error("limite de redirecionamento/tempo")); }
  var u;
  try { u = urlmod.parse(target); } catch (e) { return cb(new Error("URL invalida")); }
  if (!u.hostname || (u.protocol !== "http:" && u.protocol !== "https:")) { return cb(new Error("URL HTTP/HTTPS obrigatoria")); }
  u.headers = config.headers(opt.extraHeaders || null, opt.perChannel || null);
  if (opt.sampleBytes) { u.headers.Range = "bytes=0-" + (opt.sampleBytes - 1); }
  u.rejectUnauthorized = false;
  var done = false, timer, req, chunks = [], size = 0;
  function finish(e, body, res) {
    if (done) { return; } done = true; clearTimeout(timer); cb(e, body, res);
  }
  function stop() { if (req) { try { req.destroy(); } catch (ignore) {} } }
  timer = setTimeout(function () { finish(new Error("timeout total")); stop(); }, Math.max(1, deadline - Date.now()));
  try {
    req = (u.protocol === "https:" ? https : http).request(u, function (res) {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        done = true; clearTimeout(timer); res.resume(); stop();
        return fetchBuffer(urlmod.resolve(target, res.headers.location), opt, cb, depth + 1, deadline);
      }
      if ((res.statusCode !== 200 && res.statusCode !== 206) || (res.statusCode === 206 && !opt.sampleBytes)) {
        finish(new Error("HTTP " + res.statusCode)); res.resume(); stop(); return;
      }
      if (res.statusCode === 206 && opt.sampleBytes && !/^bytes 0-\d+\/(\d+|\*)$/i.test(res.headers["content-range"] || "")) {
        finish(new Error("Content-Range invalido para inicio do arquivo")); res.resume(); stop(); return;
      }
      var stream = res, encoding = (res.headers["content-encoding"] || "").toLowerCase();
      if (encoding === "gzip") { stream = res.pipe(zlib.createGunzip()); }
      else if (encoding === "deflate") { stream = res.pipe(zlib.createInflate()); }
      stream.on("data", function (chunk) {
        if (done) { return; }
        if (!Buffer.isBuffer(chunk)) { chunk = Buffer.from(chunk); }
        var limit = opt.sampleBytes || opt.maxBytes || 40 * 1024 * 1024;
        if (!opt.sampleBytes && size + chunk.length > limit) { finish(new Error("resposta excedeu limite de bytes")); stop(); return; }
        var take = Math.min(chunk.length, limit - size);
        /* Copia somente a amostra, sem reter um chunk gigante do servidor. */
        chunks.push(Buffer.from(chunk.slice(0, take))); size += take;
        if (opt.sampleBytes && size === limit) { finish(null, Buffer.concat(chunks, size), res); stop(); }
      });
      stream.on("end", function () { finish(null, Buffer.concat(chunks, size), res); });
      stream.on("error", function (e) { finish(e); stop(); });
      res.on("aborted", function () { finish(new Error("resposta interrompida")); });
      res.on("error", function (e) { finish(e); });
    });
    req.on("error", function (e) { finish(new Error(e.code || e.message)); });
    req.end();
  } catch (e) { finish(e); stop(); }
}
function inspect(buffer, response) {
  var out = { tipo: "arquivo", ok: true, status: response.statusCode, contentType: response.headers["content-type"] || null,
    bytes: buffer.length, ftyp: false, moovNoInicio: null, format: "unknown", sampled: true };
  if (response.statusCode !== 200 && response.statusCode !== 206) { out.ok = false; out.erro = "HTTP " + response.statusCode; return out; }
  if (/text\/html|application\/json/i.test(out.contentType || "")) { out.ok = false; out.erro = "resposta de texto em vez de video"; return out; }
  out.aceitaRange = response.statusCode === 206;
  out.tamanho = response.headers["content-range"] || response.headers["content-length"] || null;
  var offset = 0, moov = false, mdat = false;
  while (offset + 8 <= buffer.length) {
    var length = buffer.readUInt32BE(offset), type = buffer.toString("ascii", offset + 4, offset + 8), header = 8;
    if (length === 1) {
      if (offset + 16 > buffer.length) { break; }
      length = buffer.readUInt32BE(offset + 8) * 4294967296 + buffer.readUInt32BE(offset + 12); header = 16;
      if (length > 9007199254740991) { out.atomError = "tamanho fora do limite numerico"; break; }
    }
    if (length !== 0 && length < header) { out.atomError = "atom menor que cabecalho"; break; }
    if (type === "ftyp") { out.ftyp = true; out.format = "mp4"; }
    if (type === "moov") { if (!mdat) { moov = true; } break; }
    if (type === "mdat") { mdat = true; break; }
    if (!length || offset + length > buffer.length) { break; }
    offset += length;
  }
  if (out.ftyp && !out.atomError) { out.moovNoInicio = moov ? true : (mdat ? false : null); }
  return out;
}
function probeFile(target, perChannel, cb) {
  fetchBuffer(target, { sampleBytes: 65536, timeoutMs: 10000, perChannel: perChannel }, function (e, body, res) {
    cb(null, e ? { ok: false, erro: e.message, moovNoInicio: null } : inspect(body, res));
  });
}
exports.fetchBuffer = fetchBuffer;
exports.inspect = inspect;
exports.probeFile = probeFile;
