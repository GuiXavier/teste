/* Cliente do backend. XMLHttpRequest em vez de fetch: bulletproof no Cr79
   e da controle de timeout, que numa TV em wifi importa. */
var API = (function () {
  "use strict";
  var base = "";
  var availability = { online: false, checkedAt: 0 }, epoch = 0, checking = null;
  var AVAILABILITY_MS = 30000;
  function available() { return !!base && !simularOffline && availability.online && Date.now() - availability.checkedAt < AVAILABILITY_MS; }
  function check(cb, force) {
    if (!base || simularOffline) { return cb(false); }
    if (!force && Date.now() - availability.checkedAt < AVAILABILITY_MS) { return cb(available()); }
    if (checking) { checking.push(cb); return; }
    var waiters = checking = [cb], version = epoch;
    req("GET", "/api/health", null, function (e, h) {
      if (checking === waiters) { checking = null; }
      if (version === epoch) { availability = { online: !e && !!h && h.ok === true, checkedAt: Date.now() }; }
      waiters.forEach(function (fn) { fn(version === epoch && available(), h); });
    }, 3000);
  }

  /* Simulacao: tudo falha como se o PC estivesse desligado, EXCETO a
     telemetria — assim da para ler o log do modo local sem depender de
     foto da tela. Ligado pela tela de configuracao. */
  var simularOffline = false;
  function scope(o) {
    var q = [];
    if (o.sourceId) { q.push("sourceId=" + encodeURIComponent(o.sourceId)); }
    if (o.generation) { q.push("generation=" + encodeURIComponent(o.generation)); }
    if (o.sync) { q.push("sync=1", "alive=0"); }
    return q;
  }

  function req(method, path, body, cb, timeout) {
    var version = epoch, done = false, callback = cb;
    cb = function (e, r) { if (!done) { done = true; callback(e, r); } };
    if (simularOffline && path.indexOf("/api/log") !== 0) {
      return setTimeout(function () {
        cb(new Error("simulacao: servidor desligado"));
      }, 30);
    }
    var x = new XMLHttpRequest();
    x.open(method, base + path, true);
    x.timeout = timeout || (/\/activate(?:\?|$)/.test(path) ? 240000 : 15000);
    x.onload = function () {
      var d = null;
      try { d = JSON.parse(x.responseText); } catch (e) {}
      if (x.status >= 200 && x.status < 300) {
        if (version === epoch && d && path !== "/api/health") {
          availability = { online: true, checkedAt: Date.now() };
        }
        cb(null, d);
      }
      else { cb(new Error((d && d.error) || ("HTTP " + x.status)), null); }
    };
    function offline(reason) {
      if (version === epoch) { availability = { online: false, checkedAt: Date.now() }; }
      cb(new Error(reason), null);
    }
    x.onerror = function () { offline("rede"); };
    x.ontimeout = function () { offline("timeout"); };
    if (body) { x.setRequestHeader("Content-Type", "text/plain"); x.send(JSON.stringify(body)); }
    else { x.send(); }
  }

  return {
    setBase: function (b) { if (base !== b) { epoch++; checking = null; availability = { online: false, checkedAt: 0 }; } base = b; },
    getBase: function () { return base; },
    available: available, check: check,
    health: function (cb) { check(function (ok, h) { cb(ok ? null : new Error("servidor indisponivel"), h); }, true); },
    probeFile: function (url, per, cb) { req("POST", "/api/probe-file", { url: url, perChannel: per }, cb, 12000); },
    categories: function (o, cb) {
      if (typeof o === "function") { cb = o; o = {}; }
      o = o || {};
      var q = scope(o); if (o.type) { q.push("type=" + encodeURIComponent(o.type)); }
      req("GET", "/api/categories?" + q.join("&"), null, cb);
    },
    seriesInfo: function (id, cb, o) {
      req("GET", "/api/series/" + encodeURIComponent(id) + "?" + scope(o || {}).join("&"), null, cb);
    },
    channels: function (o, cb) {
      o = o || {};
      var q = scope(o);
      if (o.type && o.type !== "live") { q.push("type=" + encodeURIComponent(o.type)); }
      if (o.category) { q.push("category=" + encodeURIComponent(o.category)); }
      if (o.q) { q.push("q=" + encodeURIComponent(o.q)); }
      q.push("limit=" + (o.limit || 300));
      q.push("offset=" + (o.offset || 0));
      req("GET", "/api/channels?" + q.join("&"), null, cb);
    },
    play: function (id, cb) { req("GET", "/api/play/" + encodeURIComponent(id), null, cb); },

    /* --- configuracao e fontes --- */
    simularOffline: function (on) {
      if (on !== undefined && simularOffline !== !!on) { simularOffline = !!on; epoch++; checking = null; availability = { online: false, checkedAt: 0 }; }
      return simularOffline;
    },
    getConfig: function (cb) { req("GET", "/api/config", null, cb); },
    setConfig: function (patch, cb) { req("POST", "/api/config", patch, cb); },
    sources: function (cb) { req("GET", "/api/sources", null, cb); },
    addSource: function (d, cb) { req("POST", "/api/sources", d, cb); },
    testSource: function (d, cb) { req("POST", "/api/sources/test", d, cb); },
    sourceSecret: function (id, cb) {
      req("GET", "/api/sources/" + encodeURIComponent(id) + "/secret", null, cb);
    },
    activateSource: function (id, cb) {
      req("POST", "/api/sources/" + encodeURIComponent(id) + "/activate", {}, cb);
    }
  };
})();
window.API = API;
