/* Armazenamento. DB8 e assincrono e aguenta milhares de registros;
   localStorage no webOS e pequeno e SINCRONO — trava a UI da TV.
   A sondagem devolveu "kind not registered": o DB8 responde,
   so falta registrar a kind com putKind. */
var Store = (function () {
  "use strict";
  var KIND = "com.iptv.tvapp.channel:1";
  var useDb8 = false;

  function init(cb) {
    if (typeof PalmServiceBridge === "undefined") { useDb8 = false; return cb(false); }
    Luna.call("luna://com.webos.service.db/putKind", {
      id: KIND, owner: "com.iptv.tvapp",
      indexes: [{ name: "id", props: [{ name: "id" }] },
                { name: "category", props: [{ name: "category" }] }]
    }, function (v) {
      useDb8 = !!(v && v.returnValue);
      cb(useDb8);
    });
  }

  /* preferencias pequenas: localStorage serve (poucos bytes, lidos no boot) */
  function pref(k, v) {
    try {
      if (v === undefined) { return localStorage.getItem("iptv." + k); }
      localStorage.setItem("iptv." + k, v); return v;
    } catch (e) { return null; }
  }

  function putChannels(list, cb) {
    if (!useDb8) { return cb(false); }
    var objs = [], i;
    for (i = 0; i < list.length; i++) {
      objs.push({ _kind: KIND, id: list[i].id, name: list[i].name,
                  category: list[i].category, logo: list[i].logo });
    }
    Luna.call("luna://com.webos.service.db/put", { objects: objs },
      function (v) { cb(!!(v && v.returnValue)); });
  }

  return { init: init, pref: pref, putChannels: putChannels,
           usingDb8: function () { return useDb8; } };
})();
window.Store = Store;
