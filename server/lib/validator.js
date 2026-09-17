/* Verifica quais streams estao vivos. Baixa so o inicio do manifesto/segmento. */
var mediaFile = require("./mediaFile");
function probe(target, timeoutMs, cb, depth, perChannel) {
  mediaFile.fetchBuffer(target, {sampleBytes:2048,timeoutMs:timeoutMs,perChannel:perChannel}, function (err, body, res) {
    if (err) { return cb(false,err.message); }
    var text = body.toString("utf8"), type = res.headers["content-type"] || "";
    if (/text\/html|application\/json/i.test(type)) { return cb(false,"resposta nao e midia"); }
    if (/\.m3u8(\?|$)/i.test(target)) { var valid = text.indexOf("#EXTM3U") >= 0; return cb(valid,valid ? "manifesto acessivel" : "nao-e-m3u8"); }
    cb(body.length > 0,body.length > 0 ? "bytes acessiveis" : "vazio");
  });
}

exports.probe = probe;

/* Uma rodada deu 54 vivos de 393 e outra, 30min depois, 275.
   Falha de rede momentanea nao pode condenar um canal: damos
   uma segunda chance com prazo maior antes de marcar como morto. */
function probeTwice(target, tmo, cb, perChannel) {
  probe(target, tmo, function (ok, why) {
    if (ok) { return cb(true, why, 1); }
    if (why === "HTTP 404" || why === "HTTP 410" || why === "url-invalida") {
      return cb(false, why, 1);          /* nao adianta insistir */
    }
    setTimeout(function () {
      probe(target, tmo * 2, function (ok2, why2) { cb(ok2, why2, 2); }, 0, perChannel);
    }, 400);
  }, 0, perChannel);
}

exports.run = function (channels, opt) {
  opt = opt || {};
  var conc = opt.concurrency || 8, tmo = opt.timeoutMs || 6000;
  var i = 0, done = 0, alive = 0, active = 0;
  var total = channels.length;
  if (!total) { if (opt.onDone) opt.onDone({ total: 0, alive: 0, dead: 0 }); return; }

  function next() {
    while (active < conc && i < total) {
      (function (ch) {
        active++;
        probeTwice(ch.url, tmo, function (ok, why, tries) {
          ch.status = ok ? "ok" : "dead";
          ch.checkedAt = new Date().toISOString();
          ch.lastCheck = why;
          ch.diagnostic = ch.diagnostic || {};
          ch.diagnostic.access = {ok:ok,at:Date.now(),origin:"sonda-HTTP-PC",reason:why};
          if (!ok) { ch.diagnostic.lastFailure = {at:Date.now(),origin:"sonda-HTTP-PC",reason:why}; }
          ch.tries = tries;
          if (ok) { alive++; }
          active--; done++;
          if (opt.onProgress) { opt.onProgress(done, total, alive); }
          if (done === total) {
            if (opt.onDone) { opt.onDone({ total: total, alive: alive, dead: total - alive }); }
          } else { next(); }
        }, ch.headers);
      })(channels[i++]);
    }
  }
  next();
};
