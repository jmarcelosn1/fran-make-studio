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
  function filter(category) {
    filtradas = items.filter(item => category === 'todos' || item.dataset.category === category);
    limite = PAGINA;
    mostrar();
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

  function show(index) {
    if (!visible.length) return;
    current = (index + visible.length) % visible.length;
    const item = visible[current];
    const thumb = $('img', item);
    image.src = item.dataset.full || thumb.src;
    image.alt = thumb.alt;
    const many = visible.length > 1;
    prev.hidden = !many; next.hidden = !many;
  }
  // Por toque ou mouse (detail > 0) o foco vai para o proprio dialogo: no X o
  // Safari desenhava o anel rosa. Pelo teclado fica no X, com o anel.
  function open(item, evento) {
    opener = item;
    porToque = evento.detail > 0;
    show(Number(item.dataset.index) || 0);
    dialog.showModal();
    if (porToque) dialog.focus({preventScroll:true});
    document.body.classList.add('modal-open');
  }
  items.forEach(item => item.addEventListener('click', e => open(item, e)));
  prev.addEventListener('click', () => show(current - 1));
  next.addEventListener('click', () => show(current + 1));
  $('#lb-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    document.body.classList.remove('modal-open');
    image.removeAttribute('src');
    if (porToque) opener?.classList.add('sem-anel');
    opener?.focus({preventScroll:true});
  });
  items.forEach(item => item.addEventListener('blur', () => item.classList.remove('sem-anel')));
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight') { event.preventDefault(); show(current + 1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); show(current - 1); }
  });
  // Clique fora da imagem fecha, sem capturar o gesto sobre ela.
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });
  let swipeX = 0;
  dialog.addEventListener('touchstart', e => { swipeX = e.changedTouches[0].clientX; }, {passive:true});
  dialog.addEventListener('touchend', e => {
    const delta = e.changedTouches[0].clientX - swipeX;
    if (Math.abs(delta) > 48) show(current + (delta < 0 ? 1 : -1));
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
