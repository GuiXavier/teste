/*
 * Catalog — fachada entre o app e os dados.
 *
 * O app.js pergunta "categorias?", "itens da categoria X?", "como toco
 * o item Y?" e NAO sabe se a resposta veio do server.js no PC ou do
 * IndexedDB na propria TV. O modo e um interruptor:
 *
 *   "servidor"  tudo pelo backend (o que funciona hoje)
 *   "local"     leitura do IndexedDB; a decisao de reproducao e feita
 *               AQUI, com as mesmas regras que o backend usava
 *               (medidas nos logs de 09 e 10/09)
 *
 * No modo local, a TV nao precisa do PC ligado. As regras de
 * reproducao migradas do server.js:
 *   - ao vivo  : nativo primeiro, hls.js de reserva (100% no nativo
 *                no Xtream, mas a lista publica precisou do reserva)
 *   - .ts cru  : so nativo (hls.js nao toca)
 *   - arquivo  : so nativo, prazo 25-45s (moov pode estar no fim),
 *                1 tentativa; container mkv/avi recusado antes de tentar
 */
var Catalog = (function () {
  "use strict";

  var modo = "servidor";
  var fonteAtiva = null;      /* {id, type, url, username, password} no modo local */
  var lunaDisponivel = null;  /* cache: o JS Service respondeu ao ping? */

  function setModo(m) { modo = (m === "local") ? "local" : "servidor"; Store.pref("modo", modo); }
  function getModo() { return modo; }
  function setFonte(f) { fonteAtiva = f; }
  function getFonte() { return fonteAtiva; }

  function init() {
    modo = Store.pref("modo") === "local" ? "local" : "servidor";
    try { fonteAtiva = JSON.parse(Store.pref("fonteLocal") || "null"); } catch (e) { fonteAtiva = null; }
  }

  /* Origem dos dados: o JS Service da TV se responder E a fonte tiver
     senha guardada; senao o PC. Sem senha o Xtream falha na TV (foi o
     "HTTP 404" nas categorias de filme do log de 11/09). */
  function origem(cb) {
    function decide() {
      var luna = lunaDisponivel === true;
      if (luna && fonteAtiva && fonteAtiva.type === "xtream" && !fonteAtiva.password) {
        if (API.getBase() && !API.simularOffline()) {
          Log.info("catalog", "sem senha local: usando o PC");
          return cb(Sync.origemHttp);
        }
        Log.warn("catalog", "sem senha local e sem PC: digite a senha na configuracao");
      }
      cb(luna ? Sync.origemLuna : Sync.origemHttp);
    }
    if (lunaDisponivel !== null) { return decide(); }
    Luna.service("ping", {}, function (r, e) {
      lunaDisponivel = !e && !!r;
      Log.info("catalog", "JS Service " + (lunaDisponivel ? "disponivel (Node " + r.node + ")" : "ausente"));
      decide();
    }, 3000);
  }

  /* ---------------------------------------------------- categorias */
  function categories(tipo, cb) {
    if (modo !== "local") { return API.categories({ type: tipo }, cb); }
    if (!fonteAtiva) { return cb(new Error("nenhuma fonte sincronizada")); }
    DB.categoriesOf(fonteAtiva.id, tipo, function (e, cats) {
      if (e) { return cb(new Error(e)); }
      var lista = cats.map(function (c) {
        return { id: (tipo === "live") ? c.name : c.catId, name: c.name,
                 count: c.count, carregada: !!c.carregadaEm };
      });
      if (tipo === "live") {
        DB.count("live", fonteAtiva.id, null, function (e2, n) {
          lista.unshift({ id: "__all__", name: "Todos", count: n || 0 });
          cb(null, lista);
        });
      } else { cb(null, lista); }
    });
  }

  /* --------------------------------------------------------- itens */
  function channels(opt, cb) {
    if (modo !== "local") { return API.channels(opt, cb); }
    if (!fonteAtiva) { return cb(new Error("nenhuma fonte sincronizada")); }
    var tipo = opt.type || "live";
    var store = { live: "live", vod: "vod", series: "series" }[tipo] || "live";

    function ler(nomeCat) {
      DB.query({ store: store, sourceId: fonteAtiva.id, category: nomeCat || opt.category || "__all__",
                 q: opt.q || "", offset: opt.offset || 0, limit: opt.limit || 120 },
        function (e, r) {
          if (e) { return cb(new Error(e)); }
          r.items.forEach(function (it) { if (it.playable === undefined) { it.playable = true; } });
          cb(null, r);
        });
    }

    /* filmes/series: garante que a categoria esta no banco (sob demanda) */
    if (tipo !== "live" && opt.category && opt.category !== "__all__") {
      /* filmes/series: a categoria e pedida pelo ID do Xtream ("10"),
         mas os itens sao gravados pelo NOME ("Acao"). Traduz antes. */
      return DB.get("categories", fonteAtiva.id + "|" + tipo + "|" + opt.category, function (e0, reg) {
        var nome = reg ? reg.name : opt.category;
        origem(function (org) {
          Sync.categoria(fonteAtiva, org, tipo, opt.category, null, function (e) {
            if (e) { Log.warn("catalog", "categoria nao sincronizou", { why: e }); }
            ler(nome);
          });
        });
      });
    }
    if (tipo !== "live") { return cb(null, { total: 0, offset: 0, items: [], nota: "escolha uma categoria" }); }
    ler();
  }

  /* --------------------------------------------------------- serie */
  function seriesInfo(id, cb) {
    if (modo !== "local") { return API.seriesInfo(id, cb); }
    if (!fonteAtiva) { return cb(new Error("nenhuma fonte sincronizada")); }
    DB.episodesOf(id, function (e, eps) {
      if (!e && eps && eps.length) { return cb(null, agrupar(eps)); }
      origem(function (org) {
        Sync.serie(fonteAtiva, org, id, function (e2) {
          if (e2) { return cb(new Error(e2)); }
          DB.episodesOf(id, function (e3, eps2) {
            if (e3) { return cb(new Error(e3)); }
            cb(null, agrupar(eps2));
          });
        });
      });
    });
  }
  function agrupar(eps) {
    var porT = {}, ordem = [];
    eps.forEach(function (ep) {
      if (!porT[ep.season]) { porT[ep.season] = []; ordem.push(ep.season); }
      porT[ep.season].push(ep);
    });
    ordem.sort(function (a, b) { return a - b; });
    return { seasons: ordem.map(function (t) { return { season: t, episodes: porT[t] }; }),
             totalEpisodios: eps.length };
  }

  /* ------------------------------------------------ decisao de play */
  function achar(id, cb) {
    var stores = ["live", "vod", "series", "episodes"], i = 0;
    (function prox() {
      if (i >= stores.length) { return cb(null); }
      DB.get(stores[i++], id, function (e, it) { if (it) { return cb(it); } prox(); });
    })();
  }

  function play(id, cb) {
    if (modo !== "local") { return API.play(id, cb); }
    achar(id, function (it) {
      if (!it) { return cb(new Error("item nao encontrado no banco local")); }
      var url = String(it.url || "");
      var ehHls = /\.m3u8(\?|$)/i.test(url);
      var ehTs = /\.ts(\?|$)/i.test(url);
      var arquivo = (it.kind === "vod" || it.kind === "episode") && !ehHls;
      var per = it.headers || null;
      var base = { id: it.id, name: it.name, direct: url, proxied: null,
                   needsHeaders: !!per, probe: null };

      if (it.playable === false) {
        base.preferred = null; base.fallback = null; base.naoTocavel = true;
        base.note = "container ." + it.container + " nao toca nesta TV";
        return cb(null, base);
      }
      if (arquivo) {
        base.preferred = "native"; base.fallback = null; base.maxRetry = 1;
        base.startupMs = 45000; base.note = null;
        /* sonda pelo JS Service quando existir: moov no inicio encurta o prazo */
        return origem(function (org) {
          if (org !== Sync.origemLuna) { return cb(null, base); }
          Luna.service("probeFile", { url: url, perChannel: per }, function (r, e) {
            if (!e && r && r.ok) {
              base.probe = r;
              if (r.moovNoInicio) { base.startupMs = 25000; }
              else { base.note = "arquivo sem faststart: abertura lenta"; }
            } else if (!e && r && r.erro) { base.note = r.erro; }
            cb(null, base);
          }, 12000);
        });
      }
      base.preferred = "native";
      /* hls.js so existe com o proxy do PC: sem PC (ou simulando), sem reserva */
      var temPC = !!API.getBase() && !API.simularOffline();
      base.fallback = ehTs ? null : (temPC ? "hlsjs" : null);
      base.note = ehTs ? "MPEG-TS cru: so o player nativo" : null;
      /* hls.js precisa do proxy do PC; sem PC, sem reserva */
      if (base.fallback === "hlsjs") {
        base.proxied = API.getBase() + "/proxy?url=" + encodeURIComponent(url) +
          (per && per.referer ? ("&ref=" + encodeURIComponent(per.referer)) : "") +
          (per && per.userAgent ? ("&ua=" + encodeURIComponent(per.userAgent)) : "");
      }
      cb(null, base);
    });
  }

  /* ------------------------------------------------- sincronizar */
  function sincronizar(fonte, onProg, cb) {
    /* preserva a senha ja guardada se esta sincronizacao veio sem ela */
    if (!fonte.password && fonteAtiva && fonteAtiva.id === fonte.id && fonteAtiva.password) {
      fonte.password = fonteAtiva.password;
    }

    /* Xtream sem senha: busca do PC ANTES de qualquer coisa. E a
       credencial do proprio usuario; sem ela o JS Service da TV nao
       autentica no provedor (era o HTTP 404 do log de 11/09). */
    if (fonte.type === "xtream" && !fonte.password && API.getBase() && !API.simularOffline()) {
      return API.sourceSecret(fonte.id, function (e, sec) {
        if (!e && sec && sec.password) {
          fonte.password = sec.password;
          if (sec.username) { fonte.username = sec.username; }
          Log.info("catalog", "senha obtida do PC e guardada na TV");
        } else {
          Log.warn("catalog", "PC nao entregou a senha", { why: e ? String(e) : "vazia" });
        }
        continuarSync(fonte, onProg, cb);
      });
    }
    continuarSync(fonte, onProg, cb);
  }

  function continuarSync(fonte, onProg, cb) {
    fonteAtiva = fonte;
    Store.pref("fonteLocal", JSON.stringify(fonte));   /* grava JA com a senha */
    origem(function (org) {
      Sync.fonte(fonte, org, onProg, function (e, relato) {
        if (!e) {
          fonteAtiva = fonte;
          Store.pref("fonteLocal", JSON.stringify(fonte));
        }
        cb(e, relato);
      });
    });
  }

  return { init: init, setModo: setModo, getModo: getModo, setFonte: setFonte, getFonte: getFonte,
           categories: categories, channels: channels, seriesInfo: seriesInfo, play: play,
           sincronizar: sincronizar, origem: origem };
})();
window.Catalog = Catalog;
