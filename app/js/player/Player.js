/*
 * Player — nativo primeiro, hls.js de reserva.
 *
 * Estrategia decidida por MEDICAO na 43UP7500PSF:
 *   nativo   1500ms ate a imagem (mediana), 5/5 confiavel,
 *            toca .ts cru e arquivo empacotado,
 *            MAS nao expoe nenhum contador ao Chromium
 *   hls.js   2001ms, exige CORS (por isso sempre via proxy),
 *            nao toca .ts cru nem arquivo local
 *
 * A ESCADA DE ERROS abaixo veio do nodecast-tv (GPL-3.0), que ja tinha
 * resolvido isso melhor do que a primeira versao daqui:
 *   MEDIA_ERROR   -> hls.recoverMediaError(), NAO recarrega o canal
 *   NETWORK_ERROR -> 3 tentativas com atraso crescente, depois proxy
 *   contador reseta por TEMPO (30s sem erro), nao por evento
 *
 * Cuidados do webOS codificados aqui:
 *   - currentTime avanca em degraus de 200ms no caminho nativo (33ms no MSE)
 *   - drawImage(video) SEMPRE devolve preto (plano de overlay de hardware)
 *   - o atributo muted e respeitado no nativo e ignorado no MSE
 */
var Player = (function () {
  "use strict";

  function Player(videoEl, opts) {
    this.v = videoEl;
    this.opts = opts || {};
    this.hls = null;
    this.engine = null;
    this.current = null;
    this.triedFallback = false;
    this.listeners = [];
    this.on = { statechange: null, error: null };

    /* contadores da escada de erro */
    this.netRetry = 0;
    this.lastNetError = 0;
    this.mediaErrorCount = 0;
    this.lastRecovery = 0;

    this.generation = 0;
    this.timers = [];
  }

  Player.prototype._bind = function () {
    var self = this, generation = this.generation;
    function add(n, fn) {
      var guarded = function () { if (self.current && generation === self.generation) { fn(); } };
      self.v.addEventListener(n, guarded, false); self.listeners.push({ n: n, fn: guarded });
    }

    add("loadedmetadata", function () {
      self._emit("statechange", { state: "metadata", w: self.v.videoWidth, h: self.v.videoHeight });
    });
    add("playing", function () { self._emit("statechange", { state: "playing" }); });
    add("ended", function () { self._emit("statechange", { state: "ended" }); });
    add("waiting", function () { self._emit("statechange", { state: "buffering" }); });
    add("error", function () {
      var c = self.v.error ? self.v.error.code : 0;
      if (!c || !self.engine) { return; }
      var names = { 1: "ABORTED", 2: "NETWORK", 3: "DECODE", 4: "SRC_NOT_SUPPORTED" };
      self._fail("MediaError " + c + " " + (names[c] || ""));
    });
  };

  Player.prototype._emit = function (ev, data) { if (this.on[ev]) { this.on[ev](data); } };
  Player.prototype._later = function (fn, delay) {
    var self = this, generation = this.generation;
    var timer = setTimeout(function () {
      var i = self.timers.indexOf(timer); if (i >= 0) { self.timers.splice(i, 1); }
      if (generation === self.generation && self.current) { fn(); }
    }, delay);
    this.timers.push(timer);
  };
  Player.prototype._canFallback = function () {
    return !this.triedFallback && this.current && this.current.fallback === "hlsjs" && this.current.proxied &&
      (!this.current.canFallback || this.current.canFallback());
  };

  /* Nativo recusou -> hls.js pelo proxy. Foi assim que canais bloqueados
     por CORS voltaram a tocar, e o WooHoo confirmou em uso real. */
  Player.prototype._fail = function (why) {
    var self = this;
    if ((this.engine === "native") && this._canFallback()) {
      this.triedFallback = true;
      this._emit("statechange", { state: "fallback", why: why });
      this._later(function () { self._startHls(); }, 120);
      return;
    }
    this._emit("error", { why: why, engine: this.engine });
  };

  /* Chamado de fora quando o canal demora demais para dar o primeiro frame.
     Em vez de recarregar o nativo pela enesima vez, troca de motor. */
  Player.prototype.switchToFallback = function (why) {
    if (!this._canFallback()) { return false; }
    this.triedFallback = true;
    this._emit("statechange", { state: "fallback", why: why });
    this._startHls();
    return true;
  };

  Player.prototype.stop = function () {
    this.generation++;
    this.current = null;
    this.engine = null;
    this.timers.forEach(function (timer) { clearTimeout(timer); }); this.timers = [];
    for (var i = 0; i < this.listeners.length; i++) { this.v.removeEventListener(this.listeners[i].n, this.listeners[i].fn, false); }
    this.listeners = [];
    if (this.hls) { try { this.hls.destroy(); } catch (e) {} this.hls = null; }
    try { this.v.pause(); } catch (e) {}
    try {
      while (this.v.firstChild) { this.v.removeChild(this.v.firstChild); }
      this.v.removeAttribute("src");
      this.v.load();
    } catch (e) {}
    this.engine = null;
  };

  Player.prototype.play = function (info) {
    this.stop();
    this.current = info;
    this._bind();
    this.triedFallback = false;
    this.netRetry = 0;
    this.mediaErrorCount = 0;
    this.lastNetError = 0; this.lastRecovery = 0;
    if (info.preferred === "hlsjs") { this._startHls(); } else { this._startNative(); }
  };

  Player.prototype._startNative = function () {
    this.engine = "native";
    this._emit("statechange", { state: "loading", engine: "native" });
    /* URL direta: o <video> carrega cross-origin sem restricao de CORS */
    this.v.src = this.current.nativeUrl || this.current.direct;
    this.v.load();
    var p = this.v.play();
    if (p && p["catch"]) { p["catch"](function () {}); }
  };

  /* Config herdada do nodecast-tv: o hls.js sabe se recuperar sozinho de
     travamento se voce deixar. O "nudge" empurra o currentTime alguns
     centesimos e costuma destravar sem recarregar nada. */
  Player.prototype._hlsConfig = function () {
    return {
      enableWorker: true,
      lowLatencyMode: false,
      progressive: false,

      /* medido: sem limite o buffer chegou a ~50s de atraso no ao vivo */
      maxBufferLength: 20,
      maxMaxBufferLength: 30,
      liveBackBufferLength: 30,
      /* ARMADILHA verificada no hls.js 1.5.7: se voce define
         liveMaxLatencyDurationCount SEM definir liveSyncDurationCount,
         o construtor LANCA e o motor nunca sobe. Ele nao usa o padrao.
            if (liveMaxLatencyDurationCount !== undefined &&
                (liveSyncDurationCount === undefined || max <= sync)) throw
         Copiei so metade da config do nodecast e derrubei o fallback inteiro. */
      liveSyncDurationCount: 3,
      liveMaxLatencyDurationCount: 10,

      /* recuperacao de travamento */
      nudgeOffset: 0.2,
      nudgeMaxRetry: 6,

      /* mais insistencia antes de considerar erro fatal */
      manifestLoadingMaxRetry: 4,
      levelLoadingMaxRetry: 4,
      fragLoadingMaxRetry: 6,
      manifestLoadingTimeOut: 12000,
      levelLoadingTimeOut: 12000,
      fragLoadingTimeOut: 20000,

      /* transicoes de bloco/anuncio sem audio picotado */
      stretchShortVideoTrack: true,
      forceKeyFrameOnDiscontinuity: true,
      maxAudioFramesDrift: 8
    };
  };

  Player.prototype._startHls = function () {
    var self = this, generation = this.generation;
    if (!this.current || !this.current.proxied) { return; }
    if (this.current.canFallback && !this.current.canFallback()) { return this._emit("error", { why: "proxy indisponivel", engine: this.engine }); }
    if (!window.Hls || !Hls.isSupported()) { return this._emit("error", { why: "sem MSE" }); }
    this.engine = "hlsjs";
    this._emit("statechange", { state: "loading", engine: "hlsjs" });

    if (this.hls) { this.hls.destroy(); }
    try { this.hls = new Hls(this._hlsConfig()); }
    catch (error) { return this._emit("error", { why: error.message, engine: "hlsjs" }); }
    var activeHls = this.hls;

    this.hls.on(Hls.Events.ERROR, function (e, d) {
      if (generation !== self.generation || self.hls !== activeHls || !self.current) { return; }

      if (!d.fatal) {
        /* erro de midia nao fatal: recupera com cooldown para nao entrar em laco */
        if (d.type === Hls.ErrorTypes.MEDIA_ERROR) {
          var t = Date.now();
          if (t - self.lastRecovery < 5000) { self.mediaErrorCount++; }
          else { self.mediaErrorCount = 1; }
          self.lastRecovery = t;   /* sempre, senao a janela reabre e o laco volta */
          if (self.mediaErrorCount <= 3) {
            self._emit("statechange", { state: "recovering", why: d.details });
            try { self.hls.recoverMediaError(); } catch (x) {}
          }
        }
        return;
      }

      /* --- fatais --- */
      if (d.type === Hls.ErrorTypes.NETWORK_ERROR) {
        var now = Date.now();
        if (now - self.lastNetError > 30000) { self.netRetry = 0; }  /* reset por TEMPO */
        self.lastNetError = now;
        self.netRetry++;
        if (self.netRetry <= 3) {
          var wait = self.netRetry * 1000;
          self._emit("statechange", { state: "retrying", why: d.details, attempt: self.netRetry, wait: wait });
          self._later(function () { if (self.hls === activeHls) { try { activeHls.startLoad(); } catch (x) {} } }, wait);
          return;
        }
        self._emit("error", { why: "hls.js rede / " + d.details, engine: "hlsjs" });
        return;
      }

      if (d.type === Hls.ErrorTypes.MEDIA_ERROR) {
        /* Sem contador aqui, o Aquaman entrou em laco: 8 recuperacoes
           em 3 segundos por bufferAppendError, sem nunca tocar.
           Depois de 3 tentativas o motor desiste e devolve o erro. */
        var tf = Date.now();
        if (tf - self.lastRecovery < 8000) { self.mediaErrorCount++; }
        else { self.mediaErrorCount = 1; }
        self.lastRecovery = tf;
        if (self.mediaErrorCount <= 3) {
          self._emit("statechange", { state: "recovering",
                                      why: d.details, tentativa: self.mediaErrorCount });
          try { self.hls.recoverMediaError(); return; } catch (x) {}
        }
        self._emit("error", { why: "hls.js nao recuperou / " + d.details, engine: "hlsjs" });
        return;
      }

      self._emit("error", { why: "hls.js " + d.type + " / " + d.details, engine: "hlsjs" });
    });

    this.hls.on(Hls.Events.MANIFEST_PARSED, function () {
      if (generation !== self.generation || self.hls !== activeHls) { return; }
      var q = self.v.play(); if (q && q["catch"]) { q["catch"](function () {}); }
    });

    /* SEMPRE pelo proxy: o hls.js busca o manifesto por XHR e e barrado
       por CORS na maioria dos canais quando vai direto */
    this.hls.loadSource(this.current.proxied);
    this.hls.attachMedia(this.v);
  };

  Player.prototype.destroy = function () {
    this.stop();
    for (var i = 0; i < this.listeners.length; i++) {
      this.v.removeEventListener(this.listeners[i].n, this.listeners[i].fn, false);
    }
    this.listeners = [];
  };

  return Player;
})();
window.Player = Player;
