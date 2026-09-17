/*
 * UpNext — o "a seguir" da série, com o comportamento dos streamings.
 *
 * Aos 95% do episódio o painel aparece com uma contagem regressiva. Ao
 * chegar a zero, ou quando o vídeo termina, o próximo episódio entra
 * sozinho. OK entra na hora; VOLTAR dispensa, e um episódio dispensado
 * não volta a oferecer nem avança sozinho no fim.
 *
 * A fila vem da ficha da série (lista já ordenada por temporada e
 * episódio), então a virada de temporada não precisa de caso especial e o
 * último episódio simplesmente não oferece nada.
 */
var UpNext = (function () {
  "use strict";

  var LIMIAR = 0.95;
  var DURACAO_MINIMA = 120;     /* abaixo disso nao ha creditos para pular */
  var CONTAGEM = 10;            /* segundos ate entrar sozinho */

  var fila = null, visivel = false, dispensado = false, aoAceitar = null;
  var restante = 0, ticker = null;
  var panel = null, titleEl = null, hintEl = null, goEl = null;

  function nodes() {
    if (!panel) {
      panel = document.getElementById("nextEp");
      titleEl = document.getElementById("nextEpTitle");
      hintEl = document.getElementById("nextEpHint");
      goEl = document.getElementById("nextEpGo");
    }
    return panel;
  }

  function mount(handler) {
    aoAceitar = handler;
    var go = document.getElementById("nextEpGo");
    if (go) { go.onclick = function () { accept(); }; }
  }

  function next() {
    if (!fila || !fila.lista) { return null; }
    return fila.lista[fila.index + 1] || null;
  }

  function pararTicker() {
    if (ticker) { clearInterval(ticker); ticker = null; }
  }

  function texto() {
    if (!goEl) { return; }
    goEl.innerHTML = "";
    goEl.appendChild(document.createTextNode(
      restante > 0 ? ("Proximo em " + restante + "s  ·  OK para ja") : "Abrindo o proximo..."));
  }

  function hide() {
    visivel = false;
    pararTicker();
    if (nodes()) { panel.className = "next-ep hidden"; }
  }

  function show() {
    var alvo = next();
    if (!alvo || !nodes()) { return false; }
    titleEl.innerHTML = "";
    titleEl.appendChild(document.createTextNode(alvo.name || "Proximo episodio"));
    if (hintEl) {
      hintEl.innerHTML = "";
      hintEl.appendChild(document.createTextNode("VOLTAR fica neste episodio"));
    }
    panel.className = "next-ep";
    visivel = true;
    restante = CONTAGEM;
    texto();
    pararTicker();
    ticker = setInterval(function () {
      restante--;
      texto();
      if (restante <= 0) { pararTicker(); accept(); }
    }, 1000);
    Log.info("upnext", "proximo episodio oferecido", { nome: alvo.name, contagem: CONTAGEM });
    return true;
  }

  /* chamada a cada amostra do monitor */
  function consider(ct, duration) {
    if (visivel || dispensado || !fila) { return; }
    if (!isFinite(duration) || duration < DURACAO_MINIMA) { return; }
    if (!isFinite(ct) || ct <= 0) { return; }
    if (ct / duration >= LIMIAR) { show(); }
  }

  /* Fim natural: mesmo sem duracao confiavel o proximo entra, que e o
     caso do episodio curto que termina antes de o painel aparecer. */
  function shouldAdvance() { return !dispensado && !!next(); }

  function seguinte() {
    if (!fila) { return null; }
    return { serie: fila.serie, lista: fila.lista, index: fila.index + 1 };
  }

  function begin(queue) {
    fila = (queue && queue.lista && queue.lista.length) ? queue : null;
    dispensado = false;
    hide();
  }

  function clear() { fila = null; dispensado = false; hide(); }
  function dismiss() { dispensado = true; hide(); }

  function accept() {
    var alvo = next(), proxima = seguinte();
    if (!alvo || !aoAceitar) { return false; }
    hide();
    aoAceitar(alvo, proxima);
    return true;
  }

  return {
    mount: mount, begin: begin, clear: clear, consider: consider,
    accept: accept, dismiss: dismiss,
    next: next, queue: seguinte, hide: hide,
    shouldAdvance: shouldAdvance,
    dismissed: function () { return dispensado; },
    visible: function () { return visivel; },
    countdown: function () { return restante; }
  };
})();
window.UpNext = UpNext;
