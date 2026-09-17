/*
 * Search — busca geral, como a lupa dos streamings: um termo só,
 * resultados de canais, filmes e séries ao mesmo tempo.
 *
 * A busca é LOCAL: varre o IndexedDB da fonte ativa, não pergunta ao
 * provedor nem ao PC. Por isso funciona com o computador desligado e
 * responde enquanto o usuário ainda está digitando.
 *
 * O teclado é o da própria TV: dar OK no campo chama focus(), e o webOS
 * abre o teclado virtual. É o mesmo caminho que a tela de configuração
 * já usa e que funciona no aparelho.
 */
var Search = (function () {
  "use strict";

  var LIMITE = 24;
  var ESPERA = 400;      /* deixa o dedo parar antes de varrer o banco */

  var input = null, host = null, handlers = {}, generation = 0;
  var trilhas = [], ativas = [], railIndex = 0, zona = "input", editando = false;
  var timer = null, termo = "";

  function mount(inputEl, resultsEl, h) {
    input = inputEl;
    host = resultsEl;
    handlers = h || {};
    host.innerHTML = "";
    trilhas = [
      { id: "live",   rail: cria("Canais", "tile") },
      { id: "vod",    rail: cria("Filmes", "poster") },
      { id: "series", rail: cria("Series", "poster") }
    ];
    input.oninput = function () { agendar(input.value); };
    input.onfocus = function () { editando = true; };
    input.onblur = function () { editando = false; };
  }

  function cria(titulo, variante) {
    return new Rail(host, {
      title: titulo, variant: variante,
      onActivate: function (item) { if (handlers.onActivate) { handlers.onActivate(item); } },
      onSelect: function (item) { if (zona === "results" && handlers.onSelect) { handlers.onSelect(item); } }
    });
  }

  function agendar(valor) {
    termo = String(valor || "");
    if (timer) { clearTimeout(timer); }
    timer = setTimeout(function () { timer = null; correr(); }, ESPERA);
  }

  function correr() {
    var minha = ++generation, limpo = termo.trim();
    if (limpo.length < 2) {
      trilhas.forEach(function (t) { t.rail.setItems([]); });
      recalcular();
      if (handlers.onStatus) {
        handlers.onStatus("is-warn", limpo ? "Digite pelo menos duas letras." : "Digite para buscar em toda a fonte.");
      }
      return;
    }
    if (handlers.onStatus) { handlers.onStatus("is-warn", "procurando \"" + limpo + "\"..."); }
    Catalog.buscar(limpo, LIMITE, function (err, resultado) {
      if (minha !== generation) { return; }
      if (err) {
        if (handlers.onStatus) { handlers.onStatus("is-err", String(err.message || err)); }
        return;
      }
      var achados = 0;
      trilhas.forEach(function (t) {
        var r = resultado[t.id] || { total: 0, items: [] };
        achados += r.total;
        r.items.forEach(function (it) { it.logoURL = window.Catalog ? Catalog.logoURL(it) : it.logo; });
        t.rail.setItems(r.items);
        t.rail.setSubtitle(r.total > r.items.length ? (r.items.length + " de " + r.total) : (r.total ? (r.total + "") : ""));
      });
      recalcular();
      if (handlers.onStatus) {
        handlers.onStatus(achados ? "is-ok" : "is-warn",
          achados ? (achados + " resultados para \"" + limpo + "\"") : ("Nada encontrado para \"" + limpo + "\"."));
      }
      Log.event("busca", { termo: limpo.length, resultados: achados });
    });
  }

  function recalcular() {
    ativas = trilhas.filter(function (t) { return t.rail.count() > 0; });
    if (railIndex >= ativas.length) { railIndex = Math.max(0, ativas.length - 1); }
    var alvo = ativas[railIndex];
    trilhas.forEach(function (t) { t.rail.setFocused(zona === "results" && alvo === t); });
    /* sem isto a ultima trilha fica presa no rodape, com o titulo cortado:
       quem rola e o container de resultados, nao a pagina */
    if (zona === "results" && alvo && alvo.rail.el.scrollIntoView) {
      alvo.rail.el.scrollIntoView({ block: "nearest" });
    }
  }

  function focar(novaZona) {
    zona = novaZona;
    if (zona === "input") {
      trilhas.forEach(function (t) { t.rail.setFocused(false); });
      if (input) { input.className = "search-input is-focused"; }
    } else {
      if (input) { input.className = "search-input"; }
      recalcular();
    }
  }

  function open() {
    railIndex = 0;
    focar("input");
    if (!termo && handlers.onStatus) {
      handlers.onStatus("is-warn", "Digite para buscar canais, filmes e series desta fonte.");
    }
  }

  function close() {
    generation++;
    if (timer) { clearTimeout(timer); timer = null; }
    editando = false;
    if (input && input.blur) { input.blur(); }
  }

  function railAtual() {
    var t = ativas[railIndex];
    return t ? t.rail : null;
  }

  function focusedItem() {
    var r = railAtual();
    return zona === "results" && r ? r.current() : null;
  }

  function handleKey(k, ev) {
    /* digitando, o teclado da TV consome tudo menos a saida */
    if (editando) {
      if (k === Keys.BACK || k === Keys.OK) {
        input.blur(); editando = false;
        if (timer) { clearTimeout(timer); timer = null; }
        correr();
        ev.preventDefault(); return true;
      }
      return false;
    }

    if (zona === "input") {
      if (k === Keys.OK) {
        if (input.focus) { input.focus(); editando = true; }
        ev.preventDefault(); return true;
      }
      if (k === Keys.DOWN) {
        if (ativas.length) { focar("results"); }
        ev.preventDefault(); return true;
      }
      return false;   /* CIMA e VOLTAR sobem para a navbar/pagina anterior */
    }

    if (k === Keys.UP) {
      if (railIndex > 0) { railIndex--; recalcular(); }
      else { focar("input"); }
      ev.preventDefault(); return true;
    }
    if (k === Keys.DOWN) {
      if (railIndex < ativas.length - 1) { railIndex++; recalcular(); }
      ev.preventDefault(); return true;
    }
    if (k === Keys.LEFT)  { var a = railAtual(); if (a) { a.move(-1); } ev.preventDefault(); return true; }
    if (k === Keys.RIGHT) { var b = railAtual(); if (b) { b.move(1); } ev.preventDefault(); return true; }
    if (k === Keys.OK)    { var c = railAtual(); if (c) { c.activate(); } ev.preventDefault(); return true; }
    return false;
  }

  return {
    mount: mount, open: open, close: close, handleKey: handleKey,
    focusedItem: focusedItem,
    zone: function () { return zona; },
    editing: function () { return editando; },
    term: function () { return termo; }
  };
})();
window.Search = Search;
