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
 // Unico script de fora: a contagem de visitas sem cookies da Cloudflare, so nos dois enderecos dela.
 expect(csp).toContain("script-src 'self' https://static.cloudflareinsights.com;");
 expect(csp).toContain("connect-src 'self' https://cloudflareinsights.com;");
 const externos=csp.match(/https:\/\/[^ ;]+/g).filter(o=>!/^https:\/\/(maps|www)\.google\.com(\.br)?$/.test(o));
 expect(externos.sort()).toEqual(['https://cloudflareinsights.com','https://static.cloudflareinsights.com']);
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
 // O agendamento pelo WhatsApp fica no menu e nos servicos; o contato mostra so o Instagram.
 await expect(page.locator('#contato a[href*="wa.me"]')).toHaveCount(0);
 // Sem precos: uma foto de referencia em cada servico e um Agende so, embaixo dos tres.
 await expect(page.locator('#servicos .service-preco')).toHaveCount(0);
 await expect(page.locator('#servicos .mp-foto img')).toHaveCount(3);
 await expect(page.locator('#servicos a[href*="wa.me"]')).toHaveCount(1);
 await expect(page.locator('#servicos .servicos-cta a')).toHaveText('Agende');
 await page.locator('#servicos').scrollIntoViewIfNeeded();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 const accessibility=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
 expect(accessibility.violations).toEqual([]);
 await page.locator('#mapa').scrollIntoViewIfNeeded();
 await expect(page.locator('#map-placeholder')).toBeVisible();
 await expect(page.locator('#mapa img')).toHaveCount(0);
 await expect(page.locator('#mapa a[href*="maps.app.goo.gl"]')).toBeVisible();
 expect(errors).toEqual([]);
});
test('portfolio lightbox opens, Escape closes and focus returns',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/portfolio.html');
 const card=page.locator('.pf-item').first();await card.click();
 await expect(page.locator('#lightbox')).toBeVisible();
 // So a foto: sem legenda embaixo, e o X inteiro na tela, na mesma coluna da seta da direita.
 await expect(page.locator('#lb-caption')).toHaveCount(0);
 const bordas=await page.evaluate(()=>{const x=document.querySelector('#lb-close').getBoundingClientRect(),s=document.querySelector('#lb-next').getBoundingClientRect();
  return {topo:x.top,direita:innerWidth-x.right,alinhado:Math.abs(x.right-s.right)};});
 expect(bordas.topo).toBeGreaterThanOrEqual(0);
 expect(bordas.direita).toBeGreaterThanOrEqual(0);
 expect(bordas.alinhado).toBeLessThan(1);
 // Por toque ou mouse o foco fica no quadro, nao no X: o Safari desenhava ali o anel rosa.
 await expect(page.locator('#lightbox')).toBeFocused();
 await page.keyboard.press('Escape');await expect(page.locator('#lightbox')).not.toBeVisible();
 await expect(card).toBeFocused();
 await expect(card).toHaveCSS('outline-style','none');
 // Pelo teclado o foco vai para o X, com o anel, para quem navega assim.
 await page.keyboard.press('Enter');
 await expect(page.locator('#lb-close')).toBeFocused();
 await page.keyboard.press('Escape');await expect(card).toBeFocused();
});
// Portfolio: nove fotos por vez, tres por linha; o Ver mais traz mais nove e some
// quando acabam, e trocar de filtro volta as nove primeiras.
test('portfolio shows nine photos in rows of three and Ver mais loads nine more',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/portfolio.html');
 const total=await page.locator('.pf-item').count();
 const aVista=()=>page.locator('.pf-item:visible').count();
 expect(await aVista()).toBe(9);
 expect(await page.evaluate(()=>getComputedStyle(document.querySelector('.pf-grid')).gridTemplateColumns.split(' ').length)).toBe(3);
 await page.click('#pf-mais');
 expect(await aVista()).toBe(18);
 await expect(page.locator('.pf-item:visible').nth(9)).toBeFocused();
 while(await page.locator('#pf-mais').isVisible()) await page.click('#pf-mais');
 expect(await aVista()).toBe(total);
 await page.click('[data-filter="producoes"]');
 expect(await aVista()).toBe(9);
 await expect(page.locator('#pf-mais')).toBeVisible();
 await page.click('[data-filter="noivas"]');
 expect(await aVista()).toBeLessThanOrEqual(9);
 await expect(page.locator('#pf-mais')).toBeHidden();
});
test('animation libraries failing leaves content and booking usable',async({page})=>{
 await page.route('**/vendor/**',r=>r.abort());
 await page.goto('/');await page.locator('#servicos').scrollIntoViewIfNeeded();
 await expect(page.locator('#servicos a[href*="wa.me"]')).toBeVisible();
 await expect(page.locator('#servicos a[href*="wa.me"]')).toHaveAttribute('href','https://wa.me/message/2SNOKRBPREBYH1');
});
// Pula a abertura, como numa segunda visita na mesma sessao.
const semAbertura=page=>page.addInitScript(()=>{try{sessionStorage.setItem('fm-abertura','1');}catch{/* sem armazenamento */}});
// Abertura: o nome se escreve numa tela preta e desliza ate o lugar dele no
// inicio, a cortina some e o resto ja esta la. Sem video, pincel nem rolagem.
test('intro writes the name on black, glides it into place and gets out of the way',async({page})=>{
 const errors=[];page.on('pageerror',e=>{if(doSite(e))errors.push(e.message);});
 await page.route(/google\.com|gstatic\.com|googleapis\.com/,r=>r.abort());
 await page.goto('/');
 await expect(page.locator('html')).toHaveClass(/abertura-on/);
 await expect(page.locator('.abertura')).toBeVisible();
 expect(await page.evaluate(()=>getComputedStyle(document.querySelector('.abertura-nome')).animationName)).toBe('pf-escreve');
 // O nome da cortina desliza e para exatamente sobre o nome do inicio. Mede no
 // ultimo quadro do deslize, antes de a cortina sair do layout.
 await expect.poll(()=>page.evaluate(()=>document.querySelector('.abertura-nome').getAnimations().some(a=>!a.animationName)),{timeout:6000}).toBe(true);
 const fim=await page.evaluate(()=>{const n=document.querySelector('.abertura-nome');
  n.getAnimations().find(a=>!a.animationName).finish();
  const a=n.getBoundingClientRect(),b=document.querySelector('.hero-mark img').getBoundingClientRect();
  return [a.left-b.left,a.top-b.top,a.width-b.width];});
 for(const d of fim) expect(Math.abs(d)).toBeLessThan(2);
 await expect(page.locator('html')).toHaveClass(/abertura-fim/,{timeout:6000});
 await expect(page.locator('.abertura')).toBeHidden();
 expect(await page.evaluate(()=>getComputedStyle(document.querySelector('.hero-mark')).opacity)).toBe('1');
 await expect(page.locator('video, canvas, .brush-scene, .intro-media, .hero-credit')).toHaveCount(0);
 await expect(page.locator('#navbar')).toBeVisible();
 await expect(page.locator('#hero h1')).toHaveText('Fran Make Studio');
 await expect.poll(()=>page.evaluate(()=>Number(getComputedStyle(document.querySelector('.hero-photo')).opacity))).toBe(1);
 expect(await page.evaluate(()=>scrollY)).toBe(0);
 // Sem trilho de rolagem: o inicio ocupa pouco mais que a propria tela.
 expect(await page.evaluate(()=>document.querySelector('#hero').offsetHeight<innerHeight*1.6)).toBeTruthy();
 expect(errors).toEqual([]);
});
// Uma vez por sessao: recarregar, voltar do portfolio ou chegar por ancora nao repete.
test('intro plays once per session and never on arrival at a section',async({page})=>{
 await page.goto('/');
 await expect(page.locator('html')).toHaveClass(/abertura-on/);
 await page.reload();
 await expect(page.locator('html')).not.toHaveClass(/abertura-on/);
 await expect(page.locator('.abertura')).toBeHidden();
 const outra=await page.context().newPage();
 await outra.goto('/#servicos');
 await expect(outra.locator('html')).not.toHaveClass(/abertura-on/);
});
// Sem a abertura, assinatura, retrato, titulo e texto entram juntos, no mesmo tempo.
test('opening pieces enter together, on the same clock',async({page})=>{
 await semAbertura(page);
 await page.goto('/');
 const tempos=await page.evaluate(()=>['.hero-mark .assinatura-escrita','.hero-photo','.hero-titulo','.hero-description']
  .map(s=>{const c=getComputedStyle(document.querySelector(s));return c.animationDuration+' '+c.animationDelay+' '+c.animationTimingFunction;}));
 expect(new Set(tempos).size).toBe(1);
});
test('with reduced motion the name is already written and the portrait already there',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/');
 expect(await page.evaluate(()=>getComputedStyle(document.querySelector('.assinatura-escrita')).animationName)).toBe('none');
 expect(await page.evaluate(()=>Number(getComputedStyle(document.querySelector('.hero-photo')).opacity))).toBe(1);
});
// Coverflow do portfolio na home: o cartao ativo fica no centro da moldura, de
// frente e inteiro; o anel da a volta sem copias.
const ativo=page=>page.evaluate(()=>document.querySelector('.cf-card[data-ativo]').dataset.i);
const desvio=page=>page.evaluate(()=>{const f=document.querySelector('.cf-frame').getBoundingClientRect(),c=document.querySelector('.cf-card[data-ativo]').getBoundingClientRect();
 return Math.round((c.left+c.width/2)-(f.left+f.width/2));});
test('coverflow arrows and keys move one photo at a time and loop around',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 await page.locator('.cf').scrollIntoViewIfNeeded();
 await expect(page.locator('.cf-card')).toHaveCount(6);
 expect(await ativo(page)).toBe('0');
 await page.click('.sq-arrow[data-sq="1"]');
 expect(await ativo(page)).toBe('1');
 await page.click('.sq-arrow[data-sq="-1"]');await page.click('.sq-arrow[data-sq="-1"]');
 expect(await ativo(page)).toBe('5');
 await page.locator('.cf-frame').focus();await page.keyboard.press('ArrowRight');
 expect(await ativo(page)).toBe('0');
 expect(await desvio(page)).toBe(0);
 expect(await page.evaluate(()=>getComputedStyle(document.querySelector('.cf-card[data-ativo]')).opacity)).toBe('1');
});
// Tocar numa foto do lado a traz ao centro deslizando, sem saltar: logo depois do
// toque ela ainda esta a caminho.
test('clicking a side photo glides it to the centre',async({page})=>{
 await page.goto('/');
 await page.locator('.cf').scrollIntoViewIfNeeded();
 await page.locator('.cf-card[data-i="1"]').click();
 await expect(page.locator('.cf-card[data-i="1"]')).toHaveAttribute('data-ativo','');
 await page.waitForTimeout(100);
 expect(Math.abs(await desvio(page))).toBeGreaterThan(20);
 await expect.poll(()=>desvio(page)).toBe(0);
});
// Com a animacao ligada: cliques seguidos somam passos e assentam num cartao inteiro.
test('a burst of arrow clicks settles centred on a whole photo',async({page})=>{
 await page.goto('/');
 await page.locator('.cf').scrollIntoViewIfNeeded();
 for(let i=0;i<8;i++) await page.click('.sq-arrow[data-sq="1"]');
 await expect.poll(()=>desvio(page),{timeout:10000}).toBe(0);
 expect(await ativo(page)).toBe('2');
});
// Arrastar leva a foto junto; ao soltar, o arremesso anda no maximo dois cartoes
// e para num inteiro, sempre centrado.
test('dragging settles on a whole photo, at most two past the drag',async({page})=>{
 await page.goto('/');
 await page.locator('.cf').scrollIntoViewIfNeeded();
 const b=await page.locator('.cf-frame').boundingBox();
 const x=b.x+b.width/2, y=b.y+b.height/2;
 await page.mouse.move(x,y);await page.mouse.down();
 await page.mouse.move(x-400,y,{steps:5});await page.mouse.up();
 await expect.poll(()=>desvio(page),{timeout:10000}).toBe(0);
 const i=Number(await ativo(page));
 expect(i).toBeGreaterThanOrEqual(1);
 expect(i).toBeLessThanOrEqual(4);
});

// Vindo do portfolio para uma secao, a pagina chega nela e nao no topo.
test('arriving at a section by anchor lands on it',async({page})=>{
 await page.goto('/portfolio.html');
 await page.evaluate(()=>{location.href='index.html#servicos';});
 await page.waitForURL(/#servicos$/);
 await page.waitForTimeout(800);
 const topo=await page.evaluate(()=>document.getElementById('servicos').getBoundingClientRect().top);
 expect(topo).toBeGreaterThanOrEqual(0);
 expect(topo).toBeLessThan(260);
});

test('English version translates, survives a motion remount, returns to identical Portuguese and loads without a Portuguese flash',async({page})=>{
 const errors=[];page.on('pageerror',e=>{if(doSite(e))errors.push(e.message);});
 await page.goto('/#contato');
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
 await expect(page.locator('.sq-mais a')).toHaveText('See more');
 // Remontar as animacoes desfaz a quebra dos titulos; a traducao tem que voltar.
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.emulateMedia({reducedMotion:'no-preference'});
 // Espera a pagina voltar ao modo animado: sob carga o aviso chega depois.
 await expect(page.locator('html')).toHaveClass(/motion-ready/);
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
// No celular: assinatura, a Franciana inteira com a base desfeita no preto e,
// embaixo dela, o titulo e o texto.
test('on the phone the text sits under the portrait, which is whole and faded at the base',async({page},info)=>{
 test.skip(!info.project.use.isMobile,'comportamento so do celular');
 await page.route(/google\.com|gstatic\.com|googleapis\.com/,r=>r.abort());
 for(const altura of [548,664]){
  await page.setViewportSize({width:375,height:altura});
  await page.goto('/');
  // Mede depois da entrada: ela comeca em 80% da escala, como as fotos do portfolio.
  await expect.poll(()=>page.evaluate(()=>document.querySelector('.hero-photo').getAnimations().every(a=>a.playState==='finished'))).toBe(true);
  const r=await page.evaluate(()=>{const q=s=>document.querySelector(s).getBoundingClientRect();
   const f=q('.hero-photo'),m=q('.hero-mark'),h=q('.hero-titulo'),t=q('.hero-description');
   return {marca:m.bottom-f.top,titulo:h.top-f.bottom,texto:t.top-h.bottom,largura:f.width,base:(()=>{const e=getComputedStyle(document.querySelector('#hero-img'));return e.maskImage||e.webkitMaskImage;})(),sw:document.documentElement.scrollWidth,iw:innerWidth};});
  expect(r.marca).toBeLessThanOrEqual(0);
  // O titulo pode subir sobre a base ja apagada da foto, nunca sobre o rosto.
  expect(r.titulo).toBeGreaterThan(-60);
  expect(r.texto).toBeGreaterThanOrEqual(0);
  expect(r.largura).toBeGreaterThan(300);
  expect(r.base).toContain('linear-gradient');
  expect(r.sw).toBe(r.iw);
 }
 // O portfolio nunca espia na primeira tela do celular.
 for(const altura of [664,915]){
  await page.setViewportSize({width:412,height:altura});
  await page.goto('/');
  expect(await page.evaluate(()=>document.querySelector('#squeeze-titulo').getBoundingClientRect().top)).toBeGreaterThanOrEqual(altura);
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
// A luz da Franciana e so o halo da referencia: fixo, rose, desenhado em CSS atras
// da foto. Sem canvas, WebGL ou laco de animacao para mante-lo.
test('portrait light is a still rosé halo drawn behind her',async({page})=>{
 await page.route(/google\.com|gstatic\.com|googleapis\.com/,r=>r.abort());
 await page.goto('/');
 await expect(page.locator('canvas')).toHaveCount(0);
 const halo=await page.evaluate(()=>{const s=getComputedStyle(document.querySelector('.hero-photo'),'::before');return {fundo:s.backgroundImage,anima:s.animationName,z:s.zIndex};});
 expect(halo.fundo).toContain('radial-gradient');
 expect(halo.fundo).toContain('rgba(250, 157, 170');
 expect(halo.anima).toBe('none');
 expect(halo.z).toBe('-1');
 // Sem linha em volta: nada de contorno de luz seguindo a silhueta.
 expect(await page.evaluate(()=>getComputedStyle(document.querySelector('#hero-img')).filter)).not.toContain('drop-shadow');
 // A base some pela mascara da propria foto, sem faixa sobreposta.
 expect(await page.evaluate(()=>getComputedStyle(document.querySelector('#hero-img')).maskImage||getComputedStyle(document.querySelector('#hero-img')).webkitMaskImage)).toContain('linear-gradient');
 // No portfolio, o cartao do centro nao tem brilho que a moldura cortaria numa reta.
 expect(await page.evaluate(()=>getComputedStyle(document.querySelector('.cf-card[data-ativo]')).boxShadow)).toBe('none');
});
test('page keeps only the dark theme and the footer has no loose social icons',async({page})=>{
 await page.goto('/#contato');
 await expect(page.locator('[data-tema]')).toHaveCount(0);
 await expect(page.locator('.ft-social')).toHaveCount(0);
 await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 // Seis fotos, sem legenda por foto, e o Ver mais leva ao portfolio.
 await expect(page.locator('.cf-card')).toHaveCount(6);
 await expect(page.locator('.sq-slide')).toHaveCount(0);
 await expect(page.locator('.sq-mais a')).toHaveText('Ver mais');
 await expect(page.locator('.sq-mais a')).toHaveAttribute('href','portfolio.html');
 // Tela limpa, a pedido: menu sem o Agendar, contato sem titulo, texto, borda ou
 // moldura, e rodape sem o fio acima dos direitos.
 await expect(page.locator('#navbar .nb-cta')).toHaveCount(0);
 await expect(page.locator('#contato .sh')).toHaveCount(0);
 const linhas=await page.evaluate(()=>[document.querySelector('#contato .ctc-card'),document.querySelector('#contato .ig-selo'),document.querySelector('.ft-bottom')]
  .map(el=>{const c=getComputedStyle(el);return [c.borderTopStyle,c.borderRightStyle,c.borderBottomStyle,c.borderLeftStyle].filter(b=>b!=='none').length;}));
 expect(linhas).toEqual([0,0,0]);
});
// Sem simbolos soltos: botoes so com texto, contato sem icones, selo sem seta e
// nenhuma estrelinha surgindo no clique.
test('buttons, contact cards and clicks carry no decorative symbols',async({page})=>{
 await page.goto('/#contato');
 await expect(page.locator('.ctc-ico, .ig-seta, #contato svg')).toHaveCount(0);
 for(const botao of ['.sq-mais a','#servicos .servicos-cta a'])
  expect(await page.locator(botao).first().evaluate(el=>getComputedStyle(el,'::after').content)).toBe('none');
 // A estrela aparecia em link e botao clicado; uma seta do carrossel e botao que nao sai da pagina.
 await page.locator('.sq-arrow[data-sq="1"]').click();
 await expect(page.locator('.micro-spark')).toHaveCount(0);
});
// A arte @fran_make e o proprio link: sem botao repetindo o mesmo destino.
test('Instagram art is the link, with no button repeating it',async({page})=>{
 await page.goto('/#contato');
 const selo=page.locator('#contato a.ig-selo');
 await expect(selo).toHaveAttribute('href','https://instagram.com/fran_make');
 await expect(selo.locator('img')).toHaveAttribute('alt',/@fran_make/);
 await expect(selo).toHaveCSS('cursor','pointer');
 await expect(page.locator('#contato .btn-pk')).toHaveCount(0);
 await expect(page.locator('#contato a[href*="instagram.com"]')).toHaveCount(1);
});

// ---- Melhorias de design (branch melhorias-design) ----
// A foto ampliada nasce da miniatura e volta para ela ao fechar.
test('lightbox photo grows out of its thumbnail and shrinks back on close',async({page})=>{
 await page.goto('/portfolio.html');
 const item=page.locator('.pf-item').first();
 await item.scrollIntoViewIfNeeded();
 await page.waitForTimeout(900);
 await item.click();
 // No meio do voo a foto ainda esta perto do tamanho da miniatura, e recortada como ela.
 await expect.poll(()=>page.evaluate(()=>document.querySelector('#lb-img').getAnimations().some(a=>a.effect.getKeyframes().some(k=>k.transform&&k.transform!=='none'))),{timeout:3000}).toBe(true);
 await expect.poll(()=>page.evaluate(()=>document.querySelector('#lb-img').getAnimations().length)).toBe(0);
 const aberta=await page.evaluate(()=>{const r=document.querySelector('#lb-img').getBoundingClientRect();return {cx:r.left+r.width/2-innerWidth/2,w:r.width};});
 expect(Math.abs(aberta.cx)).toBeLessThan(4);
 await page.keyboard.press('Escape');
 await expect(page.locator('#lightbox')).toHaveClass(/fechando/);
 await expect(page.locator('#lightbox')).not.toBeVisible();
 await expect(item).toBeFocused();
});
// Trocar de filtro faz as fotos que continuam a vista deslizarem ate o lugar novo.
test('filters slide the remaining photos into their new places',async({page})=>{
 await page.goto('/portfolio.html');
 // Filtros no alto da tela, com a grade a vista, como quem acabou de olhar as fotos.
 await page.evaluate(()=>scrollTo(0,document.querySelector('.pf-filters').getBoundingClientRect().top+scrollY-90));
 await page.waitForTimeout(1500);
 await page.click('[data-filter="producoes"]');
 const deslizando=await page.evaluate(()=>[...document.querySelectorAll('.pf-item:not([hidden])')]
  .filter(i=>i.getAnimations().some(a=>a.effect.getKeyframes().some(k=>/translate/.test(k.transform||'')))).length);
 expect(deslizando).toBeGreaterThan(0);
 await expect(page.locator('.pf-item:visible')).toHaveCount(9);
});
// Menu do celular: as opcoes entram uma depois da outra.
test('mobile menu options enter one after the other',async({page},info)=>{
 test.skip(!info.project.use.isMobile,'menu so do celular');
 await page.goto('/#servicos');
 await page.click('#nb-ham');
 const atrasos=await page.evaluate(()=>[...document.querySelectorAll('#nb-mob li')].map(li=>{const c=getComputedStyle(li);return c.animationName+' '+c.animationDelay;}));
 expect(atrasos).toEqual(['menu-entra 0s','menu-entra 0.05s','menu-entra 0.1s','menu-entra 0.15s']);
});
// No computador, ao rolar, a Franciana sobe mais devagar e a luz rose apaga.
test('scrolling away from the opening lags the portrait and dims its light',async({page},info)=>{
 test.skip(!!info.project.use.isMobile,'so no computador');
 await semAbertura(page);
 await page.route(/google\.com|gstatic\.com|googleapis\.com/,r=>r.abort());
 await page.goto('/');
 await page.waitForTimeout(600);
 await page.evaluate(()=>scrollTo(0,document.querySelector('#hero').offsetHeight*.5));
 await expect.poll(()=>page.evaluate(()=>new DOMMatrix(getComputedStyle(document.querySelector('#hero-img')).transform).m42),{timeout:5000}).toBeGreaterThan(20);
 expect(await page.evaluate(()=>Number(getComputedStyle(document.querySelector('.hero-photo')).getPropertyValue('--luz')))).toBeLessThan(.8);
});
// Endereco inexistente: pagina propria, com status 404 e o caminho de volta.
test('unknown addresses get a real 404 page with a way home',async({page,request})=>{
 const r=await request.get('/nao/existe');
 expect(r.status()).toBe(404);
 expect(await r.text()).toContain('Voltar ao início');
 await page.goto('/qualquer/coisa');
 await expect(page.locator('h1')).toHaveText('Esta página não existe');
 await expect(page.locator('.nao-achou .btn-pk')).toHaveAttribute('href','/');
 await expect(page.locator('.nao-achou-marca img')).toBeVisible();
 expect(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor)).toBe('rgb(0, 0, 0)');
});
// Icone para a tela inicial do celular e Instagram no rodape das duas paginas.
test('home screen icon and Instagram in the footer of both pages',async({page,request})=>{
 for(const url of ['/','/portfolio.html']){
  await page.goto(url);
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href','images/icone-app.png');
  await expect(page.locator('#footer a[href="https://instagram.com/fran_make"]')).toHaveText('Instagram');
 }
 const icone=await request.get('/images/icone-app.png');
 expect(icone.status()).toBe(200);
 expect(icone.headers()['content-type']).toBe('image/png');
});
// Topo do portfolio: a foto dos bastidores em preto e branco, que o cliente quis manter; nao se repete na grade.
test('portfolio opens with the backstage photo, not repeated in the grid',async({page})=>{
 await page.goto('/portfolio.html');
 const topo=await page.locator('.pf-feature img').getAttribute('src');
 expect(topo).toBe('images/bastidores-noiva-pb.webp');
 const grade=await page.locator('.pf-item img').evaluateAll(imgs=>imgs.map(i=>i.getAttribute('src').replace(/-m\.webp$/,'.webp')));
 expect(grade).not.toContain(topo);
});
// Cartoes de servico limpos: sem borda, sem luz seguindo o ponteiro, texto legivel,
// foto da Make Social sem o letreiro cortado e "teste" em minuscula.
test('service cards have no border or pointer light and readable text',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/#servicos');
 const cards=page.locator('#servicos .mp-card');
 await expect(cards).toHaveCount(3);
 await expect(page.locator('#servicos .spotlight-light')).toHaveCount(0);
 for(const c of await cards.all()){
  await expect(c).toHaveCSS('border-top-width','0px');
  await expect(c).toHaveCSS('box-shadow','none');
  expect(parseFloat(await c.locator('p').evaluate(p=>getComputedStyle(p).fontSize))).toBeGreaterThanOrEqual(15);
 }
 await expect(cards.first().locator('img')).toHaveAttribute('src','images/social-estudio-brilho-cartao.webp');
 await expect(cards.nth(2).locator('p')).toContainText('Pacote luxo: teste de maquiagem');
});
