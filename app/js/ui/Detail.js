/*
 * Detail — a ficha do titulo: poster grande, sinopse, acoes e, na serie,
 * a lista de episodios. E a tela que o app nao tinha; sem ela nao existe
 * "continuar de onde parei" visivel nem escolha de episodio.
 *
 * Duas zonas de foco: as acoes (linha de botoes) e a lista de episodios.
 * A lista reaproveita a ChannelList porque ela ja e virtualizada e ja sabe
 * desenhar estrela e minutos assistidos.
 *
 * Toda resposta assincrona carrega a geracao da abertura: VOLTAR durante a
 * busca de episodios nao pode repintar uma ficha que o usuario ja deixou.
 */
var Detail = (function () {
  "use strict";

  var host = null, handlers = {}, generation = 0;
  var aberto = false, atual = null, eps = [], epList = null;
  var zona = "actions", botoes = [], bIndex = 0;
  var artEl, titleEl, metaEl, plotEl, actionsEl, epsBox, epsHost;

  function txt(node, s) {
    node.innerHTML = "";
    node.appendChild(document.createTextNode(s === null || s === undefined ? "" : String(s)));
  }
  function minutos(seg) { return Math.floor(Number(seg) / 60); }

  function build() {
    if (artEl) { return; }
    host.innerHTML =
      '<div class="detail-top">' +
        '<div class="detail-art" id="detailArt"></div>' +
        '<div class="detail-info">' +
          '<div class="detail-title" id="detailTitle"></div>' +
          '<div class="detail-meta" id="detailMeta"></div>' +
          '<div class="detail-plot" id="detailPlot"></div>' +
          '<div class="detail-actions" id="detailActions"></div>' +
        '</div>' +
      '</div>' +
      '<div class="detail-eps hidden" id="detailEps">' +
        '<div class="detail-eps-head">Episodios</div>' +
        '<div class="channels" id="detailEpisodes"></div>' +
      '</div>';
    artEl = document.getElementById("detailArt");
    titleEl = document.getElementById("detailTitle");
    metaEl = document.getElementById("detailMeta");
    plotEl = document.getElementById("detailPlot");
    actionsEl = document.getElementById("detailActions");
    epsBox = document.getElementById("detailEps");
    epsHost = document.getElementById("detailEpisodes");
  }

  function mount(hostEl, h) {
    host = hostEl;
    handlers = h || {};
    build();
  }

  function chip(label, cls) {
    var s = document.createElement("span");
    s.className = "chip" + (cls ? (" " + cls) : "");
    s.appendChild(document.createTextNode(label));
    metaEl.appendChild(s);
  }

  function pintarCabecalho() {
    artEl.innerHTML = "";
    var vazio = document.createElement("div");
    vazio.className = "card-fallback";
    vazio.appendChild(document.createTextNode(atual.name || "Sem titulo"));
    artEl.appendChild(vazio);
    var url = atual.logoURL || atual.logo;
    if (url) {
      var img = document.createElement("img");
      img.alt = "";
      img.onerror = function () {
        if (img.parentNode) { img.parentNode.removeChild(img); }
        vazio.className = "card-fallback";
      };
      img.src = url;
      artEl.insertBefore(img, artEl.firstChild);
      vazio.className = "card-fallback hidden";
    }
    txt(titleEl, atual.name || "Sem titulo");

    metaEl.innerHTML = "";
    if (atual.kind === "series") { chip("Serie"); }
    else if (atual.kind === "vod") { chip("Filme"); }
    if (atual.rating) { chip("★ " + atual.rating, "chip--star"); }
    if (atual.genre) { chip(String(atual.genre).split(/[,;]/).slice(0, 2).join(" · ")); }
    if (atual.category) { chip(atual.category); }
    if (atual.container) { chip(String(atual.container).toUpperCase()); }
    if (eps.length) { chip(eps.length + " episodios"); }
    if (atual.favorite) { chip("★ nos favoritos", "chip--star"); }

    var sinopse = atual.plot || "";
    if (!sinopse && atual.cast) { sinopse = "Elenco: " + atual.cast; }
    txt(plotEl, sinopse || "Sem sinopse nesta fonte.");
  }

  function botao(label, primary, acao) {
    var b = document.createElement("div");
    b.className = "action" + (primary ? " action--primary" : "");
    b.setAttribute("role", "button");
    b.appendChild(document.createTextNode(label));
    b._acao = acao;
    b.onclick = function () { bIndex = botoes.indexOf(b); pintarFoco(); acao(); };
    actionsEl.appendChild(b);
    botoes.push(b);
    return b;
  }

  /* primeiro episodio ainda nao concluido; e o que "Continuar" significa
     numa serie. Sem nenhum progresso, comeca no primeiro. */
  function proximoNaoVisto() {
    var i;
    for (i = 0; i < eps.length; i++) {
      if (Library.resumable(eps[i])) { return i; }
    }
    for (i = 0; i < eps.length; i++) {
      if (!eps[i].completed) { return i; }
    }
    return eps.length ? 0 : -1;
  }

  function pintarAcoes() {
    actionsEl.innerHTML = "";
    botoes = [];
    if (atual.kind === "series") {
      var i = proximoNaoVisto();
      if (i >= 0) {
        var ep = eps[i];
        var rotulo = Library.resumable(ep)
          ? ("Continuar " + (Card.badgeOf(ep) || "") + " · " + minutos(ep.position) + " min")
          : ("Assistir " + (Card.badgeOf(ep) || ""));
        botao(rotulo, true, function () { tocar(ep, i); });
      }
    } else {
      if (Library.resumable(atual)) {
        botao("Continuar · " + minutos(atual.position) + " min", true, function () {
          if (handlers.onPlay) { handlers.onPlay(atual, atual.position, null); }
        });
        botao("Assistir do inicio", false, function () {
          if (handlers.onPlay) { handlers.onPlay(atual, 0, null); }
        });
      } else {
        botao("Assistir", true, function () {
          if (handlers.onPlay) { handlers.onPlay(atual, 0, null); }
        });
      }
    }
    botao(atual.favorite ? "Remover dos favoritos" : "Adicionar aos favoritos", false, function () {
      if (handlers.onToggleFavorite) { handlers.onToggleFavorite(atual); }
    });
    botao("Voltar", false, function () { if (handlers.onBack) { handlers.onBack(); } });
    if (bIndex >= botoes.length) { bIndex = 0; }
    pintarFoco();
  }

  function pintarFoco() {
    botoes.forEach(function (b, i) {
      if (zona === "actions" && i === bIndex) { b.setAttribute("data-focused", "true"); }
      else { b.removeAttribute("data-focused"); }
    });
    if (epList) { epList.setFocused(zona === "eps"); }
    else if (epsHost) { epsHost.className = "channels"; }
  }

  function tocar(ep, index) {
    if (!handlers.onPlay) { return; }
    handlers.onPlay(ep, null, { serie: atual, lista: eps, index: index });
  }

  function montarEpisodios() {
    if (!epList) {
      epList = new ChannelList(epsHost, {
        pageSize: 120,
        onActivate: function (ep) { tocar(ep, eps.indexOf(ep)); }
      });
    }
    epList.setItems(eps);
  }

  /* O registro que veio da grade pode ser uma projecao enxuta (Shelf) ou
     uma linha da biblioteca. A ficha le o registro completo do catalogo
     para ter sinopse, nota e genero. */
  function completar(item, cb) {
    var identidade = DB.identity(item.id);
    if (!identidade) { return cb(item); }
    DB.get(identidade[1], item.id, function (err, full) {
      if (err || !full) { return cb(item); }
      var k;
      for (k in full) {
        if (full.hasOwnProperty(k) && item[k] === undefined) { item[k] = full[k]; }
      }
      cb(item);
    });
  }

  function open(item) {
    var minha = ++generation;
    build();
    aberto = true;
    atual = item;
    eps = [];
    zona = "actions";
    bIndex = 0;
    epsBox.className = "detail-eps hidden";
    pintarCabecalho();
    pintarAcoes();

    completar(item, function (full) {
      if (minha !== generation) { return; }
      atual = full;
      Library.decorate([atual], function () {
        if (minha !== generation) { return; }
        if (atual.kind !== "series") {
          pintarCabecalho(); pintarAcoes();
          return;
        }
        if (handlers.onStatus) { handlers.onStatus("is-warn", "carregando " + atual.name + "..."); }
        Catalog.seriesInfo(atual.id, function (err, info) {
          if (minha !== generation) { return; }
          if (err) {
            if (handlers.onStatus) { handlers.onStatus("is-err", "erro: " + err.message); }
            pintarCabecalho(); pintarAcoes();
            return;
          }
          var lista = [];
          (info.seasons || []).forEach(function (t) {
            t.episodes.forEach(function (e) {
              /* o Xtream ja manda "S05E24" no title; nao duplicar */
              var jaTemPrefixo = /^S\d+E\d+/i.test(e.name || "");
              e.name = jaTemPrefixo ? e.name : ("T" + t.season + "E" + e.num + "  " + e.name);
              e.category = "Temporada " + t.season;
              e.kind = "episode";
              lista.push(e);
            });
          });
          Library.decorate(lista, function () {
            if (minha !== generation) { return; }
            eps = lista;
            epsBox.className = "detail-eps";
            montarEpisodios();
            pintarCabecalho();
            pintarAcoes();
            if (handlers.onStatus) { handlers.onStatus("is-ok", atual.name + ": " + eps.length + " episodios"); }
            Log.event("serie.aberta", { nome: atual.name, temporadas: (info.seasons || []).length, episodios: eps.length });
          });
        });
      });
    });
  }

  function close() {
    generation++;
    aberto = false;
    atual = null;
    eps = [];
    zona = "actions";
  }

  /* depois de favoritar ou de salvar progresso, a ficha se repinta sem
     refazer a busca de episodios */
  function refresh() {
    if (!aberto || !atual) { return; }
    var minha = generation;
    var alvos = [atual].concat(eps);
    Library.decorate(alvos, function () {
      if (minha !== generation) { return; }
      pintarCabecalho();
      pintarAcoes();
      if (epList && eps.length) { epList.refresh(); }
    });
  }

  function focusedItem() {
    if (zona === "eps" && epList) { return epList.currentItem(); }
    return atual;
  }

  function handleKey(k, ev) {
    if (!aberto) { return false; }
    if (zona === "eps") {
      if (k === Keys.UP) {
        if (epList.selected === 0) { zona = "actions"; pintarFoco(); ev.preventDefault(); return true; }
        epList.move(-1); ev.preventDefault(); return true;
      }
      if (k === Keys.DOWN) { epList.move(1); ev.preventDefault(); return true; }
      if (k === Keys.OK) { epList.activate(); ev.preventDefault(); return true; }
      return false;
    }
    if (k === Keys.LEFT) {
      if (bIndex > 0) { bIndex--; pintarFoco(); }
      ev.preventDefault(); return true;
    }
    if (k === Keys.RIGHT) {
      if (bIndex < botoes.length - 1) { bIndex++; pintarFoco(); }
      ev.preventDefault(); return true;
    }
    if (k === Keys.DOWN) {
      if (eps.length) { zona = "eps"; pintarFoco(); }
      ev.preventDefault(); return true;
    }
    if (k === Keys.OK) {
      var b = botoes[bIndex];
      if (b && b._acao) { b._acao(); }
      ev.preventDefault(); return true;
    }
    return false;
  }

  return {
    mount: mount, open: open, close: close, refresh: refresh,
    handleKey: handleKey, focusedItem: focusedItem,
    isOpen: function () { return aberto; },
    item: function () { return atual; },
    episodes: function () { return eps; },
    zone: function () { return zona; }
  };
})();
window.Detail = Detail;
