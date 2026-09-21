const fs=require('node:fs');
const path=require('node:path');
const root=process.cwd(), output=path.resolve(root,'dist');
if(path.dirname(output)!==root || path.basename(output)!=='dist')throw Error('Invalid output');
fs.rmSync(output,{recursive:true,force:true});
fs.mkdirSync(output);
for(const name of require('./site-files.cjs')) fs.cpSync(path.join(root,name),path.join(output,name),{recursive:true});
// _headers para Cloudflare Pages, gerado do vercel.json (fonte unica, lida tambem
// pelo servidor de testes e pelos contratos). Padroes com regex nao existem la; o
// cache de HTML/JS/CSS que eles cobrem ja e o padrao da Cloudflare.
const blocos=[];
for(const {source,headers} of require('../vercel.json').headers){
  const rota=source.replace('/(.*)','/*');
  if(/[()\\]/.test(rota))continue;
  blocos.push(`${rota}\n${headers.map(h=>`  ${h.key}: ${h.value}`).join('\n')}`);
}
fs.writeFileSync(path.join(output,'_headers'),`${blocos.join('\n')}\n`);
console.log('Public build ready: dist/ (no tests, credentials, or internal documents).');
