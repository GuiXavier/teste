/*
 * Controls — os controles de transporte da tela cheia.
 *
 * Sem eles não dá para entrar no meio de um episódio: o app só sabia
 * abrir do início ou do ponto salvo. Aqui entram avançar, voltar,
 * pausar e a barra de progresso com o tempo.
 *
 * Duas zonas de foco dentro da tela cheia:
 *   "seek"    (padrão) ESQUERDA/DIREITA pulam 10 s; REW/FWD pulam 60 s
 *   "botoes"  BAIXO entra na fileira; ESQUERDA/DIREITA andam; OK aciona
 *
 * O pulo é ACUMULADO e aplicado uma vez só, 450 ms depois da última
 * tecla. Numa TV, cada `currentTime =` refaz a busca no servidor: dez
 * toques viram dez buscas e o vídeo nunca sai do lugar. Acumular é o que
 * torna "segurar a seta" utilizável.
 */
var Controls = (function () {
  "use strict";

  var PULO_CURTO = 10, PULO_LONGO = 60, APLICAR_EM = 450;

  var video = null, handlers = {};
  var barra = null, trilho = null, preenchido = null, decorrido = null, total = null, host = null;
  var botoes = [], idx = 0, zona = "seek";
  var item = null, temProximo = false, podeBuscar = false;
  var pendente = 0, base = 0, timer = null;

  function tempo(s) {
    if (!isFinite(s) || s < 0) { return "0:00"; }
    var t = Math.floor(s), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), g = t % 60;
    var mm = (h && m < 10 ? "0" : "") + m, ss = (g < 10 ? "0" : "") + g;
    return (h ? (h + ":") : "") + mm + ":" + ss;
  }
  function txt(node, s) {
    node.innerHTML = "";
    node.appendChild(document.createTextNode(s));
  }

  function mount(videoEl, refs, h) {
    video = videoEl;
    handlers = h || {};
    barra = refs.seek; trilho = refs.seek; preenchido = refs.seek.firstChild;
    decorrido = refs.elapsed; total = refs.total; host = refs.buttons;
    if (trilho) {
      /* ponteiro magico: clicar na barra busca a posicao apontada */
      trilho.onclick = function (ev) {
        if (!podeBuscar || !isFinite(video.duration) || video.duration <= 0) { return; }
        var caixa = trilho.getBoundingClientRect ? trilho.getBoundingClientRect() : null;
        if (!caixa || !caixa.width) { return; }
        var fracao = Math.max(0, Math.min(1, (ev.clientX - caixa.left) / caixa.width));
        aplicarAbsoluto(fracao * video.duration);
      };
    }
  }

  function botao(rotulo, chave, acao) {
    var b = document.createElement("button");
    b.className = "wc-btn";
    b.setAttribute("aria-label", chave);
    b.appendChild(document.createTextNode(rotulo));
    b._acao = acao;
    b.onclick = function () { idx = botoes.indexOf(b); pintar(); acao(); };
    host.appendChild(b);
    botoes.push(b);
  }

  function render() {
    if (!host) { return; }
    host.innerHTML = "";
    botoes = [];
    if (podeBuscar) { botao("⏪ 60s", "voltar 60 segundos", function () { pular(-PULO_LONGO); }); }
    if (podeBuscar) { botao("◀ 10s", "voltar 10 segundos", function () { pular(-PULO_CURTO); }); }
    botao(video && video.paused ? "▶" : "‖", "pausar ou continuar", alternarPausa);
    if (podeBuscar) { botao("10s ▶", "avancar 10 segundos", function () { pular(PULO_CURTO); }); }
    if (podeBuscar) { botao("60s ⏩", "avancar 60 segundos", function () { pular(PULO_LONGO); }); }
    if (temProximo) { botao("⏭ proximo", "proximo episodio", function () { if (handlers.onNext) { handlers.onNext(); } }); }
    if (idx >= botoes.length) { idx = 0; }
    pintar();
  }

  function pintar() {
    botoes.forEach(function (b, i) {
      if (zona === "botoes" && i === idx) { b.setAttribute("data-focused", "true"); }
      else { b.removeAttribute("data-focused"); }
    });
    if (trilho) {
      trilho.className = "watch-seek" + (podeBuscar ? "" : " hidden") + (zona === "seek" ? " is-focused" : "");
    }
  }

  function setItem(novo, hasNext) {
    item = novo;
    temProximo = !!hasNext;
    podeBuscar = !!(novo && (novo.kind === "vod" || novo.kind === "episode"));
    zona = "seek"; idx = 0;
    cancelarPulo();
    render();
    update();
  }

  function reset() {
    item = null; temProximo = false; podeBuscar = false; zona = "seek"; idx = 0;
    cancelarPulo();
    if (host) { host.innerHTML = ""; botoes = []; }
  }

  function cancelarPulo() {
    if (timer) { clearTimeout(timer); timer = null; }
    pendente = 0;
  }

  function alvoAtual() {
    if (!pendente) { return video.currentTime; }
    var fim = isFinite(video.duration) && video.duration > 0 ? video.duration - 1 : base + pendente;
    return Math.max(0, Math.min(fim, base + pendente));
  }

  function pular(delta) {
    if (!podeBuscar || !isFinite(video.duration) || video.duration <= 0) { return false; }
    if (!timer) { base = isFinite(video.currentTime) ? video.currentTime : 0; }
    pendente += delta;
    if (timer) { clearTimeout(timer); }
    timer = setTimeout(function () { timer = null; aplicar(); }, APLICAR_EM);
    update();
    return true;
  }

  function aplicar() {
    var alvo = alvoAtual();
    pendente = 0;
    aplicarAbsoluto(alvo);
  }

  function aplicarAbsoluto(segundos) {
    if (!podeBuscar) { return; }
    var fim = isFinite(video.duration) && video.duration > 0 ? video.duration - 1 : segundos;
    var alvo = Math.max(0, Math.min(fim, segundos));
    /* avisa antes de mexer: o watchdog precisa saber que a pausa que vem
       a seguir e a busca, nao o stream morrendo */
    if (handlers.onSeek) { handlers.onSeek(alvo, video.currentTime); }
    try { video.currentTime = alvo; } catch (e) {
      if (handlers.onNotice) { handlers.onNotice("Este video nao permitiu avancar."); }
    }
    Log.info("controles", "busca manual", { para: Math.round(alvo) });
    update();
  }

  function alternarPausa() {
    if (!video) { return; }
    if (video.paused) { var p = video.play(); if (p && p["catch"]) { p["catch"](function () {}); } }
    else { video.pause(); }
    render();
  }

  function update() {
    if (!trilho) { return; }
    var duracao = video ? video.duration : 0;
    if (!podeBuscar || !isFinite(duracao) || duracao <= 0) {
      trilho.className = "watch-seek hidden";
      if (decorrido) { txt(decorrido, ""); }
      if (total) { txt(total, ""); }
      return;
    }
    var pos = alvoAtual();
    preenchido.style.width = Math.max(0, Math.min(100, (pos / duracao) * 100)) + "%";
    trilho.className = "watch-seek" + (zona === "seek" ? " is-focused" : "") + (pendente ? " is-scrubbing" : "");
    if (decorrido) { txt(decorrido, tempo(pos) + (pendente ? ("  (" + (pendente > 0 ? "+" : "") + pendente + "s)") : "")); }
    if (total) { txt(total, tempo(duracao)); }
  }

  function handleKey(k, ev) {
    if (!video) { return false; }
    if (k === Keys.PLAY) { var p = video.play(); if (p && p["catch"]) { p["catch"](function () {}); } render(); return true; }
    if (k === Keys.PAUSE) { video.pause(); render(); return true; }
    if (k === Keys.REW) { return pular(-PULO_LONGO); }
    if (k === Keys.FWD) { return pular(PULO_LONGO); }

    if (zona === "botoes") {
      if (k === Keys.LEFT)  { if (idx > 0) { idx--; pintar(); } return true; }
      if (k === Keys.RIGHT) { if (idx < botoes.length - 1) { idx++; pintar(); } return true; }
      if (k === Keys.UP)    { zona = "seek"; pintar(); update(); return true; }
      if (k === Keys.OK)    { var b = botoes[idx]; if (b && b._acao) { b._acao(); } return true; }
      if (k === Keys.DOWN)  { return true; }
      return false;
    }

    if (k === Keys.LEFT)  { return pular(-PULO_CURTO); }
    if (k === Keys.RIGHT) { return pular(PULO_CURTO); }
    if (k === Keys.DOWN)  { if (!botoes.length) { return false; } zona = "botoes"; pintar(); update(); return true; }
    if (k === Keys.UP)    { zona = "seek"; pintar(); return true; }
    return false;
  }

  return {
    mount: mount, setItem: setItem, reset: reset, update: update,
    handleKey: handleKey, render: render,
    zone: function () { return zona; },
    seekable: function () { return podeBuscar; },
    pending: function () { return pendente; }
  };
})();
window.Controls = Controls;
