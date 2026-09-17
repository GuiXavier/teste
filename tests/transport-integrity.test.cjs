const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),events=require('node:events');
const root=path.resolve(__dirname,'..');
const m3u=name=>'#EXTM3U\n#EXTINF:-1 tvg-name="'+name+'" group-title="News",'+name+'\nhttps://example.invalid/'+name+'.m3u8\n';
function playlistHarness(t){
  const dir=fs.mkdtempSync(path.join(__dirname,'cache-test-'));t.after(()=>{assert.equal(path.dirname(path.resolve(dir)),path.resolve(__dirname));assert.ok(path.basename(dir).startsWith('cache-test-'));fs.rmSync(dir,{recursive:true,force:true})});
  let fetches=0,fail=false,renameFail=false;
  const http={request:(opts,respond)=>{fetches++;const req=new events.EventEmitter();req.setTimeout=()=>{};req.destroy=()=>{};
    req.end=()=>setImmediate(()=>{if(fail){req.emit('error',Error('network'));return}const res=new events.EventEmitter();res.statusCode=200;res.headers={};res.setEncoding=()=>{};respond(res);res.emit('data',m3u(opts.pathname.slice(1)));res.emit('end')});return req}};
  const fakeFs=Object.create(fs);fakeFs.renameSync=(a,b)=>{if(renameFail)throw Error('disk');fs.renameSync(a,b)};
  const ctx={require:n=>n==='http'||n==='https'?http:n==='fs'?fakeFs:n==='./config'?{get:()=>({splitCategories:true}),headers:()=>({})}:require(n),exports:{},Buffer};
  vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'server/lib/playlist.js'),'utf8'),ctx);
  const load=(name,src='source')=>new Promise((resolve,reject)=>ctx.exports.load(dir,(e,r)=>e?reject(e):resolve(r),'http://example.invalid/'+name,src));
  return{ctx,dir,load,fetches:()=>fetches,fail:()=>fail=true,renameFail:()=>renameFail=true};
}
test('M3U A -> B -> A usa caches diferentes e ignora cache legado sem origem',async t=>{
  const h=playlistHarness(t);fs.writeFileSync(path.join(h.dir,'playlist.m3u'),m3u('OLD'));
  assert.equal((await h.load('A')).channels[0].name,'A');assert.equal((await h.load('B')).channels[0].name,'B');
  assert.equal((await h.load('A')).channels[0].name,'A');assert.equal(h.fetches(),2);
  await h.load('A','other-source');assert.equal(h.fetches(),3);
  h.fail();await assert.rejects(h.load('C'));
});
test('cache vencido so faz fallback para mesma origem; erro no rename preserva arquivo antigo',async t=>{
  const h=playlistHarness(t);await h.load('A');const name=fs.readdirSync(h.dir).find(f=>f.endsWith('.json')),file=path.join(h.dir,name);
  const entry=JSON.parse(fs.readFileSync(file));entry.fetchedAt=1;fs.writeFileSync(file,JSON.stringify(entry));const before=fs.readFileSync(file,'utf8');
  h.renameFail();await assert.rejects(h.load('A'));assert.equal(fs.readFileSync(file,'utf8'),before);
  h.fail();const cached=await h.load('A');assert.equal(cached.stale,true);assert.equal(cached.channels[0].name,'A');await assert.rejects(h.load('B'));
  assert.equal(fs.readdirSync(h.dir).filter(x=>x.endsWith('.tmp')).length,0);
});
test('identidade M3U independe de nome/ordem e mantem URLs distintas',t=>{
  const h=playlistHarness(t),p=h.ctx.exports;
  const a=p.parse(m3u('A')+m3u('B')),b=p.parse(m3u('B')+m3u('A'));
  assert.equal(a.channels[0].id,b.channels[1].id);assert.notEqual(a.channels[0].id,a.channels[1].id);
  const renamed=p.parse(m3u('A').replaceAll('"A"','"Renamed"'));assert.equal(renamed.channels[0].id,a.channels[0].id);
});
test('Luna separa cache por senha, pagina categorias e identifica snapshot/fonte',async()=>{
  const methods={},counts={};
  function Service(){this.activityManager={};this.register=(name,fn)=>methods[name]=fn}
  const sources={create:src=>({container:'ts',auth:cb=>cb(null,{ok:true,container:'ts'}),getCategories:cb=>{counts[src.password]=(counts[src.password]||0)+1;cb(null,Array.from({length:401},(_,i)=>({id:String(i),name:'C'+i})))}})};
  const ctx={require:n=>n==='./lib/mediaFile'?require('../services/lib/mediaFile'):n==='webos-service'?Service:n==='./lib/sources'?sources:n==='./lib/config'?{}:n==='./lib/playlist'?{}:require(n),process,Buffer,console,setTimeout,clearTimeout};
  vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'services/service.js'),'utf8'),ctx);
  const invoke=p=>new Promise(resolve=>methods.xtream({payload:p,respond:resolve}));
  const params={url:'https://example.invalid',username:'u',password:'first',sourceId:'A',acao:'categorias',limit:400};
  const a=await invoke({...params,offset:0}),b=await invoke({...params,offset:400});
  assert.equal(a.sourceId,'A');assert.equal(a.total,401);assert.equal(a.items.length,400);assert.equal(b.items.length,1);assert.equal(a.snapshot,b.snapshot);assert.equal(counts.first,1);
  await invoke({...params,password:'second'});assert.equal(counts.second,1);
});
