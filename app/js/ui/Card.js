/*
 * Card — cartao de poster e tile circular, como no desenho do nodecast.
 *
 * A imagem NAO entra no DOM junto com o cartao. Quem monta a lista decide
 * quando chamar art(el, true/false): numa TV com ~190 MB livres, um poster
 * decodificado custa muito mais que a <div> que o segura. O fallback com o
 * nome fica sempre montado, entao o cartao nunca aparece vazio.
 */
var Card = (function () {
  "use strict";

  function txt(node, s) {
    node.appendChild(document.createTextNode(s === null || s === undefined ? "" : String(s)));
  }

  function minutos(seg) { return Math.floor(Number(seg) / 60); }

  function badgeOf(item) {
    if (item.kind === "episode") {
      if (item.season !== undefined && item.num !== undefined) { return "T" + item.season + "E" + item.num; }
      return "Episodio";
    }
    if (item.kind === "series") { return "Serie"; }
    if (item.kind === "vod") { return item.container ? String(item.container).toUpperCase() : "Filme"; }
    if (item.chno) { return String(item.chno); }
    return null;
  }

  function subtitleOf(item) {
    var parts = [];
    /* no episodio o titulo ja e "T1E4 Nome"; quem falta identificar e a serie */
    if (item.kind === "episode" && item.seriesName) { parts.push(item.seriesName); }
    if (item.position > 0 && !item.completed) { parts.push(minutos(item.position) + " min assistidos"); }
    else if (item.completed) { parts.push("assistido"); }
    if (item.rating) { parts.push("★ " + item.rating); }
    if (item.genre) { parts.push(String(item.genre).split(/[,;]/)[0]); }
    else if (item.category) { parts.push(item.category); }
    if (item.missing) { parts.push("fora do catalogo"); }
    return parts.slice(0, 2).join("  ·  ");
  }

  function fallback(item) {
    var d = document.createElement("div");
    d.className = "card-fallback";
    txt(d, item.name || "Sem titulo");
    return d;
  }

  /* liga/desliga a imagem do cartao sem remontar o resto */
  function art(el, on) {
    var item = el._item, host = el._art;
    if (!host) { return; }
    var url = item ? (item.logoURL || item.logo) : null;
    if (on && url) {
      if (el._img) { return; }
      var img = document.createElement("img");
      img.alt = "";
      img.onerror = function () {
        if (img.parentNode) { img.parentNode.removeChild(img); }
        if (el._img === img) { el._img = null; }
      };
      img.src = url;
      host.insertBefore(img, host.firstChild);
      el._img = img;
      if (el._fallback) { el._fallback.className = "card-fallback hidden"; }
      return;
    }
    if (el._img) {
      if (el._img.parentNode) { host.removeChild(el._img); }
      el._img = null;
    }
    if (el._fallback) { el._fallback.className = "card-fallback"; }
  }

  function poster(item) {
    var el = document.createElement("div");
    el.className = "card";

    var host = document.createElement("div");
    host.className = "card-art";
    var vazio = fallback(item);
    host.appendChild(vazio);

    var badge = badgeOf(item);
    if (badge) {
      var b = document.createElement("span");
      b.className = "card-badge";
      txt(b, badge);
      host.appendChild(b);
    }
    if (item.favorite) {
      var star = document.createElement("span");
      star.className = "card-fav";
      txt(star, "★");
      host.appendChild(star);
    }
    if (item.position > 0 && item.duration > 0 && !item.completed) {
      var bar = document.createElement("div");
      bar.className = "card-progress";
      var fill = document.createElement("i");
      fill.style.width = Math.max(2, Math.min(100, (item.position / item.duration) * 100)) + "%";
      bar.appendChild(fill);
      host.appendChild(bar);
    }

    var info = document.createElement("div");
    info.className = "card-info";
    var title = document.createElement("div");
    title.className = "card-title";
    txt(title, item.name || "Sem titulo");
    var sub = document.createElement("div");
    sub.className = "card-sub";
    txt(sub, subtitleOf(item));
    info.appendChild(title);
    info.appendChild(sub);

    el.appendChild(host);
    el.appendChild(info);
    el._item = item;
    el._art = host;
    el._img = null;
    el._fallback = vazio;
    return el;
  }

  function tile(item) {
    var el = document.createElement("div");
    el.className = "tile";

    var host = document.createElement("div");
    host.className = "tile-art";
    var vazioTile = fallback(item);
    host.appendChild(vazioTile);

    var name = document.createElement("div");
    name.className = "tile-name";
    txt(name, item.name || "Sem titulo");

    el.appendChild(host);
    el.appendChild(name);
    el._item = item;
    el._art = host;
    el._img = null;
    el._fallback = vazioTile;
    return el;
  }

  function skeleton(variant) {
    var el = document.createElement("div");
    el.className = variant === "tile" ? "tile" : "card";
    var host = document.createElement("div");
    host.className = variant === "tile" ? "tile-art" : "card-art";
    el.appendChild(host);
    if (variant !== "tile") {
      var info = document.createElement("div");
      info.className = "card-info";
      var bar = document.createElement("div");
      bar.className = "card-title cl-bar";
      info.appendChild(bar);
      el.appendChild(info);
    }
    el._item = null;
    el._art = host;
    el._img = null;
    el.setAttribute("data-placeholder", "1");
    return el;
  }

  return { poster: poster, tile: tile, skeleton: skeleton, art: art,
           subtitleOf: subtitleOf, badgeOf: badgeOf };
})();
window.Card = Card;
