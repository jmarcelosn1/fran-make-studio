/* FRAN MAKE STUDIO. Native scrolling, progressive enhancement, no permanent loop of its own. */
(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const config = window.FRAN_CONFIG || {};
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width:850px), (pointer:coarse)');
  const traduz = texto => (window.FRAN_IDIOMA ? window.FRAN_IDIOMA.t(texto) : texto);
  let currentModal = null;
  const motion = window.FRAN_MOTION;
  // No touch interception or independent animation loop.
  const spotlights = $$('.mp-card');
  const finePointer = matchMedia('(hover:hover) and (pointer:fine)');
  const spotlightObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => entry.target.classList.toggle('spotlight-visible', entry.isIntersecting));
  }, {threshold:.25});
  spotlights.forEach(surface => {
    surface.classList.add('spotlight-surface');
    const light = document.createElement('span');
    light.className = 'spotlight-light'; light.setAttribute('aria-hidden','true'); surface.append(light);
    spotlightObserver.observe(surface);
    surface.addEventListener('pointermove', event => {
      if (!finePointer.matches || reduced.matches || event.pointerType === 'touch') return;
      const rect = surface.getBoundingClientRect();
      surface.style.setProperty('--spot-x', `${event.clientX - rect.left}px`);
      surface.style.setProperty('--spot-y', `${event.clientY - rect.top}px`);
      surface.style.setProperty('--spot-strength', '1');
    }, {passive:true});
    surface.addEventListener('pointerleave', () => {
      surface.style.removeProperty('--spot-strength');
      surface.style.removeProperty('--spot-x'); surface.style.removeProperty('--spot-y');
    });
  });
  /* Coverflow, a partir do componente que o cliente mandou (coverflow-carousel),
     reescrito sem React. Um unico numero, 'pos' (o cartao no centro, fracionario),
     decide tudo: cada cartao se inclina e recua conforme a distancia ao centro.
     O laco de quadros so existe enquanto a posicao assenta. Sem copias: no anel
     a distancia e dobrada para o lado mais curto, e o cartao some antes de
     atravessar meia volta, que e onde ele salta para o outro lado. */
  const frame = $('.cf-frame');
  if (frame) {
    const cards = $$('.cf-card', frame);
    const count = cards.length;
    // Numeros do componente original.
    const ROTATE = 44, DEPTH = .6, FALLOFF = .56, FADE = .1, GAP = .05;
    let pos = 0, target = 0, vel = 0, width = 0, raf = 0, tAnt = 0, drag = null;
    // Mola criticamente amortecida, no lugar dos 16% por quadro do original: o
    // passo leva perto de um segundo, sem tranco no inicio nem no fim, e um toque
    // no meio do movimento parte da velocidade que ja existe em vez de recomecar.
    // O teto de velocidade faz uma rajada de cliques deslizar em vez de chicotear.
    // Por tempo, nao por quadro: em tela de 120 Hz a velocidade e a mesma.
    const OMEGA = 5.2, VMAX = 5;
    const indexAt = p => ((Math.round(p) % count) + count) % count;

    function paint() {
      if (!width) return;
      const pitch = width * (1 + GAP);
      cards.forEach((card, i) => {
        let offset = ((i - pos) % count + count) % count;
        if (offset > count / 2) offset -= count;
        const distance = Math.abs(offset);
        // Inclinacao e recuo crescem cada vez menos com a distancia: numa rampa
        // linear o segundo vizinho fechava de lado.
        const ramp = distance ** FALLOFF;
        const tilt = Math.min(ROTATE * ramp, 82) * Math.sign(offset);
        card.style.transform = `translateX(calc(-50% + ${(offset * pitch).toFixed(2)}px)) translateZ(${(-DEPTH * width * ramp).toFixed(2)}px) rotateY(${(-tilt).toFixed(2)}deg)`;
        const edge = Math.min(1, Math.max(0, count / 2 - distance));
        card.style.opacity = String(Math.max(0, 1 - FADE * distance) * edge);
        card.style.zIndex = String(100 - Math.round(distance));
      });
    }
    const selecionar = i => cards.forEach((card, k) => card.toggleAttribute('data-ativo', k === i));
    function quadro(t) {
      const dt = Math.min(1 / 30, (t - tAnt) / 1000 || 1 / 60);
      tAnt = t;
      const acc = OMEGA * OMEGA * (target - pos) - 2 * OMEGA * vel;
      vel = Math.max(-VMAX, Math.min(VMAX, vel + acc * dt));
      pos += vel * dt;
      if (Math.abs(target - pos) < .0005 && Math.abs(vel) < .002) { pos = target; vel = 0; paint(); raf = 0; return; }
      paint();
      raf = requestAnimationFrame(quadro);
    }
    function settle(t) {
      target = t;
      selecionar(indexAt(t));
      if (reduced.matches) { cancelAnimationFrame(raf); raf = 0; pos = t; vel = 0; paint(); return; }
      if (!raf) { tAnt = performance.now(); raf = requestAnimationFrame(quadro); }
    }
    // Pelo lado mais curto do anel, em vez de desenrolar a volta toda.
    const goTo = i => settle(i + Math.round((target - i) / count) * count);
    const nudge = by => settle(Math.round(target) + by);

    frame.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      cancelAnimationFrame(raf); raf = 0; vel = 0;
      frame.setPointerCapture(e.pointerId);
      target = pos;
      drag = {id: e.pointerId, x: e.clientX, pos, v: 0, t: performance.now(), card: e.target.closest('.cf-card')};
    });
    frame.addEventListener('pointermove', e => {
      if (!drag || drag.id !== e.pointerId || !width) return;
      const agora = performance.now(), antes = pos;
      pos = drag.pos - (e.clientX - drag.x) / (width * (1 + GAP));
      // Cartoes por segundo, para o arremesso, suavizado entre eventos.
      drag.v = drag.v * .5 + (pos - antes) / Math.max(agora - drag.t, 1) * 500;
      drag.t = agora;
      selecionar(indexAt(pos));
      paint();
    });
    const soltar = e => {
      if (!drag || drag.id !== e.pointerId) return;
      const {card, x, v} = drag;
      drag = null;
      // Toque sem arraste num cartao do lado: ele vem para o centro.
      if (e.type === 'pointerup' && card && Math.abs(e.clientX - x) < 6) { goTo(Number(card.dataset.i)); return; }
      // O arremesso leva no maximo dois cartoes, e a mola sai com a velocidade do dedo.
      vel = Math.max(-VMAX, Math.min(VMAX, v));
      settle(Math.round(pos + Math.max(-2, Math.min(2, v * .18))));
    };
    frame.addEventListener('pointerup', soltar);
    frame.addEventListener('pointercancel', soltar);
    // Navegador sem overflow:clip: a moldura nunca fica rolada de lado.
    frame.addEventListener('scroll', () => { frame.scrollLeft = 0; }, {passive: true});
    frame.addEventListener('keydown', e => {
      const passo = {ArrowRight: 1, ArrowLeft: -1}[e.key];
      if (!passo) return;
      e.preventDefault(); nudge(passo);
    });
    $$('.sq-arrow').forEach(b => b.addEventListener('click', () => nudge(Number(b.dataset.sq))));
    // A largura do cartao decide passo, recuo e perspectiva: so ela e medida.
    // Mede ja na partida e de novo quando a moldura muda; o observador sozinho
    // atrasa em aba escondida, e os cartoes ficavam empilhados no centro.
    const medir = () => { width = cards[0].offsetWidth; paint(); };
    medir();
    new ResizeObserver(medir).observe(frame);
    selecionar(0);
  }

  function motionPreference() {
    document.documentElement.classList.toggle('mobile-layout', mobile.matches);
    document.documentElement.classList.toggle('motion-ready', !reduced.matches);
  }
  reduced.addEventListener('change', motionPreference);
  mobile.addEventListener('change', motionPreference);

  // Mobile navigation: hidden links are inert, Escape closes, focus stays in menu.
  const ham = $('#nb-ham'), menu = $('#nb-mob');
  function closeMenu(restore = true) {
    menu.hidden = true; menu.inert = true; menu.classList.remove('on');
    ham.setAttribute('aria-expanded', 'false'); ham.setAttribute('aria-label', traduz('Abrir menu'));
    document.body.classList.remove('modal-open'); currentModal = null; motion?.pause(false);
    if (restore) ham.focus();
  }
  ham.addEventListener('click', () => {
    if (!menu.hidden) return closeMenu();
    menu.hidden = false; menu.inert = false; menu.classList.add('on');
    ham.setAttribute('aria-expanded', 'true'); ham.setAttribute('aria-label', traduz('Fechar menu'));
    document.body.classList.add('modal-open'); currentModal = 'menu'; motion?.pause(true); $('a', menu).focus();
  });
  $$('a', menu).forEach(a => a.addEventListener('click', () => closeMenu(false)));
  matchMedia('(min-width:851px)').addEventListener('change', e => { if(e.matches && !menu.hidden) closeMenu(false); });
  // Troca de idioma: rotulo do menu conforme o estado e idioma do mapa.
  document.addEventListener('fm:idioma', e => {
    ham.setAttribute('aria-label', traduz(ham.getAttribute('aria-expanded') === 'true' ? 'Fechar menu' : 'Abrir menu'));
    const mapa = $('#map-placeholder iframe'), hl = 'hl=' + (e.detail === 'en' ? 'en' : 'pt-BR');
    if (mapa?.dataset.src) mapa.dataset.src = mapa.dataset.src.replace(/hl=[^&]*/, hl);
    else if (mapa?.getAttribute('src')) mapa.src = mapa.src.replace(/hl=[^&]*/, hl);
  });
  document.addEventListener('keydown', e => {
    if (currentModal !== 'menu') return;
    if (e.key === 'Escape') closeMenu();
    if (e.key === 'Tab') {
      const items = [ham, ...$$('a', menu)], first = items[0], last = items.at(-1);
      if(e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      if(!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', () => {
    const target = document.getElementById(a.hash.slice(1));
    if (target && a.closest('#nb-mob')) { target.tabIndex = -1; target.focus({preventScroll:true}); }
  }));
  const navObserver = new IntersectionObserver(entries => {
    for (const entry of entries) if(entry.isIntersecting) {
      $$('.nb-links a').forEach(a => { if(a.hash === '#' + entry.target.id) a.setAttribute('aria-current','location'); else a.removeAttribute('aria-current'); });
    }
  }, {rootMargin:'-15% 0px -60% 0px'});
  $$('main section[id]').forEach(el => navObserver.observe(el));
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(e => { if(e.isIntersecting) { e.target.classList.add('show'); revealObserver.unobserve(e.target); } });
  }, {threshold:.08});
  $$('.rv').forEach(el => revealObserver.observe(el));

  // Lightweight touch reveals use compositor-friendly properties and no frame loop.
  let mobileRevealObserver = null;
  function setupMobileReveals() {
    mobileRevealObserver?.disconnect();
    $$('.mobile-reveal').forEach(el => el.classList.remove('mobile-reveal','is-visible'));
    if (!mobile.matches || reduced.matches) return;
    mobileRevealObserver = new IntersectionObserver(entries => {
      for (const entry of entries) if(entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        mobileRevealObserver.unobserve(entry.target);
      }
    }, {threshold:.08,rootMargin:'0px 0px -24px 0px'});
    $$('.sh,.mp-card,.ctc-card').forEach(el => {
      el.classList.add('mobile-reveal');
      mobileRevealObserver.observe(el);
    });
  }
  motionPreference();
  setupMobileReveals();
  mobile.addEventListener('change', setupMobileReveals);
  reduced.addEventListener('change', setupMobileReveals);


  // Link externo do mapa, validado contra dominios Google.
  const lat=config.latitude, lng=config.longitude;
  const exact = typeof lat==='number' && typeof lng==='number' && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat)<=90 && Math.abs(lng)<=180;
  const mapsURL = window.FRAN_SAFETY.googleURL(config.mapsUrl) || (exact ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}` : '');
  if (mapsURL) $$('a[href*="maps.app.goo.gl"],a[href*="google.com/maps"]').forEach(a => { a.href = mapsURL; });
  // Mapa embutido: um src de embed proprio no config vence; senao, as coordenadas.
  // O validador so aceita o caminho /maps/embed, entao a URL por coordenadas e
  // montada aqui, com lat e lng ja conferidos como numeros validos.
  const quadroMapa = $('#map-placeholder iframe');
  if (quadroMapa) {
    const embed = window.FRAN_SAFETY.googleURL(config.mapsEmbedUrl, true)
      || (exact ? `https://maps.google.com/maps?q=${lat},${lng}&z=17&hl=pt-BR&output=embed` : '');
    if (embed && quadroMapa.getAttribute('src') !== embed) quadroMapa.src = embed;
  }
  // Mapa no inicio, com a rolagem parada: lazy, ele travava ao chegar na secao.
  if (quadroMapa?.getAttribute('src')) {
    quadroMapa.dataset.src = quadroMapa.getAttribute('src');
    quadroMapa.removeAttribute('src');
    quadroMapa.loading = 'eager';
  }
  // Only same-origin image paths are accepted; configuration never executes code.
  const retrato = window.FRAN_SAFETY.localAsset(config.portraitImage, location.href);
  if(retrato && config.portraitImage!==$('#hero-img').getAttribute('src')) {
    const img=$('#hero-img');img.addEventListener('error',()=>{img.src='images/franciana.png';},{once:true});img.src=retrato;
  }
  for(const [host,value] of [['wa.me',config.whatsappUrl],['instagram.com',config.instagramUrl]]) {
    try { const url=new URL(value); if(url.protocol==='https:' && (url.hostname===host || url.hostname==='www.'+host)) $$('a[href*="'+host+'"]').forEach(a=>a.href=url.href); } catch { /* Keep original verified links. */ }
  }

  addEventListener('pagehide',e=>{if(!e.persisted)motion?.dispose();});
  motion?.init();
  // Trabalho pesado so com a rolagem parada: o Safari nao tem requestIdleCallback
  // e um timer fixo caia no meio do primeiro deslize.
  const parado = fn => {
    let espera = 0;
    const armar = () => {
      clearTimeout(espera);
      espera = setTimeout(() => {
        removeEventListener('scroll', armar);
        if (window.requestIdleCallback) requestIdleCallback(fn, {timeout: 800}); else fn();
      }, 450);
    };
    addEventListener('scroll', armar, {passive: true});
    armar();
  };
  addEventListener('load', () => {
    parado(() => {
      if (quadroMapa?.dataset.src) { quadroMapa.src = quadroMapa.dataset.src; delete quadroMapa.dataset.src; }
    });
  }, {once:true});
})();
