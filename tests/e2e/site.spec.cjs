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
