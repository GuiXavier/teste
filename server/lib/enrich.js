/*
 * enrich — cruza os canais com o BANCO do iptv-org.
 *
 * A playlist M3U e a representacao mais pobre que o iptv-org tem.
 * Ela manda 5 atributos por canal. O banco (iptv-org/database) tem
 * muito mais, e casa pelo tvg-id.
 *
 * Formato do tvg-id: "1001Noites.br@SD"
 *                     ^canal        ^feed
 *
 * channels.csv  -> id, name, alt_names, network, owners, country,
 *                  categories, is_nsfw, launched, closed, replaced_by, website
 * feeds.csv     -> channel, id, name, is_main, broadcast_area, timezones,
 *                  languages, format
 *
 * O ganho maior sao as CATEGORIAS: o group-title da playlist e caotico
 * ("Undefined" em 8 canais), o banco tem taxonomia de verdade com 30
 * categorias normalizadas.
 */

var https = require("https");
var fs = require("fs");
var path = require("path");
var config = require("./config");

var BASE = "https://raw.githubusercontent.com/iptv-org/database/master/data/";
var TTL = 24 * 3600 * 1000;

function download(name, dataDir, cb) {
  var file = path.join(dataDir, "db-" + name + ".csv");
  try {
    var st = fs.statSync(file);
    if (Date.now() - st.mtimeMs < TTL) {
      return cb(null, fs.readFileSync(file, "utf8"));
    }
  } catch (e) {}

  https.get(BASE + name + ".csv", { headers: config.headers() }, function (r) {
    if (r.statusCode !== 200) { r.resume(); return cb(new Error("HTTP " + r.statusCode)); }
    var b = ""; r.setEncoding("utf8");
    r.on("data", function (c) { b += c; });
    r.on("end", function () {
      try { fs.writeFileSync(file, b, "utf8"); } catch (e) {}
      cb(null, b);
    });
  }).on("error", function (e) {
    try { return cb(null, fs.readFileSync(file, "utf8")); } catch (e2) {}
    cb(e);
  });
}

/* CSV simples com aspas — suficiente para o formato do iptv-org */
function parseCsv(text) {
  var lines = text.split("\n");
  if (!lines.length) { return []; }
  var head = splitLine(lines[0].replace(/\r$/, ""));
  var out = [], i;
  for (i = 1; i < lines.length; i++) {
    var L = lines[i].replace(/\r$/, "");
    if (!L.trim()) { continue; }
    var cells = splitLine(L);
    var o = {}, j;
    for (j = 0; j < head.length; j++) { o[head[j]] = cells[j] || ""; }
    out.push(o);
  }
  return out;
}

function splitLine(line) {
  var out = [], cur = "", inQ = false, i;
  for (i = 0; i < line.length; i++) {
    var c = line.charAt(i);
    if (c === '"') {
      if (inQ && line.charAt(i + 1) === '"') { cur += '"'; i++; }
      else { inQ = !inQ; }
    } else if (c === "," && !inQ) { out.push(cur); cur = ""; }
    else { cur += c; }
  }
  out.push(cur);
  return out;
}


/* Ultimo recurso, so quando banco E playlist falham.
   Medido contra a br.m3u real: resolve 9 de 54 casos (17%).
   E pouco, mas os 45 restantes sao emissoras abertas generalistas
   (Globo, SBT, RedeTV!, Play TV) que nao cabem em categoria nenhuma
   — nao e falta de dado, e a natureza do canal. */
var REGRAS = [
  [/\b(senado|c[aa]mara|assembleia|justi[cc]a|canal gov|legislativ)/i, "Legislative"],
  [/\b(gospel|igreja|cat[oo]lic|evangeliz|pai eterno|apareci[dg]a|can[cc][aa]o nova|rede vida|s[ee]culo 21|novo tempo|terceiro anjo|boas novas|man[aa] brasil|kuriakos|rit tv|tv universal)/i, "Religious"],
  [/\b(news|not[ii]cia|jornal|record news|bandnews|cnn|jovem pan)/i, "News"],
  [/\b(agro|rural|canal do boi|pecu[aa]ri)/i, "Outdoor"],
  [/\b(kids|infantil|crian[cc]a|desenho|cartoon|junior|baby|turma d)/i, "Kids"],
  [/\b(novelas|s[ee]ries)/i, "Series"],
  [/\b(filmes?|cine|movie|megapix)/i, "Movies"],
  [/\b(music|m[uu]sica|mtv|clipe)/i, "Music"],
  [/\b(esporte|sport|futebol|espn)/i, "Sports"],
  [/\b(educa|escola|futura|universi|ufop|senac|sesc)/i, "Education"],
  [/\b(culin[aa]r|chef|cozinha|gourmet|tastemade)/i, "Cooking"],
  [/\b(shop|compras)/i, "Shop"]
];
var OUTROS = "Outros";

function inferir(nome) {
  var i;
  for (i = 0; i < REGRAS.length; i++) {
    if (REGRAS[i][0].test(nome)) { return REGRAS[i][1]; }
  }
  return null;
}

var INDEX = null;

exports.load = function (dataDir, cb) {
  if (INDEX) { return cb(null, INDEX); }
  download("channels", dataDir, function (e1, chTxt) {
    if (e1) { return cb(e1); }
    download("feeds", dataDir, function (e2, fdTxt) {
      var byChannel = {}, byFeed = {};
      parseCsv(chTxt).forEach(function (r) { if (r.id) { byChannel[r.id] = r; } });
      if (!e2 && fdTxt) {
        parseCsv(fdTxt).forEach(function (r) {
          if (r.channel && r.id) { byFeed[r.channel + "@" + r.id] = r; }
        });
      }
      INDEX = { channels: byChannel, feeds: byFeed };
      cb(null, INDEX);
    });
  });
};

/* aplica sobre a lista ja parseada da playlist */
exports.apply = function (channels, index) {
  var stats = { casados: 0, semTvgId: 0, naoEncontrados: 0, categoriasDoBanco: 0 };

  channels.forEach(function (c) {
    if (!c.tvgId) { stats.semTvgId++; return; }

    var at = c.tvgId.indexOf("@");
    var chId = at >= 0 ? c.tvgId.slice(0, at) : c.tvgId;
    var rec = index.channels[chId];
    if (!rec) { stats.naoEncontrados++; return; }

    stats.casados++;
    c.db = {
      officialName: rec.name || null,
      altNames: rec.alt_names ? rec.alt_names.split(";") : [],
      network: rec.network || null,
      owners: rec.owners ? rec.owners.split(";") : [],
      country: rec.country || null,
      website: rec.website || null,
      launched: rec.launched || null,
      closed: rec.closed || null,
      replacedBy: rec.replaced_by || null,
      nsfw: rec.is_nsfw === "TRUE"
    };

    /* CASCATA de categoria, da fonte mais confiavel para a menos:
         1. banco do iptv-org  (taxonomia normalizada de 30 termos)
         2. group-title da playlist, se disser algo util
         3. palpite pelo nome  (marcado como tal)
         4. "Outros"
       A origem fica em c.categorySource para saber no que confiar. */
    if (rec.categories) {
      var cats = rec.categories.split(";")
        .map(function (x) { return x.trim(); }).filter(Boolean)
        .map(function (x) { return x.charAt(0).toUpperCase() + x.slice(1); });
      if (cats.length) {
        c.categories = cats;
        c.category = cats[0];
        c.categorySource = "banco";
        stats.categoriasDoBanco++;
      }
    }

    /* o feed traz formato (SD/HD/1080p) e idiomas de verdade */
    var feed = index.feeds[c.tvgId];
    if (feed) {
      c.db.format = feed.format || null;
      c.db.languages = feed.languages ? feed.languages.split(";") : [];
      c.db.broadcastArea = feed.broadcast_area || null;
      c.db.isMainFeed = feed.is_main === "TRUE";
    }

    /* canal encerrado ou substituido: nao adianta tentar */
    if (rec.closed) { c.status = "dead"; c.lastCheck = "encerrado em " + rec.closed; }
  });

  /* passada final: quem ficou sem categoria util cai na cascata */
  stats.daPlaylist = 0; stats.inferidas = 0; stats.semNenhuma = 0;
  channels.forEach(function (c) {
    if (c.categorySource === "banco") { return; }

    var atual = (c.categories && c.categories[0]) || null;
    var util = atual && !/^(sem categoria|outros)$/i.test(atual);
    if (util) { c.categorySource = "playlist"; stats.daPlaylist++; return; }

    var pal = inferir(c.name || "");
    if (pal) {
      c.categories = [pal]; c.category = pal;
      c.categorySource = "inferido";      /* palpite: da para revisar depois */
      stats.inferidas++;
      return;
    }
    c.categories = [OUTROS]; c.category = OUTROS;
    c.categorySource = "nenhuma";
    stats.semNenhuma++;
  });

  return stats;
};