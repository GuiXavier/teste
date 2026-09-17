/*
 * HealthMonitor — a licao mais importante de todo o estudo.
 *
 * Na webOS, TODOS os contadores do Chromium ficam em zero quando o video
 * roda pela pipeline nativa da LG (frames, bytes de video, bytes de audio;
 * e drawImage(video) devolve preto). A UNICA sonda que funciona nos dois
 * caminhos e o avanco do currentTime.
 *
 * CORRECAO v2 (achada em uso real, log de 09/09):
 * Existem DOIS estados que nao podem ser confundidos:
 *
 *   PARTIDA   ainda nao chegou o primeiro frame.
 *             Canais 1080p medidos levaram 3176ms (ESPN), 3059ms (ESPN 4)
 *             e 3613ms (TV Natal) so ate a metadata. Alarmar em 2s aqui
 *             mata o canal antes de ele ter chance. Prazo separado e longo.
 *
 *   TRAVAMENTO ja tocou e parou. Ai sim 2s de silencio e suficiente,
 *             porque o currentTime nativo anda em degraus de 200ms.
 *
 * Confundir os dois gerava um laco: alarme -> reload -> alarme -> reload.
 */
var HealthMonitor = (function () {
  "use strict";

  function HealthMonitor(videoEl, opts) {
    opts = opts || {};
    this.v = videoEl;
    this.sample = opts.sampleMs || 250;
    this.report = opts.reportMs || 1000;
    this.stallAfter = opts.stallMs || 2000;      /* so DEPOIS do 1o frame */
    /* Prazo ate o 1o frame, ADAPTATIVO pelo readyState.
       Medido em 292 reproducoes: dos 13 timeouts, 3 foram prematuros.
       O pior deles (TV Mana Brasil) estava em readyState 4 - HAVE_ENOUGH_DATA,
       ou seja, o video estava pronto e faltavam 499ms. Ja os legitimos
       (Laboral TV, SIC TV) estavam TODOS em readyState 0.
       Logo: readyState alto = esta vindo, so devagar -> mais tempo.  */
    this.startupByReady = opts.startupByReady || {
      0: 8000,    /* nada chegou: nao vai chegar */
      1: 12000,   /* metadata so */
      2: 20000,   /* tem dado do quadro atual */
      3: 22000,
      4: 22000    /* pronto para tocar: quase certo que vai */
    };
    this.timer = null;
    this.reset();
    this.onStall = opts.onStall || function () {};
    this.onRecover = opts.onRecover || function () {};
    this.onTick = opts.onTick || function () {};
    this.onFirstFrame = opts.onFirstFrame || function () {};
    this.onStartupTimeout = opts.onStartupTimeout || function () {};
    this.onAudioOnly = opts.onAudioOnly || function () {};
  }

  HealthMonitor.prototype.reset = function () {
    this.lastCT = -1;
    this.prevCT = -1;
    this.lastMove = 0;
    this.t0 = 0;
    this.stalled = false;
    this.firstFrameMs = null;
    this.stallCount = 0;
    this.lastReport = 0;
    this.startupFired = false;
    this.audioOnlyFired = false;
  };

  HealthMonitor.prototype.start = function () {
    var self = this;
    this.stop();
    this.reset();
    this.t0 = Date.now();
    this.lastMove = this.t0;
    this.timer = setInterval(function () { self._check(); }, this.sample);
  };

  HealthMonitor.prototype._check = function () {
    var ct = this.v.currentTime;
    var t = Date.now();
    var el = t - this.t0;

    /* Primeiro frame REAL: o ct precisa avancar A PARTIR de um valor que ja
       era maior que zero. O hls.js posiciona o ct no live edge antes de
       exibir qualquer coisa; sem essa condicao a medida sai otimista. */
    if (this.firstFrameMs === null && this.prevCT > 0 && ct > this.prevCT + 0.0005) {
      this.firstFrameMs = el;
      this.lastCT = ct;
      this.lastMove = t;
      this.onFirstFrame(el);
    }
    this.prevCT = ct;

    /* Stream sem faixa de video: videoWidth fica 0 mesmo tocando.
       Medido no Rede TV! (1080p) — w:0 h:0 em 3 de 3 tentativas.
       E a unica deteccao de "tela preta" que funciona no webOS,
       ja que o canvas sempre devolve preto. */
    if (!this.audioOnlyFired && this.v.readyState >= 2 && el > 2500 &&
        this.v.videoWidth === 0 && this.v.videoHeight === 0) {
      this.audioOnlyFired = true;
      this.onAudioOnly();
    }

    if (this.firstFrameMs === null) {
      /* --- fase de PARTIDA: nao existe "travou", existe "demorou demais" --- */
      var limite = this.startupByReady[this.v.readyState];
      if (limite === undefined) { limite = 12000; }
      if (!this.startupFired && el > limite) {
        this.startupFired = true;
        this.onStartupTimeout({ elapsed: el, readyState: this.v.readyState, limite: limite });
      }
    } else {
      /* --- fase de REPRODUCAO: agora sim vale detectar travamento --- */
      if (ct > this.lastCT + 0.001) {
        this.lastCT = ct;
        this.lastMove = t;
        if (this.stalled) { this.stalled = false; this.onRecover(); }
      } else if (!this.v.paused && !this.v.ended) {
        if (!this.stalled && (t - this.lastMove) > this.stallAfter) {
          this.stalled = true;
          this.stallCount++;
          this.onStall({ frozenFor: t - this.lastMove, ct: ct, count: this.stallCount });
        }
      }
    }

    if (t - this.lastReport >= this.report) {
      this.lastReport = t;
      this.onTick({
        ct: ct,
        stalled: this.stalled,
        stalls: this.stallCount,
        firstFrameMs: this.firstFrameMs,
        starting: this.firstFrameMs === null,
        elapsed: el,
        w: this.v.videoWidth, h: this.v.videoHeight,
        /* buffer a FRENTE, nao a posicao absoluta no timeline */
        bufferAhead: this.v.buffered.length
          ? Math.max(0, this.v.buffered.end(this.v.buffered.length - 1) - ct) : 0
      });
    }
  };

  HealthMonitor.prototype.stop = function () {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  };

  return HealthMonitor;
})();
window.HealthMonitor = HealthMonitor;