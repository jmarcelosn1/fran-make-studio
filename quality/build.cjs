const fs=require('node:fs');
const path=require('node:path');
const root=process.cwd(), output=path.resolve(root,'dist');
if(path.dirname(output)!==root || path.basename(output)!=='dist')throw Error('Invalid output');
fs.rmSync(output,{recursive:true,force:true});
fs.mkdirSync(output);
for(const name of require('./site-files.cjs')) fs.cpSync(path.join(root,name),path.join(output,name),{recursive:true});
console.log('Public build ready: dist/ (no tests, credentials, or internal documents).');
