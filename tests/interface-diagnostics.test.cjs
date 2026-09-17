const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),cp=require('node:child_process');
const {IDBFactory,IDBKeyRange}=require('fake-indexeddb');
const {expose}=require('./expose.cjs');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const call=(o,m,...args)=>new Promise((resolve,reject)=>o[m](...args,(e,r)=>e?reject(Error(String(e))):resolve(r)));
function context(extra={}){const c={setTimeout,clearTimeout,console,Date,...extra};c.window=c;vm.createContext(c);return c}
function load(c,f){vm.runInContext(read(f),c,{filename:f});return c}
const KEYS={LEFT:37,UP:38,RIGHT:39,DOWN:40,OK:13,BACK:461,RED:403,GREEN:404,YELLOW:405,BLUE:406,PLAY:415,PAUSE:19,STOP:413,FWD:417,REW:412,CH_UP:33,CH_DOWN:34,N0:48,N9:57};
function dom(){const ids={},listeners={};function node(){let html='';const n={style:{},children:[],scrollLeft:0,scrollTop:0,attributes:{},className:'',
 appendChild(c){this.children.push(c);return c},removeChild(c){const i=this.children.indexOf(c);if(i>=0){this.children.splice(i,1)}return c},
 insertBefore(c){this.children.unshift(c);return c},setAttribute(k,v){this.attributes[k]=v},removeAttribute(k){delete this.attributes[k]},
 getAttribute(k){return this.attributes[k]},querySelector(){return node()},addEventListener(){},scrollIntoView(){},focus(){}};
 Object.defineProperty(n,'innerHTML',{get:()=>html,set:v=>{html=v;n.children=[]}});return n}
 return{ids,listeners,hidden:false,readyState:'loading',body:node(),createElement:node,createTextNode:textContent=>({textContent}),getElementById:id=>ids[id]||(ids[id]=node()),addEventListener:(e,f)=>listeners[e]=f}}

// Arnes do orquestrador: tudo o que a interface nova desenha entra como
// duble, para o teste exercitar decisao e cancelamento, nao layout.
function app(extra={},opts={}){const document=dom(),prefs={},events=[],callbacks={},listeners={},pending=[],plays=[];let now=100000,monitor;
 function listStub(){return{total:0,selected:240,top:17000,position(){return{index:this.selected,scrollTop:this.top}},
  restorePosition(p){this.restored=p;this.selected=p.index;this.top=p.scrollTop},
  setSource(n,l){this.total=n;this.loader=l;this.selected=0},setItems(eps){this.episodes=eps},setMessage(m){this.message=m},
  setFocused(on){this.focused=on},count(){return this.total},move(d){this.selected+=d;return true},activate(){this.activated=true},
  currentItem(){return this.item||null},refresh(){this.refreshed=true},loadedCount:()=>0}}
 function gridStub(){const g=listStub();g.move=function(dx,dy){this.moved=[dx,dy];return this.canMove!==false};return g}
 const list=listStub(),grids={vod:gridStub(),series:gridStub()};
 const homeStub={loaded:[],load(sourceId,cb){this.loaded.push(sourceId);if(cb){cb(null,3)}},setFocused(on){this.focused=on},
  move(){return true},activate(){this.activated=true},current(){return this.item||null},count(){return 3},position(){return{index:0,scrollTop:0}}};
 const detail={opened:[],open(i){this.opened.push(i);this.aberto=true},close(){this.aberto=false},refresh(){this.refreshed=true},
  mount(h,handlers){this.handlers=handlers},handleKey(){return false},focusedItem(){return this.item||null},
  isOpen(){return !!this.aberto},item(){return this.opened[this.opened.length-1]||null},episodes(){return[]},zone(){return'actions'}};
 const upnext={mount(f){this.go=f},begin(q){this.fila=q},clear(){this.fila=null},consider(){},offerAtEnd(){return false},
  accept(){return false},dismiss(){},next(){return this.proximo||null},hide(){},visible(){return !!this.visivel},
  queue(){return this.fila},shouldAdvance(){return !!this.proximo},dismissed(){return false},countdown(){return 0}};
 function Player(){this.on={};this.stop=()=>{this.current=null};this.play=info=>{this.current=info;this.engine='native';plays.push(info)}}
 function HealthMonitor(v,opts){monitor=this;this.opts=opts;this.stop=()=>{};this.start=()=>{};this.setStartup=()=>{}}
 const c=context({document,Date:{now:()=>now},Player,HealthMonitor,ChannelList:function(){return list},
  PosterGrid:function(host){const id=(host&&host.__id)||'';return grids[id]||gridStub()},
  Home:function(){return homeStub},Detail:detail,UpNext:upnext,
  Setup:{open(cb){this.cb=cb;this.aberto=true},close(){this.aberto=false},handleKey(){return true},
   isOpen(){return !!this.aberto},step(){return'tipo'},progress(){return{pct:0}}},
  Controls:{mount(){},setItem(i,n){this.item=i;this.hasNext=n},reset(){this.item=null},update(){},
   handleKey(){return false},render(){},zone(){return'seek'},seekable(){return !!(this.item&&(this.item.kind==='vod'||this.item.kind==='episode'))},pending(){return 0}},
  Search:{mount(){},open(){},close(){},handleKey(){return false},focusedItem(){return null},
   zone(){return'input'},editing(){return false},term(){return''}},
  Spatial:{blur(){},focus(){},move(){},current:()=>null},
  navigator:{},screen:{},Keys:{...KEYS},Settings:{isOpen:()=>false},
  Log:{session:()=>'test-session',event:(tag,data)=>events.push({tag,data:JSON.parse(JSON.stringify(data))}),info(){},warn(){},error(){},stat(){},install(){},flush(){},toggleHud(){return true}},
  Store:{pref:(k,v)=>v===undefined?(prefs[k]===undefined?null:prefs[k]):(prefs[k]=v),init:cb=>cb(false)},
  API:{available:()=>false,setBase(){},check(){},health(cb){cb(new Error('sem pc'))}},
  Luna:{panel:()=>null,network:cb=>cb(null,'offline')},
  Library:{init:cb=>cb(null),decorate:(items,cb)=>cb(items)},
  Catalog:{getFonte:()=>({id:'A'}),getModo:()=>'local',init:cb=>cb(null),arrancar:cb=>cb({pronto:true,canais:3,doBanco:true}),
   categories:(t,cb)=>cb(null,[{id:'cat',name:'Categoria',count:null}]),channels:(o,cb)=>pending.push({o,cb}),
   seriesInfo:(id,cb)=>callbacks[id]=cb,play:(id,cb)=>cb(null,{id}),logoURL:i=>i.logo||null},
  addEventListener:(e,f)=>listeners[e]=f,...extra});
 // as grades sao criadas por id: marca o host para o duble saber qual devolver
 const original=document.getElementById;
 document.getElementById=id=>{const n=original(id);if(!n.__id&&/^grid-/.test(id)){n.__id=id.slice(5)}return n};
 vm.runInContext(expose(read('app/js/app.js')),c,{filename:'app/js/app.js'});
 // list/grids/home so existem depois do boot: os testes que nao o chamam
 // ficariam com referencias nulas e testariam o duble, nao o app
 if(opts.boot!==false){c.h.boot()}
 return{c,list,grids,home:homeStub,detail,upnext,prefs,events,callbacks,listeners,pending,plays,document,
  tick:n=>now+=n,monitor:()=>monitor,key:k=>c.h.onKey({keyCode:k,preventDefault(){}})};
}

test('biblioteca: escolha de retomada usa controle; inicio persiste zero antes de reproduzir',()=>{
 const saves=[],begins=[],timers=[];
 const h=app({Library:{init:cb=>cb(null),decorate:(i,cb)=>cb(i),progress:(ch,cb)=>cb(null,{position:125}),resumable:()=>true,save:(...args)=>saves.push(args)},
  ResumePlayback:function(){this.begin=(ch,pos)=>begins.push(pos);this.clear=()=>{};this.checkpoint=()=>{};this.retry=()=>{}},
  setTimeout:fn=>{timers.push(fn);return timers.length},clearTimeout(){}});
 h.c.h.setup([{id:'cat',name:'Filmes'}],'vod');const ch={id:'film',kind:'vod',name:'Filme'};
 h.c.h.choosePlayback(ch);assert.match(h.document.ids.resumeChoice.className,/resume-choice/);assert.equal(h.plays.length,0);
 h.key(KEYS.OK);timers.pop()();assert.deepEqual(begins,[125]);
 h.c.h.choosePlayback(ch);h.key(KEYS.RIGHT);h.key(KEYS.OK);
 assert.equal(saves.length,1);assert.equal(saves[0][1],0);assert.equal(h.plays.length,1);
 saves[0][4](null);timers.pop()();assert.deepEqual(begins,[125,0]);
});

test('biblioteca: VOLTAR cancela dialogo e resposta de historico atrasada; trocar de pagina cancela inicio pendente',()=>{
 const reads=[],saves=[];
 const h=app({Library:{init:cb=>cb(null),decorate:(i,cb)=>cb(i),progress:(ch,cb)=>reads.push(cb),resumable:()=>true,save:(...args)=>saves.push(args)}});
 h.c.h.setup([{id:'cat',name:'Filmes'}],'vod');h.c.h.choosePlayback({id:'film',kind:'vod',name:'Filme'});
 h.key(KEYS.BACK);reads[0](null,{position:70});assert.equal(h.document.ids.resumeChoice.className,'resume-choice hidden');
 h.c.h.choosePlayback({id:'film',kind:'vod',name:'Filme'});reads[1](null,{position:70});h.key(KEYS.BACK);
 assert.equal(h.document.ids.resumeChoice.className,'resume-choice hidden');assert.equal(h.plays.length,0);
 h.c.h.choosePlayback({id:'film',kind:'vod',name:'Filme'});reads[2](null,{position:70});h.key(KEYS.RIGHT);
 h.c.h.acceptChoice();h.c.h.goPage('home');saves[0][4](null);assert.equal(h.plays.length,0);
});

test('biblioteca: tecla 1 alterna favorito em foco e exibe erro de gravacao',()=>{
 const calls=[],ch={id:'A',name:'Canal'};
 const h=app({Library:{init:cb=>cb(null),decorate:(i,cb)=>cb(i),toggle:(item,cb)=>calls.push({ch:item,cb})}});
 h.c.h.setup([],'live');h.list.item=ch;
 h.key(49);assert.equal(calls[0].ch,ch);calls[0].cb(null,true);assert.equal(ch.favorite,true);assert.equal(h.list.refreshed,true);
 h.key(49);calls[1].cb('disco cheio');assert.match(h.document.ids.status.children[0].textContent,/disco cheio/);
});

test('home: favoritos e continuar assistindo saem da biblioteca local, sem backend',async()=>{
 const pedidos=[],c=context({document:dom(),Catalog:{logoURL:i=>i.logo||null},
  Library:{page:(store,source,offset,limit,cb)=>{pedidos.push({store,source,offset,limit});
   if(store==='history'){return cb(null,{total:1,items:[{id:'h1',sourceId:'A',kind:'vod',name:'Filme'}]})}
   cb(null,{total:3,items:[{id:'f1',sourceId:'A',kind:'live',name:'Canal'},{id:'f2',sourceId:'A',kind:'vod',name:'Outro filme'}]})}},
  Shelf:{hydrate:(rows,cb)=>cb(null,rows),recent:(store,source,limit,cb)=>cb(null,store==='vod'?[{id:'v1',name:'Recente'}]:[])},
  Rail:function(host,opts){this.opts=opts;this.items=[];this.setItems=function(i){this.items=i};this.setSubtitle=function(){};
   this.setFocused=function(){};this.count=function(){return this.items.length};this.current=function(){return this.items[0]||null};
   this.move=function(){return true};this.activate=function(){};this.el={scrollIntoView(){}}}});
 load(c,'app/js/ui/Home.js');
 const home=new c.Home({innerHTML:'',appendChild(){}},{});
 const trilhas=await new Promise(resolve=>home.load('A',(e,n)=>resolve(n)));
 assert.equal(pedidos.filter(p=>p.store==='history').length,1);
 assert.equal(pedidos.filter(p=>p.store==='favorites').length,1);
 assert.equal(pedidos[0].source,'A');
 assert.equal(home.rails.filter(r=>r.id==='favLive')[0].rail.items.length,1);
 assert.equal(home.rails.filter(r=>r.id==='favVod')[0].rail.items.length,1);
 assert.equal(home.rails.filter(r=>r.id==='recentSeries')[0].rail.count(),0);
 assert.equal(trilhas,4);   // a trilha vazia nao entra na navegacao
});

test('C12/C13: categoria unica desconhecida abre e total real aparece no evento',()=>{
 const h=app();h.c.h.goPage('vod');assert.equal(h.pending.length,1);assert.equal(h.pending[0].o.type,'vod');
 h.pending[0].cb(null,{total:23,items:[]});const event=h.events.find(e=>e.tag==='category.load');assert.equal(event.data.total,23);
 assert.equal(h.document.ids['cats-vod'].children[0].children[0].textContent,'Categoria (23)');
 h.c.h.setup([{id:'a',name:'A',count:null},{id:'b',name:'B'}],'vod');h.c.h.renderCats();
 assert.equal(h.document.ids['cats-vod'].children[0].children[0].textContent,'A (—)');
 assert.equal(h.document.ids['cats-vod'].children[1].children[0].textContent,'B (—)');
});

test('C14: VOLTAR encerra a reproducao e depois devolve a grade com indice e rolagem da ficha',()=>{
 const h=app();h.c.h.goPage('series');h.pending[0].cb(null,{total:400,items:[]});
 h.grids.series.selected=240;h.grids.series.top=17000;
 h.c.h.abrirFicha({id:'s1',kind:'series',name:'Serie'});
 h.c.h.play({id:'ep',name:'Episode',kind:'episode'},false);
 h.key(KEYS.BACK);assert.equal(h.events.filter(e=>e.tag==='playback').length,1);
 h.key(KEYS.BACK);const ultima=h.pending[h.pending.length-1];ultima.cb(null,{total:400,items:[]});
 assert.equal(ultima.o.category,'cat');
 assert.equal(h.grids.series.restored.index,240);assert.equal(h.grids.series.restored.scrollTop,17000);
});

test('C07/C14: resposta de pagina atrasada nao preenche a grade depois de trocar de pagina',()=>{
 const h=app();h.c.h.goPage('vod');const atrasada=h.pending[0];
 h.c.h.goPage('home');atrasada.cb(null,{total:99,items:[]});
 assert.equal(h.grids.vod.total,0);assert.ok(h.home.loaded.length>0);
});

test('C15: faixa desloca categoria ativa para dentro da janela',()=>{
 const h=app(),strip=h.document.getElementById('cats-live');
 strip.getBoundingClientRect=()=>({left:100,right:500,width:400});
 const original=h.document.createElement;
 h.document.createElement=()=>{const n=original();n.getBoundingClientRect=()=>({left:650,right:780,width:130});return n};
 h.c.h.setup([{id:'a',name:'A'}],'live');h.c.h.renderCats();assert.equal(strip.scrollLeft,280);
});

test('C18: suspensao/fechamento encerram uma vez, guardam posicao e retorno nao retoma sessao antiga',()=>{
 const h=app({},{boot:false});h.c.h.boot();h.c.h.play({id:'channel',sourceId:'A',name:'Canal'},false);h.document.ids.video.currentTime=37;h.tick(5000);
 h.document.hidden=true;h.document.listeners.visibilitychange();h.listeners.beforeunload();h.listeners.pagehide();
 const completed=h.events.filter(e=>e.tag==='playback');assert.equal(completed.length,1);
 assert.equal(completed[0].data.endedBy,'suspenso');assert.equal(completed[0].data.position,37);
 assert.equal(h.prefs.activePlayback,'null');assert.equal(JSON.parse(h.prefs.lastPlayback).position,37);
 h.document.hidden=false;h.document.listeners.visibilitychange();assert.equal(h.plays.length,1);
 h.c.h.play({id:'channel',name:'Canal'},false);h.key(KEYS.STOP);
 const all=h.events.filter(e=>e.tag==='playback');assert.equal(all.length,2);
 assert.notEqual(all[0].data.playbackId,all[1].data.playbackId);
});

test('C18: fim e falha terminal fecham registros; checkpoint de encerramento abrupto e recuperado',()=>{
 const h=app({},{boot:false});h.prefs.activePlayback=JSON.stringify({playbackId:'old',channelId:'old',t0:100,durationMs:500});h.c.h.boot();
 assert.equal(h.events.find(e=>e.tag==='playback').data.endedBy,'interrompido');
 h.c.h.play({id:'A',name:'A'},false);h.c.h.player.on.statechange({state:'ended'});h.key(KEYS.STOP);
 h.c.h.play({id:'B',name:'B'},false);h.c.h.player.on.error({why:'decode',engine:'native'});h.key(KEYS.STOP);
 const records=h.events.filter(e=>e.tag==='playback');assert.equal(records.length,3);
 assert.equal(records[1].data.endedBy,'fim');assert.equal(records[2].data.error,'decode');
});

test('proximo episodio: 95% abre a contagem, o zero avanca sozinho e VOLTAR dispensa',()=>{
 let tique=null;
 const c=context({document:dom(),Log:{info(){},warn(){}},
  setInterval:fn=>{tique=fn;return 1},clearInterval:()=>{tique=null}});
 load(c,'app/js/player/UpNext.js');
 const aceitos=[];c.UpNext.mount((ep,fila)=>aceitos.push({ep,fila}));
 const lista=[{name:'T1E1'},{name:'T1E2'},{name:'T1E3'}];

 c.UpNext.begin({serie:{name:'Serie'},lista,index:0});
 c.UpNext.consider(60,3000);assert.equal(c.UpNext.visible(),false);    // 2% do episodio
 c.UpNext.consider(2700,3000);assert.equal(c.UpNext.visible(),false);  // 90%: ainda nao
 c.UpNext.consider(2851,3000);assert.equal(c.UpNext.visible(),true);   // 95%
 assert.equal(c.UpNext.countdown(),10);
 assert.equal(c.UpNext.next().name,'T1E2');
 for(let i=0;i<10;i++){if(tique){tique()}}
 assert.equal(aceitos.length,1);assert.equal(aceitos[0].ep.name,'T1E2');assert.equal(aceitos[0].fila.index,1);
 assert.equal(c.UpNext.visible(),false);

 // dispensado nao volta a oferecer nem avanca no fim
 c.UpNext.begin({serie:{name:'Serie'},lista,index:0});
 c.UpNext.consider(2900,3000);assert.equal(c.UpNext.visible(),true);
 c.UpNext.dismiss();
 assert.equal(c.UpNext.visible(),false);assert.equal(c.UpNext.shouldAdvance(),false);
 c.UpNext.consider(2990,3000);assert.equal(c.UpNext.visible(),false);
 assert.equal(aceitos.length,1);

 // episodio curto: o painel nunca aparece, mas o fim avanca assim mesmo
 c.UpNext.begin({serie:{name:'Serie'},lista,index:1});
 c.UpNext.consider(95,100);assert.equal(c.UpNext.visible(),false);     // duracao curta demais
 assert.equal(c.UpNext.shouldAdvance(),true);
 assert.equal(c.UpNext.queue().index,2);

 // ultimo episodio nao oferece nada
 c.UpNext.begin({serie:{name:'Serie'},lista,index:2});
 c.UpNext.consider(2900,3000);
 assert.equal(c.UpNext.visible(),false);assert.equal(c.UpNext.shouldAdvance(),false);
});

test('controles: as setas acumulam o pulo numa busca so; ao vivo nao busca; a fileira responde ao OK',()=>{
 function node(){const n={children:[],style:{},className:'',attributes:{},
  appendChild(c){this.children.push(c);this.firstChild=this.children[0];return c},
  setAttribute(k,v){this.attributes[k]=v},removeAttribute(k){delete this.attributes[k]},
  getAttribute(k){return this.attributes[k]}};
  Object.defineProperty(n,'innerHTML',{get:()=>'',set:()=>{n.children=[];n.firstChild=undefined}});return n}
 const timers=[];
 const video={currentTime:100,duration:3000,paused:false,play(){this.paused=false;return{catch(){}}},pause(){this.paused=true}};
 const c=context({document:{createElement:()=>node(),createTextNode:t=>({textContent:t})},
  Keys:{...KEYS},Log:{info(){},warn(){}},
  setTimeout:fn=>{timers.push(fn);return timers.length},clearTimeout(){}});
 load(c,'app/js/player/Controls.js');
 const seek=node();seek.appendChild(node());
 const refs={seek,elapsed:node(),total:node(),buttons:node()};
 c.Controls.mount(video,refs,{});
 const ev={preventDefault(){}};

 c.Controls.setItem({kind:'episode',name:'Ep'},true);
 assert.equal(refs.buttons.children.length,6);            // 4 pulos + pausa + proximo
 assert.equal(c.Controls.handleKey(KEYS.RIGHT,ev),true);
 assert.equal(c.Controls.handleKey(KEYS.RIGHT,ev),true);
 assert.equal(c.Controls.handleKey(KEYS.FWD,ev),true);
 assert.equal(c.Controls.pending(),80);                   // 10 + 10 + 60
 assert.equal(video.currentTime,100);                     // nenhuma busca ainda
 timers[timers.length-1]();
 assert.equal(Math.round(video.currentTime),180);         // uma busca so, a partir do ponto inicial
 assert.equal(c.Controls.pending(),0);

 // ao vivo nao tem o que avancar: as setas sobram para quem chamou
 c.Controls.setItem({kind:'live',name:'Canal'},false);
 assert.equal(c.Controls.seekable(),false);
 assert.equal(c.Controls.handleKey(KEYS.RIGHT,ev),false);
 assert.equal(refs.buttons.children.length,1);            // so pausar/continuar

 // BAIXO entra na fileira e o OK aciona o botao em foco
 c.Controls.setItem({kind:'vod',name:'Filme'},false);
 assert.equal(c.Controls.handleKey(KEYS.DOWN,ev),true);
 assert.equal(c.Controls.zone(),'botoes');
 assert.equal(c.Controls.handleKey(KEYS.OK,ev),true);
 assert.equal(c.Controls.pending(),-60);                  // primeiro botao: voltar 60s
 assert.equal(c.Controls.handleKey(KEYS.UP,ev),true);
 assert.equal(c.Controls.zone(),'seek');

 // pausa e retomada pelas teclas dedicadas
 c.Controls.handleKey(KEYS.PAUSE,ev);assert.equal(video.paused,true);
 c.Controls.handleKey(KEYS.PLAY,ev);assert.equal(video.paused,false);
});

test('primeiro inicio: conta recusada nao grava fonte; conta aceita sincroniza e baixa tudo com progresso',()=>{
 // dom proprio: o assistente precisa reencontrar os campos pelo id que ele mesmo atribuiu
 function setupDom(){const ids={};function node(){const n={children:[],style:{},className:'',attributes:{},value:'',
   appendChild(c){this.children.push(c);return c},setAttribute(k,v){this.attributes[k]=v},
   removeAttribute(k){delete this.attributes[k]},getAttribute(k){return this.attributes[k]},
   scrollIntoView(){},focus(){if(this.onfocus){this.onfocus()}},blur(){if(this.onblur){this.onblur()}}};
   Object.defineProperty(n,'innerHTML',{get:()=>'',set:()=>{n.children=[]}});
   Object.defineProperty(n,'id',{get(){return n._id},set(v){n._id=v;ids[v]=n}});return n}
  return{ids,body:node(),createElement:()=>node(),createTextNode:t=>({textContent:t}),
   getElementById:id=>ids[id]||(ids[id]=node())}}

 const chamadas={test:[],save:[],sync:[],tudo:[]};
 const document=setupDom();
 const c=context({document,Keys:{...KEYS},Log:{info(){},warn(){},event(){}},
  DB:{resumo:(id,cb)=>cb(null,{live:3348,vod:912,series:120})},
  API:{getBase:()=>'',setBase(){},check(cb){cb(false)}},URL,Store:{pref(){return null}},
  Catalog:{testSource:(f,cb)=>chamadas.test.push({f,cb}),
   saveSource:(src,cb)=>{chamadas.save.push(src);cb(null,{...src,id:'S1'})},
   setModo(){},getFonte:()=>({id:'S1'}),
   sincronizar:(src,prog,cb)=>chamadas.sync.push({src,prog,cb}),
   baixarTudo:(prog,cb)=>chamadas.tudo.push({prog,cb}),
   cancelarBaixarTudo(){}}});
 load(c,'app/js/ui/Setup.js');
 const ev={preventDefault(){}};
 let fechou=false;
 c.Setup.open(()=>{fechou=true});
 assert.equal(c.Setup.step(),'tipo');

 c.Setup.handleKey(KEYS.OK,ev);                       // primeiro botao: Xtream
 assert.equal(c.Setup.step(),'dados');

 const irPara=chave=>{for(let i=0;i<12&&c.Setup.focused()!==chave;i++){c.Setup.handleKey(KEYS.DOWN,ev)}
  assert.equal(c.Setup.focused(),chave)};

 // sem usuario e senha o assistente nao chega a falar com o provedor
 irPara('conectar');
 c.Setup.handleKey(KEYS.OK,ev);
 assert.equal(chamadas.test.length,0);
 assert.equal(c.Setup.step(),'dados');

 const campo=k=>document.ids['setup-campo-'+k];
 campo('name').value='Minha fonte';campo('name').oninput();
 campo('url').value='meu.servidor.exemplo:8080';campo('url').oninput();
 campo('username').value='u';campo('username').oninput();
 campo('password').value='p';campo('password').oninput();

 irPara('conectar');
 c.Setup.handleKey(KEYS.OK,ev);
 assert.equal(chamadas.test.length,1);
 assert.equal(chamadas.test[0].f.username,'u');
 assert.equal(c.Setup.step(),'conferindo');

 // conta recusada: volta ao formulario e NADA foi gravado no banco
 chamadas.test[0].cb(new Error('Conta recusada.'));
 assert.equal(c.Setup.step(),'dados');
 assert.equal(chamadas.save.length,0);
 assert.equal(chamadas.sync.length,0);

 // segunda tentativa, agora aceita
 irPara('conectar');
 c.Setup.handleKey(KEYS.OK,ev);
 chamadas.test[1].cb(null,{ok:true,container:'ts',maxConnections:2,source:{id:null,type:'xtream',name:'Minha fonte'}});
 assert.equal(chamadas.save.length,1);
 assert.equal(chamadas.sync.length,1);
 assert.equal(c.Setup.step(),'sync');

 // a barra anda com a sincronizacao da fonte e depois com as categorias
 chamadas.sync[0].prog({fase:'canais ao vivo',feito:50,total:100});
 const meio=c.Setup.progress();
 assert.ok(meio.pct>5&&meio.pct<35,'primeira faixa da barra');
 assert.equal(meio.fase,'canais ao vivo');
 chamadas.sync[0].cb(null,{live:3348});
 assert.equal(chamadas.tudo.length,1);
 chamadas.tudo[0].prog({fase:'Acao',feito:1,total:4});
 assert.ok(c.Setup.progress().pct>=35,'segunda faixa da barra');
 chamadas.tudo[0].cb(null,{categorias:4,baixadas:4,falhas:0});
 assert.equal(c.Setup.step(),'pronto');
 assert.equal(c.Setup.progress().pct,100);

 // o endereco do PC e opcional e fica no fim: quem so quer assistir passa direto
 irPara('fim');
 c.Setup.handleKey(KEYS.OK,ev);
 assert.equal(fechou,true);
 assert.equal(c.Setup.isOpen(),false);
});

test('C17: busca esparsa pagina uma unica vez e isola fonte/categoria, inclusive posicoes com lacunas',async()=>{
 const c=load(context({indexedDB:new IDBFactory(),IDBKeyRange}),'app/js/platform/db.js');
 const rows=Array.from({length:95},(_,i)=>({id:'x'+i,streamId:i,name:i%7===0?'ALVO '+i:'Outro '+i,category:i%2===0?'Par':'Impar',pos:i*3}));await call(c.DB,'putMany','live',rows,'A',null);await call(c.DB,'putMany','live',[{id:'x1',streamId:1,name:'ALVO estrangeiro',category:'Par'}],'B',null);
 const expected=rows.filter(r=>r.name.startsWith('ALVO')).map(r=>r.name),found=[];
 for(let offset=0;offset<expected.length+3;offset+=3){const page=await call(c.DB,'query',{store:'live',sourceId:'A',q:'alvo',offset,limit:3});assert.equal(page.total,expected.length);found.push(...page.items.map(r=>r.name));}
 // A busca geral percorre o indice de NOMES (srcName), entao o resultado sai
 // em ordem alfabetica, nao na ordem do provedor. O que o teste garante e o
 // que importa: nenhuma pagina pula nem repete, e o total bate.
 assert.equal(found.length,expected.length);
 assert.deepEqual(found.slice().sort(),expected.slice().sort());
 assert.equal(new Set(found).size,found.length);
 assert.deepEqual(found,found.slice().sort());const cat=await call(c.DB,'query',{store:'live',sourceId:'A',category:'Par',q:'alvo',offset:2,limit:2});assert.deepEqual(Array.from(cat.items,r=>r.name),rows.filter(r=>r.name.startsWith('ALVO')&&r.category==='Par').slice(2,4).map(r=>r.name));(await call(c.DB,'open')).close();
});
function temp(t){const dir=fs.mkdtempSync(path.join(__dirname,'cache-test-'));t.after(()=>{assert.equal(path.dirname(path.resolve(dir)),__dirname);assert.ok(path.basename(dir).startsWith('cache-test-'));fs.rmSync(dir,{recursive:true,force:true})});return dir}
test('C19: relatorio persiste reinicio, deduplica reenvios, isola nomes iguais e aplica retencao',t=>{
 const dir=temp(t),create=require('../server/lib/playbackHistory').create;let now=Date.now();const options={now:()=>now,days:30,maxRecords:3};let h=create(dir,options);
 const event=(id,channelId,at=now,error=null)=>({tag:'playback',session:'s',seq:id,ts:new Date(at).toISOString(),data:{playbackId:String(id),channelId,channel:'Mesmo nome',endedAt:at,tFirstFrame:0,tMeta:0,error}});
 h.append([event(1,'A'),event(2,'B')]);h.append([event(1,'A')]);h=create(dir,options);assert.equal(h.report().sessoes,2);assert.equal(h.report().canais.length,2);assert.equal(h.report().canais[0].tocaram,1);assert.equal(h.report().motores[0].metaMediana,0);
 h.append([event(3,'A',now+1,'rede'),event(4,'C',now+2)]);assert.equal(h.report().sessoes,3);assert.equal(h.diagnostic('A').lastFailure.reason,'rede');now+=31*86400000;assert.equal(h.report().sessoes,0);
});
test('C19: falha de persistencia nao publica registros e reenvio posterior funciona',t=>{
 const dir=temp(t),h=require('../server/lib/playbackHistory').create(dir);fs.mkdirSync(path.join(dir,'playback-history.json.tmp'));
 const event={tag:'playback',data:{playbackId:'1',channelId:'A'}};assert.throws(()=>h.append([event]));assert.equal(h.report().sessoes,0);fs.rmdirSync(path.join(dir,'playback-history.json.tmp'));h.append([event]);assert.equal(h.report().sessoes,1);
});
test('C19: primeiro inicio importa JSONL legado sem duplicar e tolera linha interrompida',t=>{
 const dir=temp(t),event={tag:'playback',ts:new Date().toISOString(),session:'old',seq:1,data:{channelId:'x1',channel:'Historico',tFirstFrame:5}};
 fs.writeFileSync(path.join(dir,'app-2026-09-12.jsonl'),JSON.stringify(event)+'\n{incompleto\n'+JSON.stringify(event)+'\n');
 const create=require('../server/lib/playbackHistory').create,h=create(dir,{logsDir:dir});assert.equal(h.report().sessoes,1);assert.equal(h.report().imported.invalidLines,1);assert.equal(create(dir,{logsDir:dir}).report().sessoes,1);
});
test('C18/C19: outbox de playback sobrevive falha/reinicio e so sai apos confirmacao',()=>{
 const prefs={},requests=[];function XHR(){requests.push(this)}Object.assign(XHR.prototype,{open(){},setRequestHeader(){},send(body){this.body=JSON.parse(body)}});
 function client(){const c=context({console:{log(){},warn(){},error(){}},Store:{pref:(k,v)=>v===undefined?prefs[k]:(prefs[k]=v)},API:{getBase:()=> 'http://pc'},XMLHttpRequest:XHR,setTimeout:()=>1,clearTimeout(){},addEventListener(){},document:dom()});load(c,'app/js/platform/Log.js');c.Log.install();return c.Log}
 let log=client();log.event('playback',{playbackId:'p1',channelId:'A'});log.flush();requests[0].onerror();assert.equal(JSON.parse(prefs.playbackOutbox).length,1);log=client();log.flush();assert.equal(requests[1].body.events.filter(e=>e.tag==='playback').length,1);requests[1].status=200;requests[1].responseText='{"ok":true}';requests[1].onload();assert.equal(JSON.parse(prefs.playbackOutbox).length,0);
});
test('C20: sonda registra acesso com origem/data sem declarar reproducao; falha nao apaga sucesso observado',async()=>{
 const c=context({exports:{},require:n=>{assert.equal(n,'./mediaFile');return{fetchBuffer:(u,o,cb)=>cb(null,Buffer.from('#EXTM3U\nsegment.ts'),{headers:{}})}}});load(c,'server/lib/validator.js');const item={url:'http://example.invalid/live.m3u8',diagnostic:{playback:{at:1,origin:'TV'}}};await new Promise(resolve=>c.exports.run([item],{onDone:resolve}));assert.equal(item.diagnostic.access.ok,true);assert.equal(item.diagnostic.access.origin,'sonda-HTTP-PC');assert.equal(item.diagnostic.playback.at,1);
});
test('C20: diagnostico local persiste e distingue acesso, reproducao temporal e ultima falha',async()=>{
 const c=load(context({indexedDB:new IDBFactory(),IDBKeyRange,Log:{warn(){}}}),'app/js/platform/db.js');load(c,'app/js/platform/Diagnostics.js');await call(c.Diagnostics,'init');c.Diagnostics.record({channelId:'A',tFirstFrame:0,observedAt:100,endedAt:200,error:'decode',engine:'native'});
 await new Promise(resolve=>setTimeout(resolve,30));const stored=await call(c.DB,'metaGet','playbackDiagnostics');assert.equal(stored.A.playback.evidence,'currentTime');assert.equal(stored.A.lastFailure.reason,'decode');
 const text=c.Diagnostics.describe({id:'A',diagnostic:{access:{ok:true,at:50,origin:'HTTP'}}});assert.match(text,/Acesso confirmado/);assert.match(text,/avanco do tempo/);assert.match(text,/Ultima falha/);(await call(c.DB,'open')).close();
});
test('C21: comandos nativos propagam falha e impedem a etapa seguinte',()=>{
 const helper=path.join(root,'scripts/native-tools.ps1').replaceAll("'","''");const command=`. '${helper}'; function Test-Native { $global:LASTEXITCODE = 23 }; try { Invoke-Checked -Command Test-Native; Write-Output 'SHOULD_NOT_RUN'; exit 0 } catch { Write-Output $_.Exception.Message; exit 7 }`;
 const r=cp.spawnSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-Command',command],{encoding:'utf8'});assert.equal(r.status,7);assert.match(r.stdout,/exit code 23/);assert.doesNotMatch(r.stdout,/SHOULD_NOT_RUN/);
});
test('C21: manifesto e deterministico, detecta alteracoes, inclui Log/servico e rejeita dependencia ausente',t=>{
 const dir=temp(t);for(const name of ['app','services','server/lib','scripts','server/server.js','server/package.json','build.ps1','auditar.ps1','corrigir.ps1'])fs.cpSync(path.join(root,name),path.join(dir,name),{recursive:true});
 fs.cpSync(path.join(__dirname,'node_modules/acorn'),path.join(dir,'tests/node_modules/acorn'),{recursive:true});
 const inspect=require('../scripts/verify-project.cjs').inspect,first=inspect(dir,true);assert.equal(inspect(dir,false).id,first.id);assert.equal(inspect(dir,true).id,first.id);
 const manifest=JSON.parse(fs.readFileSync(path.join(dir,'build-manifest.json')));assert.ok(manifest.files.some(f=>f.path==='app/js/platform/Log.js'));assert.ok(manifest.files.some(f=>f.path==='services/service.js'));assert.equal(manifest.files.some(f=>f.path.startsWith('docs/')),false);
 fs.appendFileSync(path.join(dir,'app/js/platform/Log.js'),'\n// alteracao de teste\n');assert.throws(()=>inspect(dir,false),/Conteudo mudou/);assert.notEqual(inspect(dir,true).id,first.id);
 fs.rmSync(path.join(dir,'services/lib/mediaFile.js'));assert.throws(()=>inspect(dir,true),/dependencia ausente/);
});
