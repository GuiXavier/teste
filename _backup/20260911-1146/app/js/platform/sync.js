/*
 * Sync — monta e atualiza o catalogo local.
 *
 * A ORIGEM e plugavel. Duas implementacoes com a mesma interface:
 *   Sync.origemHttp   — o server.js no PC (funciona HOJE)
 *   Sync.origemLuna   — o JS Service embutido (etapa 1, ao ser validado)
 * O banco e o resto do app nao sabem qual esta em uso.
 *
 * Estrategia:
 *   1a vez   : baixa tudo do ao vivo (paginado), grava em lotes,
 *              guarda categorias de filmes/series (itens sob demanda)
 *   seguintes: re-baixa a lista ao vivo (e pequena: ~600 KB para 3 mil
 *              canais), regrava (upsert) e PODA o que sumiu.
 *              Filmes/series: por categoria quando aberta, com validade.
 *
 * Progresso por callback, para a UI mostrar "1200/3352" — numa TV com
 * loadavg 34 uma sincronizacao pode levar dezenas de segundos e o
 * usuario precisa saber que esta andando.
 */
var Sync = (function () {
  "use strict";

  var PAGINA = 500;
  var VALIDADE_CAT_MS = 6 * 3600 * 1000;   /* filmes/series por categoria */

  /* ---------------------------------------------------------------
   * Origem A: o backend do PC. Usa a fonte ATIVA la.
   * --------------------------------------------------------------- */
  var origemHttp = {
    nome: "servidor",
    categorias: function (src, tipo, cb) {
      API.categories({ type: tipo }, function (e, cats) {
        if (e) { return cb(e.message || String(e)); }
        cb(null, (cats || []).filter(function (c) { return c.id !== "__all__"; })
                              .map(function (c) { return { id: String(c.id), name: c.name }; }));
      });
    },
    itens: function (src, tipo, categoria, offset, limit, cb) {
      API.channels({ type: tipo, category: categoria || "__all__", offset: offset, limit: limit },
        function (e, d) {
          if (e) { return cb(e.message || String(e)); }
          cb(null, { total: d.total, items: d.items || [] });
        });
    },
    serieInfo: function (src, id, cb) {
      API.seriesInfo(id, function (e, info) { cb(e ? (e.message || String(e)) : null, info); });
    }
  };

  /* ---------------------------------------------------------------
   * Origem B: o JS Service dentro da TV. Recebe as credenciais.
   * --------------------------------------------------------------- */
  function cred(src) { return { url: src.url, username: src.username, password: src.password }; }
  function mapaAcao(tipo) {
    return { live: ["categorias", "canais"], vod: ["vodCats", "vod"], series: ["serieCats", "series"] }[tipo];
  }
  var origemLuna = {
    nome: "TV",
    categorias: function (src, tipo, cb) {
      if (src.type === "m3u" || src.type === "iptv-org") {
        if (tipo !== "live") { return cb(null, []); }
        return Luna.service("m3u", { url: src.url, offset: 0, limit: 1 }, function (r, e) {
          if (e) { return cb(e); }
          cb(null, (r.categorias || []).map(function (c) { return { id: c, name: c }; }));
        });
      }
      var p = cred(src); p.acao = mapaAcao(tipo)[0]; p.limit = 2000;
      Luna.service("xtream", p, function (r, e) {
        if (e) { return cb(e); }
        cb(null, (r.items || []).map(function (c) { return { id: String(c.id), name: c.name }; }));
      });
    },
    itens: function (src, tipo, categoria, offset, limit, cb) {
      if (src.type === "m3u" || src.type === "iptv-org") {
        return Luna.service("m3u", { url: src.url, offset: offset, limit: limit }, function (r, e) {
          if (e) { return cb(e); }
          cb(null, { total: r.total, items: r.items || [] });
        });
      }
      var p = cred(src); p.acao = mapaAcao(tipo)[1];
      p.categoria = (categoria && categoria !== "__all__") ? categoria : null;
      p.offset = offset; p.limit = limit;
      Luna.service("xtream", p, function (r, e) {
        if (e) { return cb(e); }
        cb(null, { total: r.total, items: r.items || [] });
      });
    },
    serieInfo: function (src, id, cb) {
      var p = cred(src); p.acao = "serieInfo";
      p.serieId = String(id).replace(/^s/, "");
      Luna.service("xtream", p, function (r, e) { cb(e, r ? r.dados : null); });
    }
  };

  /* ---------------------------------------------------------------
   * a sincronizacao em si
   * --------------------------------------------------------------- */
  function gravarCategorias(src, tipo, cats, cb) {
    var regs = cats.map(function (c) {
      return { id: src.id + "|" + tipo + "|" + c.id, sourceId: src.id, type: tipo,
               catId: c.id, name: c.name, carregadaEm: null, count: null };
    });
    DB.putMany("categories", regs, null, null, cb);
  }

  function contarCategorias(src, cats, cb) {
    var i = 0;
    (function prox() {
      if (i >= cats.length) { return cb(); }
      var c = cats[i++];
      DB.count("live", src.id, c.name, function (e, n) {
        DB.get("categories", src.id + "|live|" + c.id, function (e2, reg) {
          if (!reg) { return setTimeout(prox, 0); }
          reg.count = e ? null : n;
          DB.put("categories", reg, function () { setTimeout(prox, 0); });
        });
      });
    })();
  }

  /* baixa TODAS as paginas de um tipo/categoria e grava em lotes */
  function baixarTudo(src, origem, tipo, categoria, store, onProg, cb) {
    var offset = 0, total = null, ids = {}, gravados = 0;
    function proxima() {
      origem.itens(src, tipo, categoria, offset, PAGINA, function (e, r) {
        if (e) { return cb(e, { gravados: gravados, ids: ids }); }
        if (total === null) { total = r.total; }
        var lista = r.items;
        /* categoria vem em nome; o banco precisa de categories[] */
        lista.forEach(function (it) {
          ids[it.id] = true;
          if (!it.categories) { it.categories = it.category ? [it.category] : []; }
        });
        if (!lista.length) { return cb(null, { gravados: gravados, ids: ids, total: total }); }
        DB.putMany(store, lista, src.id, null, function (e2) {
          if (e2) { return cb(e2, { gravados: gravados, ids: ids }); }
          gravados += lista.length;
          offset += lista.length;
          if (onProg) { onProg(gravados, total); }
          if (offset >= total || lista.length < PAGINA) {
            return cb(null, { gravados: gravados, ids: ids, total: total });
          }
          setTimeout(proxima, 0);
        }, offset);
      });
    }
    proxima();
  }

  /* sincronizacao completa da fonte: ao vivo + categorias de vod/series */
  function fonte(src, origem, onProg, cb) {
    var t0 = Date.now();
    var relato = { fonte: src.id, origem: origem.nome, live: 0, podados: 0,
                   vodCats: 0, seriesCats: 0, erros: [] };
    function prog(fase, a, b) { if (onProg) { onProg({ fase: fase, feito: a, total: b }); } }

    prog("categorias ao vivo", 0, 0);
    origem.categorias(src, "live", function (e, cats) {
      if (e) { relato.erros.push("categorias ao vivo: " + e); cats = []; }
      gravarCategorias(src, "live", cats, function () {
        prog("canais ao vivo", 0, 0);
        baixarTudo(src, origem, "live", "__all__", "live", function (a, b) { prog("canais ao vivo", a, b); },
          function (e2, r) {
            if (e2) { relato.erros.push("canais: " + e2); }
            relato.live = r.gravados;
            /* poda o que o provedor removeu desde a ultima vez */
            DB.pruneSource("live", src.id, r.ids, function (e3, n) {
              relato.podados = n || 0;
              /* contagem por categoria: a UI mostra "Kids (41)" */
              contarCategorias(src, cats, function () {
              prog("categorias de filmes", 0, 0);
              origem.categorias(src, "vod", function (e4, vc) {
                if (e4) { relato.erros.push("filmes: " + e4); vc = []; }
                relato.vodCats = vc.length;
                gravarCategorias(src, "vod", vc, function () {
                  prog("categorias de series", 0, 0);
                  origem.categorias(src, "series", function (e5, sc) {
                    if (e5) { relato.erros.push("series: " + e5); sc = []; }
                    relato.seriesCats = sc.length;
                    gravarCategorias(src, "series", sc, function () {
                      relato.ms = Date.now() - t0;
                      DB.metaSet("sync:" + src.id, { em: Date.now(), live: relato.live,
                                                     origem: origem.nome, ms: relato.ms });
                      cb(null, relato);
                    });
                  });
                });
              });
              });
            });
          });
      });
    });
  }

  /* uma categoria de filmes/series, sob demanda, com validade */
  function categoria(src, origem, tipo, catId, onProg, cb) {
    var chave = src.id + "|" + tipo + "|" + catId;
    DB.get("categories", chave, function (e, reg) {
      if (reg && reg.carregadaEm && (Date.now() - reg.carregadaEm) < VALIDADE_CAT_MS) {
        return cb(null, { cache: true, total: reg.count });
      }
      var store = (tipo === "vod") ? "vod" : "series";
      baixarTudo(src, origem, tipo, catId, store, onProg, function (e2, r) {
        if (e2) { return cb(e2); }
        var novo = reg || { id: chave, sourceId: src.id, type: tipo, catId: catId, name: catId };
        novo.carregadaEm = Date.now(); novo.count = r.gravados;
        DB.put("categories", novo, function () { cb(null, { cache: false, total: r.gravados }); });
      });
    });
  }

  /* temporadas/episodios de uma serie, gravados para o /play resolver */
  function serie(src, origem, serieId, cb) {
    origem.serieInfo(src, serieId, function (e, info) {
      if (e || !info) { return cb(e || "serie sem dados"); }
      var eps = [];
      (info.seasons || []).forEach(function (t) {
        t.episodes.forEach(function (ep) {
          ep.seriesId = serieId; ep.kind = "episode";
          ep.categories = ["Temporada " + t.season];
          eps.push(ep);
        });
      });
      DB.putMany("episodes", eps, src.id, null, function (e2) {
        cb(e2 || null, { temporadas: (info.seasons || []).length, episodios: eps.length, info: info.info });
      });
    });
  }

  return { origemHttp: origemHttp, origemLuna: origemLuna,
           fonte: fonte, categoria: categoria, serie: serie, PAGINA: PAGINA };
})();
window.Sync = Sync;
