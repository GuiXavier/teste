const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { IDBFactory, IDBKeyRange } = require('fake-indexeddb');
const root = path.resolve(__dirname, '..');
const plain = value => JSON.parse(JSON.stringify(value));
const call = (obj, method, ...args) => new Promise((resolve, reject) => obj[method](...args, (e, r) => e ? reject(new Error(String(e))) : resolve(r)));
const item = (n, extra = {}) => ({ id: 'x' + n, streamId: n, name: 'Canal ' + n, url: 'https://example.invalid/' + n + '.m3u8', category: '1', ...extra });
const source = id => ({ id, type: 'xtream', url: 'https://example.invalid', username: 'test', password: 'test' });
function context(factory = new IDBFactory()) {
  const ctx = { indexedDB: factory, IDBKeyRange, setTimeout, clearTimeout, console, Date, Log: {warn(){}, info(){}} };
  ctx.window = ctx; vm.createContext(ctx);
  for (const file of ['app/js/platform/db.js', 'app/js/platform/sync.js']) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), ctx);
  return ctx;
}
function origin(items, overrides = {}) {
  return { nome: 'TV', categorias: (s, type, cb) => cb(null, [{id:'1', name: type === 'live' ? 'Noticias' : 'Categoria'}]),
    itens: (s, type, cat, off, lim, cb) => cb(null, { total: items.length, offset: off, snapshot: 'snapshot1', items: items.slice(off, off + lim) }), ...overrides };
}
async function rows(ctx, store = 'live', id = 'A') { return plain((await call(ctx.DB, 'query', {store, sourceId:id, limit:10000})).items); }
async function seed(ctx) { await call(ctx.Sync, 'fonte', source('A'), origin([item(1), item(2)]), null); }
async function metadata(ctx) { return plain(await call(ctx.DB, 'metaGet', 'sync:A')); }

test('paginas incompletas, vazias, sem total, offset errado, mudanca de snapshot e erro preservam todo o catalogo', async t => {
  const cases = {
    curta: (o,l,cb) => cb(null,{total:1000,offset:o,snapshot:'s',items:[item(8),item(9)]}),
    vazia: (o,l,cb) => cb(null,{total:900,offset:o,snapshot:'s',items:o ? [] : Array.from({length:l},(_,i)=>item(i+10))}),
    semTotal: (o,l,cb) => cb(null,{offset:o,snapshot:'s',items:[]}),
    offset: (o,l,cb) => cb(null,{total:1,offset:5,snapshot:'s',items:[item(8)]}),
    totalMuda: (o,l,cb) => cb(null,{total:o ? 401 : 800,offset:o,snapshot:'s',items:Array.from({length:o?1:l},(_,i)=>item(o+i+10))}),
    snapshotMuda: (o,l,cb) => cb(null,{total:401,offset:o,snapshot:o?'novo':'velho',items:Array.from({length:o?1:l},(_,i)=>item(o+i+10))}),
    idInvalido: (o,l,cb) => cb(null,{total:1,offset:o,snapshot:'s',items:[item('undefined')]}),
    duplicado: (o,l,cb) => cb(null,{total:2,offset:o,snapshot:'s',items:[item(8),item(8)]}),
    rede: (o,l,cb) => o ? cb('rede') : cb(null,{total:800,offset:o,snapshot:'s',items:Array.from({length:l},(_,i)=>item(i+10))}),
    timeout: (o,l,cb) => cb('timeout')
  };
  for (const [name, response] of Object.entries(cases)) await t.test(name, async () => {
    const ctx=context(); await seed(ctx); const before=await rows(ctx), meta=await metadata(ctx);
    await assert.rejects(call(ctx.Sync,'fonte',source('A'),origin([], {itens:(s,t,c,o,l,cb)=>response(o,l,cb)}),null));
    assert.deepEqual(await rows(ctx),before); assert.deepEqual(await metadata(ctx),meta);
    const attempt=await call(ctx.DB,'metaGet','syncAttempt:A'); assert.notEqual(attempt.status,'complete');
    const db=await call(ctx.DB,'open'); const stage=await new Promise(resolve=>{const req=db.transaction('staging').objectStore('staging').count();req.onsuccess=()=>resolve(req.result)});
    assert.equal(stage,0); db.close();
  });
});

test('publicacao completa remove apenas os ausentes e informa contagem real, inclusive vazio com total explicito', async()=>{
  const ctx=context(); await seed(ctx);
  const report=await call(ctx.Sync,'fonte',source('A'),origin([item(2)]),null);
  assert.equal(report.podados,1); assert.equal(report.status,'complete'); assert.equal((await rows(ctx))[0].providerId,'2');
  const empty=await call(ctx.Sync,'fonte',source('A'),origin([]),null);
  assert.equal(empty.podados,1); assert.equal((await rows(ctx)).length,0);
});

test('falha de categorias depois do live nao publica dados nem muda lastSuccess',async()=>{
  const ctx=context(); await seed(ctx); const before=await rows(ctx), meta=await metadata(ctx);
  await assert.rejects(call(ctx.Sync,'fonte',source('A'),origin([item(3)],{categorias:(s,t,cb)=>t==='series'?cb('indisponivel'):cb(null,[{id:'1',name:'Outra'}])}),null));
  assert.deepEqual(await rows(ctx),before); assert.deepEqual(await metadata(ctx),meta);
  assert.equal((await call(ctx.DB,'metaGet','syncAttempt:A')).status,'partial');
});

test('colisoes de ID entre fontes/tipos e episodios da mesma serie sao isoladas',async()=>{
  const ctx=context(); await seed(ctx); await call(ctx.Sync,'fonte',source('B'),origin([item(1,{name:'B'})]),null);
  assert.equal((await rows(ctx,'live','A')).length,2); assert.equal((await rows(ctx,'live','B'))[0].name,'B');
  const org=origin([], {serieInfo:(s,id,cb)=>{assert.equal(id,'7');cb(null,{seasons:[{season:1,episodes:[item(9,{id:'e9',episodeId:9,kind:'episode',name:s.id,season:1,num:1})]}],totalEpisodios:1});}});
  for(const id of ['A','B']) await call(ctx.Sync,'serie',source(id),org,ctx.DB.key(id,'series','7'));
  const a=await call(ctx.DB,'episodesOf','A',ctx.DB.key('A','series','7'));
  const b=await call(ctx.DB,'episodesOf','B',ctx.DB.key('B','series','7'));
  assert.equal(a[0].name,'A');assert.equal(b[0].name,'B');assert.notEqual(a[0].id,b[0].id);
  await assert.rejects(call(ctx.DB,'episodesOf','A',ctx.DB.key('B','series','7')));
  assert.notEqual(ctx.DB.key('A','live','1'),ctx.DB.key('A','vod','1'));
});

test('categoria expirada substitui itens, falhas preservam cache e sync geral preserva timestamp',async()=>{
  const ctx=context(); await seed(ctx);
  const vod=origin([item(1,{id:'v1',kind:'vod'}),item(2,{id:'v2',kind:'vod'})]);
  await call(ctx.Sync,'categoria',source('A'),vod,'vod','1',null);
  const original=plain(await call(ctx.DB,'get','categories','A|vod|1'));
  await call(ctx.Sync,'fonte',source('A'),origin([item(1)]),null);
  assert.equal((await call(ctx.DB,'get','categories','A|vod|1')).carregadaEm,original.carregadaEm);
  let reg=await call(ctx.DB,'get','categories','A|vod|1');reg.carregadaEm=1;await call(ctx.DB,'put','categories',reg);
  const before=await rows(ctx,'vod');
  await assert.rejects(call(ctx.Sync,'categoria',source('A'),origin([],{itens:(s,t,c,o,l,cb)=>cb('rede')}),'vod','1',null));
  assert.deepEqual(await rows(ctx,'vod'),before);
  await call(ctx.Sync,'categoria',source('A'),origin([item(2,{id:'v2',kind:'vod'})]),'vod','1',null);
  assert.equal((await rows(ctx,'vod')).length,1);
  await call(ctx.Sync,'fonte',source('A'),origin([item(1)],{categorias:(s,t,cb)=>cb(null,t==='live'?[{id:'1',name:'Noticias'}]:[])}),null);
  assert.equal((await rows(ctx,'vod')).length,0);assert.equal((await call(ctx.DB,'categoriesOf','A','vod')).length,0);
});

test('duas sincronizacoes da mesma fonte sao serializadas',async()=>{
  const ctx=context(), events=[];
  function delayed(label,n){return origin([item(n)],{itens:(s,t,c,o,l,cb)=>{events.push(label+' start');setTimeout(()=>{events.push(label+' end');cb(null,{total:1,offset:0,snapshot:label,items:[item(n)]})},20)}})}
  await Promise.all([call(ctx.Sync,'fonte',source('A'),delayed('first',1),null),call(ctx.Sync,'fonte',source('A'),delayed('second',2),null)]);
  assert.deepEqual(events,['first start','first end','second start','second end']);assert.equal((await rows(ctx))[0].providerId,'2');
});

test('abort real de transacao reverte inclusoes, poda, categorias e marcador',async()=>{
  const ctx=context();await seed(ctx);const before=await rows(ctx),meta=await metadata(ctx);
  const db=await call(ctx.DB,'open'); const tx=db.transaction.bind(db);
  db.transaction=function(stores,mode){const result=tx(stores,mode);if(Array.isArray(stores)&&stores.includes('staging')&&stores.includes('meta')){const os=result.objectStore.bind(result);result.objectStore=function(name){const st=os(name);if(name==='meta'){const put=st.put.bind(st);st.put=function(v){const req=put(v);if(v.id==='sync:A'){req.onsuccess=()=>result.abort()}return req}}return st}}return result};
  await assert.rejects(call(ctx.Sync,'fonte',source('A'),origin([item(9)]),null));
  db.transaction=tx;assert.deepEqual(await rows(ctx),before);assert.deepEqual(await metadata(ctx),meta);
});

test('migra banco v1 sem apagar favoritos/historico e converte referencia de serie',async()=>{
  const factory=new IDBFactory();
  // Replica esquema v1 e registros legados em uma factory isolada.
  const old=await new Promise((resolve,reject)=>{const r=factory.open('iptv',1);r.onerror=()=>reject(r.error);r.onsuccess=()=>resolve(r.result);r.onupgradeneeded=()=>{
    const d=r.result;for(const n of ['meta','sources','favorites','history'])d.createObjectStore(n,{keyPath:'id'});
    const cats=d.createObjectStore('categories',{keyPath:'id'});cats.createIndex('srcType',['sourceId','type']);
    for(const n of ['live','vod','series','episodes']){const s=d.createObjectStore(n,{keyPath:'id'});s.createIndex('src','sourceId');s.createIndex('srcPos',['sourceId','pos']);s.createIndex('srcName',['sourceId','nameLower']);s.createIndex('catKeys','catKeys',{multiEntry:true});if(n==='episodes')s.createIndex('serie','seriesId')}
  }});
  await new Promise((resolve,reject)=>{const t=old.transaction(['live','episodes','favorites','history'],'readwrite');t.oncomplete=resolve;t.onabort=()=>reject(t.error);
    t.objectStore('live').put(item(1,{sourceId:'A',pos:0}));t.objectStore('episodes').put(item(9,{id:'e9',episodeId:9,seriesId:'s7',sourceId:'A',pos:0}));
    t.objectStore('favorites').put({id:'f1',sourceId:'A',type:'live',itemId:'x1',addedAt:4});t.objectStore('history').put({id:'legacy',watchedAt:5,position:99});});
  old.close();
  const ctx=context(factory);await call(ctx.DB,'open');
  assert.equal((await rows(ctx))[0].id,ctx.DB.key('A','live','1'));
  assert.equal((await call(ctx.DB,'episodesOf','A',ctx.DB.key('A','series','7'))).length,1);
  assert.equal((await call(ctx.DB,'get','favorites','f1')).itemId,ctx.DB.key('A','live','1'));
  assert.equal((await call(ctx.DB,'get','history','legacy')).position,99);
});

test('HTTP rejeita fonte diferente e mudanca de geracao',async()=>{
  const ctx=context();ctx.API={categories:(o,cb)=>cb(null,{sourceId:'B',generation:'g',items:[]})};
  await assert.rejects(call(ctx.Sync.origemHttp,'categorias',source('A'),'live'));
  const src=source('A');ctx.API.categories=(o,cb)=>cb(null,{sourceId:'A',generation:'g1',items:[]});
  await call(ctx.Sync.origemHttp,'categorias',src,'live');ctx.API.categories=(o,cb)=>cb(null,{sourceId:'A',generation:'g2',items:[]});
  await assert.rejects(call(ctx.Sync.origemHttp,'categorias',src,'vod'));
});

test('SHA-256 dos IDs M3U legados equivale ao backend e nao expoe URL',()=>{
  const ctx=context(),crypto=require('node:crypto');
  for(const url of ['https://example.invalid/live','https://example.invalid/ação?token=segredo','https://example.invalid/'+ 'x'.repeat(200)]){
    const id=ctx.DB.providerId({id:'canal',url},'live');assert.equal(id,'m3u:'+crypto.createHash('sha256').update(url).digest('hex'));assert.ok(!id.includes('segredo'));
  }
});

test('podar serie removida tambem remove episodios e preserva outras fontes',async()=>{
  const ctx=context();await seed(ctx);
  const org=origin([item(7,{id:'s7',seriesId:7,kind:'series'})],{serieInfo:(s,id,cb)=>cb(null,{seasons:[{season:1,episodes:[item(9,{id:'e9',episodeId:9})]}],totalEpisodios:1})});
  await call(ctx.Sync,'categoria',source('A'),org,'series','1',null);await call(ctx.Sync,'serie',source('A'),org,'s7');
  await call(ctx.Sync,'serie',source('B'),org,'s7');
  await call(ctx.Sync,'fonte',source('A'),origin([item(1)],{categorias:(s,t,cb)=>cb(null,t==='live'?[{id:'1',name:'Noticias'}]:[])}),null);
  assert.equal((await call(ctx.DB,'episodesOf','A','s7')).length,0);assert.equal((await call(ctx.DB,'episodesOf','B','s7')).length,1);
});

test('falha no staging nao altera dados ativos e informa erro uma unica vez',async()=>{
  const ctx=context();await seed(ctx);const before=await rows(ctx),meta=await metadata(ctx);
  const db=await call(ctx.DB,'open'),original=db.transaction.bind(db);let callbacks=0;
  db.transaction=function(stores,mode){const tx=original(stores,mode);if(stores==='staging'&&mode==='readwrite'){const os=tx.objectStore.bind(tx);tx.objectStore=name=>{const st=os(name);st.put=()=>{throw Error('quota simulada')};return st}}return tx};
  await new Promise(resolve=>ctx.Sync.fonte(source('A'),origin([item(9)]),null,(e)=>{callbacks++;assert.ok(e);resolve()}));
  db.transaction=original;assert.deepEqual(await rows(ctx),before);assert.deepEqual(await metadata(ctx),meta);assert.equal(callbacks,1);
});

test('colecao inteira publica de uma vez, marca as categorias e poda o que sumiu do provedor', async () => {
  const ctx = context();
  // a fonte traz as categorias de filmes; a colecao chega depois, numa tacada
  const cats = [{ id: '1', name: 'Acao' }, { id: '2', name: 'Drama' }];
  const filme = (n, cat) => ({ id: 'v' + n, streamId: n, name: 'Filme ' + n,
    url: 'https://example.invalid/' + n + '.mp4', category: String(cat), kind: 'vod' });
  const origemBase = origin([item(1)], {
    categorias: (s, type, cb) => cb(null, type === 'live' ? [{ id: '1', name: 'Noticias' }] : cats)
  });
  await call(ctx.Sync, 'fonte', source('A'), origemBase, null);

  // uma unica chamada, sem category_id: e o que substitui uma requisicao por categoria
  const pedidos = [];
  const colecao = (lista) => ({ ...origemBase,
    itens: (s, type, cat, off, lim, cb) => {
      if (type !== 'vod') { return origemBase.itens(s, type, cat, off, lim, cb); }
      pedidos.push(cat);
      cb(null, { total: lista.length, offset: off, snapshot: 's1', items: lista.slice(off, off + lim) });
    } });

  const r = await call(ctx.Sync, 'colecao', source('A'), colecao([filme(1, 1), filme(2, 1), filme(3, 2)]), 'vod', null);
  assert.equal(r.total, 3);
  assert.deepEqual(pedidos, ['__all__']);           // uma chamada so, para tudo
  const vod = await rows(ctx, 'vod', 'A');
  assert.equal(vod.length, 3);
  assert.deepEqual(vod.map(v => v.category).sort(), ['Acao', 'Acao', 'Drama']);

  const categorias = plain(await call(ctx.DB, 'categoriesOf', 'A', 'vod'));
  assert.deepEqual(categorias.map(c => [c.name, c.count]).sort(), [['Acao', 2], ['Drama', 1]]);
  assert.ok(categorias.every(c => c.carregadaEm > 0), 'categorias ficam marcadas como carregadas');

  // o provedor perdeu o filme 2: a colecao nova manda o que existe e o resto sai
  await call(ctx.Sync, 'colecao', source('A'), colecao([filme(1, 1), filme(3, 2)]), 'vod', null);
  const depois = await rows(ctx, 'vod', 'A');
  assert.deepEqual(depois.map(v => v.name).sort(), ['Filme 1', 'Filme 3']);
  (await call(ctx.DB, 'open')).close();
});

test('colecao que falha no meio preserva o catalogo anterior inteiro', async () => {
  const ctx = context();
  const cats = [{ id: '1', name: 'Acao' }];
  const filme = n => ({ id: 'v' + n, streamId: n, name: 'Filme ' + n,
    url: 'https://example.invalid/' + n + '.mp4', category: '1', kind: 'vod' });
  const base = origin([item(1)], {
    categorias: (s, type, cb) => cb(null, type === 'live' ? [{ id: '1', name: 'Noticias' }] : cats)
  });
  await call(ctx.Sync, 'fonte', source('A'), base, null);
  await call(ctx.Sync, 'colecao', source('A'), { ...base,
    itens: (s, type, cat, off, lim, cb) => type === 'vod'
      ? cb(null, { total: 2, offset: off, snapshot: 's1', items: [filme(1), filme(2)].slice(off, off + lim) })
      : base.itens(s, type, cat, off, lim, cb) }, 'vod', null);
  assert.equal((await rows(ctx, 'vod', 'A')).length, 2);

  await assert.rejects(call(ctx.Sync, 'colecao', source('A'), { ...base,
    itens: (s, type, cat, off, lim, cb) => type === 'vod'
      ? cb(new Error('rede caiu no meio'))
      : base.itens(s, type, cat, off, lim, cb) }, 'vod', null));

  const preservado = await rows(ctx, 'vod', 'A');
  assert.deepEqual(preservado.map(v => v.name).sort(), ['Filme 1', 'Filme 2']);
  const staging = plain(await call(ctx.DB, 'query', { store: 'vod', sourceId: 'A', limit: 10000 }));
  assert.equal(staging.items.length, 2);
  (await call(ctx.DB, 'open')).close();
});
