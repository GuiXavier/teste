/* Download em staging, validacao e publicacao atomica. ES5/callbacks. */
var Sync = (function () {
  "use strict";
  var PAGINA = 500, VALIDADE_CAT_MS = 6 * 3600 * 1000;
  /* Pagina do transporte Luna. Cada mensagem atravessa o PalmServiceBridge
     e e serializada dos dois lados, entao o custo por PAGINA importa mais
     que o custo por item: 1000 corta as idas e vindas quase pela metade
     sem estourar a memoria (itens de lista nao trazem sinopse). */
  var PAGINA_TV = 1000;
  var queues = Object.create(null), sequence = 0;
  function once(cb) { var done = false; return function (e, r) { if (!done) { done = true; cb(e, r); } }; }
  function locked(src, work, cb) {
    if (!src || !src.id) { return cb("fonte sem id"); }
    var id = String(src.id), copy = JSON.parse(JSON.stringify(src));
    var q = queues[id] || (queues[id] = []);
    q.push(function () {
      work(copy, once(function (e, r) {
        q.shift(); if (!q.length) { delete queues[id]; } else { setTimeout(q[0], 0); }
        cb(e, r);
      }));
    });
    if (q.length === 1) { q[0](); }
  }
  function generation() { return Date.now() + "-" + (++sequence) + "-" + Math.random().toString(36).slice(2); }
  function httpResult(src, e, r, cb) {
    if (e) { return cb(e.message || String(e)); }
    if (!r || r.sourceId !== src.id || !r.generation) { return cb("resposta HTTP sem identidade da fonte/geracao"); }
    if (src.remoteGeneration && src.remoteGeneration !== r.generation) { return cb("catalogo do servidor mudou durante a sincronizacao"); }
    src.remoteGeneration = r.generation; cb(null, r);
  }
  var origemHttp = {
    nome: "servidor",
    categorias: function (src, tipo, cb) {
      API.categories({ type: tipo, sourceId: src.id, generation: src.remoteGeneration, sync: true }, function (e, r) {
        httpResult(src, e, r, function (err, data) { cb(err, data ? data.items : null); });
      });
    },
    itens: function (src, tipo, categoria, offset, limit, cb) {
      API.channels({ type: tipo, category: categoria || "__all__", offset: offset, limit: limit,
        sourceId: src.id, generation: src.remoteGeneration, sync: true }, function (e, r) { httpResult(src, e, r, cb); });
    },
    serieInfo: function (src, id, cb) {
      API.seriesInfo(id, function (e, r) { httpResult(src, e, r, cb); }, { sourceId: src.id, generation: src.remoteGeneration, sync: true });
    }
  };
  function cred(src) { return { url: src.url, username: src.username, password: src.password, sourceId: src.id, headers: src.headers || null, container: src.container || null }; }
  function action(type, cats) { return { live: ["categorias", "canais"], vod: ["vodCats", "vod"], series: ["serieCats", "series"] }[type][cats ? 0 : 1]; }
  function lunaItems(src, tipo, categoria, offset, limit, cats, cb) {
    var p = cred(src), m3u = src.type === "m3u" || src.type === "iptv-org";
    p.acao = action(tipo, cats); p.categoria = categoria === "__all__" ? null : categoria;
    p.offset = offset; p.limit = limit;
    Luna.service(m3u ? "m3u" : "xtream", p, function (r, e) {
      if (e || !r || r.sourceId !== src.id || !r.snapshot) { return cb(e || "resposta Luna incompleta/sem identidade"); }
      if (r.container) { src.container = r.container; }
      cb(null, r);
    });
  }
  var origemLuna = {
    nome: "TV",
    categorias: function (src, tipo, cb) {
      var m3u = src.type === "m3u" || src.type === "iptv-org";
      if (m3u && tipo !== "live") { return cb(null, []); }
      if (m3u) {
        return lunaItems(src, tipo, null, 0, 1, true, function (e, r) {
          if (e) { return cb(e); }
          src.m3uSnapshot = r.snapshot;
          cb(null, Array.isArray(r.categorias) ? r.categorias.map(function (c) { return { id: c, name: c }; }) : null);
        });
      }
      collect(function (off, lim, next) { lunaItems(src, tipo, null, off, lim, true, next); }, function (e, r) { cb(e, r ? r.items : null); });
    },
    itens: function (src, tipo, categoria, offset, limit, cb) {
      lunaItems(src, tipo, categoria, offset, limit, false, function (e, r) {
        if (!e && src.m3uSnapshot && r.snapshot !== src.m3uSnapshot) { e = "playlist mudou apos carregar categorias"; }
        cb(e, r);
      });
    },
    serieInfo: function (src, id, cb) {
      var p = cred(src); p.acao = "serieInfo"; p.serieId = id;
      Luna.service("xtream", p, function (r, e) { cb(e || (!r || r.sourceId !== src.id || !r.dados ? "serie sem dados/identidade" : null), r && r.dados); });
    }
  };
  function validPage(r, offset, limit, total, snapshot) {
    if (!r || !Array.isArray(r.items) || typeof r.total !== "number" || !isFinite(r.total) || r.total < 0 || Math.floor(r.total) !== r.total) { return "pagina sem total confiavel"; }
    if (r.offset !== offset) { return "offset divergente"; }
    if (total !== null && total !== r.total) { return "total mudou durante a carga"; }
    var token = r.snapshot || r.generation;
    if (!token || (snapshot && snapshot !== token)) { return "snapshot mudou ou esta ausente"; }
    if (r.items.length !== Math.min(limit, r.total - offset)) { return "pagina incompleta ou total divergente"; }
    return null;
  }
  function collect(fetch, cb) {
    var items = [], total = null, snapshot = null;
    function next() {
      fetch(items.length, 400, once(function (e, r) {
        e = e || validPage(r, items.length, 400, total, snapshot);
        if (e) { return cb(e); }
        total = r.total; snapshot = r.snapshot || r.generation; items = items.concat(r.items);
        if (items.length === total) { return cb(null, { items: items }); }
        setTimeout(next, 0);
      }));
    }
    next();
  }
  function catsValid(cats) {
    if (!Array.isArray(cats)) { return false; }
    var ids = Object.create(null);
    return cats.every(function (c) {
      if (!c || c.id === undefined || c.id === null || !String(c.id) || /^(undefined|null)$/.test(String(c.id)) || typeof c.name !== "string" || !c.name || ids[String(c.id)]) { return false; }
      ids[String(c.id)] = true; return true;
    });
  }
  function catRecords(src, type, cats) {
    return cats.map(function (c) { return { id: src.id + "|" + type + "|" + c.id,
      sourceId: src.id, type: type, catId: String(c.id), name: c.name, carregadaEm: null, count: null }; });
  }
  function validItem(it, type) {
    return it && it.id !== undefined && it.id !== null && String(it.id) && !/^[xvse]?(undefined|null)$/.test(String(it.id)) &&
      typeof it.name === "string" && !!it.name &&
      (it.categories === undefined || it.categories === null || Array.isArray(it.categories)) &&
      !/^(undefined|null|)$/.test(DB.providerId(it, type)) &&
      (type === "series" || typeof it.url === "string" && /^https?:\/\//.test(it.url));
  }
  function baixarTudo(src, origem, tipo, cat, gen, onProg, cb, mapa) {
    var offset = 0, total = null, snapshot = null, ids = Object.create(null), counts = Object.create(null);
    var passo = origem.nome === "TV" ? PAGINA_TV : PAGINA;
    function next() {
      origem.itens(src, tipo, cat, offset, passo, once(function (e, r) {
        e = e || validPage(r, offset, passo, total, snapshot);
        if (e) { return cb(e); }
        total = r.total; snapshot = r.snapshot || r.generation;
        var list = [], invalid = false;
        r.items.forEach(function (raw) {
          if (!validItem(raw, tipo)) { invalid = true; return; }
          var originalKey = DB.identity(raw.id);
          if ((raw.sourceId && raw.sourceId !== src.id) || (originalKey && (originalKey[0] !== src.id || originalKey[1] !== tipo))) { invalid = true; return; }
          var it = JSON.parse(JSON.stringify(raw)), id = DB.key(src.id, tipo, DB.providerId(it, tipo));
          if (ids[id]) { invalid = true; return; } ids[id] = true;
          if (tipo !== "live") { it.catalogCategoryId = String(cat); }
          if (mapa && mapa[it.category]) { it.category = mapa[it.category]; it.categories = [it.category]; }
          it.categories = it.categories || (it.category ? [it.category] : []);
          it.categories.forEach(function (name) { counts[name] = (counts[name] || 0) + 1; }); list.push(it);
        });
        if (invalid) { return cb("item invalido ou id duplicado; banco preservado"); }
        DB.stage(gen, tipo, list, src.id, offset, function (e2) {
          if (e2) { return cb(e2); }
          offset += list.length; if (onProg) { onProg(offset, total); }
          if (offset === total) { return cb(null, { gravados: offset, counts: counts, complete: true }); }
          setTimeout(next, 0);
        });
      }));
    }
    next();
  }
  function sourceWork(src, origem, onProg, cb) {
    delete src.remoteGeneration; delete src.m3uSnapshot;
    var gen = generation(), start = Date.now(), allCats = [], downloaded = 0;
    var report = { fonte: src.id, origem: origem.nome, generation: gen, live: 0, podados: 0, vodCats: 0, seriesCats: 0, erros: [] };
    function fail(e) {
      report.status = downloaded ? "partial" : "failed"; report.committed = false;
      report.erros.push(String(e)); report.ms = Date.now() - start;
      DB.discard(gen, function (cleanupError) {
        if (cleanupError) { report.erros.push(String(cleanupError)); }
        DB.metaSet("syncAttempt:" + src.id, { em: start, status: report.status, generation: gen, erros: report.erros }, function (me) {
          cb(String(e) + (me ? "; falha ao registrar tentativa: " + me : ""), report);
        });
      });
    }
    function categories(type, next) {
      if (onProg) { onProg({ fase: "categorias " + type, feito: 0, total: 0 }); }
      origem.categorias(src, type, once(function (e, cats) {
        if (e || !catsValid(cats)) { return fail(e || "categorias invalidas: " + type); }
        var records = catRecords(src, type, cats); allCats = allCats.concat(records); next(cats, records);
      }));
    }
    DB.metaSet("syncAttempt:" + src.id, { em: start, status: "running", generation: gen }, function (e) {
      if (e) { return cb(e, report); }
      categories("live", function (cats, records) {
        var map = Object.create(null); cats.forEach(function (c) { map[c.id] = c.name; });
        baixarTudo(src, origem, "live", "__all__", gen, function (a, b) {
          downloaded = a; if (onProg) { onProg({ fase: "canais ao vivo", feito: a, total: b }); }
        }, function (e2, r) {
          if (e2) { return fail(e2); }
          report.live = r.gravados; records.forEach(function (c) { c.count = r.counts[c.name] || 0; });
          categories("vod", function (vc) {
            report.vodCats = vc.length;
            categories("series", function (sc) {
              report.seriesCats = sc.length; report.ms = Date.now() - start;
              var now = Date.now();
              DB.commit({ mode: "source", sourceId: src.id, generation: gen, categories: allCats,
                success: { em: now, lastSuccess: now, lastAttempt: start, status: "complete", generation: gen, live: report.live, origem: origem.nome, ms: report.ms } }, function (e3, stats) {
                if (e3) { return fail(e3); }
                report.container = src.container || null; report.podados = stats.podados; report.status = "complete"; report.committed = true; cb(null, report);
              });
            });
          });
        }, map);
      });
    });
  }
  function fonte(src, origem, onProg, cb) { locked(src, function (s, done) { sourceWork(s, origem, onProg, done); }, cb); }

  /* Colecao inteira numa tacada.
     O Xtream aceita get_vod_streams / get_series SEM category_id e devolve
     tudo de uma vez, com o category_id em cada item. Baixar assim troca
     "uma requisicao por categoria" (dezenas, em serie) por UMA — e e por
     isso que a primeira sincronizacao demorava tanto.
     A poda usa a mesma regra do ao vivo: a colecao veio completa, entao o
     que nao esta nesta geracao nao existe mais. */
  function colecao(src, origem, tipo, onProg, cb) {
    locked(src, function (s, done) {
      if (tipo !== "vod" && tipo !== "series") { return done("tipo de colecao invalido"); }
      var gen = generation(), start = Date.now();
      DB.categoriesOf(s.id, tipo, function (e, regs) {
        if (e) { return done(e); }
        if (!regs || !regs.length) { return done("sem categorias; sincronize a fonte antes"); }
        var mapa = Object.create(null);
        regs.forEach(function (r) { mapa[String(r.catId)] = r.name; });
        baixarTudo(s, origem, tipo, "__all__", gen, onProg, function (e2, r) {
          if (e2) { return DB.discard(gen, function () { done(e2); }); }
          var agora = Date.now();
          regs.forEach(function (reg) {
            reg.carregadaEm = agora;
            reg.count = r.counts[reg.name] || 0;
            reg.itemsGeneration = gen;
          });
          DB.commit({ mode: "collection", store: tipo, sourceId: s.id, generation: gen, categories: regs },
            function (e3) {
              if (e3) { return DB.discard(gen, function () { done(e3); }); }
              done(null, { total: r.gravados, categorias: regs.length, ms: Date.now() - start });
            });
        }, mapa);
      });
    }, cb);
  }
  function categoria(src, origem, tipo, catId, onProg, cb) {
    locked(src, function (s, done) {
      if (tipo !== "vod" && tipo !== "series") { return done("tipo de categoria invalido"); }
      var chave = s.id + "|" + tipo + "|" + catId, gen = generation();
      DB.get("categories", chave, function (e, reg) {
        if (e || !reg) { return done(e || "categoria removida ou inexistente"); }
        if (reg.carregadaEm && Date.now() - reg.carregadaEm < VALIDADE_CAT_MS) { return done(null, { cache: true, total: reg.count }); }
        var map = Object.create(null); map[String(catId)] = reg.name;
        baixarTudo(s, origem, tipo, catId, gen, onProg, function (e2, r) {
          if (e2) { return DB.discard(gen, function () { done(e2); }); }
          reg.carregadaEm = Date.now(); reg.count = r.gravados; reg.itemsGeneration = gen;
          DB.commit({ mode: "category", store: tipo, catId: catId, categoryName: reg.name, sourceId: s.id,
            generation: gen, categories: [reg] }, function (e3) {
            if (e3) { return DB.discard(gen, function () { done(e3); }); }
            done(null, { cache: false, total: r.gravados });
          });
        }, map);
      });
    }, cb);
  }
  function serie(src, origem, serieId, cb) {
    locked(src, function (s, done) {
      var parent = DB.identity(serieId);
      if (parent && (parent[0] !== s.id || parent[1] !== "series")) { return done("serie pertence a outra fonte/tipo"); }
      var rawId = parent ? parent[2] : String(serieId).replace(/^s(?=\d)/, "");
      var gen = generation(), key = DB.key(s.id, "series", rawId);
      origem.serieInfo(s, rawId, once(function (e, info) {
        if (e || !info || !Array.isArray(info.seasons)) { return done(e || "serie sem dados completos"); }
        var eps = [], ids = Object.create(null), invalid = false;
        info.seasons.forEach(function (t) {
          if (!t || !Array.isArray(t.episodes)) { invalid = true; return; }
          t.episodes.forEach(function (raw) {
            if (!validItem(raw, "episodes")) { invalid = true; return; }
            var ep = JSON.parse(JSON.stringify(raw)), id = DB.providerId(ep, "episodes");
            if (ids[id]) { invalid = true; return; } ids[id] = true;
            ep.seriesId = key; ep.seriesProviderId = rawId; ep.categories = ["Temporada " + t.season]; eps.push(ep);
          });
        });
        if (invalid || info.totalEpisodios !== eps.length) { return done("episodios incompletos ou invalidos"); }
        DB.stage(gen, "episodes", eps, s.id, 0, function (e2) {
          if (e2) { return DB.discard(gen, function () { done(e2); }); }
          DB.commit({ mode: "series", seriesId: key, sourceId: s.id, generation: gen }, function (e3) {
            if (e3) { return DB.discard(gen, function () { done(e3); }); }
            done(null, { temporadas: info.seasons.length, episodios: eps.length, info: info.info });
          });
        });
      }));
    }, cb);
  }
  return { origemHttp: origemHttp, origemLuna: origemLuna, fonte: fonte, colecao: colecao, categoria: categoria, serie: serie, PAGINA: PAGINA };
})();
window.Sync = Sync;
