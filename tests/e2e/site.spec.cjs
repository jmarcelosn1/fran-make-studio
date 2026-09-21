const {test,expect}=require('@playwright/test');
const AxeBuilder=require('@axe-core/playwright').default;
test('public build omits internal files and sends security headers',async({request})=>{
 const response=await request.get('/');
 expect(response.headers()['content-security-policy']).toContain("frame-ancestors 'none'");
 expect(response.headers()['x-content-type-options']).toBe('nosniff');
 for(const file of ['package.json','QUALIDADE.md','.env','tests/unit/safety.test.cjs'])expect((await request.get('/'+file)).status()).toBe(404);
});
test('services, map, accessibility and responsive layout',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/');
 await expect(page.locator('#servicos h3')).toHaveCount(3);
 await expect(page.locator('#contato a[href*="wa.me"]')).toHaveCount(1);
 await expect(page.locator('#servicos')).not.toContainText('R$');
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
test('CDN failure leaves content and booking usable',async({page})=>{
 await page.route(/https:\/\/(unpkg.com|cdnjs.cloudflare.com)\//,r=>r.abort());
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
 await page.waitForTimeout(2600);
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
 test.skip(info.project.name==='mobile','sem ponteiro de mouse no celular');
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

