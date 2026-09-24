/* Portfolio: filtro por categoria e lightbox navegavel. Pagina independente
   do script.js da home, que depende de elementos do hero inexistentes aqui. */
(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const traduz = texto => (window.FRAN_IDIOMA ? window.FRAN_IDIOMA.t(texto) : texto);

  const grid = $('#pf-grid');
  if (!grid) return;
  const items = $$('.pf-item', grid);
  const count = $('#pf-count');
  const empty = $('#pf-empty');
  const mais = $('#pf-mais');
  const calmo = matchMedia('(prefers-reduced-motion: reduce)');
  const curva = 'cubic-bezier(.2,.7,.2,1)';

  /* ---- filtro e Ver mais ----
     Nove fotos por vez, tres linhas de tres: o resto espera o Ver mais, para a
     pagina nao abrir com a grade inteira. Trocar de filtro volta as nove
     primeiras daquela categoria. O lightbox anda so pelas que estao a vista. */
  const PAGINA = 9;
  let filtradas = items.slice(), limite = PAGINA, visible = [];
  const contar = () => { count.textContent = `${filtradas.length} ${traduz(filtradas.length === 1 ? 'fotografia' : 'fotografias')}`; };
  function mostrar() {
    visible = filtradas.slice(0, limite);
    const aVista = new Set(visible);
    for (const item of items) item.hidden = !aVista.has(item);
    visible.forEach((item, i) => { item.dataset.index = String(i); });
    mais.parentElement.hidden = filtradas.length <= limite;
    empty.hidden = filtradas.length > 0;
  }
  /* Trocar de filtro reorganiza a grade deslizando: cada foto que continua a
     vista sai de onde estava e vai ate o lugar novo; as que chegam surgem. As
     que ainda esperam a entrada ao rolar ficam com ela, sem animacao dupla. */
  function reorganizar(mudar) {
    if (calmo.matches) { mudar(); return; }
    const antes = new Map(visible.map(item => [item, item.getBoundingClientRect()]));
    mudar();
    for (const item of visible) {
      if (grid.classList.contains('pf-anima') && !item.classList.contains('visto')) continue;
      const de = antes.get(item);
      if (!de) { item.animate([{opacity: 0, transform: 'scale(.94)'}, {opacity: 1, transform: 'none'}], {duration: 450, easing: curva}); continue; }
      const para = item.getBoundingClientRect(), dx = de.left - para.left, dy = de.top - para.top;
      if (Math.abs(dx) + Math.abs(dy) > 1) item.animate([{transform: `translate(${dx}px,${dy}px)`}, {transform: 'none'}], {duration: 550, easing: curva});
    }
  }
  function filter(category) {
    filtradas = items.filter(item => category === 'todos' || item.dataset.category === category);
    limite = PAGINA;
    reorganizar(mostrar);
    contar();
  }
  // O foco vai para a primeira foto nova, para quem navega pelo teclado seguir dali.
  mais.addEventListener('click', () => {
    const antes = visible.length;
    limite += PAGINA;
    mostrar();
    visible[antes]?.focus({preventScroll: true});
  });
  $$('.pf-filters button').forEach(button => {
    button.addEventListener('click', () => {
      $$('.pf-filters button').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
      filter(button.dataset.filter);
    });
  });
  filter('todos');

  /* ---- entrada ao rolar ----
     A partir do componente InView que o cliente mandou: a foto surge esmaecida,
     menor e desfocada, e assenta em cascata, uma vez so. Sem JS ou com movimento
     reduzido as fotos simplesmente estao la. */
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
    grid.classList.add('pf-anima');
    const olho = new IntersectionObserver(entradas => {
      let k = 0;
      entradas.filter(e => e.isIntersecting).forEach(e => {
        e.target.style.setProperty('--k', String(k++));
        e.target.classList.add('visto');
        olho.unobserve(e.target);
      });
    }, {rootMargin:'0px 0px -12% 0px'});
    items.forEach(item => olho.observe(item));
  }

  /* ---- lightbox ---- */
  const dialog = $('#lightbox'), image = $('#lb-img');
  const prev = $('#lb-prev'), next = $('#lb-next');
  let current = 0, opener = null, porToque = false;

  function show(index, trocar = false) {
    if (!visible.length) return;
    current = (index + visible.length) % visible.length;
    const item = visible[current];
    const thumb = $('img', item);
    image.src = item.dataset.full || thumb.src;
    image.alt = thumb.alt;
    const many = visible.length > 1;
    prev.hidden = !many; next.hidden = !many;
    if (trocar && !calmo.matches) image.animate([{opacity: .3}, {opacity: 1}], {duration: 220, easing: curva});
  }
  /* A foto ampliada nasce da propria miniatura: parte do tamanho e do recorte
     dela (o mesmo object-fit: cover da grade) e cresce ate o lugar final; ao
     fechar, faz o caminho de volta. Se a miniatura estiver fora da tela, so
     esmaece. Tudo numa animacao de transform e clip-path, sem copia da foto. */
  function voo(item, volta) {
    const thumb = item && !item.hidden ? $('img', item) : null;
    if (!thumb) return null;
    const T = thumb.getBoundingClientRect();
    if (!T.width || T.bottom < 0 || T.top > innerHeight) return null;
    image.getAnimations().forEach(a => a.cancel());
    const F = image.getBoundingClientRect();
    if (!F.width || !F.height) return null;
    const cs = getComputedStyle(thumb);
    const py = (parseFloat(cs.objectPosition.split(' ')[1]) || 50) / 100;
    const s = Math.max(T.width / F.width, T.height / F.height), w = F.width * s, h = F.height * s;
    const x = T.left - (w - T.width) / 2, y = T.top - (h - T.height) * py;
    const px = n => `${(n / s).toFixed(2)}px`;
    const lado = px((w - T.width) / 2);
    const pequeno = {transform: `translate(${x - F.left}px,${y - F.top}px) scale(${s})`,
      clipPath: `inset(${px((h - T.height) * py)} ${lado} ${px((h - T.height) * (1 - py))} ${lado} round ${px(parseFloat(cs.borderTopLeftRadius) || 0)})`};
    const grande = {transform: 'none', clipPath: `inset(0px 0px 0px 0px round ${parseFloat(getComputedStyle(image).borderTopLeftRadius) || 0}px)`};
    image.style.transformOrigin = '0 0';
    return image.animate(volta ? [grande, pequeno] : [pequeno, grande], {duration: volta ? 380 : 480, easing: curva, fill: volta ? 'forwards' : 'none'});
  }
  // Por toque ou mouse (detail > 0) o foco vai para o proprio dialogo: no X o
  // Safari desenhava o anel rosa. Pelo teclado fica no X, com o anel.
  async function open(item, evento) {
    opener = item;
    porToque = evento.detail > 0;
    show(Number(item.dataset.index) || 0);
    dialog.showModal();
    if (porToque) dialog.focus({preventScroll:true});
    document.body.classList.add('modal-open');
    if (calmo.matches) return;
    // Espera a foto decodificar (no maximo 0,4s) para o voo sair do tamanho certo.
    image.style.opacity = '0';
    const pronta = await Promise.race([image.decode().then(() => true, () => false), new Promise(r => setTimeout(() => r(false), 400))]);
    image.style.opacity = '';
    if (!dialog.open) return;
    if (!pronta || !voo(item, false)) image.animate([{opacity: 0}, {opacity: 1}], {duration: 250, easing: curva});
  }
  let fechando = false;
  function fechar() {
    if (!dialog.open || fechando) return;
    if (calmo.matches) { dialog.close(); return; }
    fechando = true;
    dialog.classList.add('fechando');
    const fim = () => { fechando = false; dialog.classList.remove('fechando'); dialog.close(); };
    const volta = voo(visible[current], true) || image.animate([{opacity: 1}, {opacity: 0}], {duration: 200, fill: 'forwards'});
    volta.finished.then(fim, fim);
  }
  items.forEach(item => item.addEventListener('click', e => open(item, e)));
  prev.addEventListener('click', () => show(current - 1, true));
  next.addEventListener('click', () => show(current + 1, true));
  $('#lb-close').addEventListener('click', fechar);
  // Esc: o navegador so deixa segurar o fechamento quando o evento e cancelavel.
  dialog.addEventListener('cancel', event => { if (event.cancelable) { event.preventDefault(); fechar(); } });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('modal-open');
    image.getAnimations().forEach(a => a.cancel());
    image.style.transformOrigin = '';
    image.removeAttribute('src');
    if (porToque) opener?.classList.add('sem-anel');
    opener?.focus({preventScroll:true});
  });
  items.forEach(item => item.addEventListener('blur', () => item.classList.remove('sem-anel')));
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight') { event.preventDefault(); show(current + 1, true); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); show(current - 1, true); }
  });
  // Clique fora da imagem fecha, sem capturar o gesto sobre ela.
  dialog.addEventListener('click', event => {
    if (event.target === dialog) fechar();
  });
  let swipeX = 0;
  dialog.addEventListener('touchstart', e => { swipeX = e.changedTouches[0].clientX; }, {passive:true});
  dialog.addEventListener('touchend', e => {
    const delta = e.changedTouches[0].clientX - swipeX;
    if (Math.abs(delta) > 48) show(current + (delta < 0 ? 1 : -1), true);
  }, {passive:true});

  /* ---- menu mobile ---- */
  const ham = $('#nb-ham'), menu = $('#nb-mob');
  function closeMenu(restore = true) {
    menu.hidden = true; menu.inert = true; menu.classList.remove('on');
    ham.setAttribute('aria-expanded', 'false'); ham.setAttribute('aria-label', traduz('Abrir menu'));
    document.body.classList.remove('modal-open');
    if (restore) ham.focus();
  }
  ham.addEventListener('click', () => {
    if (!menu.hidden) return closeMenu();
    menu.hidden = false; menu.inert = false; menu.classList.add('on');
    ham.setAttribute('aria-expanded', 'true'); ham.setAttribute('aria-label', traduz('Fechar menu'));
    document.body.classList.add('modal-open');
    $('a', menu).focus();
  });
  $$('a', menu).forEach(a => a.addEventListener('click', () => closeMenu(false)));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !menu.hidden) closeMenu();
  });
  matchMedia('(min-width:851px)').addEventListener('change', e => { if (e.matches && !menu.hidden) closeMenu(false); });
  document.addEventListener('fm:idioma', () => {
    contar();
    ham.setAttribute('aria-label', traduz(ham.getAttribute('aria-expanded') === 'true' ? 'Fechar menu' : 'Abrir menu'));
  });
})();
