/* Dados pessoais locais. Chaves do catalogo incluem fonte, tipo e ID externo.
   Nunca guardamos URLs de reproducao ou credenciais nestes registros. */
var Library = (function () {
  "use strict";
  var JOURNAL = "iptv.progressJournal", ready = false, waiters = null;
  function noop() {}
  function identity(item) {
    var a = item && DB.identity(item.id);
    return a && (!item.sourceId || String(item.sourceId) === a[0]) ? a : null;
  }
  function snapshot(item) {
    var a = identity(item);
    if (!a) { throw new Error("Sincronize esta fonte na TV para usar sua biblioteca local."); }
    return { id:item.id, sourceId:a[0], kind:a[1] === "episodes" ? "episode" : a[1],
      name:String(item.name || "Sem titulo"), category:String(item.category || ""), seriesId:item.seriesId || null };
  }
  function transaction(store, action, cb) {
    cb = cb || noop;
    DB.open(function (err, db) {
      if (err) { return cb(err); }
      var tx, result, failure;
      try {
        tx = db.transaction([store], "readwrite");
        tx.oncomplete = function () { cb(null, result); };
        tx.onabort = function () { cb(failure || "Nao foi possivel salvar na TV."); };
        tx.onerror = function () {};
        action(tx.objectStore(store), function (r) { result = r; });
      } catch (e) { failure = e.message; if (tx) { tx.abort(); } else { cb(failure); } }
    });
  }
  function writeProgress(record, cb) {
    transaction("history", function (store, result) { store.put(record); result(record); }, cb);
  }
  function init(cb) {
    cb = cb || noop;
    if (ready) { return cb(null); }
    if (waiters) { waiters.push(cb); return; }
    waiters = [cb];
    var record = null;
    try { record = JSON.parse(localStorage.getItem(JOURNAL) || "null"); } catch (ignore) {}
    function done(err) {
      if (!err) { ready = true; }
      var pending = waiters; waiters = null; pending.forEach(function (f) { f(err); });
    }
    if (!record || !identity(record) || !isFinite(record.position) || record.position < 0) { return done(null); }
    writeProgress(record, function (err) {
      if (!err) { try { localStorage.removeItem(JOURNAL); } catch (ignore) {} }
      done(err);
    });
  }
  function toggle(item, cb) {
    var row;
    try { row = snapshot(item); } catch (e) { return cb(e.message); }
    transaction("favorites", function (store, result) {
      var req = store.get(row.id);
      req.onsuccess = function () {
        if (req.result) { store.delete(row.id); result(false); }
        else { row.addedAt = Date.now(); store.put(row); result(true); }
      };
    }, cb);
  }
  function progress(item, cb) { init(function (err) { if (err) { return cb(err); } DB.get("history", item.id, cb); }); }
  function save(item, position, duration, ended, cb) {
    cb = cb || noop;
    var row;
    try { row = snapshot(item); } catch (e) { return cb(e.message); }
    if (["vod", "episode"].indexOf(row.kind) < 0 || !isFinite(position) || position < 0) { return cb(null); }
    row.duration = isFinite(duration) && duration > 0 ? duration : null;
    row.position = position;
    row.completed = !!ended || !!(row.duration && position >= row.duration - Math.min(30, row.duration * 0.05));
    row.watchedAt = Date.now();
    var serialized = JSON.stringify(row);
    /* Um unico checkpoint pequeno e sincrono cobre pagehide. Escritas regulares
       vao ao IndexedDB; o journal e reaplicado antes da primeira leitura. */
    init(function (error) {
      if (error) { return cb(error); }
      try { localStorage.setItem(JOURNAL, serialized); } catch (ignore) {}
      writeProgress(row, function (err) {
        if (!err) {
          try { if (localStorage.getItem(JOURNAL) === serialized) { localStorage.removeItem(JOURNAL); } } catch (ignore) {}
        }
        cb(err, row);
      });
    });
  }
  function resumable(row) { return !!(row && !row.completed && isFinite(row.position) && row.position >= 10); }
  function page(storeName, source, offset, limit, cb) {
    init(function (err) {
      if (err) { return cb(err); }
      DB.open(function (error, db) {
        if (error) { return cb(error); }
        var tx = db.transaction([storeName], "readonly"), total = 0, items = [];
        var req = tx.objectStore(storeName).index(storeName === "favorites" ? "addedAt" : "watchedAt").openCursor(null, "prev");
        req.onsuccess = function () {
          var cursor = req.result; if (!cursor) { return; }
          var row = cursor.value;
          if (row.sourceId === source && (storeName !== "history" || resumable(row))) {
            if (total >= offset && items.length < limit) { items.push(row); } total++;
          }
          cursor.continue();
        };
        tx.oncomplete = function () { cb(null, {total:total, items:items}); };
        tx.onabort = function () { cb("Nao foi possivel ler a biblioteca."); };
      });
    });
  }
  /* Uma transacao so responde as duas perguntas que a lista faz de cada
     item: esta favoritado? tem progresso salvo? A grade de posters usa o
     progresso para desenhar a barrinha, igual ao painel da referencia. */
  function decorate(items, cb) {
    DB.open(function (err, db) {
      if (err || !items.length) { return cb(items); }
      var tx;
      try { tx = db.transaction(["favorites", "history"], "readonly"); }
      catch (e) { return cb(items); }
      var favorites = tx.objectStore("favorites"), history = tx.objectStore("history");
      items.forEach(function (item) {
        var f = favorites.get(item.id);
        f.onsuccess = function () { item.favorite = !!f.result; };
        var h = history.get(item.id);
        h.onsuccess = function () {
          var row = h.result;
          if (!row) { return; }
          item.position = row.position; item.duration = row.duration; item.completed = !!row.completed;
        };
      });
      tx.oncomplete = function () { cb(items); }; tx.onabort = function () { cb(items); };
    });
  }
  return {init:init, toggle:toggle, progress:progress, save:save, resumable:resumable, page:page, decorate:decorate};
})();
window.Library = Library;
