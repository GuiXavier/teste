/*
 * PosterGrid — grade de posters virtualizada e paginada.
 *
 * Mesma disciplina da ChannelList, em duas dimensoes:
 *   - o array de itens e ESPARSO; so a janela visivel existe
 *   - paginas distantes sao descartadas (memoria, nao velocidade)
 *   - imagens so entram no DOM dentro da janela; sair da janela
 *     remove o <img>, nao basta esconder
 *
 * As medidas abaixo precisam bater com --card-w/--card-gap/--poster-h
 * em tokens.css. 8 colunas em 1792px uteis: 8*196 + 7*20 = 1708.
 *
 * PAD e a folga do anel de foco. Como as celulas sao posicionadas de
 * forma absoluta, o padding do container NAO as desloca: a folga precisa
 * entrar na conta de cada celula e na altura total.
 */
var PosterGrid = (function () {
  "use strict";

  var COLS = 8;
  var CARD_W = 196, CARD_GAP = 20;
  var ROW_H = 294 + 48 + 22;      /* poster + info + respiro */
  var PAD = 10;
  var OVERSCAN_ROWS = 1;

  function PosterGrid(container, opts) {
    opts = opts || {};
    this.el = container;
    this.pageSize = opts.pageSize || 120;
    this.total = 0;
    this.items = {};
    this.pages = {};
    this.loader = null;
    this.generation = 0;
    this.rendered = {};
    this.selected = 0;
    this.focused = false;
    this.onActivate = opts.onActivate || function () {};
    this.onSelect = opts.onSelect || function () {};
    this.onPage = opts.onPage || function () {};

    this.el.innerHTML =
      '<div class="grid-viewport"><div class="grid-spacer"></div><div class="grid-cells"></div></div>';
    this.viewport = this.el.querySelector(".grid-viewport");
    this.spacer = this.el.querySelector(".grid-spacer");
    this.cells = this.el.querySelector(".grid-cells");

    var self = this;
    this.viewport.addEventListener("scroll", function () { self.render(); }, false);
  }

  PosterGrid.prototype.cols = function () { return COLS; };
  PosterGrid.prototype.rowsTotal = function () { return Math.ceil(this.total / COLS); };

  PosterGrid.prototype.setSource = function (total, loader) {
    this.generation++;
    this.total = total || 0;
    this.loader = loader;
    this.items = {};
    this.pages = {};
    this.rendered = {};
    this.selected = 0;
    this.cells.innerHTML = "";
    this.spacer.style.height = (this.rowsTotal() * ROW_H + PAD * 2) + "px";
    this.viewport.scrollTop = 0;
    this.render();
  };

  PosterGrid.prototype.setMessage = function (message) {
    this.generation++;
    this.total = 0; this.items = {}; this.pages = {}; this.rendered = {};
    this.spacer.style.height = "0px";
    this.cells.innerHTML = "";
    var box = document.createElement("div");
    box.className = "grid-empty";
    box.appendChild(document.createTextNode(message));
    this.cells.appendChild(box);
  };

  PosterGrid.prototype._pageOf = function (i) { return Math.floor(i / this.pageSize); };

  PosterGrid.prototype._ensure = function (first, last) {
    if (!this.loader || !this.total) { return; }
    var p0 = this._pageOf(Math.max(0, first));
    var p1 = this._pageOf(Math.min(this.total - 1, last));
    var p;
    for (p = p0; p <= p1; p++) {
      if (!this.pages[p]) { this._loadPage(p); }
    }
  };

  PosterGrid.prototype._loadPage = function (p) {
    var self = this, generation = this.generation;
    this.pages[p] = "carregando";
    var off = p * this.pageSize, t0 = Date.now();
    this.loader(off, this.pageSize, function (list) {
      if (generation !== self.generation) { return; }
      if (list && window.Library) { Library.decorate(list, loaded); } else { loaded(list); }
    });
    function loaded(list) {
      if (generation !== self.generation) { return; }
      if (!list) { delete self.pages[p]; return; }    /* deixa tentar de novo */
      var i;
      for (i = 0; i < list.length; i++) { self.items[off + i] = list[i]; }
      self.pages[p] = true;
      self.onPage({ pagina: p, offset: off, recebidos: list.length, ms: Date.now() - t0 });

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
        self.cells.removeChild(self.rendered[remover[i]]);
        delete self.rendered[remover[i]];
      }
      self.render();
      if (self.selected >= off && self.selected < off + self.pageSize) {
        self.onSelect(self.items[self.selected] || null, self.selected);
      }
    }
  };

  PosterGrid.prototype._trim = function (first, last) {
    var manter = 2;
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

  PosterGrid.prototype._place = function (el, i) {
    el.style.left = (PAD + (i % COLS) * (CARD_W + CARD_GAP)) + "px";
    el.style.top = (PAD + Math.floor(i / COLS) * ROW_H) + "px";
    el.setAttribute("data-index", String(i));
  };

  PosterGrid.prototype._build = function (i) {
    var item = this.items[i], self = this, el;
    if (!item) {
      el = Card.skeleton("poster");
      this._place(el, i);
      return el;
    }
    el = Card.poster(item);
    this._place(el, i);
    el.onclick = function () { self.select(i); };
    el.ondblclick = function () { self.select(i); self.activate(); };
    return el;
  };

  PosterGrid.prototype.render = function () {
    if (!this.total) { return; }
    var top = this.viewport.scrollTop;
    var h = this.viewport.clientHeight || 760;
    var firstRow = Math.max(0, Math.floor(top / ROW_H) - OVERSCAN_ROWS);
    var lastRow = Math.min(this.rowsTotal() - 1, Math.ceil((top + h) / ROW_H) + OVERSCAN_ROWS);
    var first = firstRow * COLS;
    var last = Math.min(this.total - 1, (lastRow + 1) * COLS - 1);

    this._ensure(first, last);

    var i, keep = {};
    for (i = first; i <= last; i++) {
      keep[i] = true;
      if (!this.rendered[i]) {
        var el = this._build(i);
        this.cells.appendChild(el);
        this.rendered[i] = el;
      }
    }
    for (i in this.rendered) {
      if (!this.rendered.hasOwnProperty(i)) { continue; }
      if (!keep[i]) {
        Card.art(this.rendered[i], false);
        this.cells.removeChild(this.rendered[i]);
        delete this.rendered[i];
      }
    }
    this._paint();
    this._trim(first, last);
  };

  PosterGrid.prototype._paint = function () {
    var i;
    for (i in this.rendered) {
      if (!this.rendered.hasOwnProperty(i)) { continue; }
      var el = this.rendered[i], idx = parseInt(i, 10);
      var on = idx === this.selected && this.focused;
      if (el.getAttribute("data-placeholder") !== "1") {
        el.className = "card" + (on ? " is-focused" : "");
      }
      Card.art(el, true);
    }
  };

  PosterGrid.prototype.setFocused = function (on) {
    this.focused = !!on;
    this._paint();
    if (on) { this.onSelect(this.items[this.selected] || null, this.selected); }
  };

  PosterGrid.prototype.select = function (i) {
    if (i < 0 || i >= this.total) { return false; }
    this.selected = i;
    var rowTop = PAD + Math.floor(i / COLS) * ROW_H;
    var top = this.viewport.scrollTop;
    var h = this.viewport.clientHeight || 760;
    if (rowTop - PAD < top) { this.viewport.scrollTop = Math.max(0, rowTop - PAD); }
    else if (rowTop + ROW_H + PAD > top + h) { this.viewport.scrollTop = rowTop + ROW_H + PAD - h; }
    this.render();
    this.onSelect(this.items[i] || null, i);
    return true;
  };

  /* devolve false quando o movimento sai da grade: quem chamou decide
     se isso significa "subir para a faixa de categorias" */
  PosterGrid.prototype.move = function (dx, dy) {
    if (!this.total) { return false; }
    if (dy) {
      var alvo = this.selected + dy * COLS;
      if (alvo < 0) { return false; }
      if (alvo >= this.total) {
        if (dy < 0 || Math.floor(this.selected / COLS) >= this.rowsTotal() - 1) { return false; }
        alvo = this.total - 1;
      }
      return this.select(alvo);
    }
    var col = this.selected % COLS;
    if (dx < 0 && col === 0) { return false; }
    if (dx > 0 && (col === COLS - 1 || this.selected + 1 >= this.total)) { return false; }
    return this.select(this.selected + dx);
  };

  PosterGrid.prototype.activate = function () {
    var item = this.items[this.selected];
    if (item) { this.onActivate(item, this.selected); }
  };

  PosterGrid.prototype.currentItem = function () { return this.items[this.selected] || null; };
  PosterGrid.prototype.count = function () { return this.total; };
  PosterGrid.prototype.position = function () { return { index: this.selected, scrollTop: this.viewport.scrollTop }; };
  PosterGrid.prototype.restorePosition = function (p) {
    if (!this.total || !p) { return; }
    this.viewport.scrollTop = Math.max(0, Number(p.scrollTop) || 0);
    this.select(Math.min(this.total - 1, Math.max(0, Number(p.index) || 0)));
  };
  PosterGrid.prototype.refresh = function () {
    var i;
    for (i in this.rendered) {
      if (this.rendered.hasOwnProperty(i)) { Card.art(this.rendered[i], false); }
    }
    this.cells.innerHTML = "";
    this.rendered = {};
    this.render();
  };
  PosterGrid.prototype.loadedCount = function () {
    var n = 0, k;
    for (k in this.items) { if (this.items.hasOwnProperty(k)) { n++; } }
    return n;
  };

  return PosterGrid;
})();
window.PosterGrid = PosterGrid;
