const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {IDBFactory,IDBKeyRange}=require('fake-indexeddb');
const root=path.resolve(__dirname,'..'),call=(o,m,...args)=>new Promise((resolve,reject)=>o[m](...args,(e,r)=>e?reject(Error(String(e))):resolve(r)));
function env(factory=new IDBFactory(),storage=new Map()){
 const c={indexedDB:factory,IDBKeyRange,console,Date,setTimeout,clearTimeout,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}};
 c.window=c;vm.createContext(c);for(const f of ['app/js/platform/db.js','app/js/platform/Library.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),c);return c;
}
function item(c,source='A',type='vod',id='1'){return{id:c.DB.key(source,type,id),sourceId:source,kind:type==='episodes'?'episode':type,name:'Mesmo titulo',url:'http://secret.invalid/password',headers:{referer:'segredo'}}}
test('favoritos: toggle atomico, isolamento por fonte/tipo, paginacao e persistencia apos reabrir',async()=>{
 const factory=new IDBFactory(),c=env(factory),a=item(c),b=item(c,'B'),episode=item(c,'A','episodes');
 assert.equal(await call(c.Library,'toggle',a),true);await call(c.Library,'toggle',b);await call(c.Library,'toggle',episode);
 let page=await call(c.Library,'page','favorites','A',0,1);assert.equal(page.total,2);assert.equal(page.items.length,1);assert.ok(!JSON.stringify(page).includes('secret'));
 assert.notEqual((await call(c.Library,'page','favorites','A',1,1)).items[0].id,page.items[0].id);
 const results=await Promise.all([call(c.Library,'toggle',a),call(c.Library,'toggle',a)]);assert.deepEqual(results,[false,true]);
 (await call(c.DB,'open')).close();const reopened=env(factory);assert.equal((await call(reopened.Library,'page','favorites','A',0,120)).total,2);assert.equal((await call(reopened.Library,'page','favorites','B',0,120)).total,1);
 assert.equal(await call(reopened.Library,'toggle',a),false);(await call(reopened.DB,'open')).close();
});
test('historico: filmes/episodios persistem, live nao entra, concluido sai e inicio zera',async()=>{
 const factory=new IDBFactory(),c=env(factory),a=item(c),ep=item(c,'A','episodes'),b=item(c,'B');
 await call(c.Library,'save',a,80,1000,false);await call(c.Library,'save',ep,150,1800,false);await call(c.Library,'save',b,99,1000,false);await call(c.Library,'save',item(c,'A','live'),99,1000,false);
 assert.equal((await call(c.Library,'page','history','A',0,120)).total,2);
 (await call(c.DB,'open')).close();const d=env(factory);assert.equal((await call(d.Library,'progress',a)).position,80);
 await call(d.Library,'save',ep,1790,1800,false);assert.equal((await call(d.Library,'page','history','A',0,120)).total,1);
 await call(d.Library,'save',a,0,null,false);assert.equal((await call(d.Library,'page','history','A',0,120)).total,0);
 await call(d.Library,'save',a,50,NaN,true);assert.equal((await call(d.Library,'progress',a)).completed,true);(await call(d.DB,'open')).close();
});
test('checkpoint sincrono recupera fechamento antes de finalizar IndexedDB',async()=>{
 const storage=new Map(),c=env(new IDBFactory(),storage),a=item(c);await call(c.Library,'init');
 const pending=call(c.Library,'save',a,321,1000,false);const journal=storage.get('iptv.progressJournal');assert.equal(JSON.parse(journal).position,321);await pending;assert.equal(storage.has('iptv.progressJournal'),false);
 storage.set('iptv.progressJournal',journal);const d=env(new IDBFactory(),storage);assert.equal((await call(d.Library,'progress',a)).position,321);assert.equal(storage.has('iptv.progressJournal'),false);
 (await call(c.DB,'open')).close();(await call(d.DB,'open')).close();
});
test('falha de gravacao e identidade invalida nao anunciam sucesso',async()=>{
 const c=env(),a=item(c);await assert.rejects(call(c.Library,'toggle',{...a,sourceId:'B'}),/Sincronize/);
 await call(c.Library,'toggle',a);const open=c.DB.open;c.DB.open=cb=>cb('quota indisponivel');await assert.rejects(call(c.Library,'toggle',a),/quota/);c.DB.open=open;
 assert.equal((await call(c.Library,'page','favorites','A',0,10)).total,1);(await call(c.DB,'open')).close();
});
test('poda do catalogo preserva favoritos e progresso e nao guarda URL em dados pessoais',async()=>{
 const c=env(),a=item(c);await call(c.DB,'putMany','vod',[{id:'v1',streamId:1,name:'Filme',url:a.url}],'A',null);
 await call(c.Library,'toggle',a);await call(c.Library,'save',a,70,300,false);await call(c.DB,'pruneSource','vod','A',[]);
 assert.equal((await call(c.Library,'page','favorites','A',0,10)).total,1);const row=await call(c.Library,'progress',a);assert.equal(row.position,70);assert.equal(row.url,undefined);assert.equal(row.headers,undefined);(await call(c.DB,'open')).close();
});
function resume(){const events={},writes=[],notices=[];let time=100000;const video={currentTime:0,duration:1000,addEventListener:(n,f)=>{(events[n]||(events[n]=[])).push(f)}};
 const c={Library:{save:(...args)=>{writes.push(args.slice(0,4));args[4](null)}},Date:{now:()=>time}};c.window=c;vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(root,'app/js/player/Resume.js'),'utf8'),c);
 return{video,writes,notices,r:new c.ResumePlayback(video,m=>notices.push(m)),fire:n=>(events[n]||[]).forEach(f=>f()),tick:()=>time+=11000};}
test('retomada espera metadata e seek confirmado; retry nao grava zero nem perde ponto',()=>{
 const h=resume();h.r.begin({id:'film',kind:'vod'},120);h.r.checkpoint(false);assert.equal(h.writes.length,0);
 h.fire('loadedmetadata');assert.equal(h.video.currentTime,120);h.tick();h.fire('timeupdate');assert.equal(h.writes.length,0);
 h.fire('seeked');h.video.currentTime=135;h.fire('pause');assert.equal(h.writes.at(-1)[1],135);
 h.r.retry();h.video.currentTime=0;h.fire('pause');assert.equal(h.writes.at(-1)[1],135);h.fire('loadedmetadata');assert.equal(h.video.currentTime,135);
 h.fire('seeked');h.video.currentTime=140;h.r.checkpoint(false);assert.equal(h.writes.at(-1)[1],140);
 h.r.clear();h.video.currentTime=0;h.fire('pause');assert.equal(h.writes.at(-1)[1],140);
});
test('inicio/fim, pause e checkpoint periodico; live nao salva e falha antes de metadata preserva',()=>{
 const h=resume();h.r.begin({id:'film',kind:'vod'},0);h.video.currentTime=99;h.fire('pause');assert.equal(h.writes.length,0);
 h.video.currentTime=0;h.fire('loadedmetadata');h.video.currentTime=11;h.tick();h.fire('timeupdate');assert.equal(h.writes.at(-1)[1],11);
 h.video.currentTime=1000;h.r.checkpoint(true);assert.equal(h.writes.at(-1)[3],true);h.r.clear();const n=h.writes.length;
 h.r.begin({id:'live',kind:'live'},0);h.fire('loadedmetadata');h.video.currentTime=30;h.fire('pause');assert.equal(h.writes.length,n);
});
test('seek aguarda faixa, aceita nova duracao e nao sobrescreve ponto se seek falhar',()=>{
 const h=resume();h.r.begin({id:'ep',kind:'episode'},400);h.video.seekable={length:1,start:()=>0,end:()=>100};h.fire('loadedmetadata');assert.equal(h.video.currentTime,0);
 h.video.seekable.end=()=>1000;h.fire('progress');assert.equal(h.video.currentTime,400);h.fire('seeked');h.r.checkpoint(false);assert.equal(h.writes.at(-1)[1],400);
 const x=resume();x.r.begin({id:'ep',kind:'episode'},500);Object.defineProperty(x.video,'currentTime',{get:()=>0,set(){throw Error('not seekable')}});x.fire('loadedmetadata');x.fire('pause');assert.equal(x.writes.length,0);assert.equal(x.notices.length,1);
});
