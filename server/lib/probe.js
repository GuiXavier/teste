/*
 * probe — inspeciona o stream ANTES de tocar.
 *
 * Ideia emprestada do /api/probe do nodecast-tv, que usa ffprobe.
 * Aqui nao dependemos de ffmpeg: o proprio manifesto HLS ja declara
 * os codecs no atributo CODECS do #EXT-X-STREAM-INF. Para o que
 * precisamos decidir (qual motor usar) isso basta e custa um GET.
 *
 * Decide entre:
 *   native  - <video> da LG. Media: 1500ms ate a imagem, 5/5 confiavel.
 *             Unico que toca .ts cru e arquivo empacotado.
 *   hlsjs   - via proxy. 2001ms, mas com telemetria e recuperacao propria.
 */

var http = require("http");
var https = require("https");
var urlmod = require("url");
var config = require("./config");

var CACHE = {};
var TTL = 10 * 60 * 1000;

var mediaFile = require("./mediaFile");
function fetchHead(target, bytes, timeoutMs, cb, depth, perChannel) {
  mediaFile.fetchBuffer(target, { sampleBytes: bytes, timeoutMs: timeoutMs, perChannel: perChannel },
    function (e, buffer, response) { cb(e, buffer ? buffer.toString("utf8") : null, response); });
}

/* CODECS="avc1.4d401f,mp4a.40.2" -> {video:"avc1", audio:"mp4a"} */
function parseCodecs(text) {
  var out = { video: null, audio: null, raw: null };
  var m = /CODECS="([^"]+)"/i.exec(text);
  if (!m) { return out; }
  out.raw = m[1];
  var parts = m[1].split(",");
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i].trim().toLowerCase();
    if (p.indexOf("avc1") === 0 || p.indexOf("hvc1") === 0 || p.indexOf("hev1") === 0 ||
        p.indexOf("vp9") === 0 || p.indexOf("vp09") === 0 || p.indexOf("av01") === 0) {
      out.video = p.split(".")[0];
    } else if (p.indexOf("mp4a") === 0 || p.indexOf("ac-3") === 0 ||
               p.indexOf("ec-3") === 0 || p.indexOf("opus") === 0) {
      out.audio = p.split(".")[0];
    }
  }
  return out;
}

function parseResolution(text) {
  var m = /RESOLUTION=(\d+)x(\d+)/i.exec(text);
  return m ? { w: parseInt(m[1], 10), h: parseInt(m[2], 10) } : null;
}

/* Tudo o que medimos que a 43UP7500PSF decodifica em tempo real */
var TV_OK_VIDEO = { avc1: 1, hvc1: 1, hev1: 1, vp9: 1, vp09: 1, av01: 1 };

function decide(info, perChannel) {
  /* http-referrer / http-user-agent no M3U sao DICA, nao exigencia.
     Medido: o AWTV declara http-referrer e mesmo assim tocou no nativo
     em 1751ms e 2001ms. Forcar o proxy custou 3544ms — quase o dobro.
     Entao: continua nativo primeiro; se falhar ou travar, o fallback
     vai pelo proxy JA COM os cabecalhos na URL. */
  if (perChannel && (perChannel.referer || perChannel.userAgent)) {
    if (info.container === "ts") {
      return { engine: "native", fallback: null,
               why: "MPEG-TS cru: so o player nativo (sem cabecalhos custom)" };
    }
    return { engine: "native", fallback: "hlsjs",
             why: "declara cabecalhos proprios: fallback vai pelo proxy com eles" };
  }
  /* .ts cru: o hls.js nao toca sem playlist. Nativo obrigatorio. */
  if (info.container === "ts") {
    return { engine: "native", fallback: null, why: "MPEG-TS cru: so o player nativo" };
  }
  /* codec que a TV nao decodifica -> o MSE do Chromium pode dar conta */
  if (info.codecs && info.codecs.video && !TV_OK_VIDEO[info.codecs.video]) {
    return { engine: "hlsjs", fallback: "native",
             why: "codec " + info.codecs.video + " incerto no decoder da TV" };
  }
  /* Medido: nativo chega a imagem ~500ms antes e foi 5/5 confiavel */
  return { engine: "native", fallback: "hlsjs", why: null };
}


/* ------------------------------------------------------------------
 * probeFile — sonda de ARQUIVO (filme, episodio), nao de stream.
 *
 * Um MP4 progressivo so comeca a tocar quando o player acha o atomo
 * "moov" (o indice). Se o arquivo foi gerado sem faststart, o moov
 * fica no FIM: o player baixa o comeco, nao acha, faz um Range no
 * final, acha, e so entao volta ao inicio. Num filme 4K isso passa
 * facil de 8 segundos com readyState preso em 0 — que foi exatamente
 * o padrao do log de 10/09 (filmes 30% de sucesso, ao vivo 100%).
 *
 * Aqui lemos os primeiros 64 KB e vemos quem vem primeiro: moov ou
 * mdat. Com isso da para dar ao player o prazo que ele realmente
 * precisa, em vez de matar o filme antes da hora.
 * ------------------------------------------------------------------ */
exports.probeFile = mediaFile.probeFile;

exports.probe = function (target, cb, perChannel) {
  var hit = CACHE[target];
  if (hit && (Date.now() - hit.at) < TTL) { return cb(null, hit.data); }

  var isM3u8 = /\.m3u8(\?|$)/i.test(target);
  if (!isM3u8) {
    var container = /\.ts(\?|$)/i.test(target) ? "ts" : "unknown";
    var d0 = { container: container, codecs: null, resolution: null, variants: 0 };
    d0.decision = decide(d0, perChannel);
    CACHE[target] = { at: Date.now(), data: d0 };
    return cb(null, d0);
  }

  fetchHead(target, 4096, 6000, function (err, body) {
    var d = { container: "hls", codecs: null, resolution: null, variants: 0, master: false };
    if (err) {
      d.error = err.message;
      d.decision = decide(d, perChannel);
      return cb(null, d);   /* nao bloqueia a reproducao por falha de sonda */
    }
    d.master = body.indexOf("#EXT-X-STREAM-INF") >= 0;
    if (d.master) {
      d.variants = (body.match(/#EXT-X-STREAM-INF/g) || []).length;
      d.codecs = parseCodecs(body);
      d.resolution = parseResolution(body);
    }
    /* segmentos .ts dentro da playlist sao normais; o nativo aguenta */
    d.decision = decide(d, perChannel);
    CACHE[target] = { at: Date.now(), data: d };
    cb(null, d);
  }, 0, perChannel);
};
