const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve('dist');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.mp4':'video/mp4','.txt':'text/plain; charset=utf-8','.json':'application/json'};
const headers=Object.fromEntries(require('../vercel.json').headers[0].headers.map(h=>[h.key,h.value]));
http.createServer((req,res)=>{
 try{
  const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(root,`.${name==='/'?'/index.html':name}`);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){
   const pagina=path.join(root,'404.html');
   if(!fs.existsSync(pagina)){res.writeHead(404);return res.end();}
   res.writeHead(404,{...headers,'Content-Type':mime['.html']});return fs.createReadStream(pagina).pipe(res);
  }
  res.writeHead(200,{...headers,'Content-Type':mime[path.extname(file)]||'application/octet-stream'});
  fs.createReadStream(file).pipe(res);
 }catch{res.writeHead(400);res.end();}
}).listen(4173,'127.0.0.1',()=>console.log('Preview http://127.0.0.1:4173'));
