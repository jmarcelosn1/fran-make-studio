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
 await expect(page.locator('#servicos a')).toHaveCount(1);
 await expect(page.locator('#servicos')).not.toContainText('R$');
 await page.locator('#servicos').scrollIntoViewIfNeeded();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 const accessibility=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
 expect(accessibility.violations).toEqual([]);
 await page.locator('#mapa').scrollIntoViewIfNeeded();
 await expect(page.locator('#map-placeholder')).toBeVisible();
 await page.locator('#show-map').click();
 await expect(page.locator('#studio-map')).toHaveAttribute('src',/-2\.5197988,-44\.2177339/);
 expect(errors).toEqual([]);
});
test('gallery single click stays closed, keyboard opens and Escape closes',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 const card=page.locator('.portfolio-card').first();await card.click();
 await expect(page.locator('#lightbox')).not.toBeVisible();
 await card.focus();await page.keyboard.press('Enter');await expect(page.locator('#lightbox')).toBeVisible();
 await page.keyboard.press('Escape');await expect(page.locator('#lightbox')).not.toBeVisible();
 await expect(card).toBeFocused();
});
test('CDN failure leaves content and booking usable',async({page})=>{
 await page.route(/https:\/\/(unpkg.com|cdnjs.cloudflare.com)\//,r=>r.abort());
 await page.goto('/');await page.locator('#servicos').scrollIntoViewIfNeeded();
 await expect(page.locator('#servicos a')).toBeVisible();
 await expect(page.locator('#servicos a')).toHaveAttribute('href','https://wa.me/message/2SNOKRBPREBYH1');
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
test('formanda sequence follows forward and reverse scroll',async({page})=>{
 await page.goto('/');
 await page.waitForFunction(()=>window.ScrollTrigger?.getAll().some(t=>t.trigger?.matches('[data-look-story]')));
 for(const [progress,index] of [[0,0],[.53,1],[1,2],[.53,1],[0,0]]){
  await page.evaluate(progress=>{
   const trigger=window.ScrollTrigger.getAll().find(t=>t.trigger?.matches('[data-look-story]'));
   window.scrollTo(0,trigger.start+(trigger.end-trigger.start)*progress);
  },progress);
  await expect(page.locator(`[data-look-step="${index}"]`)).toHaveAttribute('aria-pressed','true');
  await expect(page.locator(`[data-look-frame="${index}"]`)).toHaveCSS('opacity','1');
 }
});
