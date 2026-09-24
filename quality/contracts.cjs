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
 // Previa no WhatsApp e endereco oficial so funcionam com URL completa.
 for(const re of [/<link rel="canonical" href="([^"]+)"/,/<meta property="og:image" content="([^"]+)"/,/<meta property="og:url" content="([^"]+)"/])
  assert.ok(/^https:\/\//.test((html.match(re)||[])[1]||''),`Relative or missing ${re.source.slice(1,26)} in ${page}`);
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
// So o que vai para o ar (o guia fica fora do build e nao pesa para ninguem).
const bytes=require('./site-files.cjs').filter(f=>/\.(js|css)$/.test(f)).reduce((sum,f)=>sum+gzipSync(fs.readFileSync(f)).length,0);
assert.ok(bytes<45000,`First-party JS/CSS gzip budget exceeded: ${bytes}/45000`);
// Home: sem precos, sem foto repetida (o logo da navbar e do rodape e marca, nao
// foto) e sem video na abertura, que agora e uma tela so, sem rolagem conduzida.
const home=fs.readFileSync('index.html','utf8');
assert.ok(!/R\$\s*\d/.test(home),'Prices are not shown on the home page');
const fotos=[...home.matchAll(/<img\b[^>]*\bsrc="(images\/[^"]+)"/g)].map(m=>m[1]).filter(f=>!/logo/.test(f));
assert.equal(fotos.length,new Set(fotos).size,`Duplicate photo on the home page: ${fotos.filter((f,i)=>fotos.indexOf(f)!==i)}`);
assert.ok(!/<video\b/.test(home),'The home opening has no video');
// A primeira pagina do portfolio (nove fotos) nao repete a apresentacao da home.
const base=f=>f.replace(/^images\/|(-m|-full)?\.(webp|jpg)$/g,'');
const capa=[...home.matchAll(/<div class="cf-card"[^>]*><img\b[^>]*\bsrc="(images\/[^"]+)"/g)].map(m=>base(m[1]));
const pagina=[...fs.readFileSync('portfolio.html','utf8').matchAll(/<button class="pf-item[^"]*"[^>]*><img\b[^>]*\bsrc="(images\/[^"]+)"/g)].slice(0,9).map(m=>base(m[1]));
assert.equal(capa.length,6,'The home presentation has six photos');
assert.deepEqual(capa.filter(f=>pagina.includes(f)),[],'The first portfolio page repeats a home photo');
console.log(`Architecture, assets and security checks passed. JS/CSS gzip: ${bytes}/45000 bytes.`);
