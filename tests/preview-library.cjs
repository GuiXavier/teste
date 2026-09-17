// Previa visual isolada: fixtures, sem provedor/PC/TV. Nao entra no IPK.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../app');
const fixture=`(function(){
var film={id:DB.key('preview-A','vod','1'),sourceId:'preview-A',kind:'vod',name:'Filme de demonstracao',category:'Filmes'},live={id:DB.key('preview-A','live','1'),sourceId:'preview-A',kind:'live',name:'Canal de demonstracao',category:'TV'};
Catalog.init=function(cb){Catalog.setFonte({id:'preview-A',name:'Fonte de demonstracao'});Library.init(function(e){if(e)return cb(e);DB.metaGet('preview-seeded',function(err,seed){if(seed)return cb(null);Library.toggle(film,function(error){if(error)return cb(error);Library.save(film,325,3600,false,function(fail){if(fail)return cb(fail);DB.metaSet('preview-seeded',true,cb);});});});});};
Catalog.arrancar=function(cb){cb({pronto:true,canais:1,doBanco:true});};
Catalog.categories=function(type,cb){cb(null,[{id:'demo',name:type==='vod'?'Filmes de demonstracao':'TV de demonstracao',count:type==='series'?0:1}]);};
Catalog.channels=function(o,cb){cb(null,{total:1,items:[o.type==='vod'?film:live]});};
Catalog.play=function(id,cb){cb(null,{naoTocavel:true,note:'Previa visual: nenhum video ou provedor conectado.'});};
API.check=function(cb){cb(false);};Luna.network=function(cb){cb(null,'Previa isolada');};
})();`;
http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 if(pathname==='/fixture.js'){res.setHeader('Content-Type','application/javascript');return res.end(fixture);}
 const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 fs.readFile(file,(e,body)=>{if(e){res.writeHead(404);return res.end();}res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)]||'application/octet-stream');
 if(pathname==='/'||pathname==='/index.html')body=body.toString().replace('<script src="js/app.js">','<script src="/fixture.js"></script><script src="js/app.js">');res.end(body);});
}).listen(8874,'127.0.0.1',()=>console.log('Previa isolada: http://127.0.0.1:8874'));
