const fs=require('node:fs'),assert=require('node:assert/strict'),{gzipSync}=require('node:zlib');
const html=fs.readFileSync('index.html','utf8');
assert.ok(!/\son\w+\s*=|javascript:/i.test(html),'Inline executable HTML is forbidden');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(ids.length,new Set(ids).size,'Duplicate IDs');
for(const m of html.matchAll(/(?:src|href)="([^"#]+)"/g))if(!/^https?:/.test(m[1]))assert.ok(fs.existsSync(m[1]),`Missing asset: ${m[1]}`);
for(const m of html.matchAll(/href="#([^"]+)"/g))assert.ok(ids.includes(m[1]),`Missing anchor ${m[1]}`);
const scripts=[...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m=>m[1]);
assert.equal(scripts.length,new Set(scripts).size,'Duplicate scripts');
for(const file of fs.readdirSync('.').filter(f=>f.endsWith('.js'))){
 const source=fs.readFileSync(file,'utf8');
 assert.ok(!/\beval\s*\(|new Function\s*\(|\.innerHTML\s*=/.test(source),`Unsafe code in ${file}`);
}
const csp=require('../vercel.json').headers[0].headers.find(h=>h.key==='Content-Security-Policy').value;
assert.ok(csp.includes("object-src 'none'")&&csp.includes("frame-ancestors 'none'")&&!csp.includes('unsafe-eval'));
const bytes=fs.readdirSync('.').filter(f=>/\.(js|css)$/.test(f)).reduce((sum,f)=>sum+gzipSync(fs.readFileSync(f)).length,0);
assert.ok(bytes<45000,`First-party JS/CSS gzip budget exceeded: ${bytes}/45000`);
for(const file of ['images/franciana-mobile.mp4','images/franciana-scroll.mp4'])assert.ok(fs.statSync(file).size<4*1024*1024,`Video budget exceeded: ${file}`);
console.log(`Architecture, assets and security checks passed. JS/CSS gzip: ${bytes}/45000 bytes; intro videos <4 MiB each.`);
