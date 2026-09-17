/*
 * Home — o painel de trilhas do nodecast-tv, portado para o D-pad.
 *
 * Tudo aqui sai do banco local: favoritos e historico da biblioteca
 * pessoal, recentes do catalogo ja sincronizado. Nenhuma trilha chama o
 * backend do PC, entao a home abre com o computador desligado.
 *
 * Trilha vazia some (is-empty) e nao entra na navegacao: nada de faixa
 * com "nenhum item" ocupando meia tela.
 */
var Home = (function () {
  "use strict";

  var LIMITE_BIBLIOTECA = 40;   /* favoritos lidos antes de separar por tipo */
  var LIMITE_TRILHA = 14;

  function Home(host, opts) {
    opts = opts || {};
    this.host = host;
    this.onActivate = opts.onActivate || function () {};
    this.onSelect = opts.onSelect || function () {};
    this.generation = 0;
    this.railIndex = 0;
    this.focused = false;
    this.host.innerHTML = "";

    var self = this;
    function make(title, variant) {
      return new Rail(self.host, {
        title: title, variant: variant,
        onActivate: function (item) { self.onActivate(item); },
        onSelect: function (item) { if (self.focused) { self.onSelect(item); } }
      });
    }
    this.rails = [
      { id: "favLive", rail: make("Canais favoritos", "tile") },
      { id: "history", rail: make("Continuar assistindo", "poster") },
      { id: "favVod", rail: make("Seus filmes e series", "poster") },
      { id: "recentVod", rail: make("Filmes adicionados recentemente", "poster") },
      { id: "recentSeries", rail: make("Series adicionadas recentemente", "poster") }
    ];
    this.active = [];
  }

  Home.prototype._byId = function (id) {
    var i;
    for (i = 0; i < this.rails.length; i++) {
      if (this.rails[i].id === id) { return this.rails[i].rail; }
    }
    return null;
  };

  Home.prototype._recompute = function () {
    var self = this;
    this.active = this.rails.filter(function (r) { return r.rail.count() > 0; });
    if (this.railIndex >= this.active.length) { this.railIndex = Math.max(0, this.active.length - 1); }
    this.active.forEach(function (r, i) { r.rail.setFocused(self.focused && i === self.railIndex); });
    this.rails.forEach(function (r) {
      if (self.active.indexOf(r) < 0) { r.rail.setFocused(false); }
    });
  };

  function logos(items) {
    items.forEach(function (item) {
      item.logoURL = window.Catalog ? Catalog.logoURL(item) : item.logo;
    });
    return items;
  }

  /* carrega as cinco trilhas; cada uma aparece assim que responde */
  Home.prototype.load = function (sourceId, cb) {
    var self = this, generation = ++this.generation, pendentes = 5, erro = null;
    this.rails.forEach(function (r) { r.rail.setItems([]); });
    this.railIndex = 0;

    function pronto(e) {
      if (e && !erro) { erro = e; }
      pendentes--;
      if (generation !== self.generation) { return; }
      self._recompute();
      if (!pendentes && cb) { cb(erro, self.active.length); }
    }
    function fill(id, items, sub) {
      if (generation !== self.generation) { return; }
      var rail = self._byId(id);
      if (!rail) { return; }
      rail.setItems(logos(items || []));
      if (sub) { rail.setSubtitle(sub); }
    }

    if (!sourceId) {
      this.rails.forEach(function (r) { r.rail.setItems([]); });
      this._recompute();
      if (cb) { cb(null, 0); }
      return;
    }

    Library.page("history", sourceId, 0, LIMITE_TRILHA, function (e, r) {
      if (generation !== self.generation) { return; }
      if (e || !r.items.length) { fill("history", []); return pronto(e); }
      Shelf.hydrate(r.items, function (err, rows) {
        fill("history", rows, r.total > rows.length ? (r.total + " em andamento") : "");
        pronto(err);
      });
    });

    Library.page("favorites", sourceId, 0, LIMITE_BIBLIOTECA, function (e, r) {
      if (generation !== self.generation) { return; }
      if (e || !r.items.length) { fill("favLive", []); fill("favVod", []); pronto(e); return pronto(null); }
      Shelf.hydrate(r.items, function (err, rows) {
        var canais = [], titulos = [];
        rows.forEach(function (row) {
          row.favorite = true;
          if (row.kind === "live") { canais.push(row); } else { titulos.push(row); }
        });
        fill("favLive", canais.slice(0, LIMITE_BIBLIOTECA));
        fill("favVod", titulos.slice(0, LIMITE_TRILHA));
        pronto(err); pronto(null);
      });
    });

    Shelf.recent("vod", sourceId, LIMITE_TRILHA, function (e, items) {
      fill("recentVod", items); pronto(e);
    });
    Shelf.recent("series", sourceId, LIMITE_TRILHA, function (e, items) {
      fill("recentSeries", items); pronto(e);
    });
  };

  Home.prototype.count = function () { return this.active.length; };
  Home.prototype.currentRail = function () {
    var entry = this.active[this.railIndex];
    return entry ? entry.rail : null;
  };
  Home.prototype.current = function () {
    var rail = this.currentRail();
    return rail ? rail.current() : null;
  };

  Home.prototype.setFocused = function (on) {
    this.focused = !!on;
    this._recompute();
    if (on) { this.onSelect(this.current()); }
  };

  Home.prototype.move = function (dx, dy) {
    if (!this.active.length) { return false; }
    if (dy) {
      var alvo = this.railIndex + dy;
      if (alvo < 0 || alvo >= this.active.length) { return false; }
      this.railIndex = alvo;
      this._recompute();
      this._scrollIntoView();
      this.onSelect(this.current());
      return true;
    }
    var rail = this.currentRail();
    return rail ? rail.move(dx) : false;
  };

  Home.prototype._scrollIntoView = function () {
    var entry = this.active[this.railIndex];
    if (entry && entry.rail.el.scrollIntoView) { entry.rail.el.scrollIntoView({ block: "nearest" }); }
  };

  Home.prototype.activate = function () {
    var rail = this.currentRail();
    if (rail) { rail.activate(); }
  };

  return Home;
})();
window.Home = Home;
