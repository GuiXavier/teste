/*
 * sources — camada de provedores.
 *
 * Padrao emprestado do nodecast-tv, onde o M3uXtreamAdapter faz uma
 * lista M3U responder aos MESMOS metodos de uma fonte Xtream. O ganho:
 * o app da TV tem UM caminho de codigo. Nada de "if (xtream) ... else".
 *
 * Todo provedor implementa:
 *   auth(cb)                         -> {ok, info}
 *   getCategories(cb)                -> [{id, name, count}]
 *   getChannels(opts, cb)            -> [{id, name, logo, category, url, tvgId}]
 *   buildStreamUrl(id, type, cont)   -> string | null
 *   getXmltvUrl()                    -> string | null
 *
 * Hoje so o provedor "iptv-org" esta implementado. Xtream e M3U estao
 * com a assinatura pronta para o dia em que forem ligados.
 */

var https = require("https");
var http = require("http");
var urlmod = require("url");
var config = require("./config");

/* ------------------------------------------------------------------
 * iptv-org — lista publica, sem credenciais
 * ------------------------------------------------------------------ */
function IptvOrgProvider(cfg) {
  this.cfg = cfg || {};
  this.channels = [];
}
IptvOrgProvider.prototype.type = "iptv-org";

IptvOrgProvider.prototype.setChannels = function (list) { this.channels = list || []; };

IptvOrgProvider.prototype.auth = function (cb) {
  cb(null, { ok: true, info: { provider: "iptv-org", credentials: false } });
};

IptvOrgProvider.prototype.getCategories = function (cb) {
  var counts = {}, i;
  for (i = 0; i < this.channels.length; i++) {
    var c = this.channels[i];
    if (c.status === "dead") { continue; }
    counts[c.category] = (counts[c.category] || 0) + 1;
  }
  var out = Object.keys(counts).sort().map(function (k) {
    return { id: k, name: k, count: counts[k] };
  });
  cb(null, out);
};

IptvOrgProvider.prototype.getChannels = function (opts, cb) {
  opts = opts || {};
  var q = (opts.q || "").toLowerCase();
  var out = this.channels.filter(function (c) {
    if (opts.aliveOnly !== false && c.status === "dead") { return false; }
    if (opts.category && opts.category !== "__all__" && c.category !== opts.category) { return false; }
    if (q && c.name.toLowerCase().indexOf(q) < 0) { return false; }
    return true;
  });
  cb(null, out);
};

/* lista publica ja traz a URL pronta */
IptvOrgProvider.prototype.buildStreamUrl = function (id) {
  for (var i = 0; i < this.channels.length; i++) {
    if (this.channels[i].id === id) { return this.channels[i].url; }
  }
  return null;
};

IptvOrgProvider.prototype.getXmltvUrl = function () {
  /* o iptv-org publica EPG num repositorio separado (iptv-org/epg) */
  return null;
};

/* ------------------------------------------------------------------
 * Xtream Codes — ESQUELETO
 *
 * O protocolo (confirmado no xtreamApi.js do nodecast):
 *   auth      GET  {base}/player_api.php?username=U&password=P
 *             -> { user_info: {...}, server_info: {...} }
 *   categorias GET  ...&action=get_live_categories
 *             -> [{ category_id, category_name, parent_id }]
 *   canais     GET  ...&action=get_live_streams[&category_id=N]
 *             -> [{ stream_id, name, stream_icon, category_id,
 *                   epg_channel_id, ... }]
 *   stream     {base}/live/{U}/{P}/{stream_id}.{ts|m3u8}
 *   EPG        {base}/xmltv.php?username=U&password=P
 *
 * Tambem existem get_vod_categories / get_vod_streams / get_series
 * para filmes e series, e get_short_epg por canal.
 * ------------------------------------------------------------------ */
function XtreamProvider(cfg) {
  this.base = String(cfg.url || "").replace(/\/+$/, "");
  /* aceita "servidor.com:8080" sem esquema */
  if (this.base && this.base.indexOf("http") !== 0) { this.base = "http://" + this.base; }
  this.username = cfg.username;
  this.password = cfg.password;
  /* NAO chamar isto de "auth": colidiria com XtreamProvider.prototype.auth
     e a propriedade de instancia venceria o metodo do prototipo. */
  this.authData = null;
  this.container = "m3u8";   /* ajustado apos autenticar */
}
XtreamProvider.prototype.type = "xtream";

XtreamProvider.prototype._api = function (action, params, cb) {
  var u = this.base + "/player_api.php?username=" + encodeURIComponent(this.username) +
          "&password=" + encodeURIComponent(this.password);
  if (action) { u += "&action=" + encodeURIComponent(action); }
  var k;
  for (k in (params || {})) {
    if (params[k] !== null && params[k] !== undefined) {
      u += "&" + k + "=" + encodeURIComponent(params[k]);
    }
  }
  var mod = u.indexOf("https:") === 0 ? https : http;
  var opts;
  try { opts = urlmod.parse(u); } catch (e) { return cb(new Error("url invalida")); }
  /* O Hypnotix expoe o User-Agent como preferencia, padrao "Mozilla/5.0".
     Nao e capricho: muitos provedores Xtream DESCARTAM em silencio o
     pacote de UA desconhecido, o que aparece como TIMEOUT e nao como
     403. Era o unico ponto do projeto que ainda mandava UA proprio. */
  opts.headers = config.headers();
  opts.rejectUnauthorized = false;

  /* uma resposta so: timeout dispara destroy que dispara error,
     e sem esta trava o callback seria chamado duas vezes */
  var done = false;
  function fin(e, d) { if (!done) { done = true; cb(e, d); } }

  var req = mod.request(opts, function (r) {
    var b = ""; r.setEncoding("utf8");
    r.on("data", function (c) { b += c; if (b.length > 8e7) { req.destroy(); } });
    r.on("end", function () {
      if (r.statusCode !== 200) { return fin(new Error("HTTP " + r.statusCode)); }
      try { fin(null, JSON.parse(b)); }
      catch (e) {
        /* provedor fora do ar costuma devolver HTML de erro */
        var amostra = b.slice(0, 80).replace(/\s+/g, " ");
        fin(new Error("resposta nao e JSON: " + amostra));
      }
    });
  });
  req.setTimeout(15000, function () { req.destroy(); fin(new Error("timeout")); });
  req.on("error", function (e) { fin(new Error(e.code || e.message)); });
  req.end();
};

XtreamProvider.prototype.auth = function (cb) {
  var self = this;
  this._api(null, {}, function (err, d) {
    if (err) { return cb(err); }
    if (!d || !d.user_info) { return cb(new Error("credenciais invalidas")); }
    var u = d.user_info;
    self.authData = d;

    /* allowed_output_formats diz o que o provedor serve.
       m3u8 e preferivel: .ts cru so toca no player nativo. */
    var fmts = u.allowed_output_formats || [];
    if (fmts.length) {
      self.container = (fmts.indexOf("m3u8") >= 0) ? "m3u8" :
                       (fmts.indexOf("ts") >= 0 ? "ts" : fmts[0]);
    }

    cb(null, {
      ok: String(u.auth) === "1" && (u.status === "Active" || !u.status),
      status: u.status || null,
      /* max_connections IMPORTA: o validador abre 8 conexoes simultaneas.
         Numa conta de 1 conexao isso derruba a sessao do usuario. */
      maxConnections: parseInt(u.max_connections || "1", 10),
      activeConnections: parseInt(u.active_cons || "0", 10),
      expiraEm: u.exp_date ? new Date(parseInt(u.exp_date, 10) * 1000).toISOString() : null,
      teste: String(u.is_trial) === "1",
      formatos: fmts,
      container: self.container,
      servidor: d.server_info ? (d.server_info.url + ":" + d.server_info.port) : null,
      info: d
    });
  });
};

XtreamProvider.prototype.getCategories = function (cb) {
  this._api("get_live_categories", {}, function (err, d) {
    if (err) { return cb(err); }
    cb(null, (d || []).map(function (c) {
      return { id: String(c.category_id), name: c.category_name, count: null };
    }));
  });
};

XtreamProvider.prototype.getChannels = function (opts, cb) {
  var self = this;
  opts = opts || {};
  this._api("get_live_streams",
    { category_id: (opts.category && opts.category !== "__all__") ? opts.category : null },
    function (err, d) {
      if (err) { return cb(err); }
      cb(null, (d || []).map(function (s) {
        return {
          id: "x" + s.stream_id,
          streamId: s.stream_id,
          name: s.name,
          logo: s.stream_icon || null,
          category: String(s.category_id),
          tvgId: s.epg_channel_id || null,
          url: self.buildStreamUrl(s.stream_id, "live", self.container),
          /* tv_archive = catchup: da para rever o que ja passou */
          catchup: String(s.tv_archive) === "1" ? "xtream" : null,
          catchupDays: s.tv_archive_duration || null,
          directSource: s.direct_source || null,
          status: "unknown"
        };
      }));
    });
};


/* ---------- VOD (filmes) ---------- */
XtreamProvider.prototype.getVodCategories = function (cb) {
  this._api("get_vod_categories", {}, function (err, d) {
    if (err) { return cb(err); }
    cb(null, (d || []).map(function (c) {
      return { id: String(c.category_id), name: c.category_name };
    }));
  });
};

XtreamProvider.prototype.getVod = function (opts, cb) {
  var self = this;
  opts = opts || {};
  this._api("get_vod_streams",
    { category_id: (opts.category && opts.category !== "__all__") ? opts.category : null },
    function (err, d) {
      if (err) { return cb(err); }
      cb(null, (d || []).map(function (v) {
        /* container_extension importa: mkv e avi NAO tocam no webOS.
           Guardamos para o cliente saber antes de tentar. */
        var ext = (v.container_extension || "mp4").toLowerCase();
        return {
          id: "v" + v.stream_id, streamId: v.stream_id, kind: "vod",
          name: v.name, logo: v.stream_icon || v.cover || null,
          category: String(v.category_id),
          rating: v.rating || null, added: v.added || null,
          container: ext,
          /* so mp4 e m3u8 sao seguros no player da TV */
          playable: (ext === "mp4" || ext === "m3u8" || ext === "ts"),
          url: self.buildStreamUrl(v.stream_id, "vod", ext),
          status: "unknown"
        };
      }));
    });
};

XtreamProvider.prototype.getVodInfo = function (vodId, cb) {
  this._api("get_vod_info", { vod_id: vodId }, cb);
};

/* ---------- Series ---------- */
XtreamProvider.prototype.getSeriesCategories = function (cb) {
  this._api("get_series_categories", {}, function (err, d) {
    if (err) { return cb(err); }
    cb(null, (d || []).map(function (c) {
      return { id: String(c.category_id), name: c.category_name };
    }));
  });
};

XtreamProvider.prototype.getSeries = function (opts, cb) {
  opts = opts || {};
  this._api("get_series",
    { category_id: (opts.category && opts.category !== "__all__") ? opts.category : null },
    function (err, d) {
      if (err) { return cb(err); }
      cb(null, (d || []).map(function (s) {
        return {
          id: "s" + s.series_id, seriesId: s.series_id, kind: "series",
          name: s.name, logo: s.cover || null,
          category: String(s.category_id),
          plot: s.plot || null, cast: s.cast || null,
          genre: s.genre || null, rating: s.rating || null,
          lastModified: s.last_modified || null,
          status: "unknown"
        };
      }));
    });
};

/* Temporadas e episodios so sao buscados quando o usuario abre a serie.
   O Hypnotix faz igual: "Series is very time consuming, we will only
   populate the Series once the user click on the Series". */
XtreamProvider.prototype.getSeriesInfo = function (seriesId, cb) {
  var self = this;
  this._api("get_series_info", { series_id: seriesId }, function (err, d) {
    if (err) { return cb(err); }
    if (!d) { return cb(new Error("serie sem resposta")); }

    var temporadas = [];
    var eps = d.episodes || {};
    var k;
    for (k in eps) {
      if (!eps.hasOwnProperty(k)) { continue; }
      var lista = (eps[k] || []).map(function (e) {
        var ext = (e.container_extension || "mp4").toLowerCase();
        var info = e.info || {};
        return {
          id: "e" + e.id, episodeId: e.id, kind: "episode",
          name: e.title || ("Episodio " + e.episode_num),
          num: parseInt(e.episode_num, 10) || 0,
          season: parseInt(k, 10) || 0,
          plot: info.plot || null,
          duration: info.duration || null,
          logo: info.movie_image || null,
          container: ext,
          playable: (ext === "mp4" || ext === "m3u8" || ext === "ts"),
          url: self.buildStreamUrl(e.id, "series", ext),
          status: "unknown"
        };
      });
      lista.sort(function (a, b) { return a.num - b.num; });
      temporadas.push({ season: parseInt(k, 10) || 0, episodes: lista });
    }
    temporadas.sort(function (a, b) { return a.season - b.season; });

    cb(null, {
      info: d.info || {},
      seasons: temporadas,
      totalEpisodios: temporadas.reduce(function (n, t) { return n + t.episodes.length; }, 0)
    });
  });
};

XtreamProvider.prototype.buildStreamUrl = function (streamId, type, container) {
  var map = { live: "live", vod: "movie", series: "series" };
  var t = map[type || "live"] || "live";
  /* m3u8 e preferivel a ts: o .ts cru so toca no player nativo */
  return this.base + "/" + t + "/" + this.username + "/" + this.password +
         "/" + streamId + "." + (container || "m3u8");
};

XtreamProvider.prototype.getXmltvUrl = function () {
  return this.base + "/xmltv.php?username=" + encodeURIComponent(this.username) +
         "&password=" + encodeURIComponent(this.password);
};

/* ------------------------------------------------------------------
 * M3U do usuario — ESQUELETO
 * Reaproveita lib/playlist.js trocando a URL de origem. As categorias
 * saem do group-title, como no adaptador do nodecast.
 * ------------------------------------------------------------------ */
function M3uProvider(cfg) {
  this.url = cfg.url;
  this.channels = [];
}
M3uProvider.prototype.type = "m3u";
M3uProvider.prototype.auth = function (cb) { cb(null, { ok: true, info: { url: this.url } }); };
M3uProvider.prototype.setChannels = IptvOrgProvider.prototype.setChannels;
M3uProvider.prototype.getCategories = IptvOrgProvider.prototype.getCategories;
M3uProvider.prototype.getChannels = IptvOrgProvider.prototype.getChannels;
M3uProvider.prototype.buildStreamUrl = IptvOrgProvider.prototype.buildStreamUrl;
M3uProvider.prototype.getXmltvUrl = function () { return null; };

/* ------------------------------------------------------------------ */
function create(cfg) {
  switch ((cfg && cfg.type) || "iptv-org") {
    case "xtream": return new XtreamProvider(cfg);
    case "m3u":    return new M3uProvider(cfg);
    default:       return new IptvOrgProvider(cfg);
  }
}

/* nunca devolva a senha ao cliente */
function sanitize(cfg) {
  var out = {}, k;
  for (k in cfg) { if (cfg.hasOwnProperty(k)) { out[k] = cfg[k]; } }
  if (out.password) { out.password = "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"; }
  return out;
}

exports.create = create;
exports.sanitize = sanitize;
exports.IptvOrgProvider = IptvOrgProvider;
exports.XtreamProvider = XtreamProvider;
exports.M3uProvider = M3uProvider;
