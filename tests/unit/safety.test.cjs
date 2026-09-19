const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const {localAsset, googleURL} = require('../../safety.js');
test('only local image/video assets are accepted', () => {
  const base='https://studio.example/';
  assert.equal(localAsset('images/franciana.webp',base),'https://studio.example/images/franciana.webp');
  for(const value of ['',null,42,'https://other.example/a.png','javascript:alert(1)','data:image/png,test','/a.svg','/a.js','https://user:pass@studio.example/a.png']) assert.equal(localAsset(value,base),'',String(value));
  assert.equal(localAsset('/a.png','bad'), '');
  assert.equal(localAsset('file:///a.png','file:///'), '');
});
test('map links reject lookalike hosts, unsafe protocols and fake embed paths',()=>{
  assert.equal(googleURL('https://maps.app.goo.gl/gSEBqmsFhHYvpRUdA'),'https://maps.app.goo.gl/gSEBqmsFhHYvpRUdA');
  assert.equal(googleURL('https://www.google.com/maps/embed?pb=x',true),'https://www.google.com/maps/embed?pb=x');
  for(const value of ['bad','http://google.com/maps','https://google.com.evil.test/maps','javascript:alert(1)','https://x:y@google.com/maps'])assert.equal(googleURL(value),'');
  for(const value of ['https://maps.app.goo.gl/test','https://google.com/maps/embed-malicious','https://google.com/maps/search'])assert.equal(googleURL(value,true),'');
});
test('browser exposes the same frozen boundary',()=>{
  const context=vm.createContext({URL});
  vm.runInContext(fs.readFileSync('safety.js','utf8'),context);
  assert.equal(typeof context.FRAN_SAFETY.googleURL,'function');
  assert.ok(Object.isFrozen(context.FRAN_SAFETY));
});
