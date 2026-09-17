/* Fachada do catalogo: IndexedDB primeiro; Luna e PC sao transportes opcionais. */
var Catalog = (function () {
  "use strict";
  var modo = "local", fonteAtiva = null, syncIntent = 0, cancelarDownload = false;
  var TTL = 6 * 3600 * 1000;
  function setModo(m) { modo = m === "servidor" ? "servidor" : "local"; Store.pref("modo", modo); }
  function getModo() { return modo; }
  function setFonte(f) { syncIntent++; fonteAtiva = f; }
  function getFonte() { return fonteAtiva; }
  function init(cb) {
    cb = cb || function () {};
    if (window.Diagnostics) { var completed = cb; cb = function (e) { Diagnostics.init(function (err) { if (err) { Log.warn("diagnostico","falha ao ler historico local",{why:String(err)}); } completed(e); }); }; }
    modo = Store.pref("modo") === "servidor" ? "servidor" : "local";
    DB.metaGet("activeSource", function (e, id) {
      if (e) { return cb(e); }
      if (id) { return DB.get("sources", id, function (err, src) { fonteAtiva = src; cb(err); }); }
      var legacy = null;
      try { legacy = JSON.parse(Store.pref("fonteLocal") || "null"); } catch (ignore) {}
      if (!legacy || !legacy.id) { return cb(null); }
      DB.saveSource(legacy, true, function (err) {
        if (!err) { fonteAtiva = legacy; Store.pref("fonteLocal", "null"); }
        cb(err);
      });
    });
  }
  function normalize(source) {
    var s = JSON.parse(JSON.stringify(source)), url = String(s.url || "").trim();
    if (url && !/^[a-z]+:\/\//i.test(url)) { url = "http://" + url; }
    if (!/^https?:\/\/[^\/\s?#]+/i.test(url)) { throw new Error("Informe uma URL HTTP ou HTTPS valida."); }
    if (["xtream", "m3u", "iptv-org"].indexOf(s.type) < 0) { throw new Error("Tipo de fonte invalido."); }
    if (s.type === "xtream" && (!s.username || !s.password)) { throw new Error("Informe usuario e senha."); }
    s.url = s.type === "xtream" ? url.replace(/\/+$/, "") : url;
    s.name = String(s.name || "Minha fonte").trim();
    s.headers = { userAgent: String((s.headers || {}).userAgent || "").trim(), referer: String((s.headers || {}).referer || "").trim() };
    if (/[\r\n]/.test(s.headers.userAgent + s.headers.referer)) { throw new Error("Cabecalho invalido."); }
    s.id = s.id || ("local-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9));
    return s;
  }
  function saveSource(source, cb) {
    var s;
    try { s = normalize(source); } catch (e) { return cb(e); }
    DB.get("sources", s.id, function (e, old) {
      if (e) { return cb(new Error(e)); }
      if (old && (old.url !== s.url || old.username !== s.username || old.type !== s.type || old.password !== s.password || JSON.stringify(old.headers || {}) !== JSON.stringify(s.headers || {}))) {
        s.id = "local-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
      }
      DB.saveSource(s, false, function (err) { cb(err ? new Error(err) : null, s); });
    });
  }
  function listSources(cb) { DB.sources(function (e, rows) { cb(e ? new Error(e) : null, rows); }); }
  function removeSource(id, cb) {
    if (fonteAtiva && fonteAtiva.id === id) { return cb(new Error("Ative outra fonte antes de remover esta.")); }
    /* Remover configuracao nao apaga catalogo/favoritos; limpeza e separada. */
    DB.del("sources", id, function (e) { cb(e ? new Error(e) : null); });
  }
  function testSource(source, cb) {
    var s;
    try { s = normalize(source); } catch (e) { return cb(e); }
    if (s.type !== "xtream") {
      return Luna.service("m3u", { url: s.url, sourceId: s.id, headers: s.headers, limit: 1, offset: 0 }, function (r, e) {
        cb(e ? new Error(e) : null, e ? null : { ok: true, channels: r.total, source: s });
      });
    }
    Luna.service("xtream", { acao: "auth", sourceId: s.id, url: s.url, username: s.username, password: s.password, headers: s.headers }, function (r, e) {
      var info = r && r.dados;
      if (e || !info || !info.ok) { return cb(new Error(e || "Conta recusada.")); }
      s.container = info.container; s.formats = info.formatos || [];
      cb(null, { ok: true, container: info.container, maxConnections: info.maxConnections, source: s });
    });
  }
  function origem(cb, candidate) {
    var s = candidate || fonteAtiva;
    cb(s && (s.type !== "xtream" || s.password) ? Sync.origemLuna : Sync.origemHttp);
  }
  /* Uma falha de Luna reinicia a operacao inteira pelo HTTP, nunca mistura
     paginas de snapshots diferentes. Sync mantem staging/rollback da P1. */
  function execute(source, method, args, cb) {
    origem(function (org) {
      function run(transport, done) { Sync[method].apply(Sync, [source, transport].concat(args, [done])); }
      function http(previous) {
        API.check(function (online) {
          if (!online) { return cb(previous || new Error("Servidor indisponivel e fonte sem credenciais locais.")); }
          run(Sync.origemHttp, function (e, r) { cb(e || null, r); });
        });
      }
      if (org === Sync.origemHttp) { return http(null); }
      run(org, function (e, r) { if (!e) { return cb(null, r); } http(e); });
    }, source);
  }
  function logoURL(item) {
    var original = item.logoOriginal || item.logo;
    /* Migra na leitura as URLs de proxy gravadas antes da P1. */
    if (original && /\/logo\?/.test(original)) {
      var m = /[?&]url=([^&]+)/.exec(original);
      if (m) { try { original = decodeURIComponent(m[1]); } catch (ignore) {} }
    }
    if (!original || !/^https?:\/\//i.test(original)) { return null; }
    return API.available() ? API.getBase() + "/logo?url=" + encodeURIComponent(original) + "&w=160" : original;
  }
  function categories(tipo, cb) {
    if (modo !== "local") { return API.categories({ type: tipo }, cb); }
    var s = fonteAtiva;
    if (!s) { return cb(new Error("Cadastre uma fonte nas configuracoes.")); }
    DB.categoriesOf(s.id, tipo, function (e, cats) {
      if (e) { return cb(new Error(e)); }
      var rows = cats.map(function (c) { return { id: tipo === "live" ? c.name : c.catId, name: c.name, count: c.count, carregada: !!c.carregadaEm }; });
      if (tipo !== "live") { return cb(null, rows); }
      DB.count("live", s.id, null, function (err, n) {
        if (err) { return cb(new Error(err)); }
        rows.unshift({ id: "__all__", name: "Todos", count: n }); cb(null, rows);
      });
    });
  }
  function channels(opt, cb) {
    if (modo !== "local") { return API.channels(opt, cb); }
    var s = fonteAtiva, tipo = opt.type || "live";
    if (!s) { return cb(new Error("Nenhuma fonte ativa.")); }
    function read(name, previous) {
      DB.query({ store: tipo, sourceId: s.id, category: name || opt.category || "__all__", q: opt.q || "", offset: opt.offset || 0, limit: opt.limit || 120 }, function (e, r) {
        if (e) { return cb(new Error(e)); }
        if (previous && !r.total) { return cb(new Error(String(previous))); }
        r.items.forEach(function (it) { it.logo = logoURL(it); if (it.playable === undefined) { it.playable = true; } }); cb(null, r);
      });
    }
    if (tipo === "live") { return read(); }
    if (!opt.category || opt.category === "__all__") { return cb(null, {total:0,offset:0,items:[]}); }
    DB.get("categories", s.id + "|" + tipo + "|" + opt.category, function (e, reg) {
      if (e) { return cb(new Error(e)); }
      var name = reg ? reg.name : opt.category;
      if (reg && reg.carregadaEm) {
        read(name);
        if (Date.now() - reg.carregadaEm >= TTL) { execute(s, "categoria", [tipo, opt.category, null], function (err) { if (err) { Log.warn("catalog", "cache preservado", {why:String(err)}); } }); }
        return;
      }
      execute(s, "categoria", [tipo, opt.category, null], function (err) { read(name, err); });
    });
  }
  /* Busca geral: varre as tres colecoes da fonte ativa no banco local.
     Nao pergunta ao provedor nem ao PC, entao responde com o computador
     desligado e enquanto o usuario ainda digita. O custo e a varredura
     do indice por fonte, que o proprio DB.query ja limita. */
  /* BUSCA.
     A primeira busca le do banco a lista [chave, nome] de cada colecao e
     guarda na memoria; da segunda em diante procurar e filtrar strings,
     sem tocar no IndexedDB. Foi isso que tirou a espera de cada letra
     digitada. Catalogo acima do teto nao e guardado: melhor pagar a
     varredura do que responder com meia lista.
     O indice cai fora em qualquer sincronizacao e na suspensao do app,
     porque ai ele estaria velho — ou ocupando memoria a toa. */
  var MAX_INDICE = 20000, MAX_RESULTADOS = 600;
  var indices = { fonte: null };
  function limparBusca() { indices = { fonte: null }; }

  function indiceDe(tipo, sourceId, cb) {
    if (indices.fonte === sourceId && indices[tipo]) { return cb(null, indices[tipo]); }
    DB.nameIndex(tipo, sourceId, MAX_INDICE, function (e, lista, truncado) {
      if (e) { return cb(e); }
      if (indices.fonte !== sourceId) { indices = { fonte: sourceId }; }
      var registro = { lista: lista, truncado: !!truncado };
      if (!truncado) { indices[tipo] = registro; }
      cb(null, registro);
    });
  }

  function preparar(tipo, itens) {
    itens.forEach(function (it) {
      if (!it.kind) { it.kind = tipo; }
      it.logo = logoURL(it);
      if (it.playable === undefined) { it.playable = true; }
    });
    return itens;
  }

  function buscar(termo, limite, cb) {
    var s = fonteAtiva;
    if (!s) { return cb(new Error("Sincronize uma fonte na TV para usar a busca.")); }
    var t = String(termo || "").toLowerCase();
    limite = limite || 24;
    var tipos = ["live", "vod", "series"], saida = {}, pendentes = tipos.length, falha = null;

    function pronto() {
      pendentes--;
      if (!pendentes) { cb(falha ? new Error(falha) : null, saida); }
    }

    tipos.forEach(function (tipo) {
      indiceDe(tipo, s.id, function (e, indice) {
        if (e) { falha = e; return pronto(); }
        var achados = [], i;
        for (i = 0; i < indice.lista.length; i++) {
          if (indice.lista[i].n.indexOf(t) >= 0) {
            achados.push(indice.lista[i]);
            if (achados.length >= MAX_RESULTADOS) { break; }
          }
        }
        DB.getMany(tipo, achados.slice(0, limite).map(function (m) { return m.k; }), function (erro, itens) {
          if (erro) { falha = erro; return pronto(); }
          saida[tipo] = { total: achados.length, offset: 0, items: preparar(tipo, itens),
                          truncated: achados.length >= MAX_RESULTADOS || indice.truncado };
          pronto();
        });
      });
    });
  }

  /* Monta o catalogo de filmes e series de uma vez.
     O Xtream aceita get_vod_streams / get_series SEM category_id: uma
     requisicao devolve a colecao inteira, com o category_id em cada item.
     Antes daqui saia uma requisicao POR CATEGORIA, em serie — dezenas
     delas, e era isso que fazia a primeira sincronizacao demorar tanto.
     Provedor que nao aceite a colecao inteira (ou resposta grande demais
     para esta TV) cai de volta no caminho antigo, categoria a categoria. */
  function baixarTudo(onProg, cb) {
    var s = fonteAtiva;
    if (!s) { return cb(new Error("Ative uma fonte antes de baixar o catalogo.")); }
    limparBusca();
    cancelarDownload = false;
    var intent = syncIntent, tipos = ["vod", "series"];
    var rotulos = { vod: "filmes", series: "series" };
    var falhas = 0, baixadas = 0, itens = 0;

    function progresso(tipo, parte, feito, total) {
      if (onProg) {
        onProg({ fase: rotulos[tipo], feito: feito || 0, total: total || 0,
                 parte: parte, partes: tipos.length });
      }
    }

    function porCategoria(tipo, parte, done) {
      DB.categoriesOf(s.id, tipo, function (e, cats) {
        if (e) { falhas++; return done(); }
        var fila = cats || [], i = 0;
        (function passo() {
          if (cancelarDownload || i >= fila.length) { return done(); }
          var c = fila[i++];
          progresso(tipo, parte, i, fila.length);
          if (c.carregadaEm && Date.now() - c.carregadaEm < TTL) { return passo(); }
          execute(s, "categoria", [tipo, c.catId, null], function (err) {
            if (err) { falhas++; Log.warn("catalog", "categoria fora do download completo", { cat: c.name, why: String(err) }); }
            else { itens += 0; }
            passo();
          });
        })();
      });
    }

    function concluir(cancelado) {
      DB.metaSet("catalogoCompleto:" + s.id,
        { em: Date.now(), itens: itens, falhas: falhas, cancelado: !!cancelado },
        function () {
          cb(null, { categorias: baixadas, baixadas: baixadas, itens: itens,
                     falhas: falhas, cancelado: !!cancelado });
        });
    }

    function correr(i) {
      if (intent !== syncIntent) { return cb(new Error("Outra sincronizacao assumiu o lugar desta.")); }
      if (cancelarDownload) { return concluir(true); }
      if (i >= tipos.length) { return concluir(false); }
      var tipo = tipos[i], t0 = Date.now();
      progresso(tipo, i, 0, 0);
      execute(s, "colecao", [tipo, function (feito, total) { progresso(tipo, i, feito, total); }],
        function (err, r) {
          if (!err) {
            baixadas++; itens += (r && r.total) || 0;
            Log.event("catalogo.colecao", { tipo: tipo, itens: r && r.total,
                                            categorias: r && r.categorias, ms: Date.now() - t0 });
            return correr(i + 1);
          }
          Log.warn("catalog", "colecao inteira falhou; caindo para categoria a categoria",
                   { tipo: tipo, why: String(err.message || err) });
          porCategoria(tipo, i, function () {
            baixadas++;
            Log.event("catalogo.categorias", { tipo: tipo, ms: Date.now() - t0 });
            correr(i + 1);
          });
        });
    }

    correr(0);
  }

  function cancelarBaixarTudo() { cancelarDownload = true; }

  /* Apaga tudo o que este app guardou na TV: catalogo, categorias, fontes,
     favoritos, progresso e preferencias. Usado pelo "recomecar do zero";
     nao toca em nada fora do app. */
  function apagarTudo(cb) {
    cancelarDownload = true;
    syncIntent++;
    fonteAtiva = null;
    limparBusca();
    try {
      var mortas = [], i, chave;
      for (i = 0; i < localStorage.length; i++) {
        chave = localStorage.key(i);
        if (chave && chave.indexOf("iptv.") === 0) { mortas.push(chave); }
      }
      mortas.forEach(function (k) { localStorage.removeItem(k); });
    } catch (ignore) {}
    DB.wipe(function (e) { cb(e ? new Error(e) : null); });
  }

  function catalogoCompleto(cb) {
    var s = fonteAtiva;
    if (!s) { return cb(null, null); }
    DB.metaGet("catalogoCompleto:" + s.id, function (e, v) { cb(e ? new Error(e) : null, v || null); });
  }

  function agrupar(eps) {
    var map = Object.create(null), order = [];
    eps.forEach(function (e) { if (!map[e.season]) { map[e.season] = []; order.push(e.season); } e.logo = logoURL(e); map[e.season].push(e); });
    order.sort(function (a,b) { return a-b; });
    return { seasons: order.map(function (n) { return { season:n, episodes:map[n] }; }), totalEpisodios:eps.length };
  }
  function seriesInfo(id, cb) {
    if (modo !== "local") { return API.seriesInfo(id, cb); }
    var s = fonteAtiva;
    if (!s) { return cb(new Error("Nenhuma fonte ativa.")); }
    DB.episodesOf(s.id, id, function (e, eps) {
      if (e) { return cb(new Error(e)); }
      if (eps.length) { return cb(null, agrupar(eps)); }
      execute(s, "serie", [id], function (err) {
        if (err) { return cb(new Error(String(err))); }
        DB.episodesOf(s.id, id, function (ee, list) { cb(ee ? new Error(ee) : null, ee ? null : agrupar(list)); });
      });
    });
  }
  function play(id, cb) {
    if (modo !== "local") { return API.play(id, cb); }
    var s = fonteAtiva, identity = DB.identity(id);
    if (!s || !identity || identity[0] !== s.id || ["live","vod","episodes"].indexOf(identity[1]) < 0) { return cb(new Error("Item fora da fonte ativa.")); }
    DB.get(identity[1], id, function (e, it) {
      if (e || !it || it.sourceId !== s.id) { return cb(new Error(e || "Item nao esta no catalogo local.")); }
      var headers = {}, k;
      for (k in (s.headers || {})) { if (s.headers[k]) { headers[k] = s.headers[k]; } }
      for (k in (it.headers || {})) { if (it.headers[k]) { headers[k] = it.headers[k]; } }
      var needs = !!(headers.referer || headers.userAgent), url = it.url;
      var hls = /\.m3u8(\?|$)/i.test(url), ts = /\.ts(\?|$)/i.test(url);
      var file = (it.kind === "vod" || it.kind === "episode") && !hls;
      var result = { id:it.id, name:it.name, direct:url, preferred:"native", fallback:null, proxied:null, needsHeaders:needs, canFallback:API.available };
      if (it.playable === false) { result.naoTocavel = true; result.preferred = null; result.note = "Formato nao habilitado para esta TV."; return cb(null,result); }
      function decide(online) {
        if (needs && !online) { result.preferred = null; result.naoTocavel = true; result.note = "Esta fonte exige cabecalhos de acesso ao video. Conecte o PC com o proxy para reproduzir."; return cb(null,result); }
        if (online) { result.proxied = API.getBase() + "/proxy?url=" + encodeURIComponent(url) + (headers.referer ? "&ref=" + encodeURIComponent(headers.referer) : "") + (headers.userAgent ? "&ua=" + encodeURIComponent(headers.userAgent) : ""); }
        if (needs) { result.note = "Reproducao depende do proxy do PC."; if (hls) { result.preferred = "hlsjs"; } else { result.nativeUrl = result.proxied; } }
        else if (!file && !ts && online) { result.fallback = "hlsjs"; }
        if (!file) { return cb(null, result); }
        result.maxRetry = 1; result.startupMs = 45000;
        function probed(info) { result.probe = info || null; if (info && info.ok && info.moovNoInicio === true) { result.startupMs = 25000; } cb(null,result); }
        Luna.service("probeFile", {url:url,perChannel:headers}, function (r, error) {
          if (!error && r && r.ok) { return probed(r); }
          if (!API.available()) { return probed(r); }
          API.probeFile(url, headers, function (err, info) { probed(err ? r : info); });
        },12000);
      }
      if (needs) { API.check(decide); }
      else {
        decide(API.available());
        /* Revalida para as proximas operacoes sem atrasar o caminho direto. */
        if (API.getBase()) { API.check(function () {}); }
      }
    });
  }
  function sincronizar(fonte, onProg, cb) {
    limparBusca();
    var s = JSON.parse(JSON.stringify(fonte)), intent = ++syncIntent;
    if (!s.password && fonteAtiva && fonteAtiva.id === s.id) { s.password = fonteAtiva.password; }
    function run() {
      execute(s,"fonte",[onProg],function (e,r) {
        if (e) { return cb(e,r); }
        if (r && r.container) { s.container = r.container; }
        DB.saveSource(s,intent === syncIntent,function (err) {
          if (!err && intent === syncIntent) { fonteAtiva = s; Store.pref("fonteLocal","null"); }
          cb(err || null,r);
        });
      });
    }
    if (s.type === "xtream" && !s.password) {
      return API.check(function (online) {
        if (!online) { return cb(new Error("Informe a senha da fonte na TV.")); }
        API.sourceSecret(s.id,function (e,sec) { if (!e && sec) { s.password = sec.password; s.username = sec.username || s.username; s.headers = sec.headers || s.headers; } run(); });
      });
    }
    run();
  }
  function activateSource(id, onProg, cb) {
    DB.get("sources",id,function(e,s) {
      if(e || !s){return cb(new Error(e || "Fonte nao encontrada."));}
      /* Cache valido pode ser ativado sem rede. */
      DB.metaGet("sync:"+id,function(err,meta) {
        if(err){return cb(new Error(err));}
        if(!meta){return sincronizar(s,onProg,function(error,r){if(!error){setModo("local");}cb(error,r);});}
        var intent=++syncIntent;
        DB.saveSource(s,true,function(error){if(!error && intent===syncIntent){fonteAtiva=s;setModo("local");}cb(error);});
      });
    });
  }
  function arrancar(cb,onProg) {
    var s=fonteAtiva;
    if(!s){return cb({pronto:false,motivo:"Aperte AZUL para cadastrar sua fonte diretamente na TV."});}
    DB.count("live",s.id,null,function(e,n){
      if(e){return cb({pronto:false,motivo:String(e)});}
      DB.metaGet("sync:"+s.id,function(err,meta){
        if(err){return cb({pronto:false,motivo:String(err)});}
        if(meta){
          cb({pronto:true,canais:n,doBanco:true});
          if(Date.now()-(meta.lastSuccess || meta.em || 0)>12*3600000){sincronizar(s,null,function(error){if(error){Log.warn("catalog","atualizacao falhou; cache preservado",{why:String(error)});}});}
          return;
        }
        sincronizar(s,onProg,function(error,r){cb(error?{pronto:false,motivo:String(error)}:{pronto:true,canais:r.live,doBanco:false});});
      });
    });
  }
  return {init:init,setModo:setModo,getModo:getModo,setFonte:setFonte,getFonte:getFonte,origem:origem,
    categories:categories,channels:channels,seriesInfo:seriesInfo,play:play,sincronizar:sincronizar,arrancar:arrancar,
    buscar:buscar,limparBusca:limparBusca,baixarTudo:baixarTudo,catalogoCompleto:catalogoCompleto,
    cancelarBaixarTudo:cancelarBaixarTudo,apagarTudo:apagarTudo,
    listSources:listSources,saveSource:saveSource,testSource:testSource,removeSource:removeSource,activateSource:activateSource,logoURL:logoURL};
})();
window.Catalog=Catalog;
