/* Barramento Luna sem depender do webOSTV.js.
   PalmServiceBridge e o global que a biblioteca da LG usa por baixo.
   Confirmado na 43UP7500PSF, SEM declarar ACG:
     PalmSystem.deviceInfo / systemproperty / connectionmanager / com.webos.audio
   Negados sem ACG: settingsservice, applicationManager. */
var Luna = (function () {
  "use strict";

  function call(uri, params, cb, timeoutMs) {
    var done = false;
    function fin(v, e) { if (!done) { done = true; cb(v, e); } }
    try {
      if (typeof PalmServiceBridge === "undefined") { return fin(null, "sem PalmServiceBridge"); }
      var b = new PalmServiceBridge();
      b.onservicecallback = function (s) {
        try { fin(JSON.parse(s), null); } catch (e) { fin(null, "resposta invalida"); }
      };
      b.call(uri, JSON.stringify(params || {}));
      setTimeout(function () { fin(null, "timeout"); }, timeoutMs || 4000);
    } catch (e) { fin(null, e.message); }
  }

  /* Nosso JS Service: o backend embutido. Chamadas de rede podem
     demorar (playlist grande, provedor lento), entao o timeout aqui
     e generoso — o servico fica vivo enquanto nao responder. */
  var SERVICE = "luna://com.iptv.tvapp.service/";
  function service(metodo, params, cb, timeoutMs) {
    call(SERVICE + metodo, params, function (r, e) {
      if (e) { return cb(null, e); }
      if (!r || r.returnValue === false) { return cb(null, (r && r.erro) || "servico falhou"); }
      cb(r, null);
    }, timeoutMs || 90000);
  }

  function deviceInfo() {
    try {
      if (typeof PalmSystem !== "undefined" && PalmSystem.deviceInfo) {
        return JSON.parse(PalmSystem.deviceInfo);
      }
    } catch (e) {}
    return null;
  }

  return {
    call: call,
    service: service,
    deviceInfo: deviceInfo,

    /* Resolucao FISICA do painel: 3840x2160 na UP7500, mesmo com
       viewport CSS de 1920x1080 (dpr 2). Use para dimensionar imagens. */
    panel: function () {
      var d = deviceInfo();
      return d ? { w: d.screenWidth, h: d.screenHeight, type: d.panelType, model: d.modelName } : null;
    },

    systemInfo: function (cb) {
      call("luna://com.webos.service.tv.systemproperty/getSystemInfo",
        { keys: ["modelName", "firmwareVersion", "UHD", "sdkVersion", "boardType"] }, cb);
    },

    /* Serve para dizer ao usuario que o travamento e a rede dele, nao o app */
    network: function (cb) {
      call("luna://com.webos.service.connectionmanager/getStatus", {}, function (v, e) {
        if (e || !v) { return cb(null, e); }
        var w = v.wifi || {}, wired = v.wired || {};
        cb({
          online: (w.state === "connected") || (wired.state === "connected"),
          medium: (wired.state === "connected") ? "cabo" : "wifi",
          ip: (wired.state === "connected" ? wired.ipAddress : w.ipAddress) || null
        }, null);
      });
    },

    volume: function (cb) { call("luna://com.webos.audio/getVolume", {}, cb); },

    /* O mute do <video> se comporta diferente entre a pipeline nativa e o MSE.
       Controlar pelo sistema e mais previsivel. */
    setVolume: function (v, cb) {
      call("luna://com.webos.audio/setVolume", { volume: v }, cb || function () {});
    }
  };
})();
window.Luna = Luna;
