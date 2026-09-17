/* Fixture da previa visual: semeia o IndexedDB real com um catalogo
   ficticio para exercitar home, grade, ficha e biblioteca sem provedor,
   sem PC e sem TV. Nao entra no IPK. */
(function () {
  "use strict";

  var FONTE = "preview-A";
  var CORES = ["#6366f1", "#ef4444", "#10b981", "#f59e0b", "#0ea5e9", "#a855f7", "#ec4899"];

  /* posters servidos por HTTP pela propria previa: uma data: URI seria
     descartada por Catalog.logoURL, que so aceita http(s) */
  function poster(texto, i) {
    return "http://127.0.0.1:8875/poster?i=" + (i % CORES.length) + "&t=" + encodeURIComponent(texto);
  }

  /* ?grande=1 semeia um catalogo do tamanho de um provedor real, para
     medir busca e rolagem com numeros que importam */
  var GRANDE = /[?&]grande=1/.test(location.search);
  var N_LIVE = GRANDE ? 3348 : 48, N_VOD = GRANDE ? 8000 : 73, N_SERIES = GRANDE ? 600 : 17;

  var CAT_LIVE = ["Abertos", "Esportes", "Documentarios"];
  var CAT_VOD = ["Lancamentos", "Acao", "Drama"];
  var CAT_SERIES = ["Series originais", "Comedia"];

  function categorias(tipo, nomes) {
    return nomes.map(function (nome, i) {
      return { id: FONTE + "|" + tipo + "|c" + i, sourceId: FONTE, type: tipo,
               catId: "c" + i, name: nome, count: null, carregadaEm: Date.now() };
    });
  }

  function live() {
    var out = [], i;
    for (i = 0; i < N_LIVE; i++) {
      out.push({ id: DB.key(FONTE, "live", String(i + 1)), providerId: String(i + 1), kind: "live",
                 name: "CANAL " + (i + 1) + " [FHD]", category: CAT_LIVE[i % CAT_LIVE.length],
                 chno: i + 1, logo: poster("C" + (i + 1), i), url: "http://exemplo.invalido/live/" + i + ".m3u8",
                 playable: true });
    }
    return out;
  }
  function vod() {
    var out = [], i;
    for (i = 0; i < N_VOD; i++) {
      out.push({ id: DB.key(FONTE, "vod", String(i + 1)), providerId: String(i + 1), kind: "vod",
                 name: "Filme de demonstracao " + (i + 1), category: CAT_VOD[i % CAT_VOD.length],
                 logo: poster("Filme " + (i + 1), i), container: i % 3 ? "mp4" : "mkv",
                 rating: (5 + (i % 5)) + "." + (i % 10), genre: ["Acao", "Drama", "Ficcao"][i % 3],
                 plot: "Sinopse ficticia do filme " + (i + 1) + ". Este texto existe para conferir como a ficha " +
                       "se comporta com um paragrafo longo, do tamanho que um provedor costuma mandar, " +
                       "sem estourar a area reservada na tela.",
                 added: String(1700000000 + i * 8640), url: "http://exemplo.invalido/movie/" + i + ".mp4",
                 playable: i % 3 !== 0 });
    }
    return out;
  }
  function series() {
    var out = [], i;
    for (i = 0; i < N_SERIES; i++) {
      out.push({ id: DB.key(FONTE, "series", String(i + 1)), providerId: String(i + 1), kind: "series",
                 name: "Serie de demonstracao " + (i + 1), category: CAT_SERIES[i % CAT_SERIES.length],
                 logo: poster("Serie " + (i + 1), i + 3), rating: (6 + (i % 4)) + ".2",
                 genre: ["Comedia", "Suspense"][i % 2], added: String(1700000000 + i * 43200),
                 plot: "Sinopse ficticia da serie " + (i + 1) + ", com elenco inventado e nenhuma relacao " +
                       "com obra real. Serve para medir a altura do bloco de texto na ficha." });
    }
    return out;
  }
  function episodios() {
    var out = [], s, t, e, n = 0;
    for (s = 1; s <= 3; s++) {
      for (t = 1; t <= 2; t++) {
        for (e = 1; e <= 8; e++) {
          n++;
          out.push({ id: DB.key(FONTE, "episodes", String(n)), providerId: String(n), kind: "episode",
                     seriesId: DB.key(FONTE, "series", String(s)), season: t, num: e,
                     name: "Episodio " + e + " da temporada " + t,
                     /* de proposito SEM arte: e o caso real do provedor, e
                        exercita a queda para a capa da serie */
                     logo: null, container: "mp4",
                     url: "http://exemplo.invalido/series/" + n + ".mp4", playable: true });
        }
      }
    }
    return out;
  }

  function seed(cb) {
    var canais = live(), filmes = vod(), listas = series(), eps = episodios();
    var cats = categorias("live", CAT_LIVE).concat(categorias("vod", CAT_VOD)).concat(categorias("series", CAT_SERIES));
    var fila = [
      function (next) { DB.putMany("live", canais, FONTE, null, next); },
      function (next) { DB.putMany("vod", filmes, FONTE, null, next); },
      function (next) { DB.putMany("series", listas, FONTE, null, next); },
      function (next) { DB.putMany("episodes", eps, FONTE, null, next); }
    ];
    cats.forEach(function (c) { fila.push(function (next) { DB.put("categories", c, next); }); });
    /* biblioteca pessoal: dois canais, um filme favorito, dois em andamento */
    fila.push(function (next) { Library.toggle(canais[0], next); });
    fila.push(function (next) { Library.toggle(canais[3], next); });
    fila.push(function (next) { Library.toggle(canais[7], next); });
    fila.push(function (next) { Library.toggle(filmes[2], next); });
    fila.push(function (next) { Library.toggle(listas[1], next); });
    fila.push(function (next) { Library.save(filmes[5], 1450, 6400, false, next); });
    fila.push(function (next) { Library.save(filmes[9], 320, 5200, false, next); });
    fila.push(function (next) { Library.save(eps[2], 900, 2400, false, next); });
    fila.push(function (next) { DB.metaSet((GRANDE ? "preview-seeded-grande" : "preview-seeded-3"), true, next); });
    (function passo(i) {
      if (i >= fila.length) { return cb(null); }
      fila[i](function (err) {
        if (err) { return cb(err); }
        passo(i + 1);
      });
    })(0);
  }

  /* ?novo=1 exercita o primeiro inicio: nenhuma fonte cadastrada, e a
     conferencia/sincronizacao sao simuladas para a barra de progresso
     poder ser vista sem provedor real. */
  if (/[?&]novo=1/.test(location.search)) {
    Catalog.init = function (cb) { Library.init(function () { cb(null); }); };
    Catalog.arrancar = function (cb) { cb({ pronto: false, motivo: "sem fonte" }); };
    Catalog.testSource = function (fonte, cb) {
      setTimeout(function () {
        if (!/exemplo/.test(String(fonte.url || ""))) {
          return cb(new Error("Conta recusada pelo provedor (previa: use um endereco com 'exemplo')."));
        }
        cb(null, { ok: true, container: "ts", maxConnections: 2, source: fonte });
      }, 900);
    };
    var cadastrada = false;
    Catalog.saveSource = function (fonte, cb) { cb(null, { id: FONTE, name: fonte.name, type: fonte.type }); };
    /* so existe fonte depois que a sincronizacao termina: e isso que faz o
       app abrir o assistente no primeiro inicio */
    Catalog.getFonte = function () { return cadastrada ? { id: FONTE, name: "Fonte de demonstracao" } : null; };
    Catalog.sincronizar = function (fonte, onProg, cb) {
      var feito = 0, total = 3348;
      var t = setInterval(function () {
        feito += 420;
        if (feito >= total) { clearInterval(t); onProg({ fase: "canais ao vivo", feito: total, total: total });
          return seed(function () { cadastrada = true; cb(null, { live: total }); }); }
        onProg({ fase: "canais ao vivo", feito: feito, total: total });
      }, 260);
    };
    Catalog.baixarTudo = function (onProg, cb) {
      var nomes = CAT_VOD.concat(CAT_SERIES), i = 0;
      var t = setInterval(function () {
        if (i >= nomes.length) { clearInterval(t); return cb(null, { categorias: nomes.length, baixadas: nomes.length, falhas: 0 }); }
        onProg({ fase: nomes[i], feito: i, total: nomes.length });
        i++;
      }, 700);
    };
    Catalog.cancelarBaixarTudo = function () {};
    Catalog.play = function (id, cb) { cb(null, { id: id, naoTocavel: true, note: "Previa visual." }); };
    API.check = function (cb) { cb(false); };
    API.available = function () { return false; };
    Luna.network = function (cb) { cb(null, "previa isolada"); };
    Luna.panel = function () { return { model: "Previa 1920x1080", w: 1920, h: 1080, type: "preview" }; };
    return;
  }

  var initOriginal = Catalog.init;
  Catalog.init = function (cb) {
    Catalog.setFonte({ id: FONTE, name: "Fonte de demonstracao", type: "xtream" });
    Catalog.setModo("local");
    Library.init(function (e) {
      if (e) { return cb(e); }
      DB.metaGet((GRANDE ? "preview-seeded-grande" : "preview-seeded-3"), function (err, pronto) {
        if (pronto) { return cb(null); }
        seed(cb);
      });
    });
  };
  Catalog.arrancar = function (cb) { cb({ pronto: true, canais: N_LIVE, doBanco: true }); };

  /* Sem provedor nem video real: a decisao de play recusa com um aviso
     claro, e nada fica esperando timeout na tela. */
  Catalog.play = function (id, cb) {
    cb(null, { id: id, naoTocavel: true, preferred: null,
               note: "Previa visual: nenhum video ou provedor conectado." });
  };
  API.check = function (cb) { cb(false); };
  API.available = function () { return false; };
  Luna.network = function (cb) { cb(null, "previa isolada"); };
  Luna.panel = function () { return { model: "Previa 1920x1080", w: 1920, h: 1080, type: "preview" }; };
  window.PREVIEW_INIT_ORIGINAL = initOriginal;
})();
