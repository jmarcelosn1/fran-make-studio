const fs=require('node:fs'),assert=require('node:assert/strict'),{gzipSync}=require('node:zlib');
for(const page of ['index.html','portfolio.html']){
 const html=fs.readFileSync(page,'utf8');
 assert.ok(!/\son\w+\s*=|javascript:/i.test(html),`Inline executable HTML is forbidden: ${page}`);
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(ids.length,new Set(ids).size,`Duplicate IDs in ${page}`);
 for(const m of html.matchAll(/(?:src|href)="([^"#]+)"/g))if(!/^https?:/.test(m[1]))assert.ok(fs.existsSync(m[1]),`Missing asset in ${page}: ${m[1]}`);
 for(const m of html.matchAll(/href="#([^"]+)"/g))assert.ok(ids.includes(m[1]),`Missing anchor in ${page}: ${m[1]}`);
 // Ancora entre paginas: o alvo precisa existir na pagina de destino.
 for(const m of html.matchAll(/href="([a-z0-9-]+.html)#([^"]+)"/g)){
  const destino=fs.readFileSync(m[1],'utf8');
  assert.ok(new RegExp('id="'+m[2]+'"').test(destino),`Dead cross-page anchor in ${page}: ${m[1]}#${m[2]}`);
 }
 const scripts=[...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(scripts.length,new Set(scripts).size,`Duplicate scripts in ${page}`);
 // Imagem sem dimensao declarada empurra o layout quando carrega (CLS). As que
 // nao trazem src no HTML recebem origem e tamanho por JS e nao deslocam nada.
 for(const m of html.matchAll(/<img\b[^>]*>/g)){
  if(!/\bsrc="/.test(m[0]))continue;
  assert.ok(/\bwidth="\d+"/.test(m[0])&&/\bheight="\d+"/.test(m[0]),`Image without width/height in ${page}: ${m[0].slice(0,90)}`);
 }
}
for(const file of fs.readdirSync('.').filter(f=>f.endsWith('.js'))){
 const source=fs.readFileSync(file,'utf8');
 assert.ok(!/\beval\s*\(|new Function\s*\(|\.innerHTML\s*=/.test(source),`Unsafe code in ${file}`);
}
const csp=require('../vercel.json').headers[0].headers.find(h=>h.key==='Content-Security-Policy').value;
assert.ok(csp.includes("object-src 'none'")&&csp.includes("frame-ancestors 'none'")&&!csp.includes('unsafe-eval'));
const bytes=fs.readdirSync('.').filter(f=>/\.(js|css)$/.test(f)).reduce((sum,f)=>sum+gzipSync(fs.readFileSync(f)).length,0);
assert.ok(bytes<45000,`First-party JS/CSS gzip budget exceeded: ${bytes}/45000`);
for(const file of ['images/franciana-mobile.mp4','images/franciana-scroll.mp4','images/pincel-scroll.mp4','images/pincel-scroll-mobile.mp4'])assert.ok(fs.statSync(file).size<4*1024*1024,`Video budget exceeded: ${file}`);
// O scrub por scroll depende de keyframes densos; sem isso cada seek redecodifica desde o inicio.
for(const file of ['images/pincel-scroll.mp4','images/pincel-scroll-mobile.mp4'])assert.ok(fs.existsSync(file),`Missing brush video: ${file}`);
console.log(`Architecture, assets and security checks passed. JS/CSS gzip: ${bytes}/45000 bytes; intro videos <4 MiB each.`);
