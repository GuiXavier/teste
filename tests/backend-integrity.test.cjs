const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),url=require('node:url');
const root=path.resolve(__dirname,'..');
function harness(){
  let active='A', handler, mode={}, activationFail=false;const held=[];
  const sources={A:{id:'A',type:'xtream',name:'A'},B:{id:'B',type:'xtream',name:'B'}};
  const asyncResult=(s,method,data,cb)=>{const fail=mode[s.id+':'+method];const finish=()=>cb(fail?new Error(method+' failed'):null,data);if(mode.hold===method){held.push(finish)}else{setTimeout(finish,mode.delay||0)}};
  const provider=s=>({auth:cb=>asyncResult(s,'auth',{ok:true},cb),getCategories:cb=>asyncResult(s,'liveCats',[{id:'1',name:s.id}],cb),
    getChannels:(o,cb)=>asyncResult(s,'live',[{id:'x1',streamId:1,name:s.id,category:'1',url:'https://example.invalid/'+s.id}],cb),
    getVodCategories:cb=>asyncResult(s,'vodCats',[{id:'1',name:s.id+' VOD'}],cb),getSeriesCategories:cb=>asyncResult(s,'seriesCats',[{id:'1',name:s.id+' Series'}],cb),
    getVod:(o,cb)=>asyncResult(s,'vod',[{id:'v1',streamId:1,name:s.id,category:'1',url:'https://example.invalid/'+s.id}],cb),
    getSeries:(o,cb)=>asyncResult(s,'series',[{id:'s1',seriesId:1,name:s.id,category:'1'}],cb),
    getSeriesInfo:(id,cb)=>asyncResult(s,'episodes',{seasons:[{season:1,episodes:[{id:'e1',episodeId:1,name:s.id,url:'https://example.invalid/'+s.id}]}],totalEpisodios:1},cb)});
  const modules={http:{createServer:fn=>{handler=fn;return{listen(){}}}},url,path,os:require('node:os'),fs:{existsSync:()=>true},
    './lib/playbackHistory':{create:()=>({append(){},report:()=>({sessoes:0}),diagnostic:()=>({})})},
    './lib/sources':{create:provider},'./lib/sourceStore':{active:()=>sources[active],byId:id=>sources[id],activate:id=>{if(activationFail)throw Error('disk');active=id},sanitizeList:()=>[]},
    './lib/validator':{run(){}},'./lib/playlist':{},'./lib/enrich':{},'./lib/config':{},'./lib/proxy':{},'./lib/diag':{},'./lib/probe':{}};
  const ctx={require:n=>modules[n]||require(n),__dirname:path.join(root,'server'),console:{log(){}},process:{env:{},on(){}},setTimeout,setInterval(){},Buffer};
  vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'server/server.js'),'utf8'),ctx);
  function request(route,method='GET'){return new Promise(resolve=>{let status;handler({url:route,method,headers:{host:'localhost'},on(){}},{writeHead:s=>status=s,end:body=>resolve({status,body:JSON.parse(body)})})})}
  function reload(id,activate=false){return new Promise((resolve,reject)=>ctx.reload((e,r)=>e?reject(e):resolve(r),sources[id],activate))}
  return{ctx,request,reload,setMode:m=>mode=m,active:()=>active,failActivation:()=>activationFail=true,release:()=>held.splice(0).forEach(f=>f())};
}
test('troca de fonte publica tudo junto; todas as falhas preservam estado e fonte persistida',async()=>{
  const h=harness();await h.reload('A');const state=h.ctx.STATE;
  for(const step of ['auth','liveCats','live','vodCats','seriesCats']){
    h.setMode({['B:'+step]:true});await assert.rejects(h.reload('B',true));assert.equal(h.ctx.STATE,state);assert.equal(h.active(),'A');
  }
  h.setMode({delay:10});const pending=h.request('/api/sources/B/activate','POST');
  assert.equal(h.ctx.STATE,state);assert.equal(h.active(),'A');
  const response=await pending;assert.equal(response.status,200);assert.equal(h.active(),'B');assert.equal(h.ctx.STATE.source.id,'B');assert.equal(h.ctx.STATE.channels[0].name,'B');
  assert.notEqual(h.ctx.STATE.generation,state.generation);assert.deepEqual(Array.from(h.ctx.STATE.episodeCache),[]);
});
test('falha ao persistir ativacao nao publica candidato',async()=>{const h=harness();await h.reload('A');const state=h.ctx.STATE;h.failActivation();await assert.rejects(h.reload('B',true));assert.equal(h.ctx.STATE,state);assert.equal(h.active(),'A')});
test('HTTP exige fonte; inclui identidade e nao filtra mortos durante sync',async()=>{
  const h=harness();await h.reload('A');h.ctx.STATE.channels[0].status='dead';
  assert.equal((await h.request('/api/channels?sync=1')).status,400);
  assert.equal((await h.request('/api/channels?sync=1&sourceId=B')).status,409);
  const cats=await h.request('/api/categories?sync=1&sourceId=A');assert.equal(cats.body.sourceId,'A');assert.ok(cats.body.generation);
  const r=await h.request('/api/channels?sync=1&sourceId=A&offset=0&limit=500');assert.equal(r.body.total,1);assert.ok(r.body.snapshot);
  await h.reload('A');assert.equal((await h.request('/api/categories?sync=1&sourceId=A&generation='+cats.body.generation)).status,409);
});
test('categoria com falha responde erro; callback antigo nao contamina fonte nova',async()=>{
  const h=harness();await h.reload('A');h.setMode({'A:vod':true});
  assert.equal((await h.request('/api/channels?sync=1&sourceId=A&type=vod&category=1')).status,502);
  h.setMode({hold:'vod'});const pending=h.request('/api/channels?sync=1&sourceId=A&type=vod&category=1');
  h.setMode({});await h.reload('B',true);h.release();assert.equal((await pending).status,409);assert.equal(Object.keys(h.ctx.STATE.moviesByCat).length,0);
});
test('episodios de callback antigo nao entram no cache da nova fonte',async()=>{
  const h=harness();await h.reload('A');h.setMode({hold:'episodes'});const pending=h.request('/api/series/s1?sync=1&sourceId=A');
  h.setMode({});await h.reload('B',true);h.release();assert.equal((await pending).status,409);assert.equal(h.ctx.STATE.episodeCache.length,0);
});
test('ativacoes concorrentes sao serializadas e cada resposta descreve sua geracao',async()=>{
  const h=harness();await h.reload('A');h.setMode({delay:2});const a=h.request('/api/sources/B/activate','POST'),b=h.request('/api/sources/A/activate','POST');
  const results=await Promise.all([a,b]);assert.equal(results[0].body.active,'B');assert.equal(results[1].body.active,'A');assert.equal(h.active(),'A');assert.equal(h.ctx.STATE.source.id,'A');
});

test('IDs entregues a interface incluem fonte e tipo; play antigo nao abre item da nova fonte',async()=>{
  const h=harness();await h.reload('A');
  const list=await h.request('/api/channels?limit=5');const id=list.body.items[0].id;
  assert.deepEqual(JSON.parse(id.slice(3)),['A','live','1']);
  assert.equal((await h.request('/api/play/'+encodeURIComponent(id))).status,200);
  await h.reload('B',true);assert.equal((await h.request('/api/play/'+encodeURIComponent(id))).status,409);
  assert.equal((await h.request('/api/series/'+encodeURIComponent('k2:'+JSON.stringify(['A','series','7'])))).status,409);
});
