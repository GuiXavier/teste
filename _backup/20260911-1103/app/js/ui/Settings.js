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
  var estado = { sources: [], config: null, health: null, resumo: null, ultimaSync: null };

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

    /* --- catalogo local (IndexedDB) --- */
    var modoAtual = Catalog.getModo();
    botao(dia, "Modo: " + (modoAtual === "local" ? "LOCAL (sem PC)" : "SERVIDOR (PC)") + " - trocar", function () {
      var novo = (Catalog.getModo() === "local") ? "servidor" : "local";
      if (novo === "local" && !Catalog.getFonte()) {
        msg("sincronize o catalogo primeiro", "err"); return;
      }
      Catalog.setModo(novo);
      Log.info("ui", "modo alterado", { modo: novo });
      Log.stat("modo", novo);
      msg("modo " + novo.toUpperCase() + ". Feche a configuracao para recarregar a lista.", "ok");
      render();
    });

    botao(dia, "Sincronizar catalogo para a TV", function () {
      /* usa a fonte ATIVA do servidor como referencia; no modo local
         futuro, a fonte vem da lista de fontes daqui mesmo */
      var ativa = null;
      estado.sources.forEach(function (x) { if (x.active) { ativa = x; } });
      if (!ativa) { msg("nenhuma fonte ativa", "err"); return; }
      var fonte = { id: ativa.id, type: ativa.type, name: ativa.name, url: ativa.url,
                    username: ativa.username || null,
                    password: (inpPass && inpPass.value) || null };
      var t0 = Date.now();
      msg("sincronizando " + fonte.name + " ...", "wait");
      Log.info("sync", "iniciando", { fonte: fonte.id });
      Catalog.sincronizar(fonte, function (p) {
        msg(p.fase + (p.total ? ("  " + p.feito + "/" + p.total) : ""), "wait");
      }, function (e, r) {
        if (e) {
          msg("falhou: " + e, "err");
          Log.error("sync", "falhou", { why: String(e) });
          return;
        }
        Log.event("sync.concluida", { fonte: r.fonte, origem: r.origem, live: r.live,
                                      podados: r.podados, vodCats: r.vodCats,
                                      seriesCats: r.seriesCats, ms: Date.now() - t0,
                                      erros: r.erros });
        msg("pronto via " + r.origem + ": " + r.live + " canais, " + r.vodCats + " cats de filme, " +
            r.seriesCats + " de serie, em " + Math.round((Date.now() - t0) / 1000) + "s" +
            (r.podados ? (", " + r.podados + " removidos") : "") +
            (r.erros.length ? ("  AVISOS: " + r.erros.join("; ")) : ""), r.erros.length ? "wait" : "ok");
        render();
      });
    }, "primary");

    /* --- diagnostico --- */
    botao(dia, "Testar servico embutido", function () {
      msg("chamando o JS Service ...", "wait");
      var t0 = Date.now();
      Luna.service("ping", {}, function (r, e) {
        if (e) {
          msg("servico NAO respondeu: " + e, "err");
          Log.error("jsservice", "ping falhou", { why: e });
          return;
        }
        var t1 = Date.now();
        Log.event("jsservice.ping", { node: r.node, rssMB: r.rssMB, ms: t1 - t0 });
        msg("servico OK: Node " + r.node + ", " + r.rssMB + " MB, " + (t1 - t0) + "ms. Testando rede...", "wait");
        /* segunda etapa: a TV consegue buscar de fora SEM CORS? */
        Luna.service("fetch", { url: "https://iptv-org.github.io/iptv/countries/br.m3u",
                                maxBytes: 200000, timeoutMs: 30000 }, function (r2, e2) {
          if (e2) {
            msg("servico sobe, mas fetch falhou: " + e2, "err");
            Log.error("jsservice", "fetch falhou", { why: e2 });
            return;
          }
          Log.event("jsservice.fetch", { status: r2.status, bytes: r2.bytes, ms: r2.ms });
          msg("TUDO OK: Node " + r.node + " | fetch HTTP " + r2.status + ", " +
              Math.round(r2.bytes / 1024) + " KB em " + r2.ms + "ms — a TV busca sozinha", "ok");
        });
      });
    }, "primary");

    var panel = Luna.panel();
    linha(dia, "TV", panel ? panel.model : "fora do webOS");
    linha(dia, "Painel", panel ? (panel.w + "x" + panel.h + " " + panel.type) : "-");
    linha(dia, "Chromium", (/Chrome\/(\d+)/.exec(navigator.userAgent) || [])[1] || "-");
    linha(dia, "DB8", Store.usingDb8() ? "ativo" : "indisponivel");
    linha(dia, "Modo", Catalog.getModo());
    var fl = Catalog.getFonte();
    linha(dia, "Fonte local", fl ? fl.name : "-");
    if (fl && estado.resumo) {
      linha(dia, "Canais locais", estado.resumo.live);
      linha(dia, "Filmes locais", estado.resumo.vod);
      linha(dia, "Series locais", estado.resumo.series);
      linha(dia, "Episodios locais", estado.resumo.episodes);
    }
    if (estado.ultimaSync) {
      linha(dia, "Ultima sinc.", new Date(estado.ultimaSync.em).toLocaleString());
    }
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
    var fl = Catalog.getFonte();
    if (fl) {
      DB.resumo(fl.id, function (e, r) { if (!e) { estado.resumo = r; render(); } });
      DB.metaGet("sync:" + fl.id, function (e, m) { if (!e && m) { estado.ultimaSync = m; render(); } });
    }
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
