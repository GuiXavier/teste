/*
 * sourceStore — fontes persistidas em disco.
 * Formato JSON (o Hypnotix usa "nome:::tipo:::url:::user:::pass:::epg";
 * JSON e mais facil de evoluir e nao quebra se a senha tiver ":::").
 */
var fs = require("fs");
var path = require("path");

var FILE = path.join(__dirname, "..", "data", "sources.json");

var PADRAO = [{
  id: "iptv-org-br",
  type: "iptv-org",
  name: "iptv-org Brasil",
  url: "https://iptv-org.github.io/iptv/countries/br.m3u",
  username: null, password: null,
  active: true
}];

var cache = null;

function load() {
  if (cache) { return cache; }
  try {
    cache = JSON.parse(fs.readFileSync(FILE, "utf8"));
    if (!Array.isArray(cache) || !cache.length) { cache = PADRAO.slice(); }
  } catch (e) { cache = PADRAO.slice(); }
  return cache;
}

function save(list) {
  cache = list;
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(list, null, 2), "utf8");
  } catch (e) {}
  return list;
}

function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "fonte";
}

function all() { return load(); }

function active() {
  var l = load(), i;
  for (i = 0; i < l.length; i++) { if (l[i].active) { return l[i]; } }
  return l[0] || null;
}

function add(src) {
  var l = load();
  var id = slug(src.name || src.type);
  var n = 1, base = id;
  while (l.some(function (x) { return x.id === id; })) { id = base + "-" + (++n); }
  var novo = {
    id: id, type: src.type, name: src.name || src.type,
    url: src.url, username: src.username || null, password: src.password || null, headers: src.headers || null,
    active: false
  };
  l.push(novo);
  save(l);
  return novo;
}

function remove(id) {
  var l = load().filter(function (x) { return x.id !== id; });
  if (!l.length) { l = PADRAO.slice(); }
  if (!l.some(function (x) { return x.active; })) { l[0].active = true; }
  save(l);
  return l;
}

function activate(id) {
  var l = load().map(function (x) { return Object.assign({}, x); }), achou = false;
  l.forEach(function (x) { x.active = (x.id === id); if (x.id === id) { achou = true; } });
  if (!achou) { throw new Error("fonte nao encontrada"); }
  var tmp = FILE + "." + require("crypto").randomBytes(8).toString("hex") + ".tmp";
  try { fs.writeFileSync(tmp, JSON.stringify(l, null, 2), "utf8"); fs.renameSync(tmp, FILE); }
  catch (e) { try { fs.unlinkSync(tmp); } catch (ignore) {} throw e; }
  cache = l;
  return active();
}

function byId(id) {
  var l = load(), i;
  for (i = 0; i < l.length; i++) { if (l[i].id === id) { return l[i]; } }
  return null;
}

/* nunca devolve senha ao cliente */
function sanitizeList() {
  return load().map(function (s) {
    return { id: s.id, type: s.type, name: s.name, url: s.url,
             username: s.username || null,
             hasPassword: !!s.password,
             active: !!s.active };
  });
}

exports.all = all;
exports.active = active;
exports.add = add;
exports.remove = remove;
exports.activate = activate;
exports.byId = byId;
exports.sanitizeList = sanitizeList;
