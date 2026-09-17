/*
 * Shelf — consultas de vitrine para a home.
 *
 * Os registros de favoritos/historico guardam so o necessario para listar
 * (sem URL de video nem credencial). Para desenhar poster e ficha, a home
 * precisa reencontrar o item no catalogo: e o que hydrate() faz.
 *
 * LIMITE ASSUMIDO em recent(): o IndexedDB v2 nao tem indice por "added",
 * e criar um exigiria subir a versao do banco e mexer na migracao ja
 * validada na TV. Entao a varredura le no maximo MAX_SCAN registros na
 * ordem do provedor e ordena essa amostra. "Recentes" aqui significa
 * "mais recentes dentro da amostra", nao do catalogo inteiro.
 */
var Shelf = (function () {
  "use strict";

  var MAX_SCAN = 500;
  var CATALOGO = ["live", "vod", "series", "episodes"];

  /* o historico guarda kind "episode"; o store chama-se "episodes" */
  function storeOf(kind) { return kind === "episode" ? "episodes" : kind; }

  /* campos que a vitrine usa; o resto do registro fica no banco */
  var VITRINE = ["logo", "logoOriginal", "plot", "rating", "genre", "added",
                 "container", "format", "chno", "catchup", "playable",
                 "seriesId", "season", "num", "url"];

  function hydrate(rows, cb) {
    if (!rows || !rows.length) { return cb(null, rows || []); }
    DB.open(function (err, db) {
      /* sem banco a lista ainda serve para remover favorito */
      if (err) { return cb(null, rows); }
      var tx;
      try { tx = db.transaction(CATALOGO, "readonly"); }
      catch (e) { return cb(null, rows); }
      rows.forEach(function (row) {
        var name = storeOf(row.kind);
        if (CATALOGO.indexOf(name) < 0) { return; }
        var req = tx.objectStore(name).get(row.id);
        req.onsuccess = function () {
          var item = req.result;
          if (!item) { row.missing = true; return; }
          VITRINE.forEach(function (k) {
            if (row[k] === undefined && item[k] !== undefined) { row[k] = item[k]; }
          });
          if (!row.category) { row.category = item.category; }
          if (row.kind !== "episode") { return; }
          /* A arte do episodio quase sempre vem vazia do provedor, e quando
             vem e um still 16:9 dentro de um espaco 2:3. Os streamings
             mostram a capa da SERIE em "continuar assistindo"; e o que
             transforma a trilha numa estante e nao numa fileira de buracos. */
          var pai = item.seriesId || row.seriesId;
          if (!pai) { return; }
          var serie = tx.objectStore("series").get(pai);
          serie.onsuccess = function () {
            var dono = serie.result;
            if (!dono) { return; }
            row.seriesName = dono.name;
            if (dono.logo) { row.logo = dono.logo; row.logoOriginal = dono.logoOriginal || dono.logo; }
          };
        };
      });
      tx.oncomplete = function () { cb(null, rows); };
      tx.onabort = function () { cb(null, rows); };
    });
  }

  /* projecao enxuta: 500 registros de VOD com sinopse e elenco seriam
     megabytes numa TV com ~190 MB livres */
  function resumir(v) {
    return { id: v.id, sourceId: v.sourceId, name: v.name, kind: v.kind,
             category: v.category, logo: v.logo, logoOriginal: v.logoOriginal,
             added: v.added, rating: v.rating, genre: v.genre,
             container: v.container, playable: v.playable, chno: v.chno };
  }

  function recent(store, sourceId, limit, cb) {
    DB.open(function (err, db) {
      if (err) { return cb(String(err)); }
      var tx;
      try { tx = db.transaction([store], "readonly"); }
      catch (e) { return cb(String(e.message || e)); }
      var amostra = [], lidos = 0;
      var idx = tx.objectStore(store).index("srcPos");
      var req = idx.openCursor(IDBKeyRange.bound([sourceId, 0], [sourceId, 99999999]));
      req.onsuccess = function () {
        var c = req.result;
        if (!c) { return; }
        amostra.push(resumir(c.value));
        lidos++;
        if (lidos >= MAX_SCAN) { return; }
        c["continue"]();
      };
      tx.oncomplete = function () {
        /* "added" do Xtream e epoch em segundos; quando nenhum item tem,
           a ordem do provedor e a melhor informacao disponivel. */
        var datados = amostra.filter(function (i) { return Number(i.added) > 0; });
        var lista = amostra;
        if (datados.length) {
          datados.sort(function (a, b) { return Number(b.added) - Number(a.added); });
          lista = datados;
        }
        cb(null, lista.slice(0, limit));
      };
      tx.onabort = function () { cb("nao foi possivel ler o catalogo local"); };
    });
  }

  return { hydrate: hydrate, recent: recent, storeOf: storeOf };
})();
window.Shelf = Shelf;
