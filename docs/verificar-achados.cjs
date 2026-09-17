// Reproduções isoladas; não usa a rede, a TV nem o IndexedDB do usuário.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert'),zlib=require('zlib'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'); const results=[];
function check(name,fn){try{results.push({name,...fn()})}catch(e){results.push({name,error:e.message})}}
// C01/C02 agora exigem o comportamento corrigido, exercitando o IndexedDB.
check('Regressoes C01/C02: preservacao e contagem de poda',()=>{
 const cp=require('node:child_process');
 const run=cp.spawnSync(process.execPath,['--test','--test-name-pattern=paginas incompletas|publicacao completa','tests/catalog-integrity.test.cjs'],{cwd:root,encoding:'utf8'});
 assert.strictEqual(run.status,0,run.stdout+'\\n'+run.stderr);
 return {passed:true,regression:true};
});
check('Parser EXTINF com vírgula em atributo',()=>{const p=require('../server/lib/playlist');const r=p.parse('#EXTM3U\n#EXTINF:-1 tvg-name="Canal, Um" group-title="Noticias",Titulo\nhttps://example.invalid/live.m3u8');assert.notStrictEqual(r.channels[0].name,'Canal, Um');return {reproduced:true,actual:{name:r.channels[0].name,category:r.channels[0].category},expected:{name:'Canal, Um',category:'Noticias'}}});
check('Parser preserva atributos e categorias simples',()=>{const p=require('../server/lib/playlist');const r=p.parse('#EXTM3U\n#EXTINF:-1 tvg-name="Canal Um" group-title="Noticias;Educacao" catchup="default",Titulo\nhttps://example.invalid/live.m3u8');assert.strictEqual(r.channels[0].name,'Canal Um');assert.strictEqual(r.channels[0].categories.length,2);assert.strictEqual(r.channels[0].attrs.catchup,'default');return {passed:true}});
check('Proxy reescreve segmentos, chaves, mapas e cabeçalhos',()=>{const p=require('../server/lib/proxy');const r=p.rewriteM3U8('#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="key"\n#EXT-X-MAP:URI="init.mp4"\nseg.ts','https://example.invalid/path/main.m3u8','http://localhost:8099',{userAgent:'teste',referer:'https://example.invalid/'});assert.strictEqual((r.match(/\/proxy\?url=/g)||[]).length,3);assert.strictEqual((r.match(/&ua=teste/g)||[]).length,3);return {passed:true}});
// AR e TAR: inspeciona bytes do pacote sem executar ou instalar.
const ipk=fs.readFileSync(path.join(root,'com.iptv.tvapp_0.1.0_all.ipk'));
const members={};for(let p=8;p+60<=ipk.length;){const h=ipk.subarray(p,p+60).toString();const name=h.slice(0,16).trim().replace(/\/$/,'');const n=parseInt(h.slice(48,58),10);if(!Number.isFinite(n))break;members[name]=ipk.subarray(p+60,p+60+n);p+=60+n+(n%2)}
function tar(b){const out=[];for(let p=0;p+512<=b.length;){const h=b.subarray(p,p+512);let name=h.subarray(0,100).toString().replace(/\0.*$/s,'');if(!name)break;const prefix=h.subarray(345,500).toString().replace(/\0.*$/s,'');if(prefix)name=prefix+'/'+name;const n=parseInt(h.subarray(124,136).toString().replace(/\0.*$/s,'').trim(),8)||0;out.push({name,body:b.subarray(p+512,p+512+n),type:h[156]});p+=512+Math.ceil(n/512)*512}return out}
const entries=tar(zlib.gunzipSync(members['data.tar.gz']));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const packed=entries.filter(e=>e.type===48||e.type===0).map(e=>{let rel=null;if(e.name.includes('/applications/com.iptv.tvapp/'))rel='app/'+e.name.split('/applications/com.iptv.tvapp/')[1];if(e.name.includes('/services/com.iptv.tvapp.service/'))rel='services/'+e.name.split('/services/com.iptv.tvapp.service/')[1];const local=rel&&fs.existsSync(path.join(root,rel));return {path:e.name,localPath:rel,bytes:e.body.length,sha256:hash(e.body),equalToLocal:local?hash(fs.readFileSync(path.join(root,rel)))===hash(e.body):null,textStart:rel?.endsWith('.js')?e.body.toString('utf8').slice(0,100):null,buildMarkers:rel==='app/js/app.js'?[...e.body.toString('utf8').matchAll(/0911-\d{4}/g)].map(m=>m[0]):undefined}});
fs.writeFileSync(path.join(__dirname,'inspecao-ipk.json'),JSON.stringify({members:Object.keys(members),files:packed},null,2));
fs.writeFileSync(path.join(__dirname,'verificacao-achados.json'),JSON.stringify(results,null,2));
console.log(JSON.stringify({results,ipk:{files:packed.length,compared:packed.filter(x=>x.equalToLocal!==null).length,different:packed.filter(x=>x.equalToLocal===false).map(x=>x.localPath)}},null,2));
