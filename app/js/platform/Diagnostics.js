/* Diagnostico observado, separado de acesso HTTP. Nao certifica imagem/codec. */
var Diagnostics = (function () {
  "use strict";
  var entries = Object.create(null), ready = false, waiting = [], writing = false, dirty = false;
  function init(cb) {
    if (ready) { return cb(); }
    waiting.push(cb); if (waiting.length > 1) { return; }
    DB.metaGet("playbackDiagnostics", function (e, value) {
      entries = value && typeof value === "object" ? value : Object.create(null); ready = true;
      var callbacks = waiting; waiting = []; callbacks.forEach(function (fn) { fn(e); });
    });
  }
  function save() {
    dirty = true; if (writing) { return; }
    var keys = Object.keys(entries).sort(function (a,b) { return entries[b].at - entries[a].at; });
    keys.slice(500).forEach(function (k) { delete entries[k]; });
    dirty = false; writing = true;
    DB.metaSet("playbackDiagnostics", JSON.parse(JSON.stringify(entries)), function (e) {
      writing = false; if (e) { Log.warn("diagnostico", "nao foi possivel salvar", {why:String(e)}); }
      if (dirty) { save(); }
    });
  }
  function record(p) {
    init(function () {
      if (!p.channelId) { return; }
      var d = entries[p.channelId] || {at:0}, at = p.endedAt || Date.now();
      d.at = Math.max(d.at, at);
      if (typeof p.tFirstFrame === "number" && p.tFirstFrame >= 0 && (!d.playback || d.playback.at <= (p.observedAt || at))) {
        d.playback = {at:p.observedAt || at,origin:"TV",engine:p.engine,evidence:p.evidence || "currentTime",audioOnly:!!p.audioOnly};
      }
      if (p.error && (!d.lastFailure || d.lastFailure.at <= at)) { d.lastFailure = {at:at,origin:"player-TV",reason:String(p.error).slice(0,300)}; }
      entries[p.channelId] = d; save();
    });
  }
  function decorate(item) {
    var local = entries[item.id] || {}, remote = item.diagnostic || {}, d = {};
    ["access", "playback", "lastFailure"].forEach(function (key) {
      var a = remote[key], b = local[key]; d[key] = b && (!a || b.at > a.at) ? b : a || null;
    });
    item.diagnostic = d; return item;
  }
  function describe(item) {
    var d = decorate(item).diagnostic, parts = [];
    function stamp(v) { return new Date(v.at).toLocaleString(); }
    if (d.access) { parts.push((d.access.ok ? "Acesso confirmado" : "Falha de acesso") + " · " + stamp(d.access) + " · " + d.access.origin); }
    if (d.playback) { parts.push("Reproducao observada" + (d.playback.audioOnly ? " (sem video detectado)" : " (avanco do tempo)") + " · " + stamp(d.playback) + " · " + d.playback.origin); }
    if (d.lastFailure) { parts.push("Ultima falha: " + d.lastFailure.reason + " · " + stamp(d.lastFailure) + " · " + d.lastFailure.origin); }
    return parts.join(" | ") || "Sem diagnostico de reproducao";
  }
  return {init:init,record:record,decorate:decorate,describe:describe};
})();
window.Diagnostics = Diagnostics;
