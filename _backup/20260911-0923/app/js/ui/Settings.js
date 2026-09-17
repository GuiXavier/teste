/*
 * Settings — tela de configuracao.
 *
 * Entrada de texto: usa <input> de verdade. Ao receber foco, a webOS
 * abre o TECLADO VIRTUAL DO SISTEMA, que o usuario ja conhece do resto
 * da TV. Muito melhor que construir um QWERTY na mao.
 *
 * Navegacao: cima/baixo entre campos, OK entra no campo (abre o
 * teclado) ou aciona o botao, VOLTAR sai.
 */
var Settings = (function () {
  "use strict";

  var el = null, aberto = false;
  var campos = [], idx = 0, editando = false;
  var onClose = null;
  var estado = { sources: [], config: null, health: null };

  function h(html) { var d = document.createElement("div"); d.innerHTML = html; return d.firstChild; }
  function txt(e, s) { e.innerHTML = ""; e.appendChild(document.createTextNode(s)); }

  /* ---------- montagem ---------- */
  function build() {
    if (el) { return el; }
    el = document.createElement("div");
    el.id = "settings";
    el.className = "settings hidden";
    el.innerHTML =
      '<div class="set-head">' +
        '<div class="set-title">Configuracao</div>' +
        '<div class="set-hint">Cima/Baixo mover &middot; OK editar &middot; VOLTAR sair</div>' +
      '</div>' +
      '<div class="set-body">' +
        '<div class="set-col">' +
          '<h3>Servidor</h3><div id="set-server"></div>' +
          '<h3>Rede</h3><div id="set-net"></div>' +
        '</div>' +
        '<div class="set-col">' +
          '<h3>Fontes</h3><div id="set-sources"></div>' +
          '<h3>Nova fonte</h3><div id="set-new"></div>' +
        '</div>' +
        '<div class="set-col">' +
          '<h3>Diagnostico</h3><div id="set-diag"></div>' +
          '<div id="set-msg" class="set-msg"></div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(el);
    return el;
  }

  function campoTexto(host, rotulo, valor, tipo) {
    var row = h('<div class="set-row"><label>' + rotulo + '</label>' +
                '<input type="' + (tipo || "text") + '" value=""></div>');
    var inp = row.querySelector("input");
    inp.value = valor === null || valor === undefined ? "" : valor;
    host.appendChild(row);
    campos.push({ tipo: "input", el: row, input: inp, rotulo: rotulo });
    return inp;
  }

  function botao(host, rotulo, fn, classe) {
    var b = h('<div class="set-btn ' + (classe || "") + '">' + rotulo + "</div>");
    host.appendChild(b);
    campos.push({ tipo: "botao", el: b, acao: fn, rotulo: rotulo });
    return b;
  }

  function linha(host, k, v, classe) {
    host.appendChild(h('<div class="set-info ' + (classe || "") + '"><span>' + k +
                       "</span><b>" + (v === null || v === undefined ? "-" : v) + "</b></div>"));
  }

  function msg(texto, tipo) {
    var m = document.getElementById("set-msg");
    m.className = "set-msg " + (tipo || "");
    txt(m, texto);
  }

  /* ---------- render ---------- */
  function render() {
    build();
    campos = [];
    var srv = document.getElementById("set-server");
    var net = document.getElementById("set-net");
    var src = document.getElementById("set-sources");
    var nov = document.getElementById("set-new");
    var dia = document.getElementById("set-diag");
    srv.innerHTML = ""; net.innerHTML = ""; src.innerHTML = ""; nov.innerHTML = ""; dia.innerHTML = "";

    /* --- servidor --- */
    var inpBase = campoTexto(srv, "Endereco do backend", API.getBase());
    botao(srv, "Testar e salvar", function () {
      var v = inpBase.value.trim();
      if (v && v.indexOf("http") !== 0) { v = "http://" + v; }
      if (v && !/:\d+$/.test(v)) { v = v + ":8099"; }
      inpBase.value = v;
      API.setBase(v);
      msg("testando " + v + " ...", "wait");
      API.health(function (e, hh) {
        if (e) { msg("nao respondeu: " + e.message, "err"); return; }
        Store.pref("backend", v);
        estado.health = hh;
        msg("ok - " + hh.channels + " canais, " + hh.alive + " vivos", "ok");
        carregar();
      });
    }, "primary");

    /* --- rede --- */
    if (estado.config) {
      var inpUa = campoTexto(net, "User-Agent", estado.config.userAgent);
      var inpRef = campoTexto(net, "Referer", estado.config.referer);
      botao(net, "Salvar rede", function () {
        API.setConfig({ userAgent: inpUa.value.trim(), referer: inpRef.value.trim() },
          function (e) { msg(e ? ("erro: " + e.message) : "cabecalhos salvos", e ? "err" : "ok"); });
      });
    } else {
      linha(net, "carregando", "...");
    }

    /* --- fontes --- */
    if (!estado.sources.length) { linha(src, "nenhuma fonte", "-"); }
    estado.sources.forEach(function (s) {
      var row = h('<div class="set-src' + (s.active ? " is-active" : "") + '">' +
        '<div class="set-src-name">' + (s.active ? "&#9679; " : "") + s.name + "</div>" +
        '<div class="set-src-meta">' + s.type +
          (s.username ? (" &middot; " + s.username) : "") +
          (s.hasPassword ? " &middot; senha salva" : "") + "</div></div>");
      src.appendChild(row);
      campos.push({
        tipo: "botao", el: row, rotulo: s.name,
        acao: function () {
          if (s.active) { msg("ja e a fonte ativa", "wait"); return; }
          msg("ativando " + s.name + " ...", "wait");
          API.activateSource(s.id, function (e) {
            if (e) { msg("erro: " + e.message, "err"); return; }
            msg("ativada. o servidor esta recarregando os canais.", "ok");
            carregar();
          });
        }
      });
    });

    /* --- nova fonte (Xtream) --- */
    var inpNome = campoTexto(nov, "Nome", "");
    var inpHost = campoTexto(nov, "Host (ex: srv.com:8080)", "");
    var inpUser = campoTexto(nov, "Usuario", "");
    var inpPass = campoTexto(nov, "Senha", "", "password");

    botao(nov, "Testar credenciais", function () {
      var d = { type: "xtream", name: inpNome.value.trim() || inpHost.value.trim(),
                url: inpHost.value.trim(), username: inpUser.value.trim(),
                password: inpPass.value };
      if (!d.url || !d.username) { msg("preencha host e usuario", "err"); return; }
      msg("conectando ...", "wait");
      API.testSource(d, function (e, r) {
        if (e) { msg("erro: " + e.message, "err"); return; }
        if (!r.ok) { msg("recusado: " + (r.erro || r.status || "credenciais invalidas"), "err"); return; }
        msg("conta " + (r.status || "ativa") +
            " - " + r.maxConnections + " conexao(oes)" +
            (r.expiraEm ? (", expira " + r.expiraEm.slice(0, 10)) : "") +
            (r.teste ? " (teste)" : ""), "ok");
      });
    });

    botao(nov, "Adicionar fonte", function () {
      var d = { type: "xtream", name: inpNome.value.trim() || inpHost.value.trim(),
                url: inpHost.value.trim(), username: inpUser.value.trim(),
                password: inpPass.value };
      if (!d.url || !d.username) { msg("preencha host e usuario", "err"); return; }
      msg("salvando ...", "wait");
      API.addSource(d, function (e) {
        if (e) { msg("erro: " + e.message, "err"); return; }
        msg("fonte salva. selecione-a na lista para ativar.", "ok");
        inpNome.value = ""; inpHost.value = ""; inpUser.value = ""; inpPass.value = "";
        carregar();
      });
    }, "primary");

    /* --- diagnostico --- */
    var panel = Luna.panel();
    linha(dia, "TV", panel ? panel.model : "fora do webOS");
    linha(dia, "Painel", panel ? (panel.w + "x" + panel.h + " " + panel.type) : "-");
    linha(dia, "Chromium", (/Chrome\/(\d+)/.exec(navigator.userAgent) || [])[1] || "-");
    linha(dia, "DB8", Store.usingDb8() ? "ativo" : "indisponivel");
    if (estado.health) {
      linha(dia, "Fonte ativa", estado.health.source ? estado.health.source.name : "-");
      linha(dia, "Canais", estado.health.alive + " de " + estado.health.channels);
      linha(dia, "Categorias", estado.health.categories);
      if (estado.health.auth) {
        linha(dia, "Conta", estado.health.auth.status || "-");
        linha(dia, "Conexoes", estado.health.auth.maxConnections);
        linha(dia, "Expira", (estado.health.auth.expiraEm || "-").slice(0, 10));
      }
    }

    if (idx >= campos.length) { idx = 0; }
    foco();
  }

  function foco() {
    campos.forEach(function (c, i) {
      if (i === idx) { c.el.setAttribute("data-focused", "true"); }
      else { c.el.removeAttribute("data-focused"); }
    });
    var c = campos[idx];
    if (c && c.el.scrollIntoView) { c.el.scrollIntoView({ block: "nearest" }); }
  }

  /* ---------- dados ---------- */
  function carregar() {
    API.sources(function (e, list) { if (!e) { estado.sources = list || []; render(); } });
    API.getConfig(function (e, c) { if (!e) { estado.config = c; render(); } });
    API.health(function (e, hh) { if (!e) { estado.health = hh; render(); } });
  }

  /* ---------- teclas ---------- */
  function handleKey(k, ev) {
    if (!aberto) { return false; }

    /* dentro de um <input>: o teclado do sistema esta aberto */
    if (editando) {
      if (k === Keys.BACK || k === Keys.OK) {
        editando = false;
        var c = campos[idx];
        if (c && c.input) { c.input.blur(); }
        ev.preventDefault();
        return true;
      }
      return false;   /* deixa o teclado do sistema trabalhar */
    }

    if (k === Keys.UP) { idx = (idx - 1 + campos.length) % campos.length; foco(); ev.preventDefault(); return true; }
    if (k === Keys.DOWN) { idx = (idx + 1) % campos.length; foco(); ev.preventDefault(); return true; }
    if (k === Keys.OK) {
      var c = campos[idx];
      if (!c) { return true; }
      if (c.tipo === "input") { editando = true; c.input.focus(); }
      else if (c.acao) { c.acao(); }
      ev.preventDefault(); return true;
    }
    if (k === Keys.BACK || k === Keys.BLUE) { close(); ev.preventDefault(); return true; }
    return true;   /* engole o resto para nao vazar para a tela de tras */
  }

  function open(cb) {
    build();
    onClose = cb || null;
    aberto = true; editando = false; idx = 0;
    el.className = "settings";
    render();
    carregar();
    msg("", "");
  }

  function close() {
    aberto = false; editando = false;
    if (el) { el.className = "settings hidden"; }
    if (onClose) { onClose(); }
  }

  return { open: open, close: close, handleKey: handleKey,
           isOpen: function () { return aberto; } };
})();
window.Settings = Settings;
