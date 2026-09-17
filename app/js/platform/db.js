/*
 * DB — catalogo LOCAL no IndexedDB.
 *
 * Por que IndexedDB e nao DB8 (pesquisa na documentacao da LG):
 *   - DB8 tem teto COMPARTILHADO de 10 MB entre todos os apps da TV.
 *     Um catalogo Xtream (3 mil canais + milhares de filmes) nao cabe.
 *   - localStorage: 16 MB desde a webOS 3.5, e apaga em update do app.
 *   - IndexedDB no Chromium 79 funciona em app packaged (file://),
 *     persiste entre reinicios e segue quota de disco do Chromium.
 *     E o que apps IPTV reais usam na webOS.
 *
 * Desenho para uma TV com ~190 MB livres:
 *   - nada e carregado inteiro em memoria: toda leitura e por CURSOR,
 *     paginada (offset/limit), e a lista virtualizada pede so a janela
 *   - escrita em LOTES numa transacao so (500 por vez), senao 3 mil
 *     put() individuais levam dezenas de segundos na TV
 *   - filtro por categoria via indice multiEntry "catKeys":
 *     ["fonte|Categoria A", "fonte|Categoria B"], porque um canal pode
 *     estar em varias categorias e o IndexedDB nao combina compound
 *     com multiEntry
 *
 * Tudo em ES5 e callbacks: o Chromium 79 ate suporta Promise, mas a
 * API do IndexedDB e por eventos de qualquer jeito.
 */
var DB = (function () {
  "use strict";

  var NOME = "iptv", VERSAO = 2;
  /* teto de resultados de uma busca: passa disso e o usuario precisa de um
     termo melhor, nao de mais rolagem */
  var MAX_ACHADOS = 600;
  var db = null, abrindo = null;
  var LOTE = 500;

  /* stores que guardam itens de catalogo (todas com o mesmo indice) */
  var CATALOGO = ["live", "vod", "series", "episodes"];

  function erroDe(e) {
    try { return (e && e.target && e.target.error && e.target.error.message) || String(e); }
    catch (x) { return "erro"; }
  }

  function criarStores(d) {
    var mk = function (n, opt) { return d.objectStoreNames.contains(n) ? null : d.createObjectStore(n, opt); };
    var s;
    mk("meta",       { keyPath: "id" });
    mk("sources",    { keyPath: "id" });
    s = mk("staging", { keyPath: ["generation", "store", "id"] });
    if (s) { s.createIndex("generation", "generation", { unique: false }); }
    s = mk("categories", { keyPath: "id" });
    if (s) { s.createIndex("srcType", ["sourceId", "type"], { unique: false }); }

    CATALOGO.forEach(function (n) {
      var st = mk(n, { keyPath: "id" });
      if (!st) { return; }
      st.createIndex("src",     "sourceId",             { unique: false });
      /* ordem do provedor: ele ordena a lista de proposito */
      st.createIndex("srcPos",  ["sourceId", "pos"],    { unique: false });
      st.createIndex("catKeys", "catKeys",              { unique: false, multiEntry: true });
      st.createIndex("srcName", ["sourceId", "nameLower"], { unique: false });
      if (n === "episodes") { st.createIndex("serie", "seriesId", { unique: false }); }
    });

    s = mk("favorites", { keyPath: "id" });
    if (s) { s.createIndex("addedAt", "addedAt", { unique: false }); }
    s = mk("history", { keyPath: "id" });
    if (s) { s.createIndex("watchedAt", "watchedAt", { unique: false }); }
  }

  function open(cb) {
    if (db) { return cb(null, db); }
    if (!window.indexedDB) { return cb("sem IndexedDB neste navegador"); }
    if (abrindo) { abrindo.push(cb); return; }
    abrindo = [cb];
    var req;
    try { req = indexedDB.open(NOME, VERSAO); }
    catch (e) { var l0 = abrindo; abrindo = null; l0.forEach(function (f) { f(e.message); }); return; }
    req.onupgradeneeded = function (e) {
      criarStores(e.target.result);
      if (e.oldVersion > 0 && e.oldVersion < 2) { migrar(req.transaction); }
    };
    req.onsuccess = function (e) {
      db = e.target.result;
      db.onversionchange = function () { try { db.close(); } catch (x) {} db = null; };
      var l = abrindo || []; abrindo = null;
      l.forEach(function (f) { f(null, db); });
    };
    req.onerror = function (e) {
      var l = abrindo || []; abrindo = null;
      l.forEach(function (f) { f(erroDe(e)); });
    };
    req.onblocked = function () {
      var l = abrindo || []; abrindo = [];
      l.forEach(function (f) { f("banco bloqueado por outra aba"); });
    };
  }

  /* --------------------------------------------------------- escrita */

  /* normaliza um item de catalogo para o formato do banco */
  function pad(n) { var s = "0000000" + n; return s.slice(-7); }

  function key(sourceId, store, providerId) {
    return "k2:" + JSON.stringify([String(sourceId), store, String(providerId)]);
  }
  function identity(id) {
    if (String(id).slice(0, 3) !== "k2:") { return null; }
    try { var a = JSON.parse(id.slice(3)); return Array.isArray(a) && a.length === 3 ? a : null; } catch (e) { return null; }
  }
  /* SHA-256 sincrono apenas para migrar URLs M3U legadas dentro da
     transacao IDB. Nao coloca URL/credenciais em IDs enviados ao log. */
  function urlId(text) {
    var bytes = unescape(encodeURIComponent(text)), words = [], i, j;
    var k = [1116352408,1899447441,3049323471,3921009573,961987163,1508970993,2453635748,2870763221,
      3624381080,310598401,607225278,1426881987,1925078388,2162078206,2614888103,3248222580,
      3835390401,4022224774,264347078,604807628,770255983,1249150122,1555081692,1996064986,
      2554220882,2821834349,2952996808,3210313671,3336571891,3584528711,113926993,338241895,
      666307205,773529912,1294757372,1396182291,1695183700,1986661051,2177026350,2456956037,
      2730485921,2820302411,3259730800,3345764771,3516065817,3600352804,4094571909,275423344,
      430227734,506948616,659060556,883997877,958139571,1322822218,1537002063,1747873779,
      1955562222,2024104815,2227730452,2361852424,2428436474,2756734187,3204031479,3329325298];
    var h = [1779033703,3144134277,1013904242,2773480762,1359893119,2600822924,528734635,1541459225];
    function rr(x, n) { return (x >>> n) | (x << (32 - n)); }
    for (i = 0; i < bytes.length; i++) { words[i >> 2] = (words[i >> 2] || 0) | bytes.charCodeAt(i) << (24 - (i % 4) * 8); }
    words[bytes.length >> 2] = (words[bytes.length >> 2] || 0) | 0x80 << (24 - (bytes.length % 4) * 8);
    var end = Math.ceil((bytes.length + 9) / 64) * 16;
    words[end - 2] = Math.floor(bytes.length / 536870912); words[end - 1] = bytes.length * 8;
    for (i = 0; i < end; i += 16) {
      var w = [], a = h.slice();
      for (j = 0; j < 64; j++) {
        if (j < 16) { w[j] = words[i + j] | 0; }
        else { var x = w[j - 15], y = w[j - 2]; w[j] = (w[j - 16] + (rr(x,7) ^ rr(x,18) ^ (x >>> 3)) + w[j - 7] + (rr(y,17) ^ rr(y,19) ^ (y >>> 10))) | 0; }
        var t1 = (a[7] + (rr(a[4],6) ^ rr(a[4],11) ^ rr(a[4],25)) + ((a[4] & a[5]) ^ (~a[4] & a[6])) + k[j] + w[j]) | 0;
        var t2 = ((rr(a[0],2) ^ rr(a[0],13) ^ rr(a[0],22)) + ((a[0] & a[1]) ^ (a[0] & a[2]) ^ (a[1] & a[2]))) | 0;
        a = [(t1 + t2) | 0, a[0], a[1], a[2], (a[3] + t1) | 0, a[4], a[5], a[6]];
      }
      for (j = 0; j < 8; j++) { h[j] = (h[j] + a[j]) | 0; }
    }
    return "m3u:" + h.map(function (n) { return ("00000000" + (n >>> 0).toString(16)).slice(-8); }).join("");
  }
  function providerId(item, store) {
    if (item.providerId !== undefined && item.providerId !== null) { return String(item.providerId); }
    var a = identity(item.id);
    if (a) { return a[2]; }
    var raw = store === "episodes" ? item.episodeId : (store === "series" ? item.seriesId : item.streamId);
    if (raw !== undefined && raw !== null) { return String(raw); }
    var id = String(item.id || "");
    if (/^[xvse]\d+$/.test(id)) { return id.slice(1); }
    return store === "live" && item.url ? urlId(item.url) : id;
  }
  function canonical(item, sourceId, store, pos) {
    var out = {}, k;
    for (k in item) { if (Object.prototype.hasOwnProperty.call(item, k)) { out[k] = item[k]; } }
    out.providerId = providerId(item, store);
    out.legacyId = item.legacyId || item.id;
    out.id = key(sourceId, store, out.providerId);
    out.kind = store === "episodes" ? "episode" : store;
    if (store === "episodes") {
      var parent = identity(item.seriesId);
      out.seriesProviderId = item.seriesProviderId || (parent ? parent[2] : String(item.seriesId || "").replace(/^s(?=\d)/, ""));
      out.seriesId = key(sourceId, "series", out.seriesProviderId);
    }
    out.pos = pos;
    return preparar(out, sourceId, pos);
  }
  /* Upgrade transacional: registros antigos permanecem se a migracao abortar.
     Referencias sem fonte/tipo sao preservadas, nunca atribuidas por adivinhacao. */
  function migrar(tx) {
    CATALOGO.forEach(function (store) {
      var st = tx.objectStore(store);
      st.openCursor().onsuccess = function (e) {
        var c = e.target.result;
        if (!c) { return; }
        var item = c.value;
        if (item.sourceId && !identity(item.id)) {
          var novo = canonical(item, item.sourceId, store, item.pos || 0);
          st.delete(c.primaryKey); st.put(novo);
        }
        c["continue"]();
      };
    });
    ["favorites", "history"].forEach(function (store) {
      var st = tx.objectStore(store);
      st.openCursor().onsuccess = function (e) {
        var c = e.target.result;
        if (!c) { return; }
        var v = c.value, type = v.type || v.kind;
        if (type === "episode") { type = "episodes"; }
        if (v.sourceId && CATALOGO.indexOf(type) >= 0 && !identity(v.itemId || v.id)) {
          v.legacyItemId = v.itemId || v.id;
          v.itemId = key(v.sourceId, type, providerId({ id: v.legacyItemId, providerId: v.providerId, url: v.url }, type));
          c.update(v);
        }
        c["continue"]();
      };
    });
  }

  function preparar(item, sourceId, pos) {
    var cats = item.categories || (item.category ? [item.category] : []);
    item.sourceId = sourceId;
    if (item.pos === undefined) { item.pos = pos; }
    item.nameLower = String(item.name || "").toLowerCase();
    /* "fonte|Categoria|0000123": um range por prefixo devolve a
       categoria JA NA ORDEM do provedor, sem ordenar em memoria */
    var p = pad(item.pos);
    item.catKeys = cats.map(function (c) { return sourceId + "|" + c + "|" + p; });
    if (!item.catKeys.length) { item.catKeys = [sourceId + "|Outros|" + p]; }
    return item;
  }

  /* grava em lotes: uma transacao por lote, sequencial */
  function putMany(store, items, sourceId, onProgress, cb, posBase) {
    var callback = cb, finished = false;
    cb = function (e, n) { if (!finished) { finished = true; callback(e, n); } };
    posBase = posBase || 0;
    open(function (err, d) {
      if (err) { return cb(err); }
      var i = 0, total = items.length;
      function lote() {
        if (i >= total) { return cb(null, total); }
        var fim = Math.min(i + LOTE, total);
        var tx;
        try { tx = d.transaction(store, "readwrite"); }
        catch (e) { return cb(e.message); }
        var st = tx.objectStore(store);
        try {
          for (var k = i; k < fim; k++) {
            st.put(sourceId ? canonical(items[k], sourceId, store, posBase + k) : items[k]);
          }
        } catch (e2) { tx.abort(); return cb(e2.message); }
        tx.oncomplete = function () {
          i = fim;
          if (onProgress) { onProgress(i, total); }
          /* solta o loop para a UI respirar entre lotes */
          setTimeout(lote, 0);
        };
        tx.onabort = function (e) { cb("transacao abortada: " + erroDe(e)); };
      }
      lote();
    });
  }

  function put(store, item, cb) { putMany(store, [item], null, null, cb); }

  function transactionDone(tx, cb, value) {
    var done = false;
    function end(e) { if (!done) { done = true; cb(e, e ? null : value); } }
    tx.oncomplete = function () { end(null); };
    /* onerror pode borbulhar antes do rollback; somente onabort conclui falha. */
    tx.onabort = function (e) { end("transacao abortada: " + erroDe(e)); };
  }
  function stage(generation, store, items, sourceId, offset, cb) {
    var records;
    try {
      records = items.map(function (it, i) {
        var value = canonical(it, sourceId, store, offset + i);
        value.generation = generation;
        return { generation: generation, store: store, id: value.id, value: value };
      });
    } catch (e) { return cb(e.message); }
    putMany("staging", records, null, null, cb);
  }
  function discard(generation, cb) {
    open(function (e, d) {
      if (e) { return cb(e); }
      var tx = d.transaction("staging", "readwrite");
      transactionDone(tx, cb);
      tx.objectStore("staging").index("generation").openCursor(IDBKeyRange.only(generation)).onsuccess = function (ev) {
        var c = ev.target.result;
        if (c) { c.delete(); c["continue"](); }
      };
    });
  }
  /* Publicacao, poda e marcador de sucesso na MESMA transacao. Nenhum
     leitor observa metade de uma geracao, inclusive se faltar espaco. */
  function commit(opt, cb) {
    open(function (err, d) {
      if (err) { return cb(err); }
      var tx = d.transaction(CATALOGO.concat(["categories", "meta", "staging"]), "readwrite");
      var stats = { podados: 0 }, cats = {}, oldCats = {}, removedSeries = {};
      var sourceId = opt.sourceId, gen = opt.generation;
      transactionDone(tx, cb, stats);
      (opt.categories || []).forEach(function (c) { cats[c.id] = c; });
      var catStore = tx.objectStore("categories");
      catStore.openCursor().onsuccess = function (e) {
        var c = e.target.result;
        if (!c) { return writeCategories(); }
        var v = c.value;
        if (v.sourceId === sourceId) {
          oldCats[v.id] = v;
          if (opt.mode === "source" && !cats[v.id]) { c.delete(); }
        }
        c["continue"]();
      };
      function writeCategories() {
        (opt.categories || []).forEach(function (v) {
          var old = oldCats[v.id];
          if (opt.mode === "source" && v.type !== "live" && old && old.name === v.name) {
            v.carregadaEm = old.carregadaEm; v.count = old.count;
            v.itemsGeneration = old.itemsGeneration || old.generation || null;
          }
          v.generation = gen;
          catStore.put(v);
        });
        var st = tx.objectStore("staging");
        st.index("generation").openCursor(IDBKeyRange.only(gen)).onsuccess = function (e) {
          var c = e.target.result;
          if (!c) { return prune(0); }
          tx.objectStore(c.value.store).put(c.value.value);
          c.delete(); c["continue"]();
        };
      }
      function prune(i) {
        if (i >= CATALOGO.length) {
          if (opt.success) {
            tx.objectStore("meta").put({ id: "sync:" + sourceId, valor: opt.success, em: Date.now() });
            tx.objectStore("meta").put({ id: "syncAttempt:" + sourceId, valor: opt.success, em: Date.now() });
          }
          return;
        }
        var store = CATALOGO[i];
        tx.objectStore(store).index("src").openCursor(IDBKeyRange.only(sourceId)).onsuccess = function (e) {
          var c = e.target.result;
          if (!c) { return prune(i + 1); }
          var v = c.value, remove = false;
          if (opt.mode === "source") {
            if (store === "live") { remove = v.generation !== gen; }
            if (store === "vod" || store === "series") {
              var found = false;
              Object.keys(cats).some(function (k) {
                var cat = cats[k];
                if (cat.type !== store) { return false; }
                var belongs = v.catalogCategoryId !== undefined ? String(v.catalogCategoryId) === String(cat.catId) : v.category === cat.name;
                if (belongs && (!oldCats[k] || oldCats[k].name === cat.name)) { found = true; }
                return found;
              });
              remove = !found;
            }
          } else if (opt.mode === "collection" && store === opt.store) {
            /* a colecao inteira acabou de ser rebaixada: o que nao veio
               nesta geracao nao existe mais no provedor */
            remove = v.generation !== gen;
          } else if (opt.mode === "category" && store === opt.store) {
            var belongs = v.catalogCategoryId !== undefined ? String(v.catalogCategoryId) === String(opt.catId) : v.category === opt.categoryName;
            remove = belongs && v.generation !== gen;
          } else if (opt.mode === "series" && store === "episodes") {
            remove = v.seriesId === opt.seriesId && v.generation !== gen;
          }
          if (store === "episodes" && removedSeries[v.seriesId]) { remove = true; }
          if (remove) {
            if (store === "series") { removedSeries[v.id] = true; }
            c.delete();
            if (store === "live") { stats.podados++; }
          }
          c["continue"]();
        };
      }
    });
  }

  function get(store, id, cb) {
    open(function (err, d) {
      if (err) { return cb(err); }
      var r = d.transaction(store, "readonly").objectStore(store).get(id);
      r.onsuccess = function () { cb(null, r.result || null); };
      r.onerror = function (e) { cb(erroDe(e)); };
    });
  }

  function del(store, id, cb) {
    open(function (err, d) {
      if (err) { return cb(err); }
      var tx = d.transaction(store, "readwrite");
      tx.objectStore(store).delete(id);
      tx.oncomplete = function () { cb(null); };
      tx.onerror = function (e) { cb(erroDe(e)); };
    });
  }

  /* apaga tudo de uma fonte numa store, por cursor (sem carregar) */
  function clearSource(store, sourceId, cb) {
    open(function (err, d) {
      if (err) { return cb(err); }
      var tx = d.transaction(store, "readwrite");
      var idx = tx.objectStore(store).index("src");
      var n = 0;
      var req = idx.openKeyCursor(IDBKeyRange.only(sourceId));
      req.onsuccess = function (e) {
        var c = e.target.result;
        if (!c) { return; }
        tx.objectStore(store).delete(c.primaryKey);
        n++;
        c["continue"]();
      };
      tx.oncomplete = function () { cb(null, n); };
      tx.onerror = function (e) { cb(erroDe(e)); };
    });
  }

  /* apaga os ids de uma fonte que NAO estao no conjunto novo */
  function pruneSource(store, sourceId, manterIds, cb) {
    open(function (err, d) {
      if (err) { return cb(err); }
      var tx = d.transaction(store, "readwrite");
      var st = tx.objectStore(store);
      var n = 0;
      var req = st.index("src").openKeyCursor(IDBKeyRange.only(sourceId));
      req.onsuccess = function (e) {
        var c = e.target.result;
        if (!c) { return; }
        if (!manterIds[c.primaryKey]) { st.delete(c.primaryKey); n++; }
        c["continue"]();
      };
      tx.oncomplete = function () { cb(null, n); };
      tx.onerror = function (e) { cb(erroDe(e)); };
    });
  }

  /* --------------------------------------------------------- leitura */

  function count(store, sourceId, category, cb) {
    open(function (err, d) {
      if (err) { return cb(err); }
      var st = d.transaction(store, "readonly").objectStore(store);
      var r;
      if (category && category !== "__all__") {
        var pfx = sourceId + "|" + category + "|";
        r = st.index("catKeys").count(IDBKeyRange.bound(pfx, pfx + "\uffff"));
      } else if (sourceId) {
        r = st.index("src").count(IDBKeyRange.only(sourceId));
      } else { r = st.count(); }
      r.onsuccess = function () { cb(null, r.result); };
      r.onerror = function (e) { cb(erroDe(e)); };
    });
  }

  /*
   * query: a leitura principal. Devolve {total, offset, items}.
   *   opt.store     "live" | "vod" | "series" | "episodes"
   *   opt.sourceId
   *   opt.category  nome, ou "__all__"
   *   opt.q         busca por substring no nome (varredura, limitada)
   *   opt.offset / opt.limit
   * Sem q: usa indice + cursor.advance(offset), nunca carrega tudo.
   * Com q: varre a fonte por cursor testando indexOf; 3 mil itens e
   * questao de milissegundos; para 10 mil, aceitavel.
   */
  function query(opt, cb) {
    open(function (err, d) {
      if (err) { return cb(err); }
      var store = opt.store || "live";
      var offset = opt.offset || 0, limit = opt.limit || 120;
      var q = (opt.q || "").toLowerCase();
      var st = d.transaction(store, "readonly").objectStore(store);
      var range, idx;
      if (opt.category && opt.category !== "__all__") {
        var pfx = opt.sourceId + "|" + opt.category + "|";
        idx = st.index("catKeys"); range = IDBKeyRange.bound(pfx, pfx + "\uffff");
      } else if (opt.sourceId) {
        /* Comeca no inicio da fonte: offset conta RESULTADOS da busca,
           e pos pode ter lacunas apos a poda. Nunca aplicar offset no range. */
        idx = st.index("srcPos");
        range = IDBKeyRange.bound([opt.sourceId, 0], [opt.sourceId, 99999999]);
      } else { idx = st; range = null; }

      var items = [], vistos = 0, avancou = false, total = 0;

      if (!q) {
        /* total por chave SIMPLES (barato); o cursor ordenado fica so
           para os itens. Contar pelo indice composto a cada pagina e
           trabalho O(n) que a TV nao precisa fazer. */
        var rcIdx = idx, rcRange = range;
        if (!(opt.category && opt.category !== "__all__") && opt.sourceId) {
          rcIdx = st.index("src"); rcRange = IDBKeyRange.only(opt.sourceId);
        }
        var rc = rcIdx.count(rcRange);
        rc.onsuccess = function () {
          total = rc.result;
          if (offset >= total) { return cb(null, { total: total, offset: offset, items: [] }); }
          var req = idx.openCursor(range);
          req.onsuccess = function (e) {
            var c = e.target.result;
            if (!c) { return cb(null, { total: total, offset: offset, items: items }); }
            if (!avancou && offset > 0) { avancou = true; return c.advance(offset); }
            avancou = true;
            items.push(c.value);
            if (items.length >= limit) { return cb(null, { total: total, offset: offset, items: items }); }
            c["continue"]();
          };
          req.onerror = function (e) { cb(erroDe(e)); };
        };
        rc.onerror = function (e) { cb(erroDe(e)); };
        return;
      }

      /* BUSCA.
         O cursor de CHAVES (openKeyCursor) le so o indice "srcName"
         — [fonte, nome em minusculas] — e nao materializa o registro.
         Numa TV, percorrer 15 mil strings do indice e muito mais barato
         que desserializar 15 mil objetos com sinopse, elenco e genero
         so para ler o nome. Os valores sao lidos no fim, e apenas os da
         pagina pedida.
         O conjunto de chaves casadas volta em `matches`: quem chama pode
         guardar e filtrar em memoria enquanto o usuario digita, em vez de
         varrer o banco a cada letra. */
      function materializar(achados, truncado) {
        var janela = achados.slice(offset, offset + limit);
        var resultado = { total: achados.length, offset: offset, items: [],
                          matches: achados, truncated: !!truncado };
        if (!janela.length) { return cb(null, resultado); }
        var pendentes = janela.length, buffer = [];
        janela.forEach(function (m, i) {
          var g = st.get(m.k);
          g.onsuccess = function () {
            buffer[i] = g.result;
            pendentes--;
            if (!pendentes) {
              resultado.items = buffer.filter(function (x) { return !!x; });
              cb(null, resultado);
            }
          };
          g.onerror = function (e) { cb(erroDe(e)); };
        });
      }

      if (opt.sourceId && !(opt.category && opt.category !== "__all__")) {
        var nomes = st.index("srcName");
        var faixa = IDBKeyRange.bound([opt.sourceId, ""], [opt.sourceId, "\uffff"]);
        var achados = [];
        var kc = nomes.openKeyCursor(faixa);
        kc.onsuccess = function (e) {
          var c = e.target.result;
          if (!c) { return materializar(achados, false); }
          var nome = String(c.key[1]);
          if (nome.indexOf(q) >= 0) {
            achados.push({ k: c.primaryKey, n: nome });
            if (achados.length >= MAX_ACHADOS) { return materializar(achados, true); }
          }
          c["continue"]();
        };
        kc.onerror = function (e) { cb(erroDe(e)); };
        return;
      }

      /* dentro de uma categoria o indice nao carrega o nome: varredura com
         filtro, sobre um conjunto ja pequeno */
      var req2 = idx.openCursor(range);
      req2.onsuccess = function (e) {
        var c = e.target.result;
        if (!c) { return cb(null, { total: total, offset: offset, items: items }); }
        var v = c.value;
        if (v.nameLower && v.nameLower.indexOf(q) >= 0) {
          if (vistos >= offset && items.length < limit) { items.push(v); }
          vistos++; total++;
        }
        c["continue"]();
      };
      req2.onerror = function (e) { cb(erroDe(e)); };
    });
  }

  /* Lista [chave, nome] de uma fonte inteira, lida so do indice.
     E a materia-prima da busca: com ela na memoria, procurar vira filtro
     de strings em vez de varredura do banco. Devolve truncado=true quando
     passa do teto — nesse caso quem chamou NAO deve guardar a lista, para
     nao responder busca com catalogo pela metade. */
  function nameIndex(store, sourceId, max, cb) {
    open(function (err, d) {
      if (err) { return cb(err); }
      var st = d.transaction(store, "readonly").objectStore(store);
      var faixa = IDBKeyRange.bound([sourceId, ""], [sourceId, "\uffff"]);
      var lista = [], req = st.index("srcName").openKeyCursor(faixa);
      req.onsuccess = function (e) {
        var c = e.target.result;
        if (!c) { return cb(null, lista, false); }
        lista.push({ k: c.primaryKey, n: String(c.key[1]) });
        if (lista.length >= max) { return cb(null, lista, true); }
        c["continue"]();
      };
      req.onerror = function (e) { cb(erroDe(e)); };
    });
  }

  /* le varios registros por chave numa transacao so */
  function getMany(store, chaves, cb) {
    if (!chaves || !chaves.length) { return cb(null, []); }
    open(function (err, d) {
      if (err) { return cb(err); }
      var st = d.transaction(store, "readonly").objectStore(store);
      var saida = [], pendentes = chaves.length;
      chaves.forEach(function (chave, i) {
        var g = st.get(chave);
        g.onsuccess = function () {
          saida[i] = g.result; pendentes--;
          if (!pendentes) { cb(null, saida.filter(function (x) { return !!x; })); }
        };
        g.onerror = function (e) { cb(erroDe(e)); };
      });
    });
  }

  /* categorias de uma fonte e tipo, com contagem opcional */
  function categoriesOf(sourceId, type, cb) {
    open(function (err, d) {
      if (err) { return cb(err); }
      var idx = d.transaction("categories", "readonly").objectStore("categories").index("srcType");
      var r = idx.getAll(IDBKeyRange.only([sourceId, type]));
      r.onsuccess = function () {
        var lista = r.result || [];
        lista.sort(function (a, b) {
          if (a.name === "Outros") { return 1; } if (b.name === "Outros") { return -1; }
          return a.name < b.name ? -1 : (a.name > b.name ? 1 : 0);
        });
        cb(null, lista);
      };
      r.onerror = function (e) { cb(erroDe(e)); };
    });
  }

  function episodesOf(sourceId, seriesId, cb) {
    var parent = identity(seriesId);
    if (parent && parent[0] !== String(sourceId)) { return cb("serie pertence a outra fonte"); }
    seriesId = parent ? seriesId : key(sourceId, "series", String(seriesId).replace(/^s(?=\d)/, ""));
    open(function (err, d) {
      if (err) { return cb(err); }
      var r = d.transaction("episodes", "readonly").objectStore("episodes").index("serie").getAll(IDBKeyRange.only(seriesId));
      r.onsuccess = function () {
        var l = r.result || [];
        l.sort(function (a, b) { return (a.season - b.season) || (a.num - b.num); });
        cb(null, l);
      };
      r.onerror = function (e) { cb(erroDe(e)); };
    });
  }

  /* -------------------------------------------------------- meta */
  function metaGet(id, cb) { get("meta", id, function (e, r) { cb(e, r ? r.valor : null); }); }
  function metaSet(id, valor, cb) { put("meta", { id: id, valor: valor, em: Date.now() }, cb || function () {}); }
  function sources(cb) {
    open(function (e, d) {
      if (e) { return cb(e); }
      var r = d.transaction("sources", "readonly").objectStore("sources").getAll();
      r.onsuccess = function () { cb(null, r.result || []); };
      r.onerror = function (error) { cb(erroDe(error)); };
    });
  }
  function saveSource(source, active, cb) {
    open(function (e, d) {
      if (e) { return cb(e); }
      var tx = d.transaction(["sources", "meta"], "readwrite");
      transactionDone(tx, cb, source);
      tx.objectStore("sources").put(source);
      if (active) { tx.objectStore("meta").put({ id: "activeSource", valor: source.id, em: Date.now() }); }
    });
  }

  /* -------------------------------------------------------- resumo */
  function resumo(sourceId, cb) {
    var out = {}, pend = CATALOGO.length;
    CATALOGO.forEach(function (s) {
      count(s, sourceId, null, function (e, n) {
        out[s] = e ? -1 : n;
        if (--pend === 0) { cb(null, out); }
      });
    });
  }

  function wipe(cb) {
    if (db) { try { db.close(); } catch (e) {} db = null; }
    var r = indexedDB.deleteDatabase(NOME);
    r.onsuccess = function () { cb(null); };
    r.onerror = function (e) { cb(erroDe(e)); };
    r.onblocked = function () { cb("bloqueado"); };
  }

  return {
    open: open, putMany: putMany, put: put, get: get, del: del,
    clearSource: clearSource, pruneSource: pruneSource,
    count: count, query: query, getMany: getMany, nameIndex: nameIndex,
    categoriesOf: categoriesOf, episodesOf: episodesOf,
    metaGet: metaGet, metaSet: metaSet, resumo: resumo, wipe: wipe,
    sources: sources, saveSource: saveSource,
    key: key, identity: identity, providerId: providerId, canonical: canonical,
    stage: stage, discard: discard, commit: commit, LOTE: LOTE
  };
})();
window.DB = DB;
