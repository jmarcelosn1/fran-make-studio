const {test,expect}=require('@playwright/test');
const AxeBuilder=require('@axe-core/playwright').default;
// Erros de dentro do iframe do Google Maps nao sao do site (o WebKit os repassa a pagina).
// "Could not load" e o carregador de modulos do Maps, que falha as vezes no WebKit de teste.
const doSite=e=>!/maps\.googleapis\.com|gstatic\.com|google\.com\/maps|^Error: Could not load "/.test(e.message);
test('public build omits internal files and sends security headers',async({request})=>{
 const response=await request.get('/');
 expect(response.headers()['content-security-policy']).toContain("frame-ancestors 'none'");
 expect(response.headers()['x-content-type-options']).toBe('nosniff');
 expect(response.headers()['strict-transport-security']).toContain('max-age=');
 // Scripts sem inline nem eval; o unico inline liberado e o atributo style (SplitType).
 const csp=response.headers()['content-security-policy'];
 expect(csp).not.toContain('unsafe-eval');
 // Tudo da propria origem: sem CDN e sem Google Fonts.
 expect(csp).not.toMatch(/unpkg|cdnjs|googleapis|gstatic/);
 expect(csp.replace("style-src-attr 'unsafe-inline'",'')).not.toContain('unsafe');
 for(const file of ['package.json','QUALIDADE.md','.env','tests/unit/safety.test.cjs','guia.html','guia.js','config.js.bak','.git/config','_fontes/franciana.jpg','.claude/settings.local.json'])expect((await request.get('/'+file)).status()).toBe(404);
});
// O build gera _headers (Cloudflare Pages) a partir do vercel.json; aqui o servidor
// local o entrega como arquivo, o que da para conferir o conteudo gerado.
test('cloudflare _headers carries the same security headers',async({request})=>{
 const h=await (await request.get('/_headers')).text();
 for(const k of ['Content-Security-Policy','Strict-Transport-Security','X-Frame-Options','Cross-Origin-Opener-Policy','Permissions-Policy'])expect(h).toContain(k+': ');
 expect(h).toContain("frame-ancestors 'none'");
 expect(h).toContain('/images/*\n  Cache-Control: ');
});
test('services, map, accessibility and responsive layout',async({page})=>{
 const errors=[];page.on('pageerror',e=>{if(doSite(e))errors.push(e.message);});
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/');
 await expect(page.locator('#servicos h3')).toHaveCount(3);
 await expect(page.locator('#contato a[href*="wa.me"]')).toHaveCount(1);
 await expect(page.locator('#servicos .service-preco')).toHaveText(['R$ 119,90','R$ 219,90','Faça seu orçamento']);
 await expect(page.locator('#servicos a[href*="wa.me"]')).toHaveCount(3);
 await page.locator('#servicos').scrollIntoViewIfNeeded();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 const accessibility=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
 expect(accessibility.violations).toEqual([]);
 await page.locator('#mapa').scrollIntoViewIfNeeded();
 await expect(page.locator('#map-placeholder')).toBeVisible();
 await expect(page.locator('#mapa a[href*="maps.app.goo.gl"]')).toBeVisible();
 expect(errors).toEqual([]);
});
test('portfolio lightbox opens, Escape closes and focus returns',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/portfolio.html');
 const card=page.locator('.pf-item').first();await card.click();
 await expect(page.locator('#lightbox')).toBeVisible();
 await page.keyboard.press('Escape');await expect(page.locator('#lightbox')).not.toBeVisible();
 await expect(card).toBeFocused();
});
test('animation libraries failing leaves content and booking usable',async({page})=>{
 await page.route('**/vendor/**',r=>r.abort());
 await page.goto('/');await page.locator('#servicos').scrollIntoViewIfNeeded();
 await page.locator('#contato').scrollIntoViewIfNeeded();
 await expect(page.locator('#contato a[href*="wa.me"]')).toBeVisible();
 await expect(page.locator('#contato a[href*="wa.me"]')).toHaveAttribute('href','https://wa.me/message/2SNOKRBPREBYH1');
});
test('intro is reversible and never flashes the portrait initially',async({page})=>{
 await page.goto('/');
 await expect(page.locator('.hero-photo')).toHaveCSS('visibility','hidden');
 await page.evaluate(()=>scrollTo(0,document.querySelector('#hero').offsetHeight));
 await expect(page.locator('#navbar')).toHaveAttribute('aria-hidden','false');
 await page.evaluate(()=>scrollTo(0,0));
 await expect(page.locator('#navbar')).toHaveAttribute('aria-hidden','true');
 await expect(page.locator('.hero-photo')).toHaveCSS('visibility','hidden');
});

test('carousel opens a panel and the caption follows',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 await page.locator('.sq-strip').scrollIntoViewIfNeeded();
 const aberto=()=>page.evaluate(()=>({
  painel:document.querySelector('.sq-panel[data-aberto]')?.dataset.i,
  copia:document.querySelector('.sq-slide[data-aberto]')?.dataset.i}));
 expect(await aberto()).toEqual({painel:'0',copia:'0'});
 await page.click('.sq-arrow[data-sq="1"]');
 await expect(page.locator('.sq-panel[data-i="1"][data-aberto]')).toHaveCount(1);
 expect(await aberto()).toEqual({painel:'1',copia:'1'});
 // clicar num painel estreito abre aquele, nao o vizinho
 await page.evaluate(()=>{const ps=[...document.querySelectorAll('.sq-panel')]
  .sort((a,b)=>+getComputedStyle(a).order-+getComputedStyle(b).order); ps[2].click();});
 await expect(page.locator('.sq-panel[data-i="3"][data-aberto]')).toHaveCount(1);
 const fim=await aberto();
 expect(fim.painel).toBe(fim.copia);
});

// Com a animacao ligada: o teste acima usa reducedMotion e nunca pegaria isto.
// Uma rajada de cliques abria vao preto na direita e fazia o painel dar tranco.
test('carousel survives a burst of clicks without gaps or jumps',async({page})=>{
 await page.goto('/');
 await page.locator('.sq-strip').scrollIntoViewIfNeeded();
 await page.evaluate(()=>{window.__q=[];const vp=document.querySelector('.sq-viewport');
  (function l(){const r=vp.getBoundingClientRect();
   const bs=[...document.querySelectorAll('.sq-panel')].map(e=>e.getBoundingClientRect());
   window.__q.push({vao:r.right-Math.max(...bs.map(x=>x.right)),maior:Math.max(...bs.map(x=>x.width))});
   requestAnimationFrame(l);})();});
 for(let i=0;i<8;i++) await page.click('.sq-arrow[data-sq="1"]');
 // Espera assentar em vez de um tempo fixo: no WebKit, com os testes em paralelo, os quadros ficam mais lentos.
 await expect.poll(()=>page.evaluate(()=>{const vp=document.querySelector('.sq-viewport').getBoundingClientRect();
  return Math.round(document.querySelector('.sq-panel[data-aberto]').getBoundingClientRect().x-vp.x);}),{timeout:10000}).toBe(0);
 const q=await page.evaluate(()=>window.__q);
 expect(q.filter(x=>x.vao>2).length).toBe(0);
 let saltos=0; for(let k=1;k<q.length;k++) if(Math.abs(q[k].maior-q[k-1].maior)>200) saltos++;
 expect(saltos).toBe(0);
 const fim=await page.evaluate(()=>{const vp=document.querySelector('.sq-viewport').getBoundingClientRect();
  const ab=document.querySelector('.sq-panel[data-aberto]');
  return {x:Math.round(ab.getBoundingClientRect().x-vp.x),copia:document.querySelector('.sq-slide[data-aberto]').dataset.i,
   painel:ab.dataset.i,sombra:'sombra' in ab.dataset};});
 expect(fim.x).toBe(0);
 expect(fim.painel).toBe(fim.copia);
 expect(fim.sombra).toBe(false);
});

// Vindo do portfolio para uma secao, o navegador pintava o topo antes de rolar
// ate a ancora e a intro aparecia por um quadro.
test('arriving at a section by anchor never flashes the intro',async({page})=>{
 await page.addInitScript(()=>{window.__vis=0;const t0=performance.now();
  const reg=()=>{const hero=document.querySelector('#hero'),im=document.querySelector('.intro-media');
   if(hero&&im){const r=im.getBoundingClientRect();
    if(getComputedStyle(hero).visibility!=='hidden'&&getComputedStyle(im).visibility!=='hidden'&&+getComputedStyle(im).opacity>.05&&r.bottom>0&&r.top<innerHeight) window.__vis++;}
   if(performance.now()-t0<2000) requestAnimationFrame(reg);};
  requestAnimationFrame(reg);});
 await page.goto('/portfolio.html');
 await page.evaluate(()=>{location.href='index.html#servicos';});
 await page.waitForURL(/#servicos$/);
 await page.waitForTimeout(2200);
 expect(await page.evaluate(()=>window.__vis)).toBe(0);
 const topo=await page.evaluate(()=>document.getElementById('servicos').getBoundingClientRect().top);
 expect(topo).toBeGreaterThanOrEqual(0);
 expect(topo).toBeLessThan(260);
});

// O painel sob o mouse abria de uma vez, estalando. Agora abre aos poucos.
test('hovering a carousel panel opens it gradually, not in one jump',async({page},info)=>{
 test.skip(!!info.project.use.isMobile,'sem ponteiro de mouse no celular');
 await page.goto('/');
 await page.locator('.sq-strip').scrollIntoViewIfNeeded();
 await page.waitForTimeout(700);
 const alvo=await page.evaluate(()=>{const ps=[...document.querySelectorAll('.sq-panel')]
  .sort((a,b)=>+getComputedStyle(a).order-+getComputedStyle(b).order);
  const r=ps[1].getBoundingClientRect(); window.__p=ps[1]; return [r.x+r.width/2,r.y+r.height/2];});
 await page.evaluate(()=>{window.__w=[];(function l(){window.__w.push(window.__p.getBoundingClientRect().width);
  if(window.__w.length<120) requestAnimationFrame(l);})();});
 await page.mouse.move(alvo[0]-40,alvo[1]);
 await page.mouse.move(alvo[0],alvo[1],{steps:4});
 await page.waitForTimeout(1200);
 const w=await page.evaluate(()=>window.__w);
 const inicio=w[0], fim=w[w.length-1];
 expect(fim-inicio).toBeGreaterThan(20);
 let maior=0, quadros=0;
 for(let k=1;k<w.length;k++){ const d=Math.abs(w[k]-w[k-1]); maior=Math.max(maior,d); if(d>.5) quadros++; }
 expect(quadros).toBeGreaterThanOrEqual(6);
 expect(maior).toBeLessThan((fim-inicio)*.5);
});

// No celular o pincel gira com o dedo pela animacao inteira, como o video
// conduzido pela rolagem no desktop, mas por quadros num canvas: sem seek de
// video (lento no celular) e sem autoplay. Em laco, quem rolava rapido via so
// um pedaco do giro.
const quadroDoPincel=async(page,pr)=>{
 const g=await page.evaluate(()=>{const H=document.querySelector('#hero'),s=document.querySelector('.hero-stage');return {a:H.offsetTop,r:H.offsetHeight-s.offsetHeight};});
 await page.evaluate(v=>scrollTo(0,v),Math.round(g.a+g.r*pr));
 await page.waitForTimeout(300);
 return page.evaluate(()=>Number(document.querySelector('.brush-quadros')?.dataset.quadro??-1));
};
// As 4 folhas de quadros baixadas e decodificadas (a rede nao fica ociosa no WebKit: o video segue baixando).
const folhasProntas=async page=>{await page.waitForFunction(()=>performance.getEntriesByType('resource').filter(e=>/pincel-quadros-\d\.webp/.test(e.name)).length===4);await page.waitForTimeout(400);};
test('mobile brush turns with the scroll through the whole animation',async({page},info)=>{
 test.skip(!info.project.use.isMobile,'comportamento so do celular');
 await page.route(/google\.com|gstatic\.com|googleapis\.com/,r=>r.abort());
 await page.goto('/');
 await folhasProntas(page);
 await expect(page.locator('.brush-scene')).toHaveClass(/quadros/);
 const inicio=await quadroDoPincel(page,.3), meio=await quadroDoPincel(page,.55), fim=await quadroDoPincel(page,.78);
 expect(inicio).toBeLessThan(8);
 expect(meio).toBeGreaterThan(25);expect(meio).toBeLessThan(40);
 expect(fim).toBeGreaterThan(56);
 // Volta junto com o dedo.
 expect(await quadroDoPincel(page,.45)).toBeLessThan(meio);
 await expect(page.locator('.brush-quadros')).toBeVisible();
 await expect(page.locator('.brush-video')).toHaveCSS('visibility','hidden');
});

// iPhone em Modo de Pouca Energia (e o navegador do Instagram) recusa play() sem
// toque. A abertura fica na capa com zoom lento e o nome ja vem escrito, sem
// botao de tocar; o pincel, feito de quadros, gira igual.
test('when iOS refuses autoplay the name is already written over the breathing poster and the brush still turns',async({page},info)=>{
 test.skip(!info.project.use.isMobile,'comportamento so do celular');
 const errors=[];page.on('pageerror',e=>{if(doSite(e))errors.push(e.message);});
 await page.route(/google\.com|gstatic\.com|googleapis\.com/,r=>r.abort());
 await page.addInitScript(()=>{HTMLMediaElement.prototype.play=function(){return Promise.reject(new DOMException('autoplay recusado','NotAllowedError'));};});
 await page.goto('/');
 await expect(page.locator('.intro-media')).toHaveClass(/poster-only/);
 await expect(page.locator('#intro-video')).toHaveCSS('visibility','hidden');
 expect(await page.evaluate(()=>getComputedStyle(document.querySelector('.intro-media'),'::before').animationName)).toBe('capa-respira');
 await expect(page.getByRole('button',{name:/reproduzir|play video/i})).toHaveCount(0);
 await expect(page.locator('html')).toHaveClass(/sem-autoplay/);
 await expect.poll(()=>page.evaluate(()=>getComputedStyle(document.querySelector('.intro-mark')).getPropertyValue('--draw').trim())).toBe('1.0000');
 expect(await page.evaluate(()=>scrollY)).toBe(0);
 await folhasProntas(page);
 expect(await quadroDoPincel(page,.55)).toBeGreaterThan(25);
 expect(errors).toEqual([]);
});

// Tema claro opcional: alterna, fica salvo, e ao recarregar ja pinta claro.
test('English version translates, survives a motion remount, returns to identical Portuguese and loads without a Portuguese flash',async({page})=>{
 const errors=[];page.on('pageerror',e=>{if(doSite(e))errors.push(e.message);});
 await page.goto('/#contato');
 // No WebKit o load chega antes de a pagina soltar o hero escondido do salto.
 await expect(page.locator('html')).not.toHaveClass(/salto-ancora/);
 await expect(page.locator('.sq-slide:not([data-aberto])').first()).toBeHidden();
 const retrato=()=>page.evaluate(()=>{
  const texto=document.body.innerText.replace(/\s+/g,' ').trim();
  const atributos=[...document.querySelectorAll('[alt],[aria-label],[title],[placeholder]')].flatMap(el=>['alt','aria-label','title','placeholder'].filter(a=>el.hasAttribute(a)).map(a=>el.tagName+'.'+a+'='+el.getAttribute(a)));
  return {texto,atributos,titulo:document.title,lang:document.documentElement.lang};
 });
 const alternar=async()=>{
  const menu=!(await page.locator('[data-idioma]:visible').count());
  if(menu)await page.click('#nb-ham');
  await page.locator('[data-idioma]:visible').first().click();
  if(menu)await page.click('#nb-ham');
  await expect(page.locator('#nb-ham')).toHaveAttribute('aria-expanded','false');
 };
 const tituloServicos=()=>page.evaluate(()=>{const c=document.querySelector('#servicos h2').cloneNode(true);c.querySelectorAll('br').forEach(b=>b.replaceWith(' '));return c.textContent.replace(/\s+/g,' ').trim();});
 const antes=await retrato();
 await alternar();
 await expect(page.locator('html')).toHaveAttribute('lang','en');
 expect(await tituloServicos()).toBe('Three ways to work together.');
 await expect(page).toHaveTitle(/Fran Make/);
 expect(await page.title()).not.toBe(antes.titulo);
 await expect(page.locator('[data-idioma]').first()).toHaveText('PT');
 // Remontar as animacoes desfaz a quebra dos titulos; a traducao tem que voltar.
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.emulateMedia({reducedMotion:'no-preference'});
 // Espera a pagina voltar ao modo animado: sob carga o aviso chega depois.
 await expect(page.locator('html')).toHaveClass(/cinematic/);
 await page.waitForTimeout(150);
 expect(await tituloServicos()).toBe('Three ways to work together.');
 await alternar();
 await expect(page.locator('html')).toHaveAttribute('lang','pt-BR');
 const depois=await retrato();
 expect(depois.texto).toBe(antes.texto);
 expect(depois.atributos).toEqual(antes.atributos);
 expect(depois.titulo).toBe(antes.titulo);
 // A escolha fica salva e a pagina nunca aparece em portugues antes de traduzir.
 await alternar();
 await expect(page.locator('html')).toHaveAttribute('lang','en');
 await page.addInitScript(()=>{requestAnimationFrame(()=>{
  const h=document.querySelector('#servicos h2');
  window.__primeiro={oculto:getComputedStyle(document.body).visibility==='hidden',titulo:h?h.textContent:''};
 });});
 await page.reload();
 await page.waitForFunction(()=>window.__primeiro!==undefined);
 const primeiro=await page.evaluate(()=>window.__primeiro);
 expect(primeiro.oculto||/Three ways/.test(primeiro.titulo)).toBeTruthy();
 await expect(page.locator('html')).not.toHaveClass(/carrega-idioma/);
 expect(await tituloServicos()).toBe('Three ways to work together.');
 expect(errors).toEqual([]);
});
// No celular o video da abertura toca sozinho. Vem por blob: a Cloudflare Pages
// ignora pedidos parciais (HTTP Range) e o Safari do iPhone nao toca video servido
// assim pelo endereco. O WebKit de teste recusa blob e cai no endereco, que ele toca.
test('mobile intro video plays on its own',async({page},info)=>{
 test.skip(!info.project.use.isMobile,'comportamento so do celular');
 await page.route(/google\.com|gstatic\.com|googleapis\.com/,r=>r.abort());
 await page.goto('/');
 await expect.poll(()=>page.evaluate(()=>{const v=document.querySelector('#intro-video');return !v.paused&&v.currentTime>.3;}),{timeout:10000}).toBe(true);
 if(info.project.name==='mobile')expect(await page.evaluate(()=>document.querySelector('#intro-video').src)).toMatch(/^blob:/);
 await expect(page.locator('html')).not.toHaveClass(/sem-autoplay/);
});
// A Franciana revelada cabe inteira na tela do celular: com largura fixa o palco
// cortava o corpo, e na altura do iPhone SE so sobrava o alto da cabeca.
test('revealed portrait fits the phone screen without being cut',async({page},info)=>{
 test.skip(!info.project.use.isMobile,'comportamento so do celular');
 await page.route(/google\.com|gstatic\.com|googleapis\.com/,r=>r.abort());
 for(const altura of [548,664]){
  await page.setViewportSize({width:375,height:altura});
  await page.goto('/');
  await page.evaluate(()=>{const H=document.querySelector('#hero'),s=document.querySelector('.hero-stage');scrollTo(0,H.offsetTop+H.offsetHeight-s.offsetHeight);});
  await page.waitForTimeout(500);
  const r=await page.evaluate(()=>{const s=document.querySelector('.hero-stage').getBoundingClientRect(),f=document.querySelector('.hero-photo img').getBoundingClientRect(),t=document.querySelector('.hero-description').getBoundingClientRect();return {base:f.bottom-s.bottom,altura:f.height,sobre:t.bottom-f.top};});
  expect(r.base).toBeLessThanOrEqual(1);
  expect(r.altura).toBeGreaterThan(160);
  expect(r.sobre).toBeLessThanOrEqual(8);
 }
});
// O mapa carrega logo no inicio, com a rolagem parada. Carregado so ao se
// aproximar (lazy), o Google Maps travava a tela justamente ao chegar na secao.
test('map loads at start, before its section is reached',async({page})=>{
 await page.route(/google\.com|gstatic\.com|googleapis\.com/,r=>r.abort());
 await page.goto('/');
 const mapa=page.locator('#map-placeholder iframe');
 await expect(mapa).toHaveAttribute('src',/^https:\/\/maps\.google\.com\/.*output=embed/,{timeout:8000});
 await expect(mapa).toHaveAttribute('loading','eager');
 expect(await page.evaluate(()=>scrollY)).toBe(0);
});
test('light contour hugs the portrait, appears only with it, and particles are gone',async({page})=>{
 await page.goto('/');
 await expect(page.locator('#webgl-canvas')).toHaveCount(0);
 // O flare precisa de WebGL; sem ele a foto fica sem contorno, e so.
 if(await page.evaluate(()=>!!document.createElement('canvas').getContext('webgl')))
  await expect(page.locator('.hero-photo canvas.hero-flare')).toHaveCount(1);
 // So na foto: o logo fica sem o flare.
 await expect(page.locator('canvas.logo-flare')).toHaveCount(0);
 const opacidade=async fracao=>{
  await page.evaluate(f=>{const h=document.getElementById('hero');window.scrollTo(0,h.offsetTop+(h.offsetHeight-innerHeight)*f);},fracao);
  await page.waitForTimeout(250);
  return page.evaluate(()=>Number(getComputedStyle(document.querySelector('.hero-photo')).opacity));
 };
 // o contorno mora dentro da foto: antes da revelacao, nenhum dos dois aparece
 expect(await opacidade(.5)).toBe(0);
 expect(await opacidade(.83)).toBe(0);
 expect(await opacidade(1)).toBe(1);
});
test('page keeps only the dark theme and the footer has no loose social icons',async({page})=>{
 await page.goto('/#contato');
 await expect(page.locator('[data-tema]')).toHaveCount(0);
 await expect(page.locator('.ft-social')).toHaveCount(0);
 await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 await expect(page.locator('.sq-panel:not([aria-hidden])')).toHaveCount(8);
 await expect(page.locator('.sq-slide')).toHaveCount(8);
});
