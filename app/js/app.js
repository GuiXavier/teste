/*
 * app.js — orquestrador da interface.
 *
 * Desenho portado do nodecast-tv: navbar, home de trilhas, grade de
 * posters, ficha do titulo e player em tela cheia. O que muda em relacao
 * ao original e o meio de entrada: nao existe ponteiro obrigatorio nem
 * :hover, entao cada zona (navbar, faixa de categorias, conteudo) tem foco
 * proprio e o D-pad anda entre elas.
 *
 * O que NAO mudou, porque foi medido nesta TV e continua valendo:
 *   - cada reproducao gera um registro "playback" completo
 *   - toda resposta assincrona carrega uma geracao; resposta velha nao
 *     altera selecao nova
 *   - o <video> nunca troca de pai: #stage e position:fixed e so muda de
 *     retangulo entre a janela da pagina ao vivo e a tela cheia
 */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  function txt(el, s) { el.innerHTML = ""; el.appendChild(document.createTextNode(s)); }
  function now() { return Date.now(); }
  function minutos(seg) { return Math.floor(Number(seg) / 60); }

  var vid = $("video");
  var player = new Player(vid, {});
  var stage = $("stage");

  /* ---------------------------------------------------------- paginas */
  var PAGES = [
    { id: "home",   nome: "Inicio",     el: "page-home" },
    { id: "live",   nome: "TV ao vivo", el: "page-live",   tipo: "live",   cats: "cats-live" },
    { id: "vod",    nome: "Filmes",     el: "page-vod",    tipo: "vod",    cats: "cats-vod",    grid: "grid-vod" },
    { id: "series", nome: "Series",     el: "page-series", tipo: "series", cats: "cats-series", grid: "grid-series" },
    { id: "search", nome: "Buscar",     el: "page-search" },
    { id: "detail", nome: "Ficha",      el: "page-detail", oculta: true }
  ];
  function pageIndexOf(id) {
    var i;
    for (i = 0; i < PAGES.length; i++) { if (PAGES[i].id === id) { return i; } }
    return 0;
  }

  var pagina = 0;                       /* indice em PAGES */
  var zona = "content";                 /* "nav" | "cats" | "content" */
  var navLinks = [];
  var voltarDe = null;                  /* pagina que abriu a ficha */

  /* estado por pagina de catalogo */
  var estado = {
    live:   { cats: [], catIndex: 0 },
    vod:    { cats: [], catIndex: 0 },
    series: { cats: [], catIndex: 0 }
  };
  /* compatibilidade com o codigo de categorias: apontam para o estado
     da pagina corrente */
  var categories = [], catIndex = 0;

  var list = null, grids = {}, home = null, monitor = null;
  var viewIntent = 0, playIntent = 0, selectionIntent = 0;
  var currentChannel = null, pendingChannel = null;
  var pb = null, playbackSequence = 0, suspended = false, warm = null;
  var choice = null, choiceIndex = 0, resumePosition = 0, checkpointAt = 0;
  var watchMode = "off";                /* "off" | "inline" | "full" */
  var barTimer = null, ultimaBusca = 0;
  var resumePlayer = window.ResumePlayback
    ? new ResumePlayback(vid, function (message) { setStatus("is-warn", message); })
    : null;

  var BUILD = window.IPTV_BUILD ? window.IPTV_BUILD.id : "dev-sem-manifesto";
  var PAGINA = 120;

  function paginaAtual() { return PAGES[pagina]; }
  function sourceId() { var s = Catalog.getFonte ? Catalog.getFonte() : null; return s ? s.id : null; }

  /* ----------------------------------------------------------- status */
  function setStatus(cls, msg) {
    var b = $("status");
    b.className = "nav-status " + cls;
    b.innerHTML = '<span class="dot"></span>';
    b.appendChild(document.createTextNode(msg));
  }
  function overlay(html) {
    var o = $("overlay");
    if (!html) { o.className = "stage-overlay hidden"; o.innerHTML = ""; return; }
    o.className = "stage-overlay";
    o.innerHTML = html;
  }

  /* ------------------------------------------------- palco e tela cheia */
  /* O retangulo da janela vem do slot na pagina ao vivo. Medir em vez de
     fixar em px mantem o desenho correto se a TV entregar outro viewport. */
  function positionStage() {
    if (watchMode === "off") { stage.className = "stage is-off"; return; }
    if (watchMode === "full") {
      stage.className = "stage is-full";
      return;
    }
    var slot = $("stageSlot");
    var r = slot && slot.getBoundingClientRect ? slot.getBoundingClientRect() : null;
    stage.className = "stage";
    if (!r || !r.width) { return; }
    stage.style.left = Math.round(r.left) + "px";
    stage.style.top = Math.round(r.top) + "px";
    stage.style.width = Math.round(r.width) + "px";
    stage.style.height = Math.round(r.height) + "px";
  }

  function showBar(temporario) {
    var bar = $("watchBar");
    if (!bar) { return; }
    if (watchMode !== "full") { bar.className = "watch-bar hidden"; return; }
    /* com o foco na fileira de botoes a barra nao pode sumir sozinha */
    if (Controls.zone() === "botoes") { temporario = false; }
    bar.className = "watch-bar";
    if (barTimer) { clearTimeout(barTimer); barTimer = null; }
    if (temporario) {
      barTimer = setTimeout(function () {
        barTimer = null;
        if (watchMode === "full") { bar.className = "watch-bar hidden"; }
      }, 4500);
    }
  }
  function updateBar(extra) {
    if (watchMode !== "full" || !currentChannel) { return; }
    txt($("watchTitle"), currentChannel.name || "");
    var partes = [];
    if (currentChannel.kind === "episode" && currentChannel.seriesName) { partes.push(currentChannel.seriesName); }
    partes.push(player.engine === "hlsjs" ? "hls.js + proxy" : "nativo");
    if (vid.videoWidth) { partes.push(vid.videoWidth + "x" + vid.videoHeight); }
    if (currentChannel.category) { partes.push(currentChannel.category); }
    if (extra) { partes.push(extra); }
    txt($("watchSub"), partes.join("  ·  "));
    Controls.update();
  }

  function enterFull() {
    if (watchMode === "off") { return; }
    watchMode = "full";
    positionStage();
    showBar(true);
    updateBar();
    renderKeybar();
    Log.info("ui", "tela cheia");
  }
  function exitFull() {
    if (watchMode !== "full") { return false; }
    UpNext.hide();
    /* TV ao vivo volta para a janela da pagina; filme/episodio encerra,
       porque fora da tela cheia eles nao tem onde aparecer */
    if (currentChannel && currentChannel.kind !== "vod" && currentChannel.kind !== "episode"
        && paginaAtual().id === "live") {
      watchMode = "inline";
      $("watchBar").className = "watch-bar hidden";
      positionStage();
      renderKeybar();
      Log.info("ui", "saiu da tela cheia");
      return true;
    }
    stopPlayback("back-player");
    return true;
  }
  function toggleFull() {
    if (watchMode === "full") { exitFull(); }
    else if (watchMode === "inline") { enterFull(); }
  }

  /* ----------------------------------------------------------- navbar */
  function buildNav() {
    var menu = $("navMenu");
    menu.innerHTML = "";
    navLinks = [];
    var itens = [];
    PAGES.forEach(function (p, i) {
      if (!p.oculta) { itens.push({ nome: p.nome, page: i }); }
    });
    itens.push({ nome: "Configuracao", settings: true });
    itens.forEach(function (it) {
      var a = document.createElement("span");
      a.className = "nav-link";
      a.setAttribute("data-focusable", "");
      a.appendChild(document.createTextNode(it.nome));
      a._alvo = it;
      a.onclick = function () { ativarNav(it); };
      menu.appendChild(a);
      navLinks.push(a);
    });
    txt($("navVersion"), BUILD.split("-")[0]);
    paintNav();
  }
  function paintNav() {
    navLinks.forEach(function (a) {
      var alvo = a._alvo;
      var atual = alvo.page !== undefined && alvo.page === pagina;
      a.className = "nav-link" + (atual ? " is-current" : "");
    });
  }
  function ativarNav(alvo) {
    if (alvo.settings) { return abrirSettings(); }
    goPage(PAGES[alvo.page].id);
    zona = "content";
    Spatial.blur();
    focarZona();
  }
  function entrarNav() {
    zona = "nav";
    var i, alvo = navLinks[0];
    for (i = 0; i < navLinks.length; i++) {
      if (navLinks[i]._alvo.page === pagina) { alvo = navLinks[i]; }
    }
    Spatial.blur();
    Spatial.focus(alvo);
    focarZona();
  }

  /* ------------------------------------------------------- categorias */
  function renderCats() {
    var p = paginaAtual();
    if (!p.cats) { return; }
    var strip = $(p.cats);
    strip.innerHTML = "";
    strip.className = "cat-strip" + (zona === "cats" ? " is-focused" : "");
    for (var i = 0; i < categories.length; i++) {
      var d = document.createElement("span");
      d.className = "cat" + (i === catIndex ? " is-active" : "");
      d.appendChild(document.createTextNode(categories[i].name + " (" +
        (categories[i].count === null || categories[i].count === undefined ? "—" : categories[i].count) + ")"));
      strip.appendChild(d);
      d.setAttribute("aria-selected", i === catIndex ? "true" : "false");
    }
    var active = strip.children && strip.children[catIndex];
    if (active && active.getBoundingClientRect && strip.getBoundingClientRect) {
      var rect = active.getBoundingClientRect(), bounds = strip.getBoundingClientRect();
      if (rect.left < bounds.left || rect.width > bounds.width) { strip.scrollLeft += rect.left - bounds.left; }
      else if (rect.right > bounds.right) { strip.scrollLeft += rect.right - bounds.right; }
    }
  }

  function debounce(fn, wait) {
    var t = null;
    var wrapped = function () {
      var args = arguments, self = this;
      if (t) { clearTimeout(t); }
      t = setTimeout(function () { t = null; fn.apply(self, args); }, wait);
    };
    wrapped.cancel = function () { clearTimeout(t); t = null; };
    return wrapped;
  }

  var pendingCat = -1;
  var loadCategoryDebounced = debounce(function () {
    if (pendingCat >= 0) { var i = pendingCat; pendingCat = -1; loadCategoryNow(i); }
  }, 350);

  function loadCategory(i) {
    if (i < 0 || i >= categories.length) { return; }
    invalidateView();
    catIndex = i;
    pendingCat = i;
    renderCats();                 /* pinta na hora, carrega depois */
    loadCategoryDebounced();
  }

  function invalidateView() {
    selectionIntent++; closeChoice();
    viewIntent++;
    pendingCat = -1;
    loadCategoryDebounced.cancel();
    return viewIntent;
  }

  function contentHost() {
    var p = paginaAtual();
    if (p.id === "live") { return list; }
    if (p.grid) { return grids[p.id]; }
    if (p.id === "home") { return home; }
    return null;
  }

  function position() {
    var alvo = contentHost();
    return alvo && alvo.position ? alvo.position() : { index: 0, scrollTop: 0 };
  }

  function loadCategoryNow(i, restorePosition, afterLoad) {
    var p = paginaAtual();
    if (!p.cats || i < 0 || i >= categories.length) { return; }
    var intent = invalidateView();
    catIndex = i;
    estado[p.id].catIndex = i;
    renderCats();
    var cat = categories[i];
    var alvo = p.id === "live" ? list : grids[p.id];
    setStatus("is-warn", "carregando " + cat.name + "...");
    var t = now();

    /* So a PRIMEIRA pagina. O total vem junto e a lista puxa o resto
       conforme voce rola. Com 10 mil itens, buscar tudo de uma vez
       significa megabytes de JSON numa TV com ~190 MB livres. */
    Catalog.channels({ type: p.tipo, category: cat.id, limit: PAGINA, offset: 0 }, function (err, data) {
      if (intent !== viewIntent) { return; }
      if (err) {
        setStatus("is-err", "erro: " + err.message);
        Log.error("api", "channels falhou", { category: cat.id, why: err.message });
        if (alvo.setMessage) { alvo.setMessage("Nao foi possivel abrir esta categoria."); }
        return;
      }
      var fetchMs = now() - t;
      var tr = now();
      if (!data.total && alvo.setMessage) {
        alvo.setMessage("Nada em " + cat.name + " nesta fonte.");
        cat.count = 0; renderCats();
        setStatus("is-warn", cat.name + ": vazia");
        if (afterLoad) { afterLoad(); }
        return;
      }

      alvo.setSource(data.total, function (off, lim, cb) {
        if (off === 0 && data && data.items) {
          var primeira = data.items; data = null;   /* reaproveita e solta */
          return cb(primeira);
        }
        Catalog.channels({ type: p.tipo, category: cat.id, limit: lim, offset: off }, function (e2, d2) {
          if (intent !== viewIntent) { return; }
          if (e2) {
            Log.warn("api", "pagina falhou", { offset: off, why: e2.message });
            return cb(null);
          }
          cb(d2.items);
        });
      });

      var renderMs = now() - tr;
      cat.count = alvo.count(); renderCats();
      if (restorePosition && alvo.restorePosition) { alvo.restorePosition(restorePosition); }
      if (zona === "content") { focarZona(); }
      setStatus("is-ok", alvo.count() + " itens em " + cat.name);
      Log.event("category.load", { name: cat.name, total: alvo.count(),
                                   primeiraPagina: PAGINA, fetchMs: fetchMs, renderMs: renderMs });
      Log.stat("categoria", cat.name);
      if (afterLoad) { afterLoad(); }
    });
  }

  /* ---------------------------------------------------------- paginas */
  function paintPages() {
    PAGES.forEach(function (p, i) {
      var el = $(p.el);
      if (el) { el.className = "page" + (i === pagina ? " is-active" : ""); }
    });
    paintNav();
    renderKeybar();
  }

  function goPage(id, opts) {
    opts = opts || {};
    var destino = pageIndexOf(id);
    if (destino === pagina && !opts.force) { return; }
    var anterior = paginaAtual();
    /* sair da pagina ao vivo com o preview aberto encerra a reproducao:
       um video flutuando sobre a home seria so confusao */
    if (anterior.id === "live" && watchMode === "inline") { stopPlayback("troca-de-pagina"); }
    if (anterior.id === "detail" && id !== "detail") { Detail.close(); }
    if (anterior.id === "search" && id !== "search") { Search.close(); }
    invalidateView();
    pagina = destino;
    var p = paginaAtual();
    paintPages();

    if (p.id === "home") {
      zona = "content";
      carregarHome();
      focarZona();
      return;
    }
    if (p.id === "search") { zona = "content"; Search.open(); focarZona(); return; }
    if (p.id === "detail") { zona = "content"; focarZona(); return; }

    categories = estado[p.id].cats;
    catIndex = estado[p.id].catIndex;
    zona = "content";
    if (categories.length) {
      renderCats();
      loadCategoryNow(Math.min(catIndex, categories.length - 1), opts.position);
      return;
    }
    carregarCategorias(p, opts.position, opts.catId);
  }

  function carregarCategorias(p, restorePosition, catId) {
    var intent = invalidateView();
    setStatus("is-warn", "carregando " + p.nome + "...");
    Catalog.categories(p.tipo, function (err, cats) {
      if (intent !== viewIntent) { return; }
      if (err) { setStatus("is-err", "erro: " + err.message); return; }
      categories = cats || [];
      estado[p.id].cats = categories;
      catIndex = 0;
      if (catId) {
        categories.some(function (c, i) { if (c.id === catId) { catIndex = i; return true; } return false; });
      }
      estado[p.id].catIndex = catIndex;
      renderCats();
      if (!categories.length) {
        setStatus("is-warn", p.nome + ": nada nesta fonte");
        var alvo = p.id === "live" ? list : grids[p.id];
        if (alvo.setMessage) { alvo.setMessage("Nada em " + p.nome + " nesta fonte."); }
        else { alvo.setSource(0, function (o, l, cb) { cb([]); }); }
        return;
      }
      loadCategoryNow(catIndex, restorePosition);
    });
  }

  function carregarHome() {
    var intent = invalidateView();
    setStatus("is-warn", "montando sua home...");
    home.load(sourceId(), function (err, trilhas) {
      if (intent !== viewIntent) { return; }
      if (err) { Log.warn("home", "trilha falhou", { why: String(err) }); }
      if (!trilhas) {
        setStatus("is-warn", "Home vazia: favorite um canal ou abra uma categoria de filmes.");
      } else {
        setStatus("is-ok", trilhas + " trilhas na home");
      }
      if (zona === "content" && paginaAtual().id === "home") { focarZona(); }
    });
  }

  /* ------------------------------------------------------------- foco */
  function focarZona() {
    var p = paginaAtual();
    if (p.cats) { $(p.cats).className = "cat-strip" + (zona === "cats" ? " is-focused" : ""); }
    var naNav = zona === "nav";
    if (!naNav) { Spatial.blur(); }
    var conteudo = zona === "content";
    if (list) { list.setFocused(conteudo && p.id === "live"); }
    if (grids.vod) { grids.vod.setFocused(conteudo && p.id === "vod"); }
    if (grids.series) { grids.series.setFocused(conteudo && p.id === "series"); }
    if (home) { home.setFocused(conteudo && p.id === "home"); }
  }

  function itemEmFoco() {
    var p = paginaAtual();
    if (watchMode === "full") { return currentChannel; }
    if (p.id === "search") { return Search.focusedItem(); }
    if (p.id === "detail") { return Detail.focusedItem(); }
    if (p.id === "home") { return home.current(); }
    if (p.id === "live") { return list.currentItem(); }
    var g = grids[p.id];
    return g ? g.currentItem() : null;
  }

  /* ------------------------------------------------------------ ficha */
  function abrirFicha(item) {
    voltarDe = { page: paginaAtual().id, catId: categories[catIndex] ? categories[catIndex].id : null,
                 position: position() };
    goPage("detail");
    Detail.open(item);
  }
  function fecharFicha() {
    var volta = voltarDe || { page: "home" };
    voltarDe = null;
    Detail.close();
    /* home e busca nao tem faixa de categorias para restaurar */
    if (!PAGES[pageIndexOf(volta.page)].cats) { return goPage(volta.page, { force: true }); }
    pagina = pageIndexOf(volta.page);
    paintPages();
    categories = estado[volta.page].cats;
    catIndex = estado[volta.page].catIndex;
    zona = "content";
    if (categories.length) { renderCats(); loadCategoryNow(catIndex, volta.position); }
    else { carregarCategorias(paginaAtual(), volta.position, volta.catId); }
  }

  /* ------------------------------------------------- escolha de retomada */
  function drawChoice() {
    var node = $("resumeChoice"); node.className = "resume-choice"; node.innerHTML = "";
    var title = document.createElement("div");
    txt(title, choice.name + " — " + minutos(resumePosition) + " min assistidos");
    node.appendChild(title);
    ["Continuar", "Assistir do início"].forEach(function (label, i) {
      var button = document.createElement("button");
      button.className = "resume-option" + (choiceIndex === i ? " is-focused" : "");
      txt(button, label);
      button.onclick = function () { choiceIndex = i; acceptChoice(); };
      node.appendChild(button);
      if (choiceIndex === i && button.focus) { button.focus(); }
    });
  }
  function closeChoice() {
    choice = null;
    var node = $("resumeChoice");
    if (node) { node.className = "resume-choice hidden"; node.innerHTML = ""; }
  }
  function acceptChoice() {
    var ch = choice, start = choiceIndex === 0 ? resumePosition : 0, intent = ++selectionIntent;
    var fila = choice ? choice._fila : null;
    closeChoice();
    if (!ch) { return; }
    function play(err) {
      if (intent !== selectionIntent) { return; }
      if (err) { setStatus("is-err", "Nao foi possivel salvar: " + err); return; }
      playChannel(ch, false, start, fila);
    }
    if (!start) { Library.save(ch, 0, null, false, play); } else { play(null); }
  }
  function choosePlayback(ch, fila) {
    if (!window.Library || (ch.kind !== "vod" && ch.kind !== "episode")) {
      return playChannel(ch, false, 0, fila);
    }
    stopPlayback("escolha");
    var intent = ++selectionIntent;
    Library.progress(ch, function (err, row) {
      if (intent !== selectionIntent) { return; }
      if (err) { setStatus("is-err", "Nao foi possivel ler o progresso: " + err); return; }
      if (!Library.resumable(row)) { return playChannel(ch, false, 0, fila); }
      choice = ch; choice._fila = fila || null; choiceIndex = 0; resumePosition = row.position;
      drawChoice();
    });
  }

  function toggleFavorite() {
    if (choice) { return; }
    var ch = itemEmFoco(), intent = viewIntent;
    if (!ch) { return; }
    Library.toggle(ch, function (err, favorite) {
      if (intent !== viewIntent) { return; }
      if (err) { setStatus("is-err", String(err)); return; }
      ch.favorite = favorite;
      var p = paginaAtual();
      if (p.id === "detail") { Detail.refresh(); }
      else if (p.id === "live" && list.refresh) { list.refresh(); }
      else if (grids[p.id] && grids[p.id].refresh) { grids[p.id].refresh(); }
      setStatus("is-ok", favorite ? "Adicionado aos favoritos desta fonte." : "Removido dos favoritos desta fonte.");
      if (p.id === "home") { carregarHome(); }
    });
  }

  /* ------------------------------------------------------- reproducao */
  var retryTimer = null, retryCount = 0, attemptT0 = 0, metaVista = false;
  var nativoRecusouNaHora = false, manifestoFalhou = false;
  var MAX_RETRY = 3;
  var maxRetryAtual = 3;

  function cancelRetry() { if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; } }

  /* "Canal fora do ar" e mentira quando o item e um filme e o usuario
     acabou de avancar: o provavel e o servidor nao atender aquele ponto. */
  function tituloDaFalha() {
    var arquivo = currentChannel && (currentChannel.kind === "vod" || currentChannel.kind === "episode");
    if (arquivo && now() - ultimaBusca < 25000) { return "Nao foi possivel continuar deste ponto"; }
    return arquivo ? "Nao foi possivel continuar este video" : "Canal fora do ar";
  }
  function dicaDaFalha() {
    if (currentChannel && (currentChannel.kind === "vod" || currentChannel.kind === "episode")
        && now() - ultimaBusca < 25000) {
      return "Este servidor pode nao aceitar avancar neste arquivo. VERMELHO recomeca do ponto salvo.";
    }
    return "escolha outro item ou aperte VERMELHO";
  }

  function scheduleRetry(reason) {
    cancelRetry();
    if (!currentChannel || pendingChannel) { return; }
    var intent = playIntent, channel = currentChannel;
    if (retryCount >= maxRetryAtual) {
      Log.error("retry", "desistindo apos " + retryCount + " tentativas",
                { channel: currentChannel ? currentChannel.name : null, reason: reason });
      if (pb) { pb.error = "desistiu: " + reason; }
      checkpoint("tentativas-esgotadas"); pbFinish("tentativas-esgotadas");
      player.stop(); if (monitor) { monitor.stop(); }
      overlay("<div>" + tituloDaFalha() + "<br><span style='font-size:var(--fs-sm);color:var(--color-text-muted)'>" +
              retryCount + " tentativas, " + reason + "<br>" + dicaDaFalha() + "</span></div>");
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
      if (intent === playIntent && currentChannel === channel) { playChannel(channel, true); }
    }, wait);
  }

  function pbStart(ch) {
    pbFinish("trocou");
    pb = { playbackId: (Log.session ? Log.session() : "session") + ":" + (++playbackSequence),
           sourceId: ch.sourceId || sourceId(), build: BUILD, channelId: ch.id, channel: ch.name,
           category: ch.category, status: ch.status, t0: now(), engine: null,
           tPlayApi: null, tMeta: null, tFirstFrame: null,
           fallback: false, stalls: 0, reloads: 0, audioOnly: false,
           error: null, endedBy: null, w: null, h: null };
    checkpoint("playing");
  }
  function pbFinish(reason) {
    if (!pb) { return; }
    pb.endedBy = reason;
    pb.durationMs = now() - pb.t0;
    pb.endedAt = now();
    if (window.Diagnostics) { Diagnostics.record(pb); }
    Log.event("playback", pb);
    Store.pref("activePlayback", "null");
    pb = null;
  }

  function navigation() {
    var p = paginaAtual();
    var ficha = Detail.isOpen() && Detail.item()
      ? { id: Detail.item().id, name: Detail.item().name, kind: Detail.item().kind } : null;
    return { sourceId: sourceId(), page: p.id, zona: zona,
             catId: categories[catIndex] ? categories[catIndex].id : null,
             position: position(), detail: ficha, parent: voltarDe };
  }
  function checkpoint(reason) {
    if (resumePlayer) { resumePlayer.checkpoint(reason === "fim"); }
    if (!Settings.isOpen()) { Store.pref("lastView", JSON.stringify(navigation())); }
    if (pb) {
      pb.position = isFinite(vid.currentTime) ? vid.currentTime : 0;
      pb.durationMs = now() - pb.t0;
      Store.pref("lastPlayback", JSON.stringify({ id: pb.channelId, sourceId: pb.sourceId,
        position: pb.position, reason: reason, at: now() }));
      Store.pref("activePlayback", JSON.stringify(pb));
    }
  }

  /* so abre o item depois que o dedo parou no controle */
  var playChannelDebounced = debounce(function () {
    if (pendingChannel) { var c = pendingChannel; pendingChannel = null; playChannelNow(c, false); }
  }, 400);

  function playChannel(ch, isReload, start, fila) {
    if (isReload) { return playChannelNow(ch, true); }
    /* quem ja estava em tela cheia nao volta para a janela so por trocar
       de canal: e o zapping do controle */
    var eraTelaCheia = watchMode === "full";
    stopPlayback("trocou");
    resumePosition = start || 0;
    UpNext.begin(fila);
    pendingChannel = ch;
    currentChannel = ch;
    var arquivo = ch.kind === "vod" || ch.kind === "episode";
    watchMode = (arquivo || eraTelaCheia) ? "full" : "inline";
    if (watchMode === "inline" && paginaAtual().id !== "live") { goPage("live"); }
    Controls.setItem(ch, !!UpNext.next());
    positionStage();
    renderKeybar();
    txt($("nowTitle"), ch.name);
    overlay('<div><span class="spinner"></span>' + ch.name + "</div>");
    if (watchMode === "full") { showBar(true); updateBar(); }
    playChannelDebounced();
  }

  function playChannelNow(ch, isReload) {
    var intent = ++playIntent;
    playChannelDebounced.cancel(); pendingChannel = null;
    cancelRetry();
    if (resumePlayer && isReload) { resumePlayer.retry(); }
    player.stop();
    /* O /api/play chegou a levar 3216ms no Xtream. Sem parar o monitor
       aqui, o cronometro do item ANTERIOR alarmava durante a espera. */
    if (monitor) { monitor.stop(); }
    currentChannel = ch;
    if (isReload && pb) { pb.reloads++; }
    else { pbStart(ch); retryCount = 0; }
    attemptT0 = now();
    metaVista = false;
    nativoRecusouNaHora = false;
    manifestoFalhou = false;

    txt($("nowTitle"), ch.name);
    $("nowMeta").innerHTML = "";
    overlay('<div><span class="spinner"></span>abrindo ' + ch.name + "</div>");
    Log.info("play", "abrindo " + ch.name, { id: ch.id, status: ch.status, reload: !!isReload });

    var t = now();
    Catalog.play(ch.id, function (err, info) {
      if (intent !== playIntent) { return; }
      if (!err && info && info.naoTocavel) {
        if (pb) { pb.error = info.note || "formato recusado"; }
        pbFinish("recusado");
        overlay("<div>" + (info.note || "nao toca nesta TV") + "</div>");
        setStatus("is-err", info.note || "nao toca nesta TV");
        Log.warn("play", "recusado pelo backend", { nome: ch.name, why: info.note });
        return;
      }
      if (err) {
        if (pb) { pb.error = "api: " + err.message; }
        pbFinish("erro-api");
        Log.error("play", "api /play falhou", { id: ch.id, why: err.message });
        overlay("<div>falha ao abrir: " + err.message + "</div>");
        return;
      }
      if (pb) { pb.tPlayApi = now() - t; }
      Log.info("play", "backend respondeu", { preferred: info.preferred, fallback: info.fallback,
        note: info.note, startupMs: info.startupMs || null, maxRetry: info.maxRetry || null });
      /* Arquivo (filme/episodio) tem regras proprias, decididas pelo
         backend: sem hls.js, prazo maior (moov no fim do MP4) e uma
         tentativa so. */
      maxRetryAtual = info.maxRetry || MAX_RETRY;
      if (monitor) { monitor.setStartup(info.startupMs || null); }
      if (info.note) { setStatus("is-warn", info.note); }
      info.canFallback = API.available;
      player.play(info);
      if (resumePlayer && !isReload) { resumePlayer.begin(ch, resumePosition); }
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
    updateBar(extra);
  }

  function stopPlayback(reason) {
    var naFicha = Detail.isOpen();
    checkpoint(reason);
    selectionIntent++; closeChoice();
    if (resumePlayer) { resumePlayer.clear(); }
    UpNext.clear();
    Controls.reset();
    playIntent++; pendingChannel = null; playChannelDebounced.cancel();
    cancelRetry(); currentChannel = null;
    player.stop(); if (monitor) { monitor.stop(); }
    pbFinish(reason);
    watchMode = "off";
    if (barTimer) { clearTimeout(barTimer); barTimer = null; }
    $("watchBar").className = "watch-bar hidden";
    positionStage();
    renderKeybar();
    /* a ficha mostra progresso: depois de parar, ela precisa ser repintada */
    if (naFicha && (reason === "fim" || reason === "parado" || reason === "back-player")) { Detail.refresh(); }
  }

  /* ------------------------------------------------ ciclo de vida da TV */
  function restoreNavigation(saved) {
    var keep = saved && saved.sourceId === sourceId();
    if (!keep) { return goPage("home", { force: true }); }
    var destino = saved.page === "detail" ? (saved.parent ? saved.parent.page : "home") : saved.page;
    voltarDe = saved.parent || null;
    pagina = pageIndexOf(destino || "home");
    paintPages();
    zona = "content";
    if (destino === "home" || !PAGES[pagina].cats) {
      goPage(destino || "home", { force: true });
    } else {
      categories = estado[destino].cats; catIndex = estado[destino].catIndex;
      carregarCategorias(paginaAtual(), saved.detail ? null : saved.position, saved.catId);
    }
    if (saved.detail) { abrirFicha(saved.detail); voltarDe = saved.parent || voltarDe; }
  }

  function suspend(reason) {
    if (suspended) { return; } suspended = true;
    /* o indice de busca vive so para a sessao: sair devolve a memoria */
    if (Catalog.limparBusca) { Catalog.limparBusca(); }
    if (warm) { warm.cancel(); }
    stopPlayback(reason); invalidateView();
    Log.flush();
  }
  function resume() {
    if (!suspended) { return; } suspended = false;
    if (!Settings.isOpen()) {
      var saved = null;
      try { saved = JSON.parse(Store.pref("lastView") || "null"); } catch (ignore) {}
      restoreNavigation(saved);
      overlay("<div>Reproducao pausada ao sair.<br>Escolha um item e aperte OK.</div>");
    }
  }

  function abrirAssistente() {
    setStatus("is-warn", "primeira configuracao");
    overlay(null);
    Setup.open(function () {
      estado.live.cats = []; estado.vod.cats = []; estado.series.cats = [];
      setStatus("is-ok", "catalogo pronto");
      goPage("home", { force: true });
    });
  }

  function abrirSettings() {
    var savedNavigation = navigation();
    stopPlayback("configuracao"); invalidateView();
    Log.info("ui", "configuracao aberta");
    Settings.open(function () {
      Log.info("ui", "configuracao fechada");
      /* a fonte pode ter mudado: recarrega tudo */
      estado.live.cats = []; estado.vod.cats = []; estado.series.cats = [];
      restoreNavigation(savedNavigation);
    });
  }

  /* --------------------------------------------------------- keybar */
  function renderKeybar() {
    var bar = $("keybar");
    if (!bar) { return; }
    var p = paginaAtual();
    var grupos = [];
    if (watchMode === "full") {
      grupos = [["◄►", "10s"], ["▼", "controles"], ["OK", "informacoes"], ["VOLTAR", "sair da tela cheia"]];
    } else if (p.id === "search") {
      grupos = [["OK", "teclado da TV"], ["▼", "resultados"], ["OK", "abrir"], ["VOLTAR", "inicio"]];
    } else if (p.id === "home") {
      grupos = [["▲▼", "trilha"], ["◄►", "itens"], ["OK", "abrir"], ["1", "favorito"]];
    } else if (p.id === "detail") {
      grupos = [["◄►", "acoes"], ["▼", "episodios"], ["OK", "assistir"], ["1", "favorito"], ["VOLTAR", "voltar"]];
    } else if (p.id === "live") {
      grupos = [["▲▼", "canal"], ["◄►", "categoria"], ["OK", "assistir / tela cheia"], ["1", "favorito"]];
    } else {
      grupos = [["▲▼◄►", "navegar"], ["OK", "abrir ficha"], ["1", "favorito"], ["VOLTAR", "inicio"]];
    }
    bar.innerHTML = "";
    grupos.forEach(function (g) {
      var span = document.createElement("span");
      span.className = "grp";
      var k = document.createElement("span");
      k.className = "k";
      k.appendChild(document.createTextNode(g[0]));
      span.appendChild(k);
      span.appendChild(document.createTextNode(g[1]));
      bar.appendChild(span);
    });
    [["V", "k--green", "secao"], ["A", "k--blue", "configuracao"],
     ["A", "k--yellow", "diagnostico"], ["V", "k--red", "recarregar"]].forEach(function (g) {
      var span = document.createElement("span");
      span.className = "grp";
      var k = document.createElement("span");
      k.className = "k " + g[1];
      k.appendChild(document.createTextNode(g[0]));
      span.appendChild(k);
      span.appendChild(document.createTextNode(g[2]));
      bar.appendChild(span);
    });
  }

  /* ----------------------------------------------------------- teclas */
  function onKey(ev) {
    var k = ev.keyCode;

    /* o assistente de primeiro inicio vem antes de tudo: sem fonte
       cadastrada nao ha catalogo, player nem navegacao para atender */
    if (Setup.isOpen()) { Setup.handleKey(k, ev); return; }

    /* a tela de configuracao consome tudo enquanto estiver aberta */
    if (Settings.isOpen()) { Settings.handleKey(k, ev); return; }

    if (choice) {
      if (k === Keys.LEFT || k === Keys.RIGHT || k === Keys.UP || k === Keys.DOWN) { choiceIndex = 1 - choiceIndex; drawChoice(); }
      else if (k === Keys.OK || k === Keys.PLAY) { acceptChoice(); }
      else if (k === Keys.BACK || k === Keys.STOP) { selectionIntent++; closeChoice(); }
      ev.preventDefault(); return;
    }

    /* com o teclado da TV aberto, "1" e uma letra, nao um atalho */
    if (paginaAtual().id === "search" && Search.editing()) {
      Search.handleKey(k, ev);
      return;
    }

    if (k === 49 && window.Library) { toggleFavorite(); ev.preventDefault(); return; }
    if (k === Keys.BLUE) { abrirSettings(); ev.preventDefault(); return; }
    if (k === Keys.YELLOW) {
      var on = Log.toggleHud();
      Log.info("ui", "hud " + (on ? "ligado" : "desligado"));
      ev.preventDefault(); return;
    }
    if (k === Keys.RED) {
      cancelRetry(); retryCount = 0;
      if (currentChannel) { playChannelNow(currentChannel, true); }
      ev.preventDefault(); return;
    }
    if (k === Keys.GREEN) {
      var proxima = (pagina + 1) % (PAGES.length - 1);   /* a ficha nao entra no ciclo */
      goPage(PAGES[proxima].id);
      ev.preventDefault(); return;
    }
    if (k === Keys.STOP) { stopPlayback("parado"); overlay("<div>parado</div>"); Log.info("ui", "stop"); return; }
    if (k === Keys.PAUSE) { vid.pause(); Log.info("ui", "pause"); return; }

    /* --- proximo episodio tem prioridade sobre o resto do OK --- */
    if (UpNext.visible()) {
      if (k === Keys.OK || k === Keys.PLAY) { UpNext.accept(); ev.preventDefault(); return; }
      if (k === Keys.BACK) { UpNext.dismiss(); ev.preventDefault(); return; }
    }

    /* --- tela cheia --- */
    if (watchMode === "full") {
      if (k === Keys.BACK) { exitFull(); ev.preventDefault(); return; }
      if (Controls.handleKey(k, ev)) { showBar(true); updateBar(); ev.preventDefault(); return; }
      /* o que os controles nao usam vira zapping: no ao vivo nao ha o que
         avancar, entao as setas trocam de canal */
      if (!Controls.seekable() && list && list.count()) {
        if (k === Keys.CH_UP || k === Keys.LEFT)    { list.move(-1); list.activate(); ev.preventDefault(); return; }
        if (k === Keys.CH_DOWN || k === Keys.RIGHT) { list.move(1);  list.activate(); ev.preventDefault(); return; }
      }
      if (k === Keys.OK) { showBar(true); updateBar(); ev.preventDefault(); return; }
      ev.preventDefault(); return;
    }

    if (k === Keys.PLAY) { if (pb) { vid.play(); } Log.info("ui", "play"); return; }

    /* --- navbar --- */
    if (zona === "nav") {
      if (k === Keys.LEFT)  { Spatial.move("left", $("navMenu")); ev.preventDefault(); return; }
      if (k === Keys.RIGHT) { Spatial.move("right", $("navMenu")); ev.preventDefault(); return; }
      if (k === Keys.DOWN || k === Keys.BACK) {
        zona = paginaAtual().cats && categories.length ? "cats" : "content";
        Spatial.blur(); focarZona(); renderCats(); ev.preventDefault(); return;
      }
      if (k === Keys.OK) {
        var atual = Spatial.current();
        if (atual && atual._alvo) { ativarNav(atual._alvo); }
        ev.preventDefault(); return;
      }
      ev.preventDefault(); return;
    }

    /* --- faixa de categorias --- */
    if (zona === "cats") {
      if (k === Keys.LEFT)  { loadCategory(catIndex - 1); ev.preventDefault(); return; }
      if (k === Keys.RIGHT) { loadCategory(catIndex + 1); ev.preventDefault(); return; }
      if (k === Keys.UP)    { entrarNav(); renderCats(); ev.preventDefault(); return; }
      if (k === Keys.DOWN || k === Keys.OK) { zona = "content"; focarZona(); renderCats(); ev.preventDefault(); return; }
      if (k === Keys.BACK)  { zona = "content"; focarZona(); renderCats(); ev.preventDefault(); return; }
      ev.preventDefault(); return;
    }

    /* --- conteudo --- */
    var p = paginaAtual();

    if (p.id === "search") {
      if (Search.handleKey(k, ev)) { return; }
      if (k === Keys.UP) { entrarNav(); ev.preventDefault(); return; }
      if (k === Keys.BACK) { goPage("home"); ev.preventDefault(); return; }
      return;
    }

    if (p.id === "detail") {
      if (Detail.handleKey(k, ev)) { return; }
      if (k === Keys.UP) { entrarNav(); ev.preventDefault(); return; }
      if (k === Keys.BACK) {
        /* mesma regra da pagina ao vivo: o primeiro VOLTAR encerra o que
           estiver tocando; so o seguinte devolve a grade */
        if (currentChannel || pendingChannel) {
          stopPlayback("back-player");
          overlay("<div>Reproducao encerrada.</div>");
        } else { fecharFicha(); }
        ev.preventDefault(); return;
      }
      return;
    }

    if (k === Keys.BACK) {
      if (watchMode === "inline") { stopPlayback("back-player"); overlay("<div>Reproducao encerrada.</div>"); ev.preventDefault(); return; }
      if (p.id !== "home") { goPage("home"); ev.preventDefault(); return; }
      checkpoint("back-lista");
      setStatus("is-ok", "Voce ja esta no inicio. VERDE troca de secao, AZUL abre a configuracao.");
      Log.flush(); ev.preventDefault(); return;
    }

    if (p.id === "home") {
      if (k === Keys.UP)    { if (!home.move(0, -1)) { entrarNav(); } ev.preventDefault(); return; }
      if (k === Keys.DOWN)  { home.move(0, 1); ev.preventDefault(); return; }
      if (k === Keys.LEFT)  { home.move(-1, 0); ev.preventDefault(); return; }
      if (k === Keys.RIGHT) { home.move(1, 0); ev.preventDefault(); return; }
      if (k === Keys.OK)    { home.activate(); ev.preventDefault(); return; }
      return;
    }

    if (p.id === "live") {
      if (k === Keys.UP) {
        if (list.selected === 0) { zona = "cats"; focarZona(); renderCats(); }
        else { selectionIntent++; list.move(-1); }
        ev.preventDefault(); return;
      }
      if (k === Keys.DOWN)    { selectionIntent++; list.move(1); ev.preventDefault(); return; }
      if (k === Keys.CH_UP)   { list.move(-1); list.activate(); ev.preventDefault(); return; }
      if (k === Keys.CH_DOWN) { list.move(1);  list.activate(); ev.preventDefault(); return; }
      if (k === Keys.LEFT)    { loadCategory(catIndex - 1); ev.preventDefault(); return; }
      if (k === Keys.RIGHT)   { loadCategory(catIndex + 1); ev.preventDefault(); return; }
      if (k === Keys.OK) {
        /* OK no item que JA esta tocando abre a tela cheia; e o mesmo
           gesto do duplo clique com o ponteiro */
        var alvo = list.currentItem();
        if (watchMode === "inline" && currentChannel && alvo && alvo.id === currentChannel.id) { enterFull(); }
        else { list.activate(); }
        ev.preventDefault(); return;
      }
      return;
    }

    /* grades de filmes e series */
    var g = grids[p.id];
    if (!g) { return; }
    if (k === Keys.UP)    { if (!g.move(0, -1)) { zona = "cats"; focarZona(); renderCats(); } ev.preventDefault(); return; }
    if (k === Keys.DOWN)  { g.move(0, 1); ev.preventDefault(); return; }
    if (k === Keys.LEFT)  { g.move(-1, 0); ev.preventDefault(); return; }
    if (k === Keys.RIGHT) { g.move(1, 0); ev.preventDefault(); return; }
    if (k === Keys.OK)    { g.activate(); ev.preventDefault(); return; }
  }

  /* ------------------------------------------------------------- boot */
  function abrirItem(item) {
    if (!item) { return; }
    if (item.kind === "series" || item.kind === "vod") { return abrirFicha(item); }
    if (item.kind === "episode") { return choosePlayback(item, null); }
    if (item.playable === false) {
      setStatus("is-err", "container ." + item.container + " nao toca nesta TV");
      Log.warn("play", "container incompativel", { nome: item.name, container: item.container });
      return;
    }
    playChannel(item, false, 0, null);
  }

  function boot() {
    Log.stat("modo", Catalog.getModo());
    Log.install();
    var interrupted = null;
    try { interrupted = JSON.parse(Store.pref("activePlayback") || "null"); } catch (ignore) {}
    if (interrupted && interrupted.playbackId) {
      interrupted.endedBy = "interrompido";
      interrupted.endedAt = interrupted.t0 + (interrupted.durationMs || 0);
      Log.event("playback", interrupted); Store.pref("activePlayback", "null");
    }
    Log.info("boot", "build", { versao: BUILD });
    Log.stat("build", BUILD);
    Log.info("boot", "iniciando", {
      ua: navigator.userAgent, screen: screen.width + "x" + screen.height,
      dpr: window.devicePixelRatio || 1, cores: navigator.hardwareConcurrency || 0
    });

    var panel = Luna.panel();
    if (panel) {
      txt($("device"), panel.model + " · " + panel.w + "x" + panel.h);
      Log.event("device", panel);
      Log.stat("tv", panel.model);
    } else {
      txt($("device"), "fora do webOS (navegador)");
      Log.warn("boot", "PalmSystem ausente - rodando fora da TV");
    }

    Luna.network(function (net, err) {
      if (net) {
        Log.event("network", net);
        Log.stat("rede", net.medium);
      } else { Log.warn("boot", "connectionmanager indisponivel", { why: err }); }
    });

    Store.init(function (db8) { Log.event("storage", { db8: db8 }); });

    /* A sonda no /api/play custou ate 1866ms (p90 767ms). Como ja existe
       uma janela de debounce enquanto o usuario navega, aquecemos a
       decisao do item em foco. */
    var warmed = {};
    warm = debounce(function (ch) {
      if (!ch || warmed[ch.id]) { return; }
      warmed[ch.id] = 1;
      Catalog.play(ch.id, function () {});
    }, 500);

    function aoSelecionar(item) {
      if (!item) { return; }
      if (item.kind !== "series") { warm(item); }
      if (window.Diagnostics) { Log.stat("diagnostico", Diagnostics.describe(item)); }
    }

    buildNav();

    list = new ChannelList($("channels"), {
      pageSize: PAGINA,
      onSelect: aoSelecionar,
      onActivate: function (ch) { abrirItem(ch); },
      onPage: function (p) {
        Log.event("lista.pagina", { pagina: p.pagina, offset: p.offset, recebidos: p.recebidos,
          ms: p.ms, emMemoria: list.loadedCount(), total: list.count() });
        Log.stat("lista", list.loadedCount() + "/" + list.count());
      }
    });

    ["vod", "series"].forEach(function (id) {
      grids[id] = new PosterGrid($("grid-" + id), {
        pageSize: PAGINA,
        onSelect: aoSelecionar,
        onActivate: function (item) { abrirItem(item); },
        onPage: function (p) {
          Log.event("lista.pagina", { pagina: p.pagina, offset: p.offset, recebidos: p.recebidos, ms: p.ms,
            emMemoria: grids[id].loadedCount(), total: grids[id].count() });
        }
      });
    });

    home = new Home($("home"), {
      onSelect: aoSelecionar,
      onActivate: function (item) { abrirItem(item); }
    });

    Detail.mount($("detail"), {
      onPlay: function (item, start, fila) {
        if (start === null || start === undefined) { choosePlayback(item, fila); }
        else { playChannel(item, false, start, fila); }
      },
      onToggleFavorite: function () { toggleFavorite(); },
      onBack: function () { fecharFicha(); },
      onStatus: setStatus
    });

    Controls.mount(vid, {
      seek: $("watchSeek"), elapsed: $("watchElapsed"), total: $("watchTotal"), buttons: $("watchControls")
    }, {
      onNext: function () { UpNext.accept(); },
      onNotice: function (message) { setStatus("is-warn", message); },
      onSeek: function (alvo, de) {
        ultimaBusca = now();
        if (monitor) { monitor.noteSeek(); }
        Log.event("seek.pedido", { de: Math.round(de || 0), para: Math.round(alvo),
                                   kind: currentChannel ? currentChannel.kind : null,
                                   engine: player.engine, readyState: vid.readyState });
      }
    });

    Search.mount($("searchInput"), $("searchResults"), {
      onActivate: function (item) { abrirItem(item); },
      onSelect: aoSelecionar,
      onStatus: setStatus
    });

    UpNext.mount(function (episodio, fila) {
      Log.info("upnext", "avancando para o proximo episodio", { nome: episodio.name });
      playChannel(episodio, false, 0, fila);
    });

    monitor = new HealthMonitor(vid, {
      sampleMs: 250, reportMs: 1000,
      stallMs: 2000,       /* so vale DEPOIS do primeiro frame */
      startupMs: 12000,

      onFirstFrame: function (ms) {
        cancelRetry();
        var naTentativa = retryCount;
        retryCount = 0;
        if (pb && pb.tFirstFrame === null) { pb.tFirstFrame = ms; pb.observedAt = now(); pb.evidence = "currentTime"; }
        Log.event("firstframe", { channel: currentChannel ? currentChannel.name : null,
                                  engine: player.engine, ms: ms, tentativa: naTentativa });
        Log.stat("avanco", ms + "ms");
      },

      onAudioOnly: function () {
        cancelRetry();
        if (pb) { pb.audioOnly = true; }
        Log.warn("audio", "stream sem faixa de video (videoWidth=0)",
                 { channel: currentChannel ? currentChannel.name : null });
        overlay("<div>SOMENTE AUDIO<br><span style='font-size:var(--fs-sm);color:var(--color-text-muted)'>" +
                "este canal nao esta transmitindo imagem</span></div>");
      },

      onStartupTimeout: function (info) {
        /* streams em que os DOIS motores recusam de imediato morrem em 8s,
           em vez de gastar 45s insistindo */
        if (nativoRecusouNaHora && manifestoFalhou) {
          cancelRetry();
          setStatus("is-err", "fora do ar (os dois motores recusaram)");
          overlay("<div>" + tituloDaFalha() + "</div>");
          Log.error("play", "fora do ar: nativo e hls.js recusaram de imediato",
                    { channel: currentChannel ? currentChannel.name : null });
          if (pb) { pb.error = "fora do ar"; }
          checkpoint("falha-motores"); pbFinish("falha-motores");
          player.stop(); if (monitor) { monitor.stop(); }
          return;
        }
        Log.warn("startup", "nao iniciou no prazo",
                 { channel: currentChannel ? currentChannel.name : null, engine: player.engine,
                   ms: info.elapsed, readyState: info.readyState, limite: info.limite });
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
                   kind: currentChannel ? currentChannel.kind : null,
                   engine: player.engine, frozenMs: info.frozenFor, n: info.count,
                   readyState: info.readyState, networkState: info.networkState,
                   seeking: info.seeking, desdeBusca: now() - ultimaBusca });
        if (player.switchToFallback("travou ha " + Math.round(info.frozenFor / 1000) + "s")) {
          if (pb) { pb.fallback = true; }
          Log.info("stall", "trocando de motor em vez de recarregar");
          if (monitor) { monitor.start(); }
          return;
        }
        scheduleRetry("travou ha " + Math.round(info.frozenFor / 1000) + "s");
      },

      onRecover: function () {
        cancelRetry();
        Log.info("stall", "recuperou");
        overlay(null);
      },

      onTick: function (s) {
        if (pb && now() - checkpointAt > 15000) { checkpointAt = now(); checkpoint("playing"); }
        if (!s.stalled && !s.starting && currentChannel) {
          updateNowMeta("buffer " + s.bufferAhead.toFixed(0) + "s");
        }
        if (watchMode === "full") { Controls.update(); }
        /* o botao de proximo episodio aparece aos 95%, antes dos creditos */
        if (currentChannel && currentChannel.kind === "episode") { UpNext.consider(s.ct, vid.duration); }
        Log.stat("buffer", s.bufferAhead.toFixed(0) + "s");
        Log.stat("ct", s.ct.toFixed(1) + "s");
        if (s.starting) { Log.stat("fase", "partida " + Math.round(s.elapsed / 100) / 10 + "s"); }
        else { Log.stat("fase", "tocando"); }
      }
    });

    player.on.statechange = function (e) {
      if (e.state === "ended") {
        /* a fila precisa ser lida ANTES de parar: stopPlayback limpa o UpNext */
        var proximo = UpNext.next(), seguinte = UpNext.queue(), avancar = UpNext.shouldAdvance();
        stopPlayback("fim");
        if (avancar && proximo) {
          Log.info("upnext", "fim do episodio: o proximo entra sozinho", { nome: proximo.name });
          overlay('<div><span class="spinner"></span>' + proximo.name + "</div>");
          playChannel(proximo, false, 0, seguinte);
        } else {
          overlay("<div>Reproducao concluida.</div>");
        }
        return;
      }
      if (e.state === "metadata") {
        /* O hls.js dispara loadedmetadata a cada troca de nivel. So a
           PRIMEIRA metadata de cada tentativa e tempo de abertura. */
        var metaMs = now() - attemptT0;
        if (pb) { pb.w = e.w; pb.h = e.h; pb.engine = player.engine; }
        if (metaVista) {
          Log.info("player", "troca de nivel", { w: e.w, h: e.h, engine: player.engine });
        } else {
          metaVista = true;
          if (pb && pb.tMeta === null) { pb.tMeta = metaMs; }
          Log.event("metadata", { ms: metaMs, tentativa: retryCount, w: e.w, h: e.h,
            engine: player.engine, semVideo: (e.w === 0 && e.h === 0) });
        }
      }
      if (e.state === "playing") { overlay(null); updateNowMeta(); Log.info("player", "tocando"); }
      if (e.state === "buffering") { overlay('<div><span class="spinner"></span>carregando</div>'); }
      if (e.state === "fallback" && /SRC_NOT_SUPPORTED/.test(e.why || "")) { nativoRecusouNaHora = true; }
      if (e.state === "fallback") {
        if (resumePlayer) { resumePlayer.retry(); }
        /* o motor novo merece o prazo cheio: sem isto o cronometro ainda
           era o da tentativa nativa */
        attemptT0 = now();
        metaVista = false;
        if (monitor) { monitor.start(); }
        if (pb) { pb.fallback = true; }
        Log.warn("player", "nativo recusou, caindo para hls.js", { why: e.why });
        overlay('<div><span class="spinner"></span>nativo recusou - tentando hls.js pelo proxy</div>');
      }
      if (e.state === "loading") { Log.info("player", "carregando com " + e.engine); Log.stat("motor", e.engine); }
      if (e.state === "recovering") { Log.info("player", "hls.js recuperando", { why: e.why }); }
      if (e.state === "retrying" && /manifestLoad/.test(e.why || "")) { manifestoFalhou = true; }
      if (e.state === "retrying") {
        Log.warn("player", "hls.js retentando rede", { why: e.why, tentativa: e.attempt, esperaMs: e.wait });
      }
    };
    player.on.error = function (e) {
      cancelRetry();
      if (pb) { pb.error = e.why; pb.engine = e.engine; }
      checkpoint("erro-player");
      if (monitor) { monitor.stop(); }
      pbFinish("erro-player");
      player.stop();
      Log.error("player", "falhou", { channel: currentChannel ? currentChannel.name : null,
                                      engine: e.engine, why: e.why });
      overlay("<div>nao foi possivel reproduzir<br><span style='font-size:var(--fs-sm);color:var(--color-text-muted)'>" +
              e.why + "</span></div>");
    };

    API.setBase(Store.pref("backend") || "");
    Catalog.init(function (initError) {
      if (window.Library) { Library.init(function (err) { if (err) { setStatus("is-warn", String(err)); } }); }
      if (initError) { setStatus("is-err", String(initError)); return; }
      Log.stat("modo", Catalog.getModo());
      var initialView = viewIntent;
      function abrirInicio() {
        if (initialView !== viewIntent) { return; }
        var saved = null;
        try { saved = JSON.parse(Store.pref("lastView") || "null"); } catch (ignore) {}
        if (saved && saved.sourceId === sourceId()) { restoreNavigation(saved); return; }
        goPage("home", { force: true });
      }

      /* Sem fonte cadastrada nao ha o que abrir: o primeiro inicio e o
         assistente, nao uma tela vazia com uma dica de tecla. */
      if (Catalog.getModo() === "local" && !Catalog.getFonte()) {
        abrirAssistente();
        return;
      }

      /* MODO LOCAL: o banco manda. Abre do banco na hora e, se o catalogo
         estiver velho, atualiza por tras sem travar nada. */
      if (Catalog.getModo() === "local") {
        setStatus("is-warn", "abrindo catalogo local...");
        Catalog.arrancar(function (r) {
          if (initialView !== viewIntent) { return; }
          if (!r.pronto) {
            setStatus("is-err", r.motivo || "catalogo vazio");
            overlay("<div>Catalogo vazio.<br><span style='font-size:var(--fs-sm)'>" +
                    "Aperte <b>AZUL</b> para cadastrar e sincronizar sua fonte na TV.<br>" +
                    (r.motivo ? ("<i>" + r.motivo + "</i>") : "") + "</span></div>");
            return;
          }
          setStatus("is-ok", r.canais + " canais" + (r.doBanco ? " (local)" : " (recem sincronizados)"));
          Log.stat("canais", r.canais + " local");
          abrirInicio();
        }, function (p) {
          if (initialView !== viewIntent) { return; }
          overlay("<div><span class='spinner'></span>montando catalogo<br>" +
                  "<span style='font-size:var(--fs-sm)'>" + p.fase +
                  (p.total ? ("  " + p.feito + "/" + p.total) : "") + "</span></div>");
        });
        API.check(function () {});
        return;
      }

      API.health(function (e, h) {
        if (initialView !== viewIntent) { return; }
        if (e) {
          Log.error("api", "health falhou", { why: e.message });
          setStatus("is-err", "backend inacessivel");
          overlay("<div>Backend nao encontrado.<br><span style='font-size:var(--fs-sm)'>" +
                  "Rode <b>node server.js</b> no PC, ou aperte <b>AZUL</b> e sincronize o " +
                  "catalogo para a TV para usar sem PC.</span></div>");
          return;
        }
        Log.stat("canais", h.alive + "/" + h.channels);
        abrirInicio();
      });
    });

    /* Retomada, controles e o proprio motor mexem em currentTime. Escutar
       o elemento cobre todos os caminhos de uma vez: o watchdog ganha
       folga e o log registra a busca com o estado do buffer. */
    vid.addEventListener("seeking", function () {
      ultimaBusca = now();
      if (monitor) { monitor.noteSeek(); }
      Log.event("seek", { para: Math.round(vid.currentTime || 0), readyState: vid.readyState,
                          engine: player.engine, kind: currentChannel ? currentChannel.kind : null });
    }, false);
    vid.addEventListener("seeked", function () {
      Log.event("seek.ok", { em: Math.round(vid.currentTime || 0), readyState: vid.readyState,
                             ms: now() - ultimaBusca,
                             buffer: vid.buffered.length ? Math.round(vid.buffered.end(vid.buffered.length - 1) - vid.currentTime) : 0 });
    }, false);
    vid.addEventListener("waiting", function () {
      Log.info("player", "aguardando dados", { readyState: vid.readyState, seeking: !!vid.seeking,
                                               desdeBusca: now() - ultimaBusca });
    }, false);

    document.addEventListener("keydown", onKey, false);
    /* o ponteiro magico da LG: duplo clique no video alterna a tela cheia,
       igual ao duplo clique do player web da referencia */
    if (stage.addEventListener) {
      stage.addEventListener("dblclick", function () { toggleFull(); }, false);
      stage.addEventListener("click", function () { if (watchMode === "full") { showBar(true); updateBar(); } }, false);
    }
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { suspend("suspenso"); } else { resume(); }
    }, false);
    if (window.addEventListener) {
      window.addEventListener("pagehide", function () { suspend("pagehide"); }, false);
      window.addEventListener("beforeunload", function () { suspend("fechado"); }, false);
      window.addEventListener("pageshow", resume, false);
      window.addEventListener("resize", function () { positionStage(); }, false);
    }
    renderKeybar();
    overlay("<div>escolha um item e aperte OK<br><span style='font-size:var(--fs-sm);color:var(--color-text-muted)'>AZUL abre as configuracoes</span></div>");
    Log.info("boot", "pronto");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, false);
  } else { boot(); }
})();
