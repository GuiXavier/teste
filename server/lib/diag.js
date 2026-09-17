/*
 * diag — diagnostico de conectividade em ETAPAS.
 *
 * "timeout" sozinho nao diz nada. Este modulo separa:
 *   1. DNS      o dominio resolve?
 *   2. TCP      a porta aceita conexao?
 *   3. HTTP     o servidor responde alguma coisa?
 *   4. API      a resposta e o JSON esperado?
 * Assim da para saber se o problema e o provedor, a rede ou nos.
 */
var dns = require("dns");
var net = require("net");
var http = require("http");
var https = require("https");
var urlmod = require("url");
var config = require("./config");

function etapas(alvo, cb) {
  var out = { url: alvo, dns: null, tcp: null, http: null, api: null };
  var u;
  try { u = urlmod.parse(alvo.indexOf("http") === 0 ? alvo : "http://" + alvo); }
  catch (e) { out.dns = { ok: false, erro: "url invalida" }; return cb(out); }

  var host = u.hostname;
  var porta = parseInt(u.port || (u.protocol === "https:" ? 443 : 80), 10);

  var t0 = Date.now();
  dns.lookup(host, function (err, addr) {
    out.dns = err
      ? { ok: false, erro: err.code || err.message, ms: Date.now() - t0 }
      : { ok: true, ip: addr, ms: Date.now() - t0 };
    if (!out.dns.ok) { return cb(out); }

    var t1 = Date.now();
    var sock = new net.Socket();
    var resolvido = false;
    function fimTcp(ok, erro) {
      if (resolvido) { return; }
      resolvido = true;
      try { sock.destroy(); } catch (e) {}
      out.tcp = { ok: ok, porta: porta, ms: Date.now() - t1 };
      if (erro) { out.tcp.erro = erro; }
      if (!ok) { return cb(out); }
      testarHttp();
    }
    sock.setTimeout(8000);
    sock.on("connect", function () { fimTcp(true); });
    sock.on("timeout", function () { fimTcp(false, "timeout"); });
    sock.on("error", function (e) { fimTcp(false, e.code || e.message); });
    sock.connect(porta, addr);

    function testarHttp() {
      var caminho = "/player_api.php?username=teste&password=teste";
      var mod = u.protocol === "https:" ? https : http;
      var t2 = Date.now();
      var opts = { hostname: host, port: porta, path: caminho, method: "GET",
                   headers: config.headers(), rejectUnauthorized: false };
      var done = false;
      var req = mod.request(opts, function (r) {
        var b = "";
        r.setEncoding("utf8");
        r.on("data", function (c) { b += c; if (b.length > 20000) { req.destroy(); } });
        r.on("end", function () {
          if (done) { return; }
          done = true;
          out.http = { ok: true, status: r.statusCode, ms: Date.now() - t2,
                       tipo: r.headers["content-type"] || null,
                       servidor: r.headers.server || null };
          try {
            var j = JSON.parse(b);
            out.api = { ok: true, temUserInfo: !!j.user_info,
                        chaves: Object.keys(j).slice(0, 6) };
          } catch (e) {
            out.api = { ok: false, erro: "resposta nao e JSON",
                        amostra: b.slice(0, 120).replace(/\s+/g, " ") };
          }
          cb(out);
        });
      });
      req.setTimeout(10000, function () {
        if (done) { return; }
        done = true;
        req.destroy();
        out.http = { ok: false, erro: "timeout", ms: Date.now() - t2 };
        cb(out);
      });
      req.on("error", function (e) {
        if (done) { return; }
        done = true;
        out.http = { ok: false, erro: e.code || e.message, ms: Date.now() - t2 };
        cb(out);
      });
      req.end();
    }
  });
}

exports.etapas = etapas;
