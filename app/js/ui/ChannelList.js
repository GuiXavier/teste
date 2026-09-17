/*
 * ChannelList — lista virtualizada COM PAGINACAO.
 *
 * Duas restricoes medidas nesta TV:
 *
 *   RENDERIZACAO  324ms para montar 2000 divs vazias (0,16ms por no).
 *                 Um item real tem ~5 elementos + <img>, entao 4x isso.
 *                 -> nunca passar de ~100 nos no DOM.
 *
 *   MEMORIA       o `free -m` na propria TV mostrou 193 MB DISPONIVEIS
 *                 de 1331, com 290 MB ja em swap. O limite de heap do
 *                 Chromium (347 MB) e MAIOR que a RAM livre da maquina:
 *                 o app morre por falta de memoria do sistema muito
 *                 antes de estourar o heap.
 *                 -> nunca segurar 10 mil canais em array JS.
 *
 * O TiviMate resolve o mesmo problema com SQLite indexado + RecyclerView,
 * consultando so a faixa visivel. Aqui a "consulta" e uma pagina do
 * backend; o efeito e o mesmo: a lista inteira nunca existe na memoria.
 */
var ChannelList = (function () {
  "use strict";

  var ROW_H = 76;          /* precisa bater com --row-h no CSS */
  var OVERSCAN = 6;

  function ChannelList(container, opts) {
    opts = opts || {};
    this.el = container;
    this.pageSize = opts.pageSize || 120;
    this.total = 0;
    this.items = {};        /* indice -> canal (esparso, so o carregado) */
    this.pages = {};        /* pagina -> "carregando" | true */
    this.loader = null;
    this.generation = 0;
    this.rendered = {};
    this.selected = 0;
    this.onActivate = opts.onActivate || function () {};
    this.onSelect = opts.onSelect || function () {};
    this.onPage = opts.onPage || function () {};
    this.focused = false;

    this.el.innerHTML =
      '<div class="cl-viewport"><div class="cl-spacer"></div><div class="cl-rows"></div></div>';
    this.viewport = this.el.querySelector(".cl-viewport");
    this.spacer = this.el.querySelector(".cl-spacer");
    this.rows = this.el.querySelector(".cl-rows");

    var self = this;
    this._onScroll = function () { self.render(); };
    this.viewport.addEventListener("scroll", this._onScroll, false);
  }

  ChannelList.prototype.setSource = function (total, loader) {
    this.generation++;
    this.total = total || 0;
    this.loader = loader;
    this.items = {};
    this.pages = {};
    this.rendered = {};
    this.selected = 0;
    this.rows.innerHTML = "";
    this.spacer.style.height = (this.total * ROW_H) + "px";
    this.viewport.scrollTop = 0;
    this.render();
    if (this.total) { this.onSelect(null, 0); }
  };

  /* lista pequena ja em memoria: continua funcionando */
  ChannelList.prototype.setItems = function (list) {
    list = list || [];
    this.setSource(list.length, function (off, lim, cb) {
      cb(list.slice(off, off + lim));
    });
  };

  ChannelList.prototype._pageOf = function (i) { return Math.floor(i / this.pageSize); };

  ChannelList.prototype._ensure = function (first, last) {
    if (!this.loader || !this.total) { return; }
    var p0 = this._pageOf(Math.max(0, first));
    var p1 = this._pageOf(Math.min(this.total - 1, last));
    var p;
    for (p = p0; p <= p1; p++) {
      if (!this.pages[p]) { this._loadPage(p); }
    }
  };

  ChannelList.prototype._loadPage = function (p) {
    var self = this, generation = this.generation;
    this.pages[p] = "carregando";
    var off = p * this.pageSize;
    var t0 = Date.now();
    this.loader(off, this.pageSize, function (list) {
      if (generation !== self.generation) { return; }
      if (list && window.Library) { Library.decorate(list, loaded); } else { loaded(list); }
    });
    function loaded(list) {
      if (generation !== self.generation) { return; }
      if (!list) { delete self.pages[p]; return; }   /* deixa tentar de novo */
      var i;
      for (i = 0; i < list.length; i++) { self.items[off + i] = list[i]; }
      self.pages[p] = true;
      self.onPage({ pagina: p, offset: off, recebidos: list.length, ms: Date.now() - t0 });

      /* joga fora os placeholders dessa faixa para serem remontados */
      var k, remover = [];
      for (k in self.rendered) {
        if (!self.rendered.hasOwnProperty(k)) { continue; }
        var idx = parseInt(k, 10);
        if (idx >= off && idx < off + self.pageSize &&
            self.rendered[k].getAttribute("data-placeholder") === "1") {
          remover.push(k);
        }
      }
      for (i = 0; i < remover.length; i++) {
        self.rows.removeChild(self.rendered[remover[i]]);
        delete self.rendered[remover[i]];
      }
      self.render();
      if (self.selected >= off && self.selected < off + self.pageSize) {
        self.onSelect(self.items[self.selected] || null, self.selected);
      }
    }
  };

  /* descarta paginas longe da janela: e o que segura a memoria */
  ChannelList.prototype._trim = function (first, last) {
    var manter = 3;
    var p0 = this._pageOf(first) - manter;
    var p1 = this._pageOf(last) + manter;
    var p;
    for (p in this.pages) {
      if (!this.pages.hasOwnProperty(p)) { continue; }
      if (this.pages[p] !== true) { continue; }
      var n = parseInt(p, 10);
      if (n < p0 || n > p1) {
        var off = n * this.pageSize, i;
        for (i = off; i < off + this.pageSize; i++) { delete this.items[i]; }
        delete this.pages[p];
      }
    }
  };

  ChannelList.prototype._placeholder = function (i) {
    var d = document.createElement("div");
    d.className = "cl-row cl-row--skeleton" + (i === this.selected ? " is-selected" : "");
    d.style.top = (i * ROW_H) + "px";
    d.setAttribute("data-index", String(i));
    d.setAttribute("data-placeholder", "1");
    d.innerHTML = '<div class="cl-logo"></div><div class="cl-body">' +
                  '<div class="cl-name cl-bar"></div>' +
                  '<div class="cl-meta cl-bar cl-bar--sm"></div></div>';
    return d;
  };

  ChannelList.prototype._build = function (i) {
    var c = this.items[i];
    if (!c) { return this._placeholder(i); }

    var d = document.createElement("div");
    d.className = "cl-row" + (i === this.selected ? " is-selected" : "");
    d.style.top = (i * ROW_H) + "px";
    d.setAttribute("data-index", String(i));

    var logo = document.createElement("div");
    logo.className = "cl-logo";
    if (c.logo) {
      var img = document.createElement("img");
      img.src = c.logo;
      img.alt = "";
      img.onerror = function () { this.style.display = "none"; };
      logo.appendChild(img);
    }

    var body = document.createElement("div");
    body.className = "cl-body";
    var nm = document.createElement("div");
    nm.className = "cl-name";
    nm.appendChild(document.createTextNode((c.favorite ? "\u2605 " : "") + (c.chno ? (c.chno + "  ") : "") + c.name));
    var meta = document.createElement("div");
    meta.className = "cl-meta";
    var extra = [];
    if (c.category) { extra.push(c.category); }
    if (c.format) { extra.push(c.format); }
    if (c.catchup) { extra.push("catchup"); }
    if (c.position && !c.completed) { extra.push(Math.floor(c.position / 60) + " min assistidos"); }
    if (window.Diagnostics) { extra.push(Diagnostics.describe(c)); }
    meta.appendChild(document.createTextNode(extra.join("  \u00b7  ")));
    body.appendChild(nm); body.appendChild(meta);

    var dot = document.createElement("span");
    var diagnostic = c.diagnostic || {};
    var state = diagnostic.playback ? "ok" : (diagnostic.access ? (diagnostic.access.ok ? "accessible" : "dead") : "unknown");
    if (diagnostic.lastFailure && (!diagnostic.playback || diagnostic.lastFailure.at > diagnostic.playback.at)) { state = "dead"; }
    dot.className = "cl-status cl-status--" + state;
    dot.setAttribute("title", window.Diagnostics ? Diagnostics.describe(c) : "Sem diagnostico");

    d.appendChild(logo); d.appendChild(body); d.appendChild(dot);
    /* ponteiro magico da LG: um clique seleciona, dois assistem */
    var self = this;
    d.onclick = function () { self.select(i); };
    d.ondblclick = function () { self.select(i); self.activate(); };
    return d;
  };

  ChannelList.prototype.render = function () {
    if (!this.total) { return; }
    var top = this.viewport.scrollTop;
    var h = this.viewport.clientHeight || 900;
    var first = Math.max(0, Math.floor(top / ROW_H) - OVERSCAN);
    var last = Math.min(this.total - 1, Math.ceil((top + h) / ROW_H) + OVERSCAN);

    this._ensure(first, last);

    var i, keep = {};
    for (i = first; i <= last; i++) {
      keep[i] = true;
      if (!this.rendered[i]) {
        var el = this._build(i);
        this.rows.appendChild(el);
        this.rendered[i] = el;
      }
    }
    for (i in this.rendered) {
      if (!this.rendered.hasOwnProperty(i)) { continue; }
      if (!keep[i]) {
        this.rows.removeChild(this.rendered[i]);
        delete this.rendered[i];
      }
    }
    this._trim(first, last);
  };

  ChannelList.prototype.select = function (i) {
    if (i < 0 || i >= this.total) { return; }
    var old = this.rendered[this.selected];
    if (old) { old.className = old.className.replace(" is-selected", ""); }
    this.selected = i;

    var target = i * ROW_H;
    var top = this.viewport.scrollTop;
    var h = this.viewport.clientHeight || 900;
    if (target < top) { this.viewport.scrollTop = target; }
    else if (target + ROW_H > top + h) { this.viewport.scrollTop = target + ROW_H - h; }
    this.render();

    var cur = this.rendered[i];
    if (cur && cur.className.indexOf("is-selected") < 0) { cur.className += " is-selected"; }
    this.onSelect(this.items[i] || null, i);
  };

  /* a lista so desenha o anel de foco quando a zona dela esta ativa:
     com navbar e faixa de categorias na tela, dois aneis ao mesmo tempo
     fazem o usuario perder de vista quem responde ao D-pad */
  ChannelList.prototype.setFocused = function (on) {
    this.focused = !!on;
    this.el.className = "channels" + (this.focused ? " is-focused" : "");
    if (on) { this.onSelect(this.items[this.selected] || null, this.selected); }
  };

  ChannelList.prototype.setMessage = function (message) {
    this.generation++;
    this.total = 0; this.items = {}; this.pages = {}; this.rendered = {};
    this.spacer.style.height = "0px";
    this.rows.innerHTML = "";
    var box = document.createElement("div");
    box.className = "grid-empty";
    box.appendChild(document.createTextNode(message));
    this.rows.appendChild(box);
  };

  ChannelList.prototype.move = function (delta) { this.select(this.selected + delta); };
  ChannelList.prototype.refresh = function () { this.rows.innerHTML = ""; this.rendered = {}; this.render(); };
  ChannelList.prototype.position = function () { return { index:this.selected, scrollTop:this.viewport.scrollTop }; };
  ChannelList.prototype.restorePosition = function (p) {
    if (!this.total) { return; }
    this.viewport.scrollTop = Math.max(0, Number(p.scrollTop) || 0);
    this.select(Math.min(this.total - 1, Math.max(0, Number(p.index) || 0)));
  };

  ChannelList.prototype.activate = function () {
    var c = this.items[this.selected];
    if (c) { this.onActivate(c, this.selected); }
    /* nao carregou ainda: ignora, a pagina esta a caminho */
  };

  ChannelList.prototype.currentItem = function () { return this.items[this.selected] || null; };
  ChannelList.prototype.count = function () { return this.total; };
  ChannelList.prototype.loadedCount = function () {
    var n = 0, k;
    for (k in this.items) { if (this.items.hasOwnProperty(k)) { n++; } }
    return n;
  };

  return ChannelList;
})();
window.ChannelList = ChannelList;
