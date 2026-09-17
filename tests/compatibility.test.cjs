const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),acorn=require('acorn');
const root=path.resolve(__dirname,'..');
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)])}
test('codigo proprio do app e ES5; servico e ES2017; backend tem sintaxe valida',()=>{
  for(const f of files(path.join(root,'app/js')).filter(f=>f.endsWith('.js')))acorn.parse(fs.readFileSync(f,'utf8'),{ecmaVersion:5});
  for(const f of files(path.join(root,'services')).filter(f=>f.endsWith('.js')))acorn.parse(fs.readFileSync(f,'utf8'),{ecmaVersion:2017});
  for(const f of files(path.join(root,'server')).filter(f=>f.endsWith('.js')))new vm.Script(fs.readFileSync(f,'utf8'),{filename:f});
  for(const f of ['sources.js','playlist.js','mediaFile.js'])assert.equal(fs.readFileSync(path.join(root,'server/lib',f),'utf8'),fs.readFileSync(path.join(root,'services/lib',f),'utf8'));
});
test('Catalog preserva fonte ativa quando sync falha e nao reativa fonte de solicitacao antiga',async()=>{
  const pending={},prefs={};const ctx={window:null,Store:{pref:(k,v)=>v===undefined?prefs[k]:(prefs[k]=v)},
    DB:{saveSource:(s,a,cb)=>cb(null)},API:{check:cb=>cb(false),getBase:()=>'',simularOffline:()=>false},Log:{info(){},warn(){}},Luna:{service:(m,p,cb)=>cb({node:'8',rssMB:1},null)},
    Sync:{origemLuna:{},origemHttp:{},fonte:(src,org,prog,cb)=>pending[src.id]=cb}};
  ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'app/js/catalog.js'),'utf8'),ctx);
  const A={id:'A',type:'xtream',password:'test'},B={id:'B',type:'xtream',password:'test'};
  ctx.Catalog.setFonte(A);let error;
  ctx.Catalog.sincronizar(B,null,e=>error=e);assert.equal(ctx.Catalog.getFonte().id,'A');pending.B('failed');assert.equal(error,'failed');assert.equal(ctx.Catalog.getFonte().id,'A');
  ctx.Catalog.sincronizar(A,null,()=>{});ctx.Catalog.sincronizar(B,null,()=>{});
  pending.B(null,{});pending.A(null,{});assert.equal(ctx.Catalog.getFonte().id,'B');assert.equal(prefs.fonteLocal,'null');
});
