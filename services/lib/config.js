/*
 * config (versao do JS Service) - SEM disco.
 * O servico e stateless: o app manda o User-Agent/Referer a cada chamada
 * e guarda tudo no IndexedDB. Mesma interface do config.js do servidor,
 * para sources.js e playlist.js funcionarem sem alteracao.
 */
var atual = { userAgent: "Mozilla/5.0", referer: "", hideAdultContent: true,
              splitCategories: true, probeTimeoutMs: 8000 };

exports.get = function () { return atual; };
exports.set = function (p) {
  var k;
  for (k in p) { if (p.hasOwnProperty(k) && atual.hasOwnProperty(k)) { atual[k] = p[k]; } }
  return atual;
};
exports.headers = function (extra, perChannel) {
  var h = { "User-Agent": atual.userAgent, "Accept": "*/*", "Accept-Encoding": "identity" };
  if (atual.referer) { h.Referer = atual.referer; }
  if (perChannel) {
    if (perChannel.userAgent) { h["User-Agent"] = perChannel.userAgent; }
    if (perChannel.referer) { h.Referer = perChannel.referer; }
  }
  if (extra) { var k; for (k in extra) { if (extra.hasOwnProperty(k)) { h[k] = extra[k]; } } }
  return h;
};
