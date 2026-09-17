/*
 * app.js — orquestrador, instrumentado.
 *
 * Cada canal assistido gera um registro "playback" completo:
 *   canal, motor usado, tempo ate metadata, tempo ate o primeiro frame,
 *   se houve fallback, quantos travamentos, erro final e duracao.
 * Isso vira dataset no PC: da para descobrir quais canais prestam
 * de verdade sem anotar nada na mao.
 */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  function txt(el, s) { el.innerHTML = ""; el.appendChild(document.createTextNode(s)); }
  function now() { return Date.now(); }

  var vid = $("video");
  var player = new Player(vid, {});
  var list = null, monitor = null;
  var categories = [], catIndex = 0;
  var currentChannel = null;
  var pb = null;

  /* Retentativa com cancelamento e backoff.
     No log de 09/09 o reload agendado disparava mesmo depois de o canal
     ter recuperado, criando um laco infinito. Agora ha um unico timer,
     sempre cancelavel. */
  var retryTimer = null, retryCount = 0, attemptT0 = 0, metaVista = false;
  var nativoRecusouNaHora = false, manifestoFalhou = false;
  var MAX_RETRY = 3;
  var maxRetryAtual = 3;

  /* Debounce. No log de 09/09 houve uma rajada de 28 trocas em menos de
     1 segundo: cada tecla abria a pipeline de midia e a proxima matava.
     43 sessoes abortadas, 37 delas com menos de 500ms.
     Utilitario no mesmo espirito do debounce() do nodecast-tv. */
  function debounce(fn, wait) {
    var t = null;
    return function () {
      var args = arguments, self = this;
      if (t) { clearTimeout(t); }
      t = setTimeout(function () { t = null; fn.apply(self, args); }, wait);
    };
  }
  var pendingChannel = null;

  function cancelRetry() {
    if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
  }
  function scheduleRetry(reason) {
    cancelRetry();
    if (retryCount >= maxRetryAtual) {
      Log.error("retry", "desistindo apos " + retryCount + " tentativas",
                { channel: currentChannel ? currentChannel.name : null, reason: reason });
      if (pb) { pb.error = "desistiu: " + reason; }
      overlay("<div>Canal fora do ar<br><span style='font-size:var(--fs-sm);color:var(--color-text-muted)'>" +
              retryCount + " tentativas, " + reason +
              "<br>escolha outro canal ou aperte VERMELHO</span></div>");
      return;
    }
    retryCount++;
    var wait = 1500 * retryCount;     /* 1.5s, 3s, 4.5s */
    Log.warn("retry", "tentativa " + retryCount + "/" + maxRetryAtual + " em " + wait + "ms",
             { channel: currentChannel ? currentChannel.name : null, reason: reason });
    overlay('<div><span class="spinner"></span>' + reason +
            "<br><span style='font-size:var(--fs-sm);color:var(--color-text-muted)'>tentativa " +
            retryCount + " de " + MAX_RETRY + "</span></div>");
    retryTimer = setTimeout(function () {
      retryTimer = null;
      if (currentChannel) { playChannel(currentChannel, true); }
    }, wait);
  }

  function pbStart(ch) {
    pbFinish("trocou");
    pb = { channelId: ch.id, channel: ch.name, category: ch.category,
           status: ch.status, t0: now(), engine: null,
           tPlayApi: null, tMeta: null, tFirstFrame: null,
           fallback: false, stalls: 0, reloads: 0, audioOnly: false,
           error: null, endedBy: null, w: null, h: null };
  }
  function pbFinish(reason) {
    if (!pb) { return; }
    pb.endedBy = reason;
    pb.durationMs = now() - pb.t0;
    Log.event("playback", pb);
    pb = null;
  }

  function setStatus(cls, msg) {
    var b = $("status");
    b.className = "topbar-status " + cls;
    b.innerHTML = '<span class="dot"></span>';
    b.appendChild(document.createTextNode(msg));
  }
  function overlay(html) {
    var o = $("overlay");
    if (!html) { o.className = "stage-overlay hidden"; o.innerHTML = ""; return; }
    o.className = "stage-overlay";
    o.innerHTML = html;
  }

  /* Endereco do backend. O valor gravado pelo usuario (Store.pref) tem
     prioridade; este aqui e o padrao ate existir a tela de configuracao. */
  var BACKEND_PADRAO = "http://192.168.101.13:8099";

  function resolveBackend(cb) {
    var saved = Store.pref("backend") || BACKEND_PADRAO;
    if (saved) { API.setBase(saved); }
    Log.info("boot", "backend", { base: API.getBase() || "(origem do app)" });
    var t = now();
    API.health(function (e, h) {
      if (e) {
        Log.error("api", "health falhou", { why: e.message });
        /* Modo LOCAL: o PC pode estar desligado e tudo bem. O catalogo
           esta no IndexedDB; so o hls.js de reserva fica indisponivel. */
        if (Catalog.getModo() === "local" && Catalog.getFonte()) {
          Log.info("boot", "sem backend, mas em modo local: seguindo com o IndexedDB");
          Log.stat("canais", "local");
          return cb(true);
        }
        return cb(false);
      }
      Log.event("health", { ms: now() - t, channels: h.channels, alive: h.alive,
                            categories: h.categories, validating: h.validating });
      Log.stat("canais", h.alive + "/" + h.channels);
      cb(true);
    });
  }

  function renderCats() {
    var strip = $("cats");
    strip.innerHTML = "";
    for (var i = 0; i < categories.length; i++) {
      var d = document.createElement("span");
      d.className = "cat" + (i === catIndex ? " is-active" : "");
      d.appendChild(document.createTextNode(categories[i].name + " (" + categories[i].count + ")"));
      strip.appendChild(d);
    }
  }

  var pendingCat = -1;
  var loadCategoryDebounced = debounce(function () {
    if (pendingCat >= 0) { var i = pendingCat; pendingCat = -1; loadCategoryNow(i); }
  }, 350);

  function loadCategory(i) {
    if (i < 0 || i >= categories.length) { return; }
    catIndex = i;
    pendingCat = i;
    renderCats();                 /* pinta na hora, carrega depois */
    loadCategoryDebounced();
  }

  var PAGINA = 120;

  /* TV ao vivo, filmes e series sao COLECOES SEPARADAS na API do Xtream.
     Sem a troca de secao o provedor parece so ter TV. */
  var SECOES = [
    { id: "live",   nome: "TV ao vivo" },
    { id: "vod",    nome: "Filmes" },
    { id: "series", nome: "Series" }
  ];
  var secao = 0;
  var serieAberta = null;   /* quando != null, a lista mostra episodios */


  function trocarSecao(delta) {
    serieAberta = null;
    secao = (secao + delta + SECOES.length) % SECOES.length;
    var sec = SECOES[secao];
    Log.info("ui", "secao: " + sec.nome);
    Log.stat("secao", sec.nome);
    setStatus("is-warn", "carregando " + sec.nome + "...");
    Catalog.categories(sec.id, function (err, cats) {
      if (err) { setStatus("is-err", "erro: " + err.message); return; }
      if (!cats || cats.length <= 1) {
        var total = cats && cats[0] ? cats[0].count : 0;
        if (!total) {
          setStatus("is-warn", sec.nome + ": nada nesta fonte");
          categories = cats || []; catIndex = 0; renderCats();
          list.setSource(0, function (o, l, cb) { cb([]); });
          return;
        }
      }
      categories = cats; catIndex = 0; renderCats(); loadCategoryNow(0);
    });
  }

  /* Serie -> temporadas -> episodios. O Hypnotix busca as temporadas so
     quando o usuario abre a serie; sao muitos episodios para carregar
     tudo de antemao. */
  function abrirSerie(item) {
    setStatus("is-warn", "carregando " + item.name + "...");
    Log.info("serie", "abrindo", { id: item.id, nome: item.name });
    Catalog.seriesInfo(item.id, function (err, info) {
      if (err) { setStatus("is-err", "erro: " + err.message); return; }
      var eps = [];
      (info.seasons || []).forEach(function (t) {
        t.episodes.forEach(function (e) {
          e.name = "T" + t.season + "E" + e.num + "  " + e.name;
          e.category = "Temporada " + t.season;
          eps.push(e);
        });
      });
      serieAberta = item;
      list.setItems(eps);
      setStatus("is-ok", item.name + ": " + eps.length + " episodios");
      Log.event("serie.aberta", { nome: item.name, temporadas: (info.seasons || []).length,
                                  episodios: eps.length });
    });
  }

  function loadCategoryNow(i) {
    if (i < 0 || i >= categories.length) { return; }
    catIndex = i;
    renderCats();
    var cat = categories[i];
    setStatus("is-warn", "carregando " + cat.name + "...");
    var t = now();

    /* So a PRIMEIRA pagina. O total vem junto e a lista puxa o resto
       conforme voce rola. Com 10 mil canais, buscar tudo de uma vez
       significa ~4 MB de JSON parseados numa TV com 193 MB livres. */
    var tipo = SECOES[secao].id;
    Catalog.channels({ type: tipo, category: cat.id, limit: PAGINA, offset: 0 }, function (err, data) {
      if (err) {
        setStatus("is-err", "erro: " + err.message);
        Log.error("api", "channels falhou", { category: cat.id, why: err.message });
        return;
      }
      var fetchMs = now() - t;
      var tr = now();

      list.setSource(data.total, function (off, lim, cb) {
        if (off === 0 && data && data.items) {
          var primeira = data.items; data = null;   /* reaproveita e solta */
          return cb(primeira);
        }
        Catalog.channels({ type: tipo, category: cat.id, limit: lim, offset: off }, function (e2, d2) {
          if (e2) {
            Log.warn("api", "pagina falhou", { offset: off, why: e2.message });
            return cb(null);
          }
          cb(d2.items);
        });
      });

      var renderMs = now() - tr;
      setStatus("is-ok", cat.total + " canais em " + cat.name);
      Log.event("category.load", { name: cat.name, total: cat.total,
                                   primeiraPagina: PAGINA,
                                   fetchMs: fetchMs, renderMs: renderMs });
      Log.stat("categoria", cat.name);
    });
  }

  /* so abre o canal depois que o dedo parou no controle */
  var playChannelDebounced = debounce(function () {
    if (pendingChannel) { var c = pendingChannel; pendingChannel = null; playChannelNow(c, false); }
  }, 400);

  function playChannel(ch, isReload) {
    if (isReload) { return playChannelNow(ch, true); }
    pendingChannel = ch;
    currentChannel = ch;
    txt($("nowTitle"), ch.name);
    overlay('<div><span class="spinner"></span>' + ch.name + "</div>");
    playChannelDebounced();
  }

  function playChannelNow(ch, isReload) {
    cancelRetry();
    /* O /api/play chegou a levar 3216ms no Xtream. Sem parar o monitor
       aqui, o cronometro do canal ANTERIOR alarmava durante a espera —
       foi o que produziu o stall fantasma do Big Bang as 23:04. */
    if (monitor) { monitor.stop(); }
    currentChannel = ch;
    if (isReload && pb) { pb.reloads++; }
    else { pbStart(ch); retryCount = 0; }
    attemptT0 = now();     /* cada tentativa tem seu proprio cronometro */
    metaVista = false;
    nativoRecusouNaHora = false;
    manifestoFalhou = false;

    txt($("nowTitle"), ch.name);
    $("nowMeta").innerHTML = "";
    overlay('<div><span class="spinner"></span>abrindo ' + ch.name + "</div>");
    Log.info("play", "abrindo " + ch.name, { id: ch.id, status: ch.status, reload: !!isReload });

    var t = now();
    Catalog.play(ch.id, function (err, info) {
      if (!err && info && info.naoTocavel) {
        setStatus("is-err", info.note || "nao toca nesta TV");
        Log.warn("play", "recusado pelo backend", { nome: ch.name, why: info.note });
        return;
      }
      if (err) {
        if (pb) { pb.error = "api: " + err.message; }
        Log.error("play", "api /play falhou", { id: ch.id, why: err.message });
        overlay("<div>falha ao abrir: " + err.message + "</div>");
        return;
      }
      if (pb) { pb.tPlayApi = now() - t; }
      Log.info("play", "backend respondeu", { preferred: info.preferred,
                                              fallback: info.fallback, note: info.note,
                                              startupMs: info.startupMs || null,
                                              maxRetry: info.maxRetry || null });
      /* Arquivo (filme/episodio) tem regras proprias, decididas pelo
         backend: sem hls.js, prazo maior (moov no fim do MP4) e uma
         tentativa so. Sem isto o Dracula levou 17s para tocar e foi
         morto 3 vezes a cada 8s no log de 10/09. */
      maxRetryAtual = info.maxRetry || MAX_RETRY;
      if (monitor) { monitor.setStartup(info.startupMs || null); }
      if (info.note) { setStatus("is-warn", info.note); }
      player.play(info);
      if (monitor) { monitor.start(); }
    });
  }

  function updateNowMeta(extra) {
    var m = $("nowMeta");
    m.innerHTML = "";
    var b = document.createElement("span");
    b.className = "badge-engine" + (player.engine === "hlsjs" ? " is-hls" : "");
    b.appendChild(document.createTextNode(player.engine === "hlsjs" ? "hls.js + proxy" : "nativo"));
    m.appendChild(b);
    if (vid.videoWidth) {
      var r = document.createElement("span");
      r.innerHTML = '<span class="sep">|</span>';
      r.appendChild(document.createTextNode(vid.videoWidth + "x" + vid.videoHeight));
      m.appendChild(r);
    }
    if (extra) {
      var e = document.createElement("span");
      e.innerHTML = '<span class="sep">|</span>';
      e.appendChild(document.createTextNode(extra));
      m.appendChild(e);
    }
  }

  function onKey(ev) {
    var k = ev.keyCode;

    /* a tela de configuracao consome tudo enquanto estiver aberta */
    if (Settings.isOpen()) { Settings.handleKey(k, ev); return; }

    if (k === Keys.BLUE) {
      cancelRetry();
      Log.info("ui", "configuracao aberta");
      Settings.open(function () {
        Log.info("ui", "configuracao fechada");
        /* a fonte pode ter mudado: recarrega categorias */
        /* o tipo e obrigatorio: sem ele, em modo local o IndexedDB recebia
           a funcao como chave ("not a valid key") e em modo servidor a
           API perdia o callback */
        Catalog.categories(SECOES[secao].id, function (err, cats) {
          if (err) { setStatus("is-err", err.message); return; }
          categories = cats; catIndex = 0; renderCats(); loadCategoryNow(0);
        });
      });
      ev.preventDefault(); return;
    }
    if (k === Keys.YELLOW) {
      var on = Log.toggleHud();
      Log.info("ui", "hud " + (on ? "ligado" : "desligado"));
      ev.preventDefault(); return;
    }

    if (k === Keys.UP)      { list.move(-1); ev.preventDefault(); return; }
    if (k === Keys.DOWN)    { list.move(1);  ev.preventDefault(); return; }
    if (k === Keys.CH_UP)   { list.move(-1); list.activate(); ev.preventDefault(); return; }
    if (k === Keys.CH_DOWN) { list.move(1);  list.activate(); ev.preventDefault(); return; }
    if (k === Keys.LEFT)    { loadCategory(catIndex - 1); ev.preventDefault(); return; }
    if (k === Keys.RIGHT)   { loadCategory(catIndex + 1); ev.preventDefault(); return; }
    if (k === Keys.OK)      { list.activate(); ev.preventDefault(); return; }

    /* Play e Pause sao teclas SEPARADAS nesta TV — sem toggle */
    if (k === Keys.PLAY)  { vid.play(); Log.info("ui", "play"); return; }
    if (k === Keys.PAUSE) { vid.pause(); Log.info("ui", "pause"); return; }
    if (k === Keys.STOP)  {
      cancelRetry();
      player.stop(); if (monitor) { monitor.stop(); }
      pbFinish("parado"); overlay("<div>parado</div>"); Log.info("ui", "stop"); return;
    }
    if (k === Keys.BACK)  { cancelRetry(); pbFinish("back"); Log.flush(); ev.preventDefault(); return; }
    if (k === Keys.RED)   {
      cancelRetry(); retryCount = 0;
      if (currentChannel) { playChannelNow(currentChannel, false); }
      return;
    }
    /* TV ao vivo -> Filmes -> Series. Sem isto, um provedor Xtream
       parece so ter TV, que foi o que aconteceu no teste de 22:40. */
    if (k === Keys.GREEN) { trocarSecao(1); ev.preventDefault(); return; }
  }

  var BUILD = "0911-1441";   /* muda a cada entrega: prova qual versao a TV roda */

  function boot() {
    Catalog.init();
    Log.stat("modo", Catalog.getModo());
    Log.install();
    Log.info("boot", "build", { versao: BUILD });
    Log.stat("build", BUILD);
    Log.info("boot", "iniciando", {
      ua: navigator.userAgent, screen: screen.width + "x" + screen.height,
      dpr: window.devicePixelRatio || 1, cores: navigator.hardwareConcurrency || 0
    });

    var panel = Luna.panel();
    if (panel) {
      txt($("device"), panel.model + " - painel " + panel.w + "x" + panel.h + " " + panel.type);
      Log.event("device", panel);
      Log.stat("tv", panel.model);
    } else {
      txt($("device"), "fora do webOS (navegador)");
      Log.warn("boot", "PalmSystem ausente - rodando fora da TV");
    }

    Luna.network(function (net, err) {
      if (net) {
        txt($("net"), net.online ? (net.medium + " - " + net.ip) : "sem rede");
        Log.event("network", net);
        Log.stat("rede", net.medium);
      } else { Log.warn("boot", "connectionmanager indisponivel", { why: err }); }
    });

    Store.init(function (db8) {
      txt($("storage"), db8 ? "DB8 ativo" : "DB8 indisponivel - memoria");
      Log.event("storage", { db8: db8 });
    });

    /* A sonda no /api/play custou ate 1866ms (p90 767ms) no log de 19:25.
       Como ja existe uma janela de debounce enquanto o usuario navega,
       aquecemos o cache do servidor para o canal em foco. Quando ele
       apertar OK, a resposta ja esta pronta. */
    var warmed = {};
    var warm = debounce(function (ch) {
      if (!ch || warmed[ch.id]) { return; }
      warmed[ch.id] = 1;
      Catalog.play(ch.id, function () {});
    }, 500);

    list = new ChannelList($("channels"), {
      pageSize: PAGINA,
      onSelect: function (ch) { if (ch) { warm(ch); } },
      onActivate: function (ch) {
        if (ch.kind === "series") { return abrirSerie(ch); }
        if (ch.playable === false) {
          setStatus("is-err", "container ." + ch.container + " nao toca nesta TV");
          Log.warn("play", "container incompativel",
                   { nome: ch.name, container: ch.container });
          return;
        }
        playChannel(ch, false);
      },
      onPage: function (p) {
        Log.event("lista.pagina", { pagina: p.pagina, offset: p.offset,
                                    recebidos: p.recebidos, ms: p.ms,
                                    emMemoria: list.loadedCount(),
                                    total: list.count() });
        Log.stat("lista", list.loadedCount() + "/" + list.count());
      }
    });

    monitor = new HealthMonitor(vid, {
      sampleMs: 250, reportMs: 1000,
      stallMs: 2000,       /* so vale DEPOIS do primeiro frame */
      startupMs: 12000,    /* 1080p medido levou 3.6s so ate a metadata */

      onFirstFrame: function (ms) {
        cancelRetry();     /* pegou video: nada de reload pendente */
        var naTentativa = retryCount;   /* registra ANTES de zerar */
        retryCount = 0;
        if (pb && pb.tFirstFrame === null) { pb.tFirstFrame = ms; }
        Log.event("firstframe", { channel: currentChannel ? currentChannel.name : null,
                                  engine: player.engine, ms: ms, tentativa: naTentativa });
        Log.stat("1o frame", ms + "ms");
      },

      /* Stream sem faixa de video. Nao adianta recarregar: o canal
         simplesmente nao esta mandando imagem agora. */
      onAudioOnly: function () {
        cancelRetry();
        if (pb) { pb.audioOnly = true; }
        Log.warn("audio", "stream sem faixa de video (videoWidth=0)",
                 { channel: currentChannel ? currentChannel.name : null });
        overlay("<div>SOMENTE AUDIO<br><span style='font-size:var(--fs-sm);color:var(--color-text-muted)'>" +
                "este canal nao esta transmitindo imagem</span></div>");
      },

      /* Nao comecou dentro do prazo. Aqui sim vale tentar de novo. */
      onStartupTimeout: function (info) {
        /* Log de 11/09: Adesso tv, XXX PRIVATE, SEXT6SENSO, XY Plus e
           GirlsDoPorn — o nativo recusou NA HORA (SRC_NOT_SUPPORTED) e o
           hls.js nao achou o manifesto. Sao streams fora do ar, e o app
           gastava 45s insistindo tres vezes em cada um. */
        if (nativoRecusouNaHora && manifestoFalhou) {
          cancelRetry();
          setStatus("is-err", "fora do ar (os dois motores recusaram)");
          overlay("<div>Canal fora do ar</div>");
          Log.error("play", "fora do ar: nativo e hls.js recusaram de imediato",
                    { channel: currentChannel ? currentChannel.name : null });
          if (pb) { pb.error = "fora do ar"; }
          return;
        }
        Log.warn("startup", "nao iniciou no prazo",
                 { channel: currentChannel ? currentChannel.name : null,
                   engine: player.engine, ms: info.elapsed,
                   readyState: info.readyState, limite: info.limite });
        /* Recarregar o MESMO motor pela enesima vez nao ajudou em nenhum
           caso do log. Trocar de motor ajudou (WooHoo). Tenta isso antes. */
        if (player.switchToFallback("nao iniciou em " + Math.round(info.elapsed / 1000) + "s")) {
          if (pb) { pb.fallback = true; }
          Log.info("startup", "trocando de motor em vez de recarregar");
          if (monitor) { monitor.start(); }
          return;
        }
        scheduleRetry("nao iniciou em " + Math.round(info.elapsed / 1000) + "s");
      },

      onStall: function (info) {
        if (pb) { pb.stalls++; }
        Log.warn("stall", "travou depois de tocar",
                 { channel: currentChannel ? currentChannel.name : null,
                   engine: player.engine, frozenMs: info.frozenFor, n: info.count });
        /* Em NENHUM log recarregar o mesmo motor salvou um canal.
           Trocar salvou (WooHoo, AWTV). Tenta trocar antes de insistir. */
        if (player.switchToFallback("travou ha " + Math.round(info.frozenFor / 1000) + "s")) {
          if (pb) { pb.fallback = true; }
          Log.info("stall", "trocando de motor em vez de recarregar");
          if (monitor) { monitor.start(); }
          return;
        }
        scheduleRetry("travou ha " + Math.round(info.frozenFor / 1000) + "s");
      },

      onRecover: function () {
        cancelRetry();     /* CORRECAO: sem isso o reload matava o canal recuperado */
        Log.info("stall", "recuperou");
        overlay(null);
      },

      onTick: function (s) {
        if (!s.stalled && !s.starting && currentChannel) {
          updateNowMeta("buffer " + s.bufferAhead.toFixed(0) + "s");
        }
        Log.stat("buffer", s.bufferAhead.toFixed(0) + "s");
        Log.stat("ct", s.ct.toFixed(1) + "s");
        if (s.starting) { Log.stat("fase", "partida " + Math.round(s.elapsed / 100) / 10 + "s"); }
        else { Log.stat("fase", "tocando"); }
      }
    });

    player.on.statechange = function (e) {
      if (e.state === "metadata") {
        /* O hls.js dispara loadedmetadata a cada troca de nivel, nao so
           na abertura. No log de 20:17 isso gerou ms=383699 (6 minutos!)
           porque o cronometro era da primeira tentativa. So a PRIMEIRA
           metadata de cada tentativa e tempo de abertura; as demais sao
           troca de qualidade e viram outro evento. */
        var metaMs = now() - attemptT0;
        if (pb) { pb.w = e.w; pb.h = e.h; pb.engine = player.engine; }
        if (metaVista) {
          Log.info("player", "troca de nivel", { w: e.w, h: e.h, engine: player.engine });
        } else {
          metaVista = true;
          if (pb && pb.tMeta === null) { pb.tMeta = metaMs; }
          Log.event("metadata", { ms: metaMs, tentativa: retryCount,
                                  w: e.w, h: e.h, engine: player.engine,
                                  semVideo: (e.w === 0 && e.h === 0) });
        }
      }
      if (e.state === "playing") { overlay(null); updateNowMeta(); Log.info("player", "tocando"); }
      if (e.state === "buffering") { overlay('<div><span class="spinner"></span>carregando</div>'); }
      if (e.state === "fallback" && /SRC_NOT_SUPPORTED/.test(e.why || "")) {
        nativoRecusouNaHora = true;
      }
      if (e.state === "fallback") {
        /* BUG do log de 23:03: o Band RS trocou para hls.js e 1 segundo
           depois levou "nao iniciou em 8s" — porque o cronometro ainda
           era da tentativa NATIVA. O motor novo merece o prazo cheio. */
        attemptT0 = now();
        metaVista = false;
        if (monitor) { monitor.start(); }
        if (pb) { pb.fallback = true; }
        Log.warn("player", "nativo recusou, caindo para hls.js", { why: e.why });
        overlay('<div><span class="spinner"></span>nativo recusou - tentando hls.js pelo proxy</div>');
      }
      if (e.state === "loading") {
        Log.info("player", "carregando com " + e.engine); Log.stat("motor", e.engine);
      }
      /* o hls.js se recuperando sozinho: nao e falha, e o mecanismo funcionando */
      if (e.state === "recovering") {
        Log.info("player", "hls.js recuperando", { why: e.why });
      }
      if (e.state === "retrying" && /manifestLoad/.test(e.why || "")) {
        manifestoFalhou = true;
      }
      if (e.state === "retrying") {
        Log.warn("player", "hls.js retentando rede",
                 { why: e.why, tentativa: e.attempt, esperaMs: e.wait });
      }
    };
    player.on.error = function (e) {
      cancelRetry();
      if (pb) { pb.error = e.why; pb.engine = e.engine; }
      Log.error("player", "falhou", { channel: currentChannel ? currentChannel.name : null,
                                      engine: e.engine, why: e.why });
      overlay("<div>nao foi possivel reproduzir<br><span style='font-size:var(--fs-sm);color:var(--color-text-muted)'>" +
              e.why + "</span></div>");
    };

    resolveBackend(function (ok) {
      if (!ok) {
        setStatus("is-err", "backend inacessivel");
        overlay("<div>Backend nao encontrado.<br><span style='font-size:var(--fs-sm)'>" +
                "Rode <b>node server.js</b> no PC, ou aperte <b>AZUL</b> e sincronize o " +
                "catalogo para a TV para usar sem PC.</span></div>");
        return;
      }
      Catalog.categories("live", function (err, cats) {
        if (err) { setStatus("is-err", err.message); Log.error("api", "categories", { why: err.message }); return; }
        categories = cats; catIndex = 0; renderCats(); loadCategory(0);
      });
    });

    document.addEventListener("keydown", onKey, false);
    overlay("<div>escolha um canal e aperte OK<br><span style='font-size:var(--fs-sm);color:var(--color-text-muted)'>AZUL abre o log na tela</span></div>");
    Log.info("boot", "pronto");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, false);
  } else { boot(); }
})();
