/*
 * Log — telemetria do app.
 *
 * Tres saidas simultaneas:
 *   1. console            (util no Chrome do PC)
 *   2. POST /api/log      (arquivo no seu PC, para analisar depois)
 *   3. HUD na tela        (tecla AMARELA)
 *
 * Captura tambem erros que ninguem tratou: window.onerror e
 * unhandledrejection. Numa TV sem console acessivel, isso e a diferenca
 * entre "travou" e "travou por causa disso".
 */
var Log = (function () {
  "use strict";

  var buf = [];            /* fila de envio */
  var ring = [];           /* ultimas linhas para o HUD */
  var RING_MAX = 40;
  /* Espelho no proprio banco da TV.
     Sem endereco de PC configurado, flush() nao tem para onde enviar e o
     diagnostico morria no recarregamento — exatamente quando mais se
     precisa dele, depois de um travamento. O anel duravel sobrevive ao
     reinicio do app e pode ser lido pelo HUD (tecla AMARELA) ou
     despejado por Log.dump(). */
  var durable = [], DURABLE_MAX = 300, durableSujo = false, durableTimer = null;
  var DURABLE_MS = 15000;
  var seq = 0;
  var sessionId = "s" + Date.now().toString(36) + Math.floor(Math.random() * 1000);
  var timer = null;
  var enabled = true;
  var hudEl = null, hudOn = false;
  var stats = {};          /* metricas ao vivo mostradas no HUD */
  var pendingPlayback = [], sending = false;
  function durableKey(e) { return e.data && e.data.playbackId || e.session + ":" + e.seq; }
  function persist() { Store.pref("playbackOutbox", JSON.stringify(pendingPlayback.slice(-100))); }

  function nowIso() { return new Date().toISOString(); }

  function push(level, tag, msg, data) {
    if (!enabled) { return; }
    var rec = {
      seq: ++seq, ts: nowIso(), level: level, tag: tag,
      msg: msg, data: data || null, session: sessionId
    };
    buf.push(rec);
    if (tag === "playback") { pendingPlayback.push(rec); pendingPlayback = pendingPlayback.slice(-100); persist(); }
    if (buf.length > 300) { buf.shift(); }

    ring.push(rec);
    if (ring.length > RING_MAX) { ring.shift(); }

    durable.push(rec);
    if (durable.length > DURABLE_MAX) { durable.shift(); }
    durableSujo = true;
    agendarDurable();

    try {
      var line = "[" + tag + "] " + msg;
      if (level === "error") { console.error(line, data || ""); }
      else if (level === "warn") { console.warn(line, data || ""); }
      else { console.log(line, data || ""); }
    } catch (e) {}

    if (hudOn) { renderHud(); }
    schedule();
  }

  function persistirDurable() {
    durableTimer = null;
    if (!durableSujo || !window.DB || !DB.metaSet) { return; }
    durableSujo = false;
    try { DB.metaSet("logRing", durable.slice(-DURABLE_MAX), function () {}); } catch (e) {}
  }
  function agendarDurable() {
    if (durableTimer || !window.DB || !DB.metaSet) { return; }
    durableTimer = setTimeout(persistirDurable, DURABLE_MS);
  }

  function schedule() {
    if (timer) { return; }
    timer = setTimeout(function () { timer = null; flush(); }, 1500);
  }

  function flush() {
    if (sending || (!buf.length && !pendingPlayback.length)) { return; }
    var base = API.getBase();
    if (!base) { return; }
    var batch = buf.slice(0);
    buf = [];
    var ids = Object.create(null);
    batch.forEach(function (e) { if (e.tag === "playback") { ids[durableKey(e)] = true; } });
    pendingPlayback.forEach(function (e) { var id = durableKey(e); if (!ids[id]) { batch.push(e); ids[id] = true; } });
    sending = true;
    var x = new XMLHttpRequest();
    x.open("POST", base + "/api/log", true);
    /* text/plain evita preflight CORS */
    x.setRequestHeader("Content-Type", "text/plain");
    x.timeout = 8000;
    var done = false;
    function finish(ok) {
      if (done) { return; } done = true; sending = false;
      if (ok) { pendingPlayback = pendingPlayback.filter(function (e) { return !ids[durableKey(e)]; }); persist(); }
    }
    x.onload = function () {
      var r = null; try { r = JSON.parse(x.responseText); } catch (ignore) {}
      finish(x.status >= 200 && x.status < 300 && r && r.ok === true);
    };
    x.onerror = x.ontimeout = function () { finish(false); };
    try {
      x.send(JSON.stringify({ session: sessionId, events: batch }));
    } catch (e) { finish(false); }
  }

  /* ---------- HUD ---------- */
  function ensureHud() {
    if (hudEl) { return hudEl; }
    hudEl = document.createElement("div");
    hudEl.id = "loghud";
    hudEl.className = "loghud hidden";
    document.body.appendChild(hudEl);
    return hudEl;
  }

  function renderHud() {
    var el = ensureHud();
    var h = '<div class="loghud-stats">';
    var k;
    for (k in stats) {
      if (stats.hasOwnProperty(k)) {
        h += '<span class="loghud-stat"><b>' + esc(k) + '</b> ' + esc(stats[k]) + "</span>";
      }
    }
    h += "</div><div class='loghud-lines'>";
    var i, start = Math.max(0, ring.length - 26);
    for (i = start; i < ring.length; i++) {
      var r = ring[i];
      var t = r.ts.slice(11, 19);
      var cls = "lv-" + r.level;
      var extra = "";
      if (r.data) {
        try {
          extra = JSON.stringify(r.data);
          if (extra.length > 110) { extra = extra.slice(0, 107) + "..."; }
        } catch (e) { extra = ""; }
      }
      h += '<div class="' + cls + '">' + t + "  [" + r.tag + "] " +
           esc(r.msg) + (extra ? ("  " + esc(extra)) : "") + "</div>";
    }
    h += "</div>";
    el.innerHTML = h;
  }

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function toggleHud() {
    hudOn = !hudOn;
    var el = ensureHud();
    el.className = "loghud" + (hudOn ? "" : " hidden");
    if (hudOn) { renderHud(); }
    return hudOn;
  }

  /* ---------- captura de erros nao tratados ---------- */
  function install() {
    if (window.DB && DB.metaGet) {
      DB.metaGet("logRing", function (e, anterior) {
        if (e || !anterior || !anterior.length) { return; }
        durable = anterior.slice(-DURABLE_MAX).concat(durable).slice(-DURABLE_MAX);
        push("info", "log", "diagnostico da sessao anterior recuperado", { linhas: anterior.length });
      });
    }
    try { pendingPlayback = JSON.parse(Store.pref("playbackOutbox") || "[]"); } catch (ignore) { pendingPlayback = []; }
    if (!Array.isArray(pendingPlayback)) { pendingPlayback = []; }
    pendingPlayback = pendingPlayback.filter(function (e) { return e && e.tag === "playback" && e.data; }).slice(-100);
    if (pendingPlayback.length) { schedule(); }
    window.onerror = function (msg, src, line, col, err) {
      push("error", "js", String(msg), {
        src: src, line: line, col: col,
        stack: err && err.stack ? String(err.stack).slice(0, 900) : null
      });
      return false;
    };
    if (window.addEventListener) {
      window.addEventListener("unhandledrejection", function (e) {
        var r = e.reason;
        push("error", "promise", r && r.message ? r.message : String(r),
             { stack: r && r.stack ? String(r.stack).slice(0, 900) : null });
      }, false);
    }
    /* O orquestrador encerra e persiste playback ANTES de chamar flush. */
  }

  return {
    install: install,
    dump: function () { return durable.slice(0); },
    persist: persistirDurable,
    info:  function (tag, msg, d) { push("info", tag, msg, d); },
    warn:  function (tag, msg, d) { push("warn", tag, msg, d); },
    error: function (tag, msg, d) { push("error", tag, msg, d); },
    event: function (tag, d) { push("info", tag, "event", d); },
    flush: flush,
    toggleHud: toggleHud,
    hudVisible: function () { return hudOn; },
    stat: function (k, v) { stats[k] = v; if (hudOn) { renderHud(); } },
    session: function () { return sessionId; },
    setEnabled: function (v) { enabled = !!v; }
  };
})();
window.Log = Log;
