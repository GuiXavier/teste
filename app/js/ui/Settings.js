/* Configuracao local. Campos mantidos entre atualizacoes assincronas. */
var Settings = (function () {
  "use strict";
  var el, aberto=false, campos=[],idx=0,editando=false,onClose=null,view=0,pendingRender=false;
  var estado={sources:[],health:null,resumo:null},draft={type:"xtream"},editorId=null;
  var editRevision=0, refreshRevision=0;
  function text(node,value){node.textContent=value===null||value===undefined?"-":String(value);}
  function build(){
    if(el){return;}
    el=document.createElement("div");el.id="settings";el.className="settings hidden";
    el.innerHTML='<div class="set-head"><div class="set-title">Configuracao</div><div class="set-hint">Cima/Baixo mover · OK editar · VOLTAR sair</div></div><div class="set-body"><div class="set-col"><h3>Fontes na TV</h3><div id="set-sources"></div></div><div class="set-col"><h3>Cadastro da fonte</h3><div id="set-new"></div></div><div class="set-col"><h3>PC opcional</h3><div id="set-server"></div><h3>Estado</h3><div id="set-diag"></div><div id="set-msg" class="set-msg"></div></div></div>';
    document.body.appendChild(el);
  }
  function msg(value,type){if(!aberto){return;}var node=document.getElementById("set-msg");node.className="set-msg "+(type||"");text(node,value);}
  function field(host,label,key,type){
    var row=document.createElement("div");row.className="set-row";
    var l=document.createElement("label");text(l,label);var input=document.createElement("input");input.type=type||"text";input.value=draft[key]||"";
    input.id="set-field-"+key;l.setAttribute("for",input.id);
    row.appendChild(l);row.appendChild(input);host.appendChild(row);
    var c={tipo:"input",el:row,input:input,key:key};campos.push(c);
    input.oninput=function(){draft[key]=input.value;editRevision++;};
    input.onfocus=function(){idx=campos.indexOf(c);editando=true;};
    input.onblur=function(){draft[key]=input.value;editando=false;if(pendingRender){pendingRender=false;render();}};
    return input;
  }
  function button(host,label,key,fn){
    var node=document.createElement("div");node.className="set-btn";node.setAttribute("role","button");text(node,label);host.appendChild(node);
    var action=function(){campos.forEach(function(c){if(c.input){draft[c.key]=c.input.value;}});fn();};
    campos.push({tipo:"botao",el:node,key:key,acao:action});node.onclick=action;return node;
  }
  function line(host,label,value){var node=document.createElement("div");node.className="set-info";var a=document.createElement("span"),b=document.createElement("b");text(a,label);text(b,value);node.appendChild(a);node.appendChild(b);host.appendChild(node);}
  function fonte(){return{id:editorId,type:draft.type||"xtream",name:draft.name,url:draft.url,username:draft.username,password:draft.password,container:draft.container,headers:{userAgent:draft.userAgent,referer:draft.referer}};}
  function progress(p){msg(p.fase+(p.total?" "+p.feito+"/"+p.total:""),"wait");}
  function refresh(){
    var token=view, revision=++refreshRevision;
    Catalog.listSources(function(e,list){if(!aberto||token!==view||revision!==refreshRevision){return;}if(e){return msg(String(e),"err");}estado.sources=list;requestRender();});
    var source=Catalog.getFonte();
    estado.resumo=null;
    if(source){DB.resumo(source.id,function(e,r){if(!aberto||token!==view||revision!==refreshRevision){return;}if(!e){estado.resumo=r;requestRender();}});}
  }
  function requestRender(){if(editando){pendingRender=true;}else{render();}}
  function render(reset){
    if(!aberto){return;}build();
    var focus=campos[idx]&&campos[idx].key;
    if(!reset){campos.forEach(function(c){if(c.input){draft[c.key]=c.input.value;}});}
    campos=[];
    var sources=document.getElementById("set-sources"),form=document.getElementById("set-new"),pc=document.getElementById("set-server"),diag=document.getElementById("set-diag");
    [sources,form,pc,diag].forEach(function(n){n.innerHTML="";});
    var active=Catalog.getFonte();
    if(!estado.sources.length){line(sources,"Nenhuma fonte","Preencha o cadastro ao lado.");}
    estado.sources.forEach(function(s){
      line(sources,s.name,(active&&active.id===s.id?"Ativa · ":"")+s.type);
      button(sources,"Usar "+s.name,"activate:"+s.id,function(){
        msg("Abrindo fonte na TV...","wait");var token=view;
        Catalog.activateSource(s.id,progress,function(e){if(token!==view){return;}msg(e?String(e):"Fonte ativa. Feche a configuracao para assistir.",e?"err":"ok");refresh();});
      });
      button(sources,"Editar "+s.name,"edit:"+s.id,function(){
        editRevision++;
        editorId=s.id;draft={type:s.type,name:s.name,url:s.url,username:s.username||"",password:s.password||"",container:s.container,userAgent:(s.headers||{}).userAgent||"",referer:(s.headers||{}).referer||"",backend:draft.backend};
        render(true);
      });
      button(sources,"Remover cadastro de "+s.name,"remove:"+s.id,function(){Catalog.removeSource(s.id,function(e){msg(e?String(e):"Cadastro removido; cache preservado.",e?"err":"ok");refresh();});});
    });
    button(form,"Tipo: "+(draft.type==="xtream"?"Xtream":"Playlist M3U")+" · trocar","type",function(){editRevision++;draft.type=draft.type==="xtream"?"m3u":"xtream";render();});
    field(form,"Nome","name");field(form,draft.type==="xtream"?"Endereco do provedor":"URL da playlist","url");
    if(draft.type==="xtream"){field(form,"Usuario","username");field(form,"Senha","password","password");}
    field(form,"User-Agent da fonte (opcional)","userAgent");field(form,"Referer da fonte (opcional)","referer");
    line(form,"Acesso ao video","Cabecalhos personalizados exigem proxy do PC.");
    button(form,"Testar pela TV","test",function(){
      msg("Testando acesso pela TV...","wait");var token=view, revision=editRevision;
      Catalog.testSource(fonte(),function(e,r){if(token!==view||revision!==editRevision){return;}if(!e){draft.container=r.container;}msg(e?String(e):"Acesso confirmado"+(r.container?" · formato "+r.container:" · "+r.channels+" canais"),e?"err":"ok");});
    });
    button(form,"Salvar fonte na TV","save",function(){
      msg("Salvando...","wait");var token=view, revision=editRevision;
      Catalog.saveSource(fonte(),function(e,s){if(token!==view){return;}if(!e&&revision===editRevision){editorId=s.id;}msg(e?String(e):"Fonte salva. Use-a na lista ou sincronize.",e?"err":"ok");refresh();});
    });
    button(form,"Salvar e sincronizar esta fonte","sync-editor",function(){
      var token=view, revision=editRevision;msg("Salvando e sincronizando...","wait");
      Catalog.saveSource(fonte(),function(e,s){if(e){return msg(String(e),"err");}if(token===view&&revision===editRevision){editorId=s.id;}
        Catalog.sincronizar(s,progress,function(error,r){if(!error){Catalog.setModo("local");}if(token!==view){return;}msg(error?String(error):"Pronto na TV: "+r.live+" canais.",error?"err":"ok");refresh();});
      });
    });
    button(form,"Novo cadastro","new",function(){editRevision++;editorId=null;draft={type:"xtream",backend:draft.backend};render(true);});
    if(draft.backend===undefined){draft.backend=API.getBase();}
    field(pc,"Endereco do servidor (opcional)","backend");
    button(pc,"Salvar endereco e testar","pc-test",function(){
      var value=String(draft.backend||"").trim();
      if(value&&!/^[a-z]+:\/\//i.test(value)){value="http://"+value;}
      if(value){try{var parsed=new URL(value);if(parsed.protocol!=="http:"&&parsed.protocol!=="https:"){throw new Error("URL");}if(!parsed.port){parsed.port="8099";}value=parsed.origin;}catch(e){return msg("Endereco do servidor invalido.","err");}}
      API.setBase(value);Store.pref("backend",value);draft.backend=value;
      if(!value){return msg("PC desativado. O catalogo local continua disponivel.","ok");}
      msg("Testando PC...","wait");var token=view;
      API.check(function(ok,h){if(token!==view){return;}estado.health=h;msg(ok?"PC disponivel.":"PC indisponivel; dados locais preservados.",ok?"ok":"wait");requestRender();},true);
    });
    button(pc,"Importar cadastros do PC","import",function(){
      var token=view;API.check(function(online){
        if(!online){return msg("PC indisponivel.","err");}
        API.sources(function(e,list){
          if(e){return msg(String(e),"err");}
          var i=0;
          function next(){
            if(i>=list.length){if(token===view){msg("Cadastros importados. Selecione uma fonte para usar.","ok");refresh();}return;}
            var s=list[i++];API.sourceSecret(s.id,function(error,secret){
              if(error){return msg(String(error),"err");}
              s.password=secret.password;s.headers=secret.headers;
              Catalog.saveSource(s,function(err){if(err){msg(String(err),"err");}else{next();}});
            });
          }next();
        });
      });
    });
    button(diag,"Modo: "+Catalog.getModo()+" · trocar","mode",function(){Catalog.setModo(Catalog.getModo()==="local"?"servidor":"local");render();});
    button(diag,API.simularOffline()?"Desligar simulacao sem PC":"Simular PC desligado","offline",function(){API.simularOffline(!API.simularOffline());render();});
    button(diag,"Enviar diagnostico ao PC agora","flush-log",function(){
      if(!API.getBase()){return msg("Configure o endereco do servidor acima para receber o diagnostico.","err");}
      if(Log.persist){Log.persist();}
      Log.flush();msg("Diagnostico enviado para "+API.getBase()+"/api/log.","ok");
    });
    button(diag,"Assistente de configuracao","wizard",function(){
      if(!window.Setup){return msg("Assistente indisponivel.","err");}
      close();Setup.open(function(){location.reload();});
    });
    button(diag,"Apagar tudo e recomecar do zero","wipe",function(){
      if(draft.wipeConfirm!==true){draft.wipeConfirm=true;
        return msg("Isso apaga catalogo, fontes, favoritos e progresso desta TV. Acione de novo para confirmar.","err");}
      draft.wipeConfirm=false;msg("Apagando os dados do app...","wait");
      Catalog.apagarTudo(function(e){if(e){return msg(String(e.message||e),"err");}location.reload();});
    });
    button(diag,"Baixar catalogo completo (demorado)","full-download",function(){
      var s=Catalog.getFonte();if(!s){return msg("Selecione uma fonte.","err");}
      var token=view;msg("Baixando todas as categorias de filmes e series...","wait");
      Catalog.baixarTudo(function(p){if(token===view){msg("Baixando "+p.fase+" ("+(p.feito+1)+"/"+p.total+")","wait");}},function(e,r){
        if(token!==view){return;}
        msg(e?String(e):("Catalogo local completo: "+r.baixadas+" categorias baixadas, "+r.falhas+" com falha."),e?"err":"ok");
        refresh();
      });
    });
    button(diag,"Atualizar catalogo ativo","sync-active",function(){
      var s=Catalog.getFonte();if(!s){return msg("Selecione uma fonte.","err");}
      Catalog.sincronizar(s,progress,function(e,r){msg(e?String(e):"Atualizado: "+r.live+" canais.",e?"err":"ok");refresh();});
    });
    line(diag,"Fonte ativa",active?active.name:"Nenhuma");line(diag,"PC",API.available()?"Disponivel":"Nao confirmado / indisponivel");
    if(estado.resumo){line(diag,"Canais / Filmes / Series",estado.resumo.live+" / "+estado.resumo.vod+" / "+estado.resumo.series);}
    idx=0;campos.some(function(c,i){if(c.key===focus){idx=i;return true;}return false;});foco();
  }
  function foco(){
    campos.forEach(function(c,i){if(i===idx){c.el.setAttribute("data-focused","true");}else{c.el.removeAttribute("data-focused");}});
    var c=campos[idx];if(c&&c.el.scrollIntoView){c.el.scrollIntoView({block:"nearest"});}
  }
  function handleKey(k,ev){
    if(!aberto){return false;}
    if(editando){if(k===Keys.BACK||k===Keys.OK){var c=campos[idx];editando=false;if(c&&c.input){c.input.blur();}if(pendingRender){pendingRender=false;render();}ev.preventDefault();return true;}return false;}
    if(k===Keys.UP||k===Keys.DOWN){idx=(idx+(k===Keys.UP?-1:1)+campos.length)%campos.length;foco();ev.preventDefault();return true;}
    if(k===Keys.OK){var target=campos[idx];if(target){if(target.input){editando=true;target.input.focus();}else{target.acao();}}ev.preventDefault();return true;}
    if(k===Keys.BACK||k===Keys.BLUE){close();ev.preventDefault();return true;}return true;
  }
  function open(cb){build();aberto=true;view++;onClose=cb;editando=false;idx=0;el.className="settings";render();msg("Cadastre e sincronize pela TV. O PC e opcional.","");refresh();}
  function close(){aberto=false;view++;editando=false;pendingRender=false;if(el){el.className="settings hidden";}if(onClose){onClose();}}
  return{open:open,close:close,handleKey:handleKey,isOpen:function(){return aberto;}};
})();
window.Settings=Settings;
