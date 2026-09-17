/* Sessao VOD: protege o checkpoint enquanto metadata/seek/retry estao pendentes. */
var ResumePlayback = (function () {
  "use strict";
  function ResumePlayback(video, notify) {
    var item = null, target = null, last = 0, duration = null, savedAt = 0, seeking = false, active = false, mediaReady = false;
    notify = notify || function () {};
    function persist(ended) {
      if (!item || !active || target !== null) { return; }
      Library.save(item, last, duration, ended, function (err) { if (err) { notify("Nao foi possivel salvar o progresso: " + err); } });
    }
    function seek() {
      if (!item || !mediaReady || target === null || seeking || !isFinite(video.duration) || video.duration <= 0) { return; }
      duration = video.duration;
      var value = Math.min(target, Math.max(0, duration - 1));
      try {
        /* Alguns motores expoem duration antes de oferecer uma faixa buscavel. */
        if (video.seekable && video.seekable.length) {
          var available = false;
          for (var i = 0; i < video.seekable.length; i++) { if (value >= video.seekable.start(i) && value <= video.seekable.end(i)) { available = true; } }
          if (!available) { return; }
        }
        seeking = true; video.currentTime = value;
      } catch (e) { seeking = false; notify("Aguardando o video permitir continuar."); }
    }
    function sample() {
      if (!item || !mediaReady || target !== null || seeking || video.seeking || !isFinite(video.currentTime)) { return; }
      if (video.currentTime > 0) { active = true; last = video.currentTime; }
      if (isFinite(video.duration) && video.duration > 0) { duration = video.duration; }
    }
    video.addEventListener("seeked", function () {
      if (seeking && target !== null && Math.abs(video.currentTime - Math.min(target, video.duration - 1)) < 2) {
        last = video.currentTime; target = null; seeking = false; active = true;
      }
    }, false);
    ["loadedmetadata", "canplay"].forEach(function (name) { video.addEventListener(name, function () { mediaReady = true; seek(); }, false); });
    ["durationchange", "progress"].forEach(function (name) { video.addEventListener(name, seek, false); });
    video.addEventListener("timeupdate", function () {
      seek(); sample();
      if (Date.now() - savedAt >= 10000) { savedAt = Date.now(); persist(false); }
    }, false);
    video.addEventListener("pause", function () { sample(); persist(false); }, false);
    this.begin = function (ch, position) {
      item = ch && (ch.kind === "vod" || ch.kind === "episode") ? ch : null;
      last = position || 0; target = last > 0 ? last : null;
      duration = null; active = false; seeking = false; mediaReady = false; savedAt = Date.now();
    };
    this.checkpoint = function (ended) { sample(); persist(ended); };
    this.retry = function () { sample(); persist(false); target = last > 0 ? last : null; seeking = false; active = false; mediaReady = false; };
    this.clear = function () { item = null; target = null; active = false; seeking = false; };
  }
  return ResumePlayback;
})();
window.ResumePlayback = ResumePlayback;
