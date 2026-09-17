const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),events=require('node:events');
const {IDBFactory,IDBKeyRange}=require('fake-indexeddb');
const {expose}=require('./expose.cjs');
const KEYS={LEFT:37,UP:38,RIGHT:39,DOWN:40,OK:13,BACK:461,RED:403,GREEN:404,YELLOW:405,BLUE:406,PLAY:415,PAUSE:19,STOP:413,CH_UP:33,CH_DOWN:34};
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const call=(o,m,...args)=>new Promise((resolve,reject)=>o[m](...args,(e,r)=>e?reject(Error(String(e))):resolve(r)));
function context(extra={}){const c={console,setTimeout,clearTimeout,Date,...extra};c.window=c;vm.createContext(c);return c}
function load(c,f){vm.runInContext(read(f),c,{filename:f});return c}
function clock(){let n=100000,id=0;const jobs=new Map();return{Date:{now:()=>n},setTimeout:(fn,ms)=>{jobs.set(++id,{fn,at:n+ms});return id},clearTimeout:i=>jobs.delete(i),tick(ms){const end=n+ms;while(true){const list=[...jobs].filter(([,j])=>j.at<=end).sort((a,b)=>a[1].at-b[1].at);if(!list.length)break;const [i,j]=list[0];jobs.delete(i);n=j.at;j.fn()}n=end}}}
function dom(){const ids={};function node(tag='div'){let html='';const n={tagName:tag,style:{},children:[],attributes:{},value:'',appendChild(c){this.children.push(c);return c},removeChild(c){this.children=this.children.filter(x=>x!==c)},setAttribute(k,v){this.attributes[k]=v},getAttribute(k){return this.attributes[k]},removeAttribute(k){delete this.attributes[k]},addEventListener(){},removeEventListener(){},scrollIntoView(){},focus(){if(this.onfocus)this.onfocus()},blur(){if(this.onblur)this.onblur()}};Object.defineProperty(n,'innerHTML',{get:()=>html,set:v=>{html=v;n.children=[];for(const m of v.matchAll(/id="([^"]+)"/g))ids[m[1]]=node()}});return n}return{ids,createElement:node,createTextNode:s=>({textContent:s}),getElementById:id=>ids[id]||(ids[id]=node()),body:node(),readyState:'loading',addEventListener(){}}}
const log={info(){},warn(){},error(){},event(){},stat(){}};
function playerHarness(){const time=clock(),listeners={},instances=[];let plays=0;
 const video={addEventListener:(n,f)=>listeners[n]=f,removeEventListener:(n,f)=>{if(listeners[n]===f)delete listeners[n]},removeAttribute(){},pause(){},load(){},play(){plays++;return{catch(){}}}};
 function Hls(){this.handlers={};this.loads=0;instances.push(this)}Hls.isSupported=()=>true;Hls.Events={ERROR:'error',MANIFEST_PARSED:'manifest'};Hls.ErrorTypes={NETWORK_ERROR:'network',MEDIA_ERROR:'media'};
 Object.assign(Hls.prototype,{on(n,f){this.handlers[n]=f},destroy(){this.destroyed=true},loadSource(u){this.url=u},attachMedia(){},startLoad(){this.loads++},recoverMediaError(){}});
 const c=load(context({...time,Hls}),'app/js/player/Player.js');return{p:new c.Player(video),time,video,listeners,instances,plays:()=>plays};}
test('STOP cancela fallback pendente; eventos antigos e retry HLS nao afetam outro canal',()=>{
 const h=playerHarness(),info={direct:'A',proxied:'proxyA',fallback:'hlsjs',canFallback:()=>true};
 h.p.play(info);const stale=h.listeners.playing;let states=0;h.p.on.statechange=()=>states++;
 h.p._fail('network');h.p.stop();h.time.tick(2000);assert.equal(h.instances.length,0);stale();assert.equal(states,1);
 h.p.play({...info,preferred:'hlsjs'});const a=h.instances[0];a.handlers.error(null,{fatal:true,type:'network',details:'manifestLoad'});
 h.p.play({...info,proxied:'proxyB',preferred:'hlsjs'});const b=h.instances[1],plays=h.plays();
 h.time.tick(5000);a.handlers.manifest();a.handlers.error(null,{fatal:true,type:'network'});
 assert.equal(a.loads,0);assert.equal(b.loads,0);assert.equal(h.plays(),plays);assert.equal(a.destroyed,true);
});
test('fallback exige disponibilidade atual e nativo com headers usa URL do proxy',()=>{
 const h=playerHarness();let online=true;h.p.play({direct:'A',nativeUrl:'proxyA',fallback:'hlsjs',proxied:'proxyA',canFallback:()=>online});
 assert.equal(h.video.src,'proxyA');online=false;assert.equal(h.p.switchToFallback('stall'),false);assert.equal(h.instances.length,0);
});
function uiStub(){return{total:0,selected:0,setSource(n,l){this.total=n;this.loader=l},setItems(){},setMessage(){},
 setFocused(){},count(){return this.total},move(){return true},activate(){},currentItem(){return null},refresh(){},
 position(){return{index:0,scrollTop:0}},restorePosition(p){this.restored=p},loadedCount:()=>0}}
function appHarness(){const time=clock(),document=dom(),pending={},loaded=[],categories=[];
 function Player(){this.on={};this.stop=()=>{};this.play=i=>loaded.push(i.id)}
 function HealthMonitor(){this.stop=()=>{};this.start=()=>{};this.setStartup=()=>{}}
 const list=uiStub(),grids={vod:uiStub(),series:uiStub()};
 const home={loads:0,load(s,cb){this.loads++;if(cb){cb(null,2)}},setFocused(){},move(){return true},activate(){},
  current(){return null},count(){return 2},position(){return{index:0,scrollTop:0}}};
 const c=context({...time,document,Player,HealthMonitor,Log:{...log,install(){},flush(){},session:()=>'t',toggleHud(){return true}},navigator:{},screen:{},
  ChannelList:function(){return list},PosterGrid:function(host){return grids[(host&&host.__id)||'vod']},
  Home:function(){return home},
  Setup:{open(cb){this.cb=cb;this.aberto=true},close(){this.aberto=false},handleKey(){return true},
   isOpen(){return !!this.aberto},step(){return'tipo'},progress(){return{pct:0}}},
  Controls:{mount(){},setItem(i,n){this.item=i;this.hasNext=n},reset(){this.item=null},update(){},
   handleKey(){return false},render(){},zone(){return'seek'},seekable(){return !!(this.item&&(this.item.kind==='vod'||this.item.kind==='episode'))},pending(){return 0}},
  Search:{mount(){},open(){},close(){},handleKey(){return false},focusedItem(){return null},
   zone(){return'input'},editing(){return false},term(){return''}},
  Detail:{mount(){},open(){},close(){},refresh(){},handleKey(){return false},focusedItem(){return null},
   isOpen(){return false},item(){return null},episodes(){return[]},zone(){return'actions'}},
  UpNext:{mount(){},begin(){},clear(){},consider(){},accept(){return false},shouldAdvance(){return false},
   dismiss(){},next(){return null},hide(){},visible(){return false},queue(){return null},dismissed(){return false},countdown(){return 0}},
  Spatial:{blur(){},focus(){},move(){},current:()=>null},
  Store:{pref(){return null},init:cb=>cb(false)},Library:{init:cb=>cb(null),decorate:(i,cb)=>cb(i)},
  API:{available:()=>false,setBase(){},check(){},health(cb){cb(new Error('sem pc'))}},
  Luna:{panel:()=>null,network:cb=>cb(null,'offline')},
  Keys:{...KEYS},Settings:{isOpen:()=>false},addEventListener(){},
  Catalog:{getFonte:()=>({id:'A'}),getModo:()=>'local',init:cb=>cb(null),
   arrancar:cb=>cb({pronto:true,canais:1,doBanco:true}),logoURL:i=>i.logo||null,
   categories:(t,cb)=>cb(null,[{id:'a',name:'A'},{id:'b',name:'B'}]),
   play:(id,cb)=>pending[id]=cb,channels:(o,cb)=>categories.push({o,cb})}});
 const original=document.getElementById;
 document.getElementById=id=>{const n=original(id);if(!n.__id&&/^grid-/.test(id)){n.__id=id.slice(5)}return n};
 vm.runInContext(expose(read('app/js/app.js')),c);
 c.h.boot();
 return{c,time,pending,loaded,categories,list,grids,home};}
test('A lento e B rapido mantem B; STOP antes de 400 ms impede play e callback antigo',()=>{
 const h=appHarness(),a={id:'A',name:'A'},b={id:'B',name:'B'};
 h.c.h.playChannel(a,false);h.time.tick(400);h.c.h.playChannel(b,false);h.time.tick(400);
 h.pending.B(null,{id:'B'});h.pending.A(null,{id:'A'});assert.deepEqual(h.loaded,['B']);
 h.c.h.playChannel(a,false);h.c.h.onKey({keyCode:KEYS.STOP,preventDefault(){}});h.time.tick(1000);assert.deepEqual(h.loaded,['B']);
 h.c.h.playChannelNow(a,false);const pending=h.pending.A;h.c.h.onKey({keyCode:KEYS.STOP,preventDefault(){}});pending(null,{id:'A'});assert.deepEqual(h.loaded,['B']);
});
test('categorias em ordem inversa e paginas antigas nao substituem lista atual',()=>{
 const h=appHarness(),totals=[];h.list.setSource=n=>totals.push(n);h.list.count=()=>2;
 h.c.h.setup([{id:'a',name:'A'},{id:'b',name:'B'}],'live');
 h.c.h.loadCategoryNow(0);h.c.h.loadCategory(1);h.categories[0].cb(null,{total:99,items:[]});h.time.tick(350);h.categories[1].cb(null,{total:2,items:[]});assert.equal(totals.includes(99),false);assert.equal(totals.at(-1),2);
 const c=load(context({document:dom()}),'app/js/ui/ChannelList.js'),p=Object.create(c.ChannelList.prototype);let done;
 Object.assign(p,{generation:1,pages:{},items:{},pageSize:120,loader:(o,l,cb)=>done=cb});p._loadPage(0);p.generation++;done([{id:'old'}]);assert.equal(Object.keys(p.items).length,0);
});
test('API distingue endereco de disponibilidade, coalesce sondas, expira e isola troca de PC',()=>{
 const time=clock(),requests=[];function XHR(){requests.push(this)}Object.assign(XHR.prototype,{open(){},send(){},setRequestHeader(){}});
 const c=load(context({...time,XMLHttpRequest:XHR}),'app/js/api.js'),a=c.API;a.setBase('http://pc');assert.equal(a.available(),false);
 const answers=[];a.check(ok=>answers.push(ok));a.check(ok=>answers.push(ok));assert.equal(requests.length,1);assert.equal(requests[0].timeout,3000);
 requests[0].status=200;requests[0].responseText='{"ok":true}';requests[0].onload();assert.deepEqual(answers,[true,true]);assert.equal(a.available(),true);
 time.tick(30001);assert.equal(a.available(),false);a.check(ok=>answers.push(ok));a.setBase('http://other');requests[1].status=200;requests[1].responseText='{"ok":true}';requests[1].onload();assert.equal(a.available(),false);assert.equal(answers.at(-1),false);
 a.simularOffline(true);a.check(ok=>assert.equal(ok,false));assert.equal(requests.length,2);
 a.simularOffline(false);a.play('channel',()=>{});requests[2].status=200;requests[2].responseText='{"preferred":"native"}';requests[2].onload();assert.equal(a.available(),true);
});
function catalogContext(factory=new IDBFactory(),prefs={}){const c=context({indexedDB:factory,IDBKeyRange,Log:log,Store:{pref:(k,v)=>v===undefined?prefs[k]:(prefs[k]=v)},API:{available:()=>false,getBase:()=>'',check:cb=>cb(false)},Luna:{service(){throw Error('rede inesperada')}}});for(const f of ['app/js/platform/db.js','app/js/platform/sync.js','app/js/catalog.js'])load(c,f);return c}
test('busca geral varre as tres colecoes da fonte ativa sem pedir nada ao PC',async()=>{
 const c=catalogContext();c.Catalog.setFonte({id:'A'});
 await call(c.DB,'putMany','live',[{id:c.DB.key('A','live','1'),name:'Globo SP',category:'Abertos'},
  {id:c.DB.key('A','live','2'),name:'ESPN',category:'Esportes'}],'A',null);
 await call(c.DB,'putMany','vod',[{id:c.DB.key('A','vod','1'),name:'Globo Reporter o filme',category:'Doc'}],'A',null);
 await call(c.DB,'putMany','series',[{id:c.DB.key('A','series','1'),name:'Globo a serie',category:'Doc'}],'A',null);
 await call(c.DB,'putMany','live',[{id:c.DB.key('B','live','1'),name:'Globo de outra fonte',category:'Abertos'}],'B',null);
 const r=await new Promise((ok,falha)=>c.Catalog.buscar('globo',10,(e,x)=>e?falha(e):ok(x)));
 assert.equal(r.live.total,1);assert.equal(r.vod.total,1);assert.equal(r.series.total,1);
 assert.equal(r.live.items[0].kind,'live');assert.equal(r.series.items[0].kind,'series');
 const vazio=await new Promise((ok,falha)=>c.Catalog.buscar('inexistente',10,(e,x)=>e?falha(e):ok(x)));
 assert.equal(vazio.live.total+vazio.vod.total+vazio.series.total,0);
 (await call(c.DB,'open')).close();
});
test('cadastro local, migracao e reinicio preservam fonte, lives, VOD e episodios sem PC',async()=>{
 const factory=new IDBFactory(),src={id:'A',type:'xtream',name:'A',url:'https://example.invalid',username:'u',password:'p'},prefs={fonteLocal:JSON.stringify(src)};
 let c=catalogContext(factory,prefs);await call(c.Catalog,'init');assert.equal(prefs.fonteLocal,'null');assert.equal(c.Catalog.getModo(),'local');
 const origin={nome:'TV',categorias:(s,t,cb)=>cb(null,[{id:'1',name:'Cat'}]),itens:(s,t,cat,o,l,cb)=>cb(null,{total:1,offset:o,snapshot:'s',items:[{id:'1',streamId:'1',seriesId:t==='series'?'1':undefined,name:'Item',kind:t,url:'https://example.invalid/x.m3u8',category:'1',logo:'http://pc/logo?url='+encodeURIComponent('https://example.invalid/logo.png')}]}),serieInfo:(s,id,cb)=>cb(null,{totalEpisodios:1,seasons:[{season:1,episodes:[{id:'e1',streamId:'e1',name:'Ep',url:'https://example.invalid/e.mp4',season:1,num:1}]}]})};
 await call(c.Sync,'fonte',src,origin,null);await call(c.Sync,'categoria',src,origin,'vod','1',null);await call(c.Sync,'categoria',src,origin,'series','1',null);
 const serie=(await call(c.DB,'query',{store:'series',sourceId:'A',limit:10})).items[0];await call(c.Sync,'serie',src,origin,serie.id);
 (await call(c.DB,'open')).close();c=catalogContext(factory,prefs);await call(c.Catalog,'init');assert.equal(c.Catalog.getFonte().id,'A');
 const boot=await new Promise(r=>c.Catalog.arrancar(r));assert.equal(boot.pronto,true);assert.equal(boot.doBanco,true);
 const live=await call(c.Catalog,'channels',{type:'live',limit:10});assert.equal(live.total,1);assert.equal(live.items[0].logo,'https://example.invalid/logo.png');assert.equal((await call(c.Catalog,'play',live.items[0].id)).fallback,null);
 assert.equal((await call(c.Catalog,'channels',{type:'vod',category:'1',limit:10})).total,1);assert.equal((await call(c.Catalog,'seriesInfo',serie.id)).totalEpisodios,1);
 const b=await call(c.Catalog,'saveSource',{type:'m3u',name:'B',url:'https://example.invalid/list'});assert.equal((await call(c.Catalog,'listSources')).length,2);await call(c.Catalog,'removeSource',b.id);await assert.rejects(call(c.Catalog,'removeSource','A'));(await call(c.DB,'open')).close();
});
test('teste local negocia TS e cabecalhos; alteracao de credenciais nao reutiliza catalogo antigo',async()=>{
 const c=catalogContext();let params;c.Luna.service=(m,p,cb)=>{params=p;cb({dados:{ok:true,container:'ts',formatos:['ts']}},null)};
 const src={type:'xtream',url:'example.invalid',username:'u',password:'p',headers:{referer:'https://example.invalid/',userAgent:'Test'}};
 const tested=await call(c.Catalog,'testSource',src);assert.equal(tested.container,'ts');assert.equal(params.headers.referer,src.headers.referer);
 const saved=await call(c.Catalog,'saveSource',tested.source);assert.equal(saved.container,'ts');const changed=await call(c.Catalog,'saveSource',{...saved,password:'new'});assert.notEqual(saved.id,changed.id);(await call(c.DB,'open')).close();
});
test('Luna falha: tenta operacao HTTP inteira so com PC disponivel',()=>{
 const c=catalogContext(),calls=[];c.Catalog.setFonte({id:'A',type:'xtream',password:'p'});c.DB.saveSource=(s,a,cb)=>cb(null);
 c.Sync.fonte=(s,o,p,cb)=>{calls.push(o.nome);cb(o===c.Sync.origemLuna?'falha':null,{live:1,container:'ts'})};c.API.check=cb=>cb(true);
 c.Catalog.sincronizar(c.Catalog.getFonte(),null,e=>assert.equal(e,null));assert.deepEqual(calls,['TV','servidor']);assert.equal(c.Catalog.getFonte().container,'ts');
 calls.length=0;c.API.check=cb=>cb(false);c.Catalog.sincronizar(c.Catalog.getFonte(),null,e=>assert.equal(e,'falha'));assert.deepEqual(calls,['TV']);
});
test('sonda MP4 interpreta atoms, ignora moov em payload e nao promete codec',()=>{
 const probe=require('../server/lib/mediaFile');function atom(type,payload=Buffer.alloc(0)){const b=Buffer.alloc(8);b.writeUInt32BE(8+payload.length);b.write(type,4);return Buffer.concat([b,payload])}
 const ftyp=atom('ftyp',Buffer.from('isom0000')),response={statusCode:200,headers:{'content-type':'video/mp4'}};
 assert.equal(probe.inspect(Buffer.concat([ftyp,atom('moov'),atom('mdat')]),response).moovNoInicio,true);
 assert.equal(probe.inspect(Buffer.concat([ftyp,atom('mdat',Buffer.from('moov')),atom('moov')]),response).moovNoInicio,false);
 assert.equal(probe.inspect(Buffer.concat([ftyp,atom('free',Buffer.from('moov'))]),response).moovNoInicio,null);
 assert.equal(probe.inspect(ftyp,{statusCode:404,headers:{}}).ok,false);assert.equal(probe.inspect(ftyp,{statusCode:200,headers:{'content-type':'text/html'}}).ok,false);
 const malformed=Buffer.from([0,0,0,4,109,111,111,118]);assert.equal(probe.inspect(Buffer.concat([ftyp,malformed]),response).moovNoInicio,null);
});
function binaryHarness(status,headers,chunks){let requested,destroyed=0;const http={request:(options,cb)=>{requested=options;const req=new events.EventEmitter();req.destroy=()=>{destroyed++;req.emit('error',Error('aborted'))};req.end=()=>setImmediate(()=>{const res=new events.EventEmitter();res.statusCode=status;res.headers=headers;res.resume=()=>{};cb(res);chunks.forEach(b=>res.emit('data',b));res.emit('end')});return req}};const c=context({Buffer,exports:{},require:n=>n==='http'||n==='https'?http:n==='./config'?{headers:(extra,per)=>({...extra,...per})}:require(n)});load(c,'server/lib/mediaFile.js');return{probe:c.exports,requested:()=>requested,destroyed:()=>destroyed}}
test('amostra limita chunk enorme mesmo sem Range; download completo excedente falha; 404 rejeitado',async()=>{
 const b=Buffer.alloc(2*1024*1024),h=binaryHarness(200,{},[b]);const data=await call(h.probe,'fetchBuffer','http://example.invalid/file',{sampleBytes:65536,perChannel:{referer:'test'}});assert.equal(data.length,65536);assert.equal(h.requested().headers.Range,'bytes=0-65535');assert.equal(h.requested().headers.referer,'test');assert.equal(h.destroyed(),1);
 await assert.rejects(call(binaryHarness(200,{},[b]).probe,'fetchBuffer','http://example.invalid/file',{maxBytes:65536}),/limite/);
  await assert.rejects(call(binaryHarness(404,{},[b]).probe,'fetchBuffer','http://example.invalid/file',{sampleBytes:65536}),/HTTP 404/);
 await assert.rejects(call(binaryHarness(206,{'content-range':'bytes 0-9/500'},[Buffer.alloc(10)]).probe,'fetchBuffer','http://example.invalid/file',{maxBytes:65536}),/HTTP 206/);
 await assert.rejects(call(binaryHarness(206,{'content-range':'bytes 100-200/500'},[b]).probe,'fetchBuffer','http://example.invalid/file',{sampleBytes:65536}),/Content-Range/);
 const ranged=await call(binaryHarness(206,{'content-range':'bytes 0-9/500'},[Buffer.alloc(10)]).probe,'fetchBuffer','http://example.invalid/file',{sampleBytes:65536});assert.equal(ranged.length,10);
});
test('Settings conserva rascunho e foco enquanto lista de fontes chega atrasada',()=>{
 const document=dom();let reply;const c=load(context({document,URL,Keys:{BACK:1,OK:2,UP:3,DOWN:4},Store:{pref(){}},Catalog:{getFonte:()=>null,listSources:cb=>reply=cb,getModo:()=> 'local'},API:{getBase:()=>'',available:()=>false,simularOffline:()=>false}}),'app/js/ui/Settings.js');c.Settings.open(()=>{});
 const inputs=()=>document.ids['set-new'].children.flatMap(x=>x.children).filter(x=>x.tagName==='input');const field=inputs()[0];field.value='Meu cadastro';field.focus();field.oninput();reply(null,[]);assert.equal(inputs()[0],field);assert.equal(field.value,'Meu cadastro');field.blur();assert.equal(inputs()[0].value,'Meu cadastro');c.Settings.close();
});
test('boot abre banco e catalogo antes de consultar PC indisponivel',()=>{
 const document=dom(),time=clock(),order=[];let init;
 function Player(){this.on={}}function HealthMonitor(){}
 const c=context({...time,document,Player,HealthMonitor,Log:{...log,install(){}},navigator:{},screen:{},
  ChannelList:function(){return uiStub()},PosterGrid:function(){return uiStub()},
  Home:function(){return{load(s,cb){order.push('home');if(cb){cb(null,1)}},setFocused(){},move(){return true},
   activate(){},current(){return null},count(){return 1},position(){return{index:0,scrollTop:0}}}},
  Setup:{open(cb){this.cb=cb;this.aberto=true},close(){this.aberto=false},handleKey(){return true},
   isOpen(){return !!this.aberto},step(){return'tipo'},progress(){return{pct:0}}},
  Controls:{mount(){},setItem(i,n){this.item=i;this.hasNext=n},reset(){this.item=null},update(){},
   handleKey(){return false},render(){},zone(){return'seek'},seekable(){return !!(this.item&&(this.item.kind==='vod'||this.item.kind==='episode'))},pending(){return 0}},
  Search:{mount(){},open(){},close(){},handleKey(){return false},focusedItem(){return null},
   zone(){return'input'},editing(){return false},term(){return''}},
  Detail:{mount(){},open(){},close(){},refresh(){},handleKey(){return false},focusedItem(){return null},
   isOpen(){return false},item(){return null},episodes(){return[]},zone(){return'actions'}},
  UpNext:{mount(){},begin(){},clear(){},consider(){},accept(){return false},shouldAdvance(){return false},
   dismiss(){},next(){return null},hide(){},visible(){return false},queue(){return null},dismissed(){return false},countdown(){return 0}},
  Spatial:{blur(){},focus(){},move(){},current:()=>null},
  Library:{init:cb=>cb(null),decorate:(i,cb)=>cb(i)},
  Store:{pref:()=>'',init:cb=>cb(false)},Luna:{panel:()=>null,network:cb=>cb(null,'offline')},
  API:{setBase(){},check(){order.push('health')}},
  Catalog:{getFonte:()=>({id:'A'}),getModo:()=>'local',init:cb=>{order.push('db');init=cb},
   arrancar:cb=>{order.push('cache');cb({pronto:true,canais:1,doBanco:true})},
   categories:(t,cb)=>{order.push('list');cb(null,[])},logoURL:i=>i.logo||null}});
 c.Keys={};let boot;document.addEventListener=(event,fn)=>{if(event==='DOMContentLoaded')boot=fn};
 load(c,'app/js/app.js');boot();assert.deepEqual(order,['db']);init(null);
 // a home abre do banco antes de qualquer sondagem do PC
 assert.deepEqual(order,['db','cache','home','health']);
});
test('C16: resultado de teste antigo nao altera formulario editado; campos sobrevivem ao refresh',()=>{
 const document=dom();let refresh,tested;
 const c=load(context({document,URL,Keys:{BACK:1,OK:2,UP:3,DOWN:4},Store:{pref(){}},Catalog:{getFonte:()=>null,listSources:cb=>refresh=cb,getModo:()=> 'local',testSource:(s,cb)=>tested=cb},API:{getBase:()=>'',available:()=>false,simularOffline:()=>false}}),'app/js/ui/Settings.js');c.Settings.open(()=>{});
 const fields=()=>document.ids['set-new'].children.flatMap(x=>x.children).filter(x=>x.tagName==='input');fields().forEach((f,i)=>{f.value='rascunho-'+i;f.oninput()});
 document.ids['set-new'].children.find(n=>n.textContent==='Testar pela TV').onclick();const name=fields()[0];name.focus();name.value='novo rascunho';name.oninput();refresh(null,[]);tested({message:'erro da fonte antiga'});assert.equal(fields()[0],name);assert.doesNotMatch(document.ids['set-msg'].textContent,/erro da fonte antiga/);name.blur();assert.equal(fields()[0].value,'novo rascunho');assert.equal(fields()[3].value,'rascunho-3');c.Settings.close();
});
test('cabecalhos obrigatorios bloqueiam caminho direto e escolhem proxy adequado quando online',async()=>{
 const c=catalogContext(),src={id:'A',type:'xtream',password:'p',headers:{referer:'https://example.invalid',userAgent:'Test'}};c.Catalog.setFonte(src);
 const id=c.DB.key('A','live','1');c.DB.get=(store,key,cb)=>cb(null,{id,sourceId:'A',url:'https://example.invalid/1.ts',kind:'live'});
 let result=await call(c.Catalog,'play',id);assert.equal(result.naoTocavel,true);assert.equal(result.preferred,null);
 c.API.check=cb=>cb(true);c.API.getBase=()=> 'http://pc';c.API.available=()=>true;result=await call(c.Catalog,'play',id);assert.equal(result.preferred,'native');assert.match(result.nativeUrl,/^http:\/\/pc\/proxy\?/);assert.match(result.nativeUrl,/ref=/);assert.equal(result.fallback,null);
 c.DB.get=(store,key,cb)=>cb(null,{id,sourceId:'A',url:'https://example.invalid/1.m3u8',kind:'live'});result=await call(c.Catalog,'play',id);assert.equal(result.preferred,'hlsjs');
});
test('servico real negocia provedor somente TS, conserva headers e renova autenticacao no reinicio',async()=>{
 let auths=0;const requests=[];
 const config={headers:(extra,per)=>({...extra,'User-Agent':per.userAgent,Referer:per.referer})};
 const http={request:(options,respond)=>{requests.push(options);const req=new events.EventEmitter();req.setTimeout=()=>{};req.destroy=()=>{};req.end=()=>setImmediate(()=>{
   const action=new URL('http://example.invalid'+options.path).searchParams.get('action');let data;
   if(!action){auths++;data={user_info:{auth:1,status:'Active',allowed_output_formats:['ts']}}}else if(action==='get_live_streams'){data=[{stream_id:7,name:'Seven',category_id:'1'}]}else data=[{category_id:'1',category_name:'Cat'}];
   const res=new events.EventEmitter();res.statusCode=200;res.setEncoding=()=>{};respond(res);res.emit('data',JSON.stringify(data));res.emit('end');});return req}};
 function start(){const p=load(context({exports:{},require:n=>n==='http'||n==='https'?http:n==='./config'?config:require(n)}),'services/lib/sources.js');const methods={};function Service(){this.register=(n,f)=>methods[n]=f;this.activityManager={}}
   load(context({Buffer,process,require:n=>n==='webos-service'?Service:n==='./lib/sources'?p.exports:n==='./lib/config'?config:n==='./lib/playlist'?{}:n==='./lib/mediaFile'?{}:require(n)}),'services/service.js');return payload=>new Promise(resolve=>methods.xtream({payload,respond:resolve}));}
 let invoke=start();const params={url:'http://example.invalid',username:'u',password:'p',sourceId:'A',headers:{userAgent:'Test',referer:'https://example.invalid'}};
 const first=await invoke({...params,acao:'canais'});assert.equal(first.returnValue,true);assert.equal(first.container,'ts');assert.match(first.items[0].url,/7\.ts$/);assert.equal(first.items[0].headers.referer,params.headers.referer);
 await invoke({...params,acao:'categorias'});assert.equal(auths,1);assert.ok(requests.every(r=>r.headers.Referer===params.headers.referer&&r.headers['User-Agent']==='Test'));
 invoke=start();const again=await invoke({...params,acao:'canais'});assert.equal(auths,2);assert.match(again.items[0].url,/7\.ts$/);
});
test('proxy de arquivo repassa Range e interrompe upstream ao fechar player',()=>{
 let options,up;const http={request:(o,cb)=>{options=o;up=new events.EventEmitter();up.destroy=()=>up.destroyed=true;up.end=()=>{const r=new events.EventEmitter();r.statusCode=206;r.headers={'content-type':'video/mp4','content-range':'bytes 100-199/1000','accept-ranges':'bytes','content-length':'100'};r.pipe=()=>{};cb(r)};return up}};
 const c=load(context({exports:{},require:n=>n==='http'||n==='https'?http:n==='./config'?{headers:(a,p)=>({...p})}:require(n)}),'server/lib/proxy.js');const res=new events.EventEmitter(),headers={};res.setHeader=(k,v)=>headers[k]=v;res.writeHead=code=>res.status=code;res.end=()=>{};
 c.exports.media({headers:{range:'bytes=100-199'}},res,'http://example.invalid/file.mp4','http://pc',0,{referer:'test'});assert.equal(options.headers.Range,'bytes=100-199');assert.equal(headers['Content-Range'],'bytes 100-199/1000');assert.equal(res.status,206);res.emit('close');assert.equal(up.destroyed,true);
});
