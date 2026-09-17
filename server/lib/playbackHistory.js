/* Historico compacto e atomico. Logs brutos continuam separados. */
var fs = require("fs"), path = require("path"), crypto = require("crypto");
function create(directory, options) {
  options = options || {};
  var max = options.maxRecords || 10000, days = options.days || 30, clock = options.now || Date.now;
  var file = path.join(directory, "playback-history.json"), records = [], diagnostics = Object.create(null);
  var imported = {files:0,bytes:0,invalidLines:0,partial:false};
  function retain(list) { var cutoff = clock() - days * 86400000; return list.filter(function (r) { return r.endedAt >= cutoff; }).sort(function (a,b) { return a.endedAt-b.endedAt; }).slice(-max); }
  function clean(event) {
    var p = event.data || {}, out = {}, time = Number(p.endedAt) || Date.parse(event.ts) || clock();
    ["channelId","sourceId","channel","category","engine","endedBy","error","evidence","build"].forEach(function (k) { out[k] = p[k] === null || p[k] === undefined ? null : String(p[k]).slice(0,k === "channelId" ? 2048 : 300); });
    ["t0","tMeta","tFirstFrame","observedAt","durationMs","position","stalls","reloads","w","h"].forEach(function (k) { out[k] = typeof p[k] === "number" && isFinite(p[k]) && p[k] >= 0 ? p[k] : null; });
    out.fallback = !!p.fallback; out.audioOnly = !!p.audioOnly; out.endedAt = Math.min(time,clock());
    out.playbackId = String(p.playbackId || crypto.createHash("sha256").update(JSON.stringify([event.session,event.seq,p.channelId,p.t0])).digest("hex")).slice(0,200);
    return out;
  }
  function index() {
    diagnostics = Object.create(null);
    records.forEach(function (r) {
      if (!r.channelId) { return; }
      var d = diagnostics[r.channelId] || (diagnostics[r.channelId] = {});
      if (r.tFirstFrame !== null && (!d.playback || (r.observedAt || r.endedAt) >= d.playback.at)) {
        d.playback = {at:r.observedAt || r.endedAt,origin:"player-TV",engine:r.engine,evidence:r.evidence || "currentTime",audioOnly:r.audioOnly};
      }
      if (r.error) { d.lastFailure = {at:r.endedAt,origin:"player-TV",reason:r.error}; }
    });
  }
  if (fs.existsSync(file)) {
    if (fs.statSync(file).size > 32 * 1024 * 1024) { throw new Error("historico de playback excede limite"); }
    var saved = JSON.parse(fs.readFileSync(file,"utf8"));
    if (saved.version !== 1 || !Array.isArray(saved.records)) { throw new Error("historico de playback invalido"); }
    imported = saved.imported || imported;
    records = retain(saved.records.map(function (r) { return clean({data:r}); })); index();
  }
  function append(events) {
    var additions = events.filter(function (e) { return e.tag === "playback" && e.data; }).map(clean);
    if (!additions.length) { return; }
    var seen = Object.create(null), next = [];
    records.concat(additions).forEach(function (r) { if (!seen[r.playbackId]) { seen[r.playbackId] = true; next.push(r); } });
    next = retain(next);
    var temp = file + ".tmp";
    var payload = JSON.stringify({version:1,imported:imported,records:next});
    while (Buffer.byteLength(payload) > 32 * 1024 * 1024) {
      next = next.slice(Math.max(1,Math.ceil(next.length/10)));
      payload = JSON.stringify({version:1,imported:imported,records:next});
    }
    try { fs.writeFileSync(temp,payload,"utf8"); fs.renameSync(temp,file); }
    catch (e) { try { fs.unlinkSync(temp); } catch (ignore) {} throw e; }
    records = next; index();
  }
  function median(a) { if (!a.length) { return null; } return Math.round(a.sort(function (x,y) { return x-y; })[Math.floor(a.length/2)]); }
  function report() {
    records = retain(records); index();
    var channels = Object.create(null), engines = Object.create(null), errors = [];
    records.forEach(function (p) {
      var key = p.channelId || JSON.stringify([p.sourceId,p.channel]);
      var c = channels[key] || (channels[key] = {id:p.channelId,sourceId:p.sourceId,canal:p.channel,categoria:p.category,n:0,ok:0,frames:[],stalls:0,fallbacks:0,error:null});
      var b = engines[p.engine || "?"] || (engines[p.engine || "?"] = {n:0,ok:0,frames:[],metas:[],stalls:0});
      c.n++; b.n++; c.stalls += p.stalls || 0; b.stalls += p.stalls || 0;
      if (p.tFirstFrame !== null) { c.ok++; b.ok++; c.frames.push(p.tFirstFrame); b.frames.push(p.tFirstFrame); }
      if (p.tMeta !== null) { b.metas.push(p.tMeta); }
      if (p.fallback) { c.fallbacks++; }
      if (p.error) { c.error = {at:p.endedAt,origin:"player-TV",reason:p.error}; errors.push({canal:p.channel,id:p.channelId,erro:p.error,at:p.endedAt}); }
    });
    return {sessoes:records.length,retention:{days:days,maxRecords:max},imported:imported,evidence:"Avanco de currentTime; nao certifica imagem ou codec",
      canais:Object.keys(channels).map(function (k) { var c=channels[k]; return {id:c.id,sourceId:c.sourceId,canal:c.canal,categoria:c.categoria,tentativas:c.n,tocaram:c.ok,primeiroFrameMediana:median(c.frames),travamentos:c.stalls,fallbacks:c.fallbacks,ultimoErro:c.error ? c.error.reason : null,diagnostic:diagnostics[c.id] || {}}; }).sort(function (a,b) { return b.tentativas-a.tentativas; }),
      motores:Object.keys(engines).map(function (k) { var b=engines[k]; return {motor:k,testes:b.n,tocaram:b.ok,metaMediana:median(b.metas),primeiroFrameMediana:median(b.frames),travamentos:b.stalls}; }),erros:errors.slice(-40)};
  }
  /* Primeira execucao: aproveita logs recentes sem carregar arquivos ilimitados. */
  if (!fs.existsSync(file) && options.logsDir && fs.existsSync(options.logsDir)) {
    var pending = [], names = fs.readdirSync(options.logsDir).filter(function (name) { return /^app-\d{4}-\d{2}-\d{2}\.jsonl$/.test(name); }).sort().reverse();
    if (names.length > 30) { imported.partial = true; }
    names.slice(0,30).forEach(function (name) {
      if (imported.bytes >= 16 * 1024 * 1024) { imported.partial = true; return; }
      var target = path.join(options.logsDir,name), size = fs.statSync(target).size;
      var length = Math.min(size,2 * 1024 * 1024,16 * 1024 * 1024 - imported.bytes), start = size - length;
      var buffer = Buffer.alloc(length), fd = fs.openSync(target,"r");
      try { fs.readSync(fd,buffer,0,length,start); } finally { fs.closeSync(fd); }
      imported.files++; imported.bytes += length; if (start) { imported.partial = true; }
      var lines = buffer.toString("utf8").split("\n"); if (start) { lines.shift(); }
      lines.forEach(function (line) {
        if (!line.trim()) { return; }
        if (line.length > 65536) { imported.invalidLines++; return; }
        try { var event=JSON.parse(line); if (event && event.tag === "playback" && event.data) { pending.push(event); } }
        catch (ignore) { imported.invalidLines++; }
      });
    });
    if (pending.length) { append(pending); }
  }
  return {append:append,report:report,diagnostic:function (id) { return diagnostics[id] || {}; }};
}
exports.create = create;
