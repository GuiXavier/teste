/*
 * config — parametros de rede, persistidos em disco.
 *
 * O Hypnotix (Linux Mint, GPLv3) expoe User-Agent e Referer como
 * CONFIGURACAO do usuario, com padrao "Mozilla/5.0". Nao e capricho:
 * muitos provedores de IPTV bloqueiam por User-Agent ou exigem um
 * Referer especifico. Sem isso, canais que funcionam no VLC dao 403 aqui.
 *
 * Timeouts tambem sao separados como no Hypnotix: conectar e uma coisa,
 * baixar e outra. Playlist grande precisa de 120s de leitura mas nao
 * pode esperar 120s por um servidor que nao responde.
 */
var fs = require("fs");
var path = require("path");

var FILE = path.join(__dirname, "..", "data", "config.json");

var DEFAULTS = {
  userAgent: "Mozilla/5.0",     /* mesmo padrao do Hypnotix */
  referer: "",
  connectTimeoutMs: 5000,       /* Hypnotix: (5, 120) para playlist */
  readTimeoutMs: 120000,
  apiConnectMs: 2000,           /* Hypnotix: (2, 15) para chamadas de API */
  apiReadMs: 15000,
  probeTimeoutMs: 6000,
  validateTimeoutMs: 6000,
  hideAdultContent: true,       /* Hypnotix filtra por padrao */
  splitCategories: true         /* "Animation;Kids" vira duas categorias */
};

var current = null;

function load() {
  if (current) { return current; }
  current = {};
  var k;
  for (k in DEFAULTS) { if (DEFAULTS.hasOwnProperty(k)) { current[k] = DEFAULTS[k]; } }
  try {
    var saved = JSON.parse(fs.readFileSync(FILE, "utf8"));
    for (k in saved) { if (saved.hasOwnProperty(k) && DEFAULTS.hasOwnProperty(k)) { current[k] = saved[k]; } }
  } catch (e) {}
  return current;
}

function save(patch) {
  var c = load(), k;
  for (k in patch) { if (patch.hasOwnProperty(k) && DEFAULTS.hasOwnProperty(k)) { c[k] = patch[k]; } }
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(c, null, 2), "utf8");
  } catch (e) {}
  return c;
}

/* Cabecalhos que TODA requisicao a provedor deve levar.
   `perChannel` vem do proprio M3U (http-referrer / http-user-agent) e
   tem prioridade sobre o padrao global. */
function headers(extra, perChannel) {
  var c = load();
  var h = { "User-Agent": c.userAgent, "Accept": "*/*", "Accept-Encoding": "identity" };
  if (c.referer) { h.Referer = c.referer; }
  if (perChannel) {
    if (perChannel.userAgent) { h["User-Agent"] = perChannel.userAgent; }
    if (perChannel.referer) { h.Referer = perChannel.referer; }
  }
  if (extra) { var k; for (k in extra) { if (extra.hasOwnProperty(k)) { h[k] = extra[k]; } } }
  return h;
}

exports.get = load;
exports.set = save;
exports.headers = headers;
exports.DEFAULTS = DEFAULTS;