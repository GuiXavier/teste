/*
 * Navegacao espacial por D-pad.
 * Implementacao minima e sem dependencia: elementos com [data-focusable]
 * dentro de um container com [data-nav-group]. O movimento escolhe o
 * candidato mais proximo na direcao pedida.
 *
 * Alternativas maduras, se o app crescer:
 *   noriginmedia/norigin-spatial-navigation  (tem core sem framework)
 *   @enact/spotlight                         (da propria LG)
 */
var Spatial = (function () {
  "use strict";

  var focused = null;

  function rect(el) {
    var r = el.getBoundingClientRect();
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2,
             l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height };
  }

  function candidates(scope) {
    var all = (scope || document).querySelectorAll("[data-focusable]");
    var out = [], i;
    for (i = 0; i < all.length; i++) {
      var el = all[i];
      if (el.offsetParent === null) { continue; }       /* invisivel */
      if (el.getAttribute("data-disabled") === "true") { continue; }
      out.push(el);
    }
    return out;
  }

  function focus(el) {
    if (!el || el === focused) { return; }
    if (focused) { focused.removeAttribute("data-focused"); }
    focused = el;
    el.setAttribute("data-focused", "true");
    /* scrollIntoView com smooth funciona no Cr79 e a TV aguenta */
    if (el.scrollIntoView) { el.scrollIntoView({ block: "nearest" }); }
    if (Spatial.onFocus) { Spatial.onFocus(el); }
  }

  function move(dir, scope) {
    if (!focused) { var c = candidates(scope); if (c.length) { focus(c[0]); } return; }
    var from = rect(focused);
    var list = candidates(scope), best = null, bestScore = Infinity, i;

    for (i = 0; i < list.length; i++) {
      if (list[i] === focused) { continue; }
      var to = rect(list[i]);
      var dx = to.cx - from.cx, dy = to.cy - from.cy;
      var ok = (dir === "left"  && to.r <= from.l + 1) ||
               (dir === "right" && to.l >= from.r - 1) ||
               (dir === "up"    && to.b <= from.t + 1) ||
               (dir === "down"  && to.t >= from.b - 1);
      if (!ok) { continue; }
      /* distancia na direcao + penalidade forte pelo desvio lateral */
      var along = (dir === "left" || dir === "right") ? Math.abs(dx) : Math.abs(dy);
      var off   = (dir === "left" || dir === "right") ? Math.abs(dy) : Math.abs(dx);
      var score = along + off * 3;
      if (score < bestScore) { bestScore = score; best = list[i]; }
    }
    if (best) { focus(best); }
  }

  /* sair da zona: sem isto o elemento antigo continua com o anel de foco
     enquanto o D-pad ja esta comandando outra parte da tela */
  function blur() {
    if (focused) { focused.removeAttribute("data-focused"); focused = null; }
  }

  return {
    focus: focus,
    blur: blur,
    move: move,
    current: function () { return focused; },
    onFocus: null,
    handleKey: function (k, scope) {
      if (k === Keys.LEFT)  { move("left", scope);  return true; }
      if (k === Keys.RIGHT) { move("right", scope); return true; }
      if (k === Keys.UP)    { move("up", scope);    return true; }
      if (k === Keys.DOWN)  { move("down", scope);  return true; }
      if (k === Keys.OK && focused) {
        if (Spatial.onEnter) { Spatial.onEnter(focused); }
        return true;
      }
      return false;
    },
    onEnter: null
  };
})();
window.Spatial = Spatial;
