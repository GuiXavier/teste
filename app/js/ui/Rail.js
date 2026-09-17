/*
 * Rail — trilha horizontal da home, no formato do nodecast-tv.
 *
 * Diferencas obrigatorias para a TV:
 *   - sem :hover e sem barra de rolagem; quem anda e o D-pad
 *   - sem "gap" em flex (Chromium 84): os cartoes sao inline-block com
 *     margin-right, e o deslocamento e um translateX no strip
 *   - so as imagens da janela visivel ficam carregadas
 */
var Rail = (function () {
  "use strict";

  function Rail(host, opts) {
    opts = opts || {};
    this.variant = opts.variant === "tile" ? "tile" : "poster";
    this.onActivate = opts.onActivate || function () {};
    this.onSelect = opts.onSelect || function () {};
    this.items = [];
    this.cells = [];
    this.selected = 0;
    this.offset = 0;
    this.focused = false;
    this.generation = 0;

    this.el = document.createElement("div");
    this.el.className = "rail is-empty";

    var head = document.createElement("div");
    head.className = "rail-head";
    this.titleEl = document.createElement("div");
    this.titleEl.className = "rail-title";
    this.titleEl.appendChild(document.createTextNode(opts.title || ""));
    this.subEl = document.createElement("div");
    this.subEl.className = "rail-sub";
    head.appendChild(this.titleEl);
    head.appendChild(this.subEl);

    this.track = document.createElement("div");
    this.track.className = "rail-track";
    this.strip = document.createElement("div");
    this.strip.className = "rail-strip";
    this.track.appendChild(this.strip);

    this.el.appendChild(head);
    this.el.appendChild(this.track);
    host.appendChild(this.el);
  }

  Rail.prototype.step = function () {
    /* largura do cartao + margem; lida do CSS para nao duplicar numero */
    var first = this.cells[0];
    if (!first) { return this.variant === "tile" ? 164 : 242; }
    return first.offsetWidth + (this.variant === "tile" ? 12 : 20);
  };

  Rail.prototype.visible = function () {
    var w = this.track.clientWidth || 1792;
    return Math.max(1, Math.floor(w / this.step()));
  };

  Rail.prototype.setSubtitle = function (s) {
    this.subEl.innerHTML = "";
    this.subEl.appendChild(document.createTextNode(s || ""));
  };

  Rail.prototype.setItems = function (items) {
    this.generation++;
    this.items = items || [];
    this.cells = [];
    this.selected = 0;
    this.offset = 0;
    this.strip.innerHTML = "";
    this.strip.style.transform = "translateX(0px)";
    this.el.className = "rail" + (this.items.length ? "" : " is-empty");
    var i, make = this.variant === "tile" ? Card.tile : Card.poster;
    for (i = 0; i < this.items.length; i++) {
      var cell = make(this.items[i]);
      cell.setAttribute("data-index", String(i));
      this.strip.appendChild(cell);
      this.cells.push(cell);
    }
    this._bindPointer();
    this._paint();
  };

  Rail.prototype.setMessage = function (message) {
    this.generation++;
    this.items = [];
    this.cells = [];
    this.strip.innerHTML = "";
    this.el.className = "rail";
    var box = document.createElement("div");
    box.className = "rail-empty";
    box.appendChild(document.createTextNode(message));
    this.strip.appendChild(box);
  };

  /* o ponteiro magico da LG continua util: clique escolhe, duplo assiste */
  Rail.prototype._bindPointer = function () {
    var self = this;
    this.cells.forEach(function (cell, i) {
      cell.onclick = function () { self.select(i); };
      cell.ondblclick = function () { self.select(i); self.activate(); };
    });
  };

  Rail.prototype.count = function () { return this.items.length; };
  Rail.prototype.current = function () { return this.items[this.selected] || null; };

  Rail.prototype.setFocused = function (on) {
    this.focused = !!on;
    this._paint();
    if (on) { this.onSelect(this.current(), this.selected); }
  };

  Rail.prototype.select = function (i) {
    if (!this.items.length) { return; }
    this.selected = Math.max(0, Math.min(this.items.length - 1, i));
    this._paint();
    this.onSelect(this.current(), this.selected);
  };

  Rail.prototype.move = function (delta) {
    var next = this.selected + delta;
    if (next < 0 || next >= this.items.length) { return false; }
    this.select(next);
    return true;
  };

  Rail.prototype.activate = function () {
    var item = this.current();
    if (item) { this.onActivate(item, this.selected); }
  };

  Rail.prototype._paint = function () {
    var visible = this.visible();
    var max = Math.max(0, this.items.length - visible);
    /* mantem dois cartoes de contexto a esquerda do foco */
    var want = Math.max(0, Math.min(max, this.selected - 2));
    this.offset = want;
    this.strip.style.transform = "translateX(" + (-want * this.step()) + "px)";

    var first = want - 1, last = want + visible + 1, i;
    for (i = 0; i < this.cells.length; i++) {
      var cell = this.cells[i];
      var on = i === this.selected && this.focused;
      var base = this.variant === "tile" ? "tile" : "card";
      cell.className = base + (on ? " is-focused" : "");
      Card.art(cell, i >= first && i <= last);
    }
  };

  return Rail;
})();
window.Rail = Rail;
