/* Cliente do backend. XMLHttpRequest em vez de fetch: bulletproof no Cr79
   e da controle de timeout, que numa TV em wifi importa. */
var API = (function () {
  "use strict";
  var base = "";

  function req(method, path, body, cb) {
    var x = new XMLHttpRequest();
    x.open(method, base + path, true);
    x.timeout = 15000;
    x.onload = function () {
      var d = null;
      try { d = JSON.parse(x.responseText); } catch (e) {}
      if (x.status >= 200 && x.status < 300) { cb(null, d); }
      else { cb(new Error((d && d.error) || ("HTTP " + x.status)), null); }
    };
    x.onerror = function () { cb(new Error("rede"), null); };
    x.ontimeout = function () { cb(new Error("timeout"), null); };
    if (body) { x.setRequestHeader("Content-Type", "text/plain"); x.send(JSON.stringify(body)); }
    else { x.send(); }
  }

  return {
    setBase: function (b) { base = b; },
    getBase: function () { return base; },
    health: function (cb) { req("GET", "/api/health", null, cb); },
    categories: function (cb) { req("GET", "/api/categories", null, cb); },
    channels: function (o, cb) {
      o = o || {};
      var q = [];
      if (o.category) { q.push("category=" + encodeURIComponent(o.category)); }
      if (o.q) { q.push("q=" + encodeURIComponent(o.q)); }
      q.push("limit=" + (o.limit || 300));
      q.push("offset=" + (o.offset || 0));
      req("GET", "/api/channels?" + q.join("&"), null, cb);
    },
    play: function (id, cb) { req("GET", "/api/play/" + encodeURIComponent(id), null, cb); },

    /* --- configuracao e fontes --- */
    getConfig: function (cb) { req("GET", "/api/config", null, cb); },
    setConfig: function (patch, cb) { req("POST", "/api/config", patch, cb); },
    sources: function (cb) { req("GET", "/api/sources", null, cb); },
    addSource: function (d, cb) { req("POST", "/api/sources", d, cb); },
    testSource: function (d, cb) { req("POST", "/api/sources/test", d, cb); },
    activateSource: function (id, cb) {
      req("POST", "/api/sources/" + encodeURIComponent(id) + "/activate", {}, cb);
    }
  };
})();
window.API = API;
