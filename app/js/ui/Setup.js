/*
 * Setup — o primeiro início: cadastrar a fonte e montar o catálogo.
 *
 * O desenho segue o que as duas referências já resolveram:
 *
 *   Hypnotix  escolhe o TIPO primeiro e só então mostra os campos daquele
 *             tipo (M3U URL / Xtream); autentica ANTES de aceitar o
 *             provedor (`if self.x.auth_data != {}`) e mostra o progresso
 *             como texto de fase — "baixando playlist", "conferindo",
 *             "carregando canais" — com o nome do provedor junto.
 *   nodecast  separa o "testar conexão" num passo explícito e avisa antes
 *             quando a lista é grande demais, sugerindo uma lista filtrada.
 *
 * O que muda aqui: numa TV não há mouse nem modal de alerta. Os passos
 * viram uma tela só, de cima para baixo, o teclado é o virtual do webOS e
 * a espera vira barra de progresso — porque a sincronização completa de um
 * provedor Xtream leva minutos, e uma tela parada nesse tempo parece um
 * app travado.
 */
var Setup = (function () {
  "use strict";

  var el = null, aberto = false, onClose = null, view = 0;
  var passo = "tipo", editando = false, campos = [], idx = 0;
  var draft = { type: "xtream", name: "", url: "", username: "", password: "" };
  var completo = true, aviso = "", avisoTipo = "";
  var info = null, resumo = null;
  var progresso = { pct: 0, fase: "", detalhe: "" };

  function txt(node, valor) {
    node.innerHTML = "";
    node.appendChild(document.createTextNode(valor === null || valor === undefined ? "" : String(valor)));
  }

  function build() {
    if (el) { return; }
    el = document.createElement("div");
    el.id = "setup";
    el.className = "setup hidden";
    el.innerHTML = '<div class="setup-box"><div class="setup-head">' +
      '<div class="setup-logo">&#9654;</div>' +
      '<div><div class="setup-title" id="setup-title"></div>' +
      '<div class="setup-sub" id="setup-sub"></div></div></div>' +
      '<div class="setup-body" id="setup-body"></div>' +
      '<div class="setup-msg" id="setup-msg"></div>' +
      '<div class="setup-hint" id="setup-hint"></div></div>';
    document.body.appendChild(el);
  }

  function linha(host, rotulo, chave, tipo) {
    var row = document.createElement("div");
    row.className = "setup-row";
    var l = document.createElement("label");
    txt(l, rotulo);
    var input = document.createElement("input");
    input.type = tipo || "text";
    input.value = draft[chave] || "";
    input.id = "setup-campo-" + chave;
    input.autocomplete = "off";
    l.setAttribute("for", input.id);
    row.appendChild(l); row.appendChild(input); host.appendChild(row);
    var c = { tipo: "input", el: row, input: input, key: chave };
    campos.push(c);
    input.oninput = function () { draft[chave] = input.value; };
    input.onfocus = function () { idx = campos.indexOf(c); editando = true; };
    input.onblur = function () { draft[chave] = input.value; editando = false; };
    return input;
  }

  function botao(host, rotulo, chave, acao, primario) {
    var b = document.createElement("div");
    b.className = "setup-btn" + (primario ? " setup-btn--primary" : "");
    b.setAttribute("role", "button");
    txt(b, rotulo);
    host.appendChild(b);
    var acionar = function () {
      campos.forEach(function (c) { if (c.input) { draft[c.key] = c.input.value; } });
      acao();
    };
    campos.push({ tipo: "botao", el: b, key: chave, acao: acionar });
    b.onclick = acionar;
    return b;
  }

  function texto(host, valor, classe) {
    var d = document.createElement("div");
    d.className = classe || "setup-text";
    txt(d, valor);
    host.appendChild(d);
    return d;
  }

  function msg(valor, tipo) { aviso = valor || ""; avisoTipo = tipo || ""; }

  function barra(host) {
    var caixa = document.createElement("div");
    caixa.className = "setup-bar";
    var preenchido = document.createElement("i");
    preenchido.style.width = Math.max(0, Math.min(100, progresso.pct)) + "%";
    caixa.appendChild(preenchido);
    host.appendChild(caixa);
    var fase = document.createElement("div");
    fase.className = "setup-phase";
    txt(fase, progresso.fase + (progresso.detalhe ? ("   " + progresso.detalhe) : ""));
    host.appendChild(fase);
  }

  function render() {
    if (!aberto) { return; }
    build();
    var foco = campos[idx] && campos[idx].key;
    campos = [];
    var corpo = document.getElementById("setup-body");
    corpo.innerHTML = "";

    if (passo === "tipo") {
      txt(document.getElementById("setup-title"), "Bem-vindo");
      txt(document.getElementById("setup-sub"), "Escolha como sua lista chega nesta TV.");
      botao(corpo, "Tenho usuario e senha (Xtream)", "t-xtream", function () {
        draft.type = "xtream"; passo = "dados"; idx = 0; msg(""); render();
      }, true);
      botao(corpo, "Tenho o link de uma lista M3U", "t-m3u", function () {
        draft.type = "m3u"; passo = "dados"; idx = 0; msg(""); render();
      });
      texto(corpo, "O video vai do seu provedor direto para a TV. " +
                   "Nada e enviado para outro lugar e nenhuma lista vem embutida no app.");
    } else if (passo === "dados") {
      var xtream = draft.type === "xtream";
      txt(document.getElementById("setup-title"), xtream ? "Dados do provedor" : "Link da lista");
      txt(document.getElementById("setup-sub"), "OK abre o teclado da TV. VOLTAR sai do campo.");
      linha(corpo, "Nome (como voce quer ver aqui)", "name");
      linha(corpo, xtream ? "Endereco do servidor (http://servidor:porta)" : "URL da lista M3U", "url");
      if (xtream) {
        linha(corpo, "Usuario", "username");
        linha(corpo, "Senha", "password", "password");
      }
      botao(corpo, completo ? "Baixar tudo agora: SIM" : "Baixar tudo agora: NAO", "completo", function () {
        completo = !completo; render();
      });
      texto(corpo, completo
        ? "Filmes e series virao inteiros agora. Demora mais no comeco e depois trocar de categoria e instantaneo."
        : "So a TV ao vivo vem agora. Cada categoria de filmes e series sera baixada quando voce abrir.");
      botao(corpo, "Conectar e sincronizar", "conectar", conferir, true);
      botao(corpo, "Voltar", "voltar", function () { passo = "tipo"; idx = 0; msg(""); render(); });
    } else if (passo === "conferindo") {
      txt(document.getElementById("setup-title"), "Conferindo o acesso");
      txt(document.getElementById("setup-sub"), draft.name || draft.url);
      texto(corpo, "Falando com o provedor pela propria TV...", "setup-text setup-text--wait");
      progresso = { pct: 3, fase: "autenticando", detalhe: "" };
      barra(corpo);
    } else if (passo === "sync") {
      txt(document.getElementById("setup-title"), "Montando o catalogo");
      txt(document.getElementById("setup-sub"), draft.name || draft.url);
      if (info && info.container) {
        texto(corpo, "Conta aceita. Formato negociado: " + String(info.container).toUpperCase() +
                     (info.maxConnections ? ("  ·  " + info.maxConnections + " conexoes") : ""));
      }
      barra(corpo);
      if (completo && progresso.pct >= 35) {
        botao(corpo, "Comecar a assistir agora (para de baixar o resto)", "pular", function () {
          if (Catalog.cancelarBaixarTudo) { Catalog.cancelarBaixarTudo(); }
          msg("Interrompendo o download. O que ja baixou fica guardado.", "wait");
          render();
        });
      }
    } else if (passo === "pronto") {
      txt(document.getElementById("setup-title"), "Tudo pronto");
      txt(document.getElementById("setup-sub"), draft.name || draft.url);
      if (resumo) {
        texto(corpo, resumo.live + " canais  ·  " + resumo.vod + " filmes  ·  " + resumo.series + " series",
              "setup-text setup-text--big");
      }
      texto(corpo, "Voce pode trocar a fonte, atualizar o catalogo ou apagar tudo a qualquer momento " +
                   "pela tecla AZUL.");
      /* Opcional e no fim de proposito: quem so quer assistir passa direto.
         O endereco do PC nao serve para tocar video — serve para o app
         mandar o diagnostico para `node server.js` quando ha um bug a
         investigar. */
      if (draft.backend === undefined) { draft.backend = API.getBase() || ""; }
      linha(corpo, "Endereco do PC para diagnostico (opcional)", "backend");
      botao(corpo, "Salvar endereco do PC", "salvar-pc", salvarBackend);
      botao(corpo, "Comecar a assistir", "fim", function () { close(); }, true);
    }

    var caixa = document.getElementById("setup-msg");
    caixa.className = "setup-msg " + avisoTipo;
    txt(caixa, aviso);
    txt(document.getElementById("setup-hint"),
      passo === "sync" || passo === "conferindo"
        ? "Pode demorar alguns minutos na primeira vez."
        : "Cima e baixo movem  ·  OK escolhe  ·  VOLTAR retorna");

    if (foco) { campos.some(function (c, i) { if (c.key === foco) { idx = i; return true; } return false; }); }
    if (idx >= campos.length) { idx = Math.max(0, campos.length - 1); }
    pintar();
  }

  function pintar() {
    campos.forEach(function (c, i) {
      if (i === idx) { c.el.setAttribute("data-focused", "true"); }
      else { c.el.removeAttribute("data-focused"); }
    });
    var c = campos[idx];
    if (c && c.el.scrollIntoView) { c.el.scrollIntoView({ block: "nearest" }); }
  }

  function salvarBackend() {
    var valor = String(draft.backend || "").trim();
    if (valor && !/^[a-z]+:\/\//i.test(valor)) { valor = "http://" + valor; }
    if (valor) {
      try {
        var alvo = new URL(valor);
        if (alvo.protocol !== "http:" && alvo.protocol !== "https:") { throw new Error("URL"); }
        if (!alvo.port) { alvo.port = "8099"; }
        valor = alvo.origin;
      } catch (e) { msg("Endereco do PC invalido.", "err"); return render(); }
    }
    API.setBase(valor);
    Store.pref("backend", valor);
    draft.backend = valor;
    if (!valor) { msg("Diagnostico so na TV (tecla AMARELA).", "ok"); return render(); }
    msg("Testando " + valor + "...", "wait"); render();
    var token = view;
    API.check(function (ok) {
      if (token !== view) { return; }
      msg(ok ? ("PC respondendo em " + valor + ". O diagnostico sera enviado para la.")
             : "PC nao respondeu; o endereco ficou salvo assim mesmo.", ok ? "ok" : "wait");
      render();
    }, true);
  }

  function fonte() {
    return { type: draft.type, name: draft.name || "Minha fonte", url: draft.url,
             username: draft.username, password: draft.password, headers: {} };
  }

  /* Hypnotix so aceita o provedor depois que a autenticacao responde; o
     mesmo aqui: sem conta confirmada nao gravamos nada no banco. */
  function conferir() {
    if (!String(draft.url || "").trim()) { msg("Informe o endereco.", "err"); return render(); }
    if (draft.type === "xtream" && (!draft.username || !draft.password)) {
      msg("Informe usuario e senha.", "err"); return render();
    }
    var token = ++view;
    passo = "conferindo"; msg(""); idx = 0; render();
    Catalog.testSource(fonte(), function (err, r) {
      if (token !== view) { return; }
      if (err) {
        passo = "dados";
        msg(String(err.message || err), "err");
        Log.warn("setup", "acesso recusado", { why: String(err.message || err) });
        return render();
      }
      info = r;
      Catalog.saveSource(r.source, function (erro2, salva) {
        if (token !== view) { return; }
        if (erro2) { passo = "dados"; msg(String(erro2.message || erro2), "err"); return render(); }
        sincronizar(salva, token);
      });
    });
  }

  function sincronizar(s, token) {
    passo = "sync";
    progresso = { pct: 4, fase: "preparando", detalhe: "" };
    msg(""); idx = 0; render();
    Catalog.setModo("local");
    Catalog.sincronizar(s, function (p) {
      if (token !== view) { return; }
      /* A sincronizacao da fonte ocupa a primeira faixa da barra; o resto
         fica para o download das categorias de filmes e series. */
      var pct = 5;
      if (p && p.total) { pct = 5 + Math.round(30 * (p.feito / p.total)); }
      progresso = { pct: pct, fase: p ? p.fase : "sincronizando",
                    detalhe: p && p.total ? (p.feito + "/" + p.total) : "" };
      render();
    }, function (err, relato) {
      if (token !== view) { return; }
      if (err) {
        passo = "dados";
        msg("Nao foi possivel sincronizar: " + String(err.message || err), "err");
        return render();
      }
      Log.event("setup.sync", { live: relato && relato.live });
      if (!completo) { return terminar(token); }
      progresso = { pct: 35, fase: "filmes e series", detalhe: "" };
      render();
      Catalog.baixarTudo(function (p) {
        if (token !== view) { return; }
        /* o download vem em partes (filmes, series); dentro de cada uma o
           progresso e por item, entao a barra anda de verdade */
        var fracao = p.total ? (p.feito / p.total) : 0;
        var posicao = p.partes ? ((p.parte + fracao) / p.partes) : fracao;
        progresso = { pct: 35 + Math.round(65 * posicao), fase: p.fase,
                      detalhe: p.total ? (p.feito + "/" + p.total) : "" };
        render();
      }, function (erro2, r) {
        if (token !== view) { return; }
        if (erro2) { msg("Catalogo parcial: " + String(erro2.message || erro2), "wait"); }
        else if (r && r.cancelado) { msg("Download interrompido; o que ja veio ficou guardado.", "wait"); }
        else if (r && r.falhas) { msg(r.falhas + " categorias ficaram para depois.", "wait"); }
        terminar(token);
      });
    });
  }

  function terminar(token) {
    progresso = { pct: 100, fase: "pronto", detalhe: "" };
    var s = Catalog.getFonte();
    if (!s) { passo = "pronto"; return render(); }
    DB.resumo(s.id, function (err, r) {
      if (token !== view) { return; }
      resumo = err ? null : r;
      passo = "pronto"; idx = 0; render();
    });
  }

  function open(cb) {
    build();
    aberto = true; view++;
    onClose = cb;
    passo = "tipo"; idx = 0; editando = false;
    draft = { type: "xtream", name: "", url: "", username: "", password: "" };
    info = null; resumo = null; completo = true; msg("");
    el.className = "setup";
    render();
    Log.info("setup", "primeiro inicio: sem fonte cadastrada");
  }

  function close() {
    aberto = false; view++; editando = false;
    if (el) { el.className = "setup hidden"; }
    if (onClose) { onClose(); }
  }

  function handleKey(k, ev) {
    if (!aberto) { return false; }
    if (editando) {
      if (k === Keys.BACK || k === Keys.OK) {
        var atual = campos[idx];
        editando = false;
        if (atual && atual.input) { atual.input.blur(); }
        ev.preventDefault(); return true;
      }
      return false;   /* o teclado da TV fica com o resto */
    }
    if (k === Keys.UP || k === Keys.DOWN) {
      if (campos.length) { idx = (idx + (k === Keys.UP ? -1 : 1) + campos.length) % campos.length; pintar(); }
      ev.preventDefault(); return true;
    }
    if (k === Keys.OK) {
      var alvo = campos[idx];
      if (alvo) {
        if (alvo.input) { editando = true; alvo.input.focus(); }
        else { alvo.acao(); }
      }
      ev.preventDefault(); return true;
    }
    if (k === Keys.BACK) {
      if (passo === "dados") { passo = "tipo"; idx = 0; msg(""); render(); }
      else if (passo === "pronto") { close(); }
      ev.preventDefault(); return true;
    }
    ev.preventDefault(); return true;
  }

  return {
    open: open, close: close, handleKey: handleKey,
    isOpen: function () { return aberto; },
    step: function () { return passo; },
    focused: function () { return campos[idx] ? campos[idx].key : null; },
    progress: function () { return progresso; }
  };
})();
window.Setup = Setup;
