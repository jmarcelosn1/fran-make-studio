/* FRAN MAKE STUDIO. Native scrolling, progressive enhancement, one frame scheduler. */
(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const config = window.FRAN_CONFIG || {};
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width:850px), (pointer:coarse)');
  const hero = $('#hero'), stage = $('.hero-stage'), title = $('.intro-title');
  const kicker = $('#intro-kicker'), heading = $('.intro-title h1');
  const content = $('.hero-content'), portrait = $('.hero-photo');
  const clamp = n => Math.min(1, Math.max(0, n));
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  let frame = 0, lastTime = 0, dirty = true, heroVisible = true;
  let range = 1, start = 0, progress = 0, sceneAPI = null;
  let currentModal = null;
  const carousels = [];
  const motion = window.FRAN_MOTION;
  const tickerDriven = !!window.gsap;
  const introVideo = $('#intro-video'), introMedia = $('.intro-media'), navbar = $('#navbar');
  const playIntro = $('#intro-play');
  const introMark = $('.intro-mark');
  const brushScene = $('.brush-scene'), brushVideo = $('.brush-video');
  let brushLoading = false, brushURL = '', brushBroken = false, brushTarget = 0;
  // No touch interception or independent animation loop. Portrait light is behind the cutout.
  const spotlights = $$('.mp-card,.portfolio-card,.look-frame');
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
  /* Carrossel de painel aberto.
     Quatro colunas dividem a sala que sobra depois do painel aberto, das ripas
     e dos vaos; o que passa da coluna 3 vira ripa. As larguras saem em pixel do
     JS, e nao de cqi no CSS, porque a fatia de cada coluna muda com o ponteiro.

     A fita leva os sete paineis mais uma copia de cada, so para encher a cauda.
     Sem essa folga, dois cliques seguidos esgotam os paineis a direita e abre
     um vao na borda; medido em 668px antes das copias existirem. As copias
     ficam fora da arvore de acessibilidade e nunca sao o painel aberto, porque
     a cada assentamento os originais voltam para as sete posicoes da frente. */
  const sqStrip = $('.sq-strip');
  if (sqStrip) {
    const originais = $$('.sq-panel', sqStrip);
    const copias = $$('.sq-slide');
    const total = originais.length;
    const FATIAS    = [-0.06, 0.61, 0.30, 0.15];
    const ESTICADA  = [ 0.00, 0.71, 0.40, 0.25];
    const ESPREMIDA = [-0.12, 0.59, 0.28, 0.13];
    const RIPA = 8, VAO_RIPA = 8, VAO = 16;
    const LIMITE = total - 1;   // alem disso o aberto cairia numa copia

    const COPIAS = 3;
    const sombras = [];
    for (let v = 0; v < COPIAS; v++) for (const p of originais) {
      const c = p.cloneNode(true);
      c.removeAttribute('id');
      c.setAttribute('aria-hidden', 'true');
      c.tabIndex = -1;
      c.dataset.sombra = '';
      sqStrip.appendChild(c);
      sombras.push(c);
    }

    let giro = 0;           // quantos passos os originais ja rodaram
    let atual = 0, alvo = 0, vel = 0, anim = 0, tAnt = 0;
    let apontado = -1;
    // Mola criticamente amortecida, com teto de velocidade em paineis por
    // segundo. Um passo fica visualmente pronto em uns 0,9s; uma rajada de cliques desliza no teto em
    // vez de dar tranco, que era o que acontecia com uma curva de duracao fixa
    // comecando rapido sobre cinco ou seis paineis de distancia.
    const OMEGA = 8, VMAX = 7;

    const roda = (lista, n) => lista.slice(n).concat(lista.slice(0, n));
    // Originais na frente, copias atras: o aberto e sempre um original.
    const fila = () => {
      const frente = roda(originais, giro);
      const cauda = [];
      for (let v = 0; v < COPIAS; v++) cauda.push(...roda(sombras.slice(v * total, (v + 1) * total), giro));
      return frente.concat(cauda);
    };

    const fatia = col => {
      if (apontado < 1 || apontado > 3 || reduced.matches) return FATIAS[col];
      return apontado === col ? ESTICADA[col] : ESPREMIDA[col];
    };

    /* Tudo sai de um unico valor animado, 'atual'. Antes cada painel tinha a
       sua transicao CSS; cliques seguidos as reiniciavam em pontos diferentes,
       a soma das larguras deixava de se conservar e a fita dava saltos. Com uma
       so fonte, interromper e apenas mirar outro alvo a partir de onde esta. */
    function desenhar() {
      const largura = sqStrip.parentElement.clientWidth;
      if (!largura) return;
      const estreito = largura < 720;
      const altura = parseFloat(getComputedStyle(sqStrip.parentElement).height) || 240;
      const colunas = estreito ? 2 : 4;
      let heroi = estreito ? largura * 0.58 : altura * 16 / 9;
      // So as ripas visiveis entram na conta; o resto da cauda passa da borda.
      const fixo = 3 * (RIPA + VAO_RIPA) + (colunas - 1) * VAO;
      let sala = largura - heroi - fixo;
      if (sala < 0) { heroi = Math.max(120, largura - fixo - 40); sala = largura - heroi - fixo; }
      sqStrip.style.setProperty('--sq-hero', heroi.toFixed(1) + 'px');

      const larguraEm = i => {
        if (i < 0 || i >= colunas) return RIPA;
        if (i === 0) return heroi + sala * (estreito ? 0 : fatia(0));
        return estreito ? sala : sala * fatia(i);
      };
      const margemEm = i => (i < colunas ? VAO : VAO_RIPA);
      const entre = (f, c) => { const a = Math.floor(c); return f(a) + (f(a + 1) - f(a)) * (c - a); };

      const ordem = fila();
      ordem.forEach((p, lugar) => {
        const col = lugar - atual;
        const w = entre(larguraEm, col);
        p.style.order = lugar;
        p.style.width = Math.max(RIPA, w).toFixed(1) + 'px';
        p.style.marginLeft = lugar === 0 ? '0px' : entre(margemEm, col).toFixed(1) + 'px';
        p.style.borderRadius = Math.min(6, w / 2).toFixed(1) + 'px';
        const aberto = Math.abs(col) < .5;
        p.toggleAttribute('data-aberto', aberto);
        if (!p.dataset.sombra) { p.setAttribute('aria-selected', String(aberto)); p.tabIndex = aberto ? 0 : -1; }
      });
      sqStrip.style.transform = atual ? 'translateX(' + (-atual * (RIPA + VAO)).toFixed(1) + 'px)' : '';

      const abertoEl = ordem[Math.round(atual)];
      const qual = abertoEl?.dataset.i;
      copias.forEach(c => {
        const seu = c.dataset.i === qual;
        c.toggleAttribute('data-aberto', seu);
        if (seu) c.removeAttribute('aria-hidden'); else c.setAttribute('aria-hidden', 'true');
        const link = $('a', c); if (link) link.tabIndex = seu ? 0 : -1;
      });
    }

    /* Reancora sem mudar a imagem: gira os originais m passos e desconta m de
       'atual' e de 'alvo'. A fila e periodica, originais e copias na mesma
       ordem, entao a foto em cada coluna continua a mesma; e os m paineis que
       saem da frente sao ripas inteiras, cujo espaco o deslize devolve exato. */
    function reancorar() {
      const m = Math.floor(Math.min(atual, alvo));
      if (m < 1) return;
      giro = (giro + m) % total;
      atual -= m; alvo -= m;
    }

    function quadro(t) {
      const dt = Math.min(1 / 30, (t - tAnt) / 1000 || 1 / 60);
      tAnt = t;
      const acc = OMEGA * OMEGA * (alvo - atual) - 2 * OMEGA * vel;
      vel = Math.max(-VMAX, Math.min(VMAX, vel + acc * dt));
      atual += vel * dt;
      const parado = Math.abs(alvo - atual) < 0.002 && Math.abs(vel) < 0.01;
      if (parado) { atual = alvo; vel = 0; }
      reancorar();
      desenhar();
      anim = parado ? 0 : requestAnimationFrame(quadro);
    }

    function mover() {
      if (reduced.matches) { atual = alvo; vel = 0; reancorar(); desenhar(); return; }
      if (!anim) { tAnt = performance.now(); anim = requestAnimationFrame(quadro); }
    }

    function andar(passos) {
      if (!passos || total < 2) return;
      if (passos > 0) {
        alvo = Math.min(alvo + passos, Math.floor(atual) + LIMITE);
      } else {
        // Voltar: os anteriores entram na frente ja como ripas fora da tela.
        // Girar para tras e somar o mesmo a 'atual' nao muda a imagem; o alvo
        // fica onde estava, e por isso passa a ficar n paineis atras.
        const n = Math.max(0, Math.min(-passos, Math.floor(LIMITE - (atual - alvo))));
        if (!n) return;
        giro = ((giro - n) % total + total) % total;
        atual += n;
      }
      mover();
    }

    [...originais, ...sombras].forEach(p => {
      p.addEventListener('click', () => {
        const lugar = fila().indexOf(p);
        if (Math.abs(lugar - atual) < .5) return;
        alvo = Math.min(lugar, Math.floor(atual) + LIMITE);
        mover();
      });
      p.addEventListener('pointerenter', e => {
        if (e.pointerType !== 'mouse' || anim) return;
        apontado = Math.round(fila().indexOf(p) - atual); desenhar();
      });
    });
    sqStrip.addEventListener('pointerleave', () => { apontado = -1; if (!anim) desenhar(); });
    sqStrip.addEventListener('keydown', e => {
      const passo = {ArrowRight:1, ArrowLeft:-1}[e.key];
      if (!passo) return;
      e.preventDefault(); andar(passo);
    });
    $$('.sq-arrow').forEach(b => b.addEventListener('click', () => andar(+b.dataset.sq)));

    desenhar();
    addEventListener('resize', desenhar, {passive:true});
    if (document.fonts?.ready) document.fonts.ready.then(desenhar);
  }
  let introInView = true;
  let videoTarget = 0, videoLoading = false, videoObjectURL = '';
  const videoRequest = new AbortController();
  // Only same-origin media paths are accepted; configuration never executes code.
  function localAsset(value) {
    return window.FRAN_SAFETY.localAsset(value, location.href);
  }
  const videoSource = localAsset(config.introVideo || 'images/franciana-scroll.mp4');
  const posterSource = localAsset(config.introPoster || 'images/intro-poster.webp');
  if (posterSource) introVideo.poster = posterSource;
  async function loadIntroVideo() {
    if (reduced.matches || navigator.connection?.saveData || videoLoading || introVideo.getAttribute('src') || !videoSource) return;
    videoLoading = true;
    if (mobile.matches) {
      introVideo.muted = true; introVideo.defaultMuted = true;
      introVideo.loop = true; introVideo.autoplay = true;
      introVideo.src = localAsset(config.introMobileVideo) || videoSource;
      introVideo.load();
      startMobileVideo();
      return;
    }
    try {
      // The small optimized clip is fully buffered so reverse seeking also works
      // on static preview servers that do not implement HTTP range requests.
      const response = await fetch(videoSource, {signal:videoRequest.signal});
      if (!response.ok) throw new Error('Video unavailable');
      const blob = await response.blob();
      if (videoRequest.signal.aborted) return;
      videoObjectURL = URL.createObjectURL(blob);
      introVideo.src = videoObjectURL;
      introVideo.load();
    } catch(error) {
      if (error.name !== 'AbortError') introMedia.classList.add('poster-only');
    }
  }
  async function loadBrushVideo() {
    if (reduced.matches || navigator.connection?.saveData) return;
    if (brushLoading || brushBroken || brushVideo.getAttribute('src')) return;
    brushLoading = true;
    try {
      // Buffer completo em memoria: hospedagem estatica sem HTTP Range nao
      // permite seek, e o scrub depende de buscar para frente e para tras.
      const source = mobile.matches ? 'images/pincel-scroll-mobile.mp4' : 'images/pincel-scroll.mp4';
      const response = await fetch(source, {signal:videoRequest.signal});
      if (!response.ok) throw new Error('Brush video unavailable');
      const blob = await response.blob();
      if (videoRequest.signal.aborted) return;
      brushURL = URL.createObjectURL(blob);
      brushVideo.src = brushURL;
      brushVideo.load();
    } catch (error) {
      if (error.name !== 'AbortError') brushBroken = true;
    }
  }
  function seekBrush() {
    if (brushBroken || brushVideo.readyState < 1 || brushVideo.seeking) return;
    if (!Number.isFinite(brushVideo.duration)) return;
    const target = Math.min(brushTarget, Math.max(0, brushVideo.duration - .05));
    if (Math.abs(brushVideo.currentTime - target) > .025) brushVideo.currentTime = target;
  }
  brushVideo.addEventListener('loadedmetadata', () => { dirty = true; schedule(); });
  brushVideo.addEventListener('loadeddata', seekBrush);
  brushVideo.addEventListener('error', () => { brushBroken = true; });
  function seekVideo() {
    if (mobile.matches || reduced.matches || introVideo.readyState < 1 || introVideo.seeking || !Number.isFinite(introVideo.duration)) return;
    const target = Math.min(videoTarget, Math.max(0, introVideo.duration - .05));
    if (Math.abs(introVideo.currentTime - target) > .025) introVideo.currentTime = target;
  }
  introVideo.addEventListener('loadedmetadata', () => { dirty = true; schedule(); });
  introVideo.addEventListener('loadeddata', seekVideo);
  async function startMobileVideo() {
    if (!mobile.matches || reduced.matches || !introInView || document.hidden) return;
    try { await introVideo.play(); playIntro.hidden = true; }
    catch { if (introInView) playIntro.hidden = false; }
  }
  introVideo.addEventListener('canplay', startMobileVideo);
  playIntro.addEventListener('click', () => {
    introMedia.classList.remove('poster-only');
    if (!introVideo.getAttribute('src')) { introVideo.src = localAsset(config.introMobileVideo) || videoSource; introVideo.muted = true; introVideo.loop = true; }
    if (introVideo.error) introVideo.load();
    startMobileVideo();
  });
  new IntersectionObserver(entries => {
    introInView = entries[0].isIntersecting;
    if (mobile.matches) { if (introInView) startMobileVideo(); else introVideo.pause(); }
  }, {threshold:.05}).observe(introMedia);
  introVideo.addEventListener('seeked', seekVideo);
  introVideo.addEventListener('error', () => { introMedia.classList.add('poster-only'); if(mobile.matches && !reduced.matches)playIntro.hidden=false; });

  function schedule() { if (!tickerDriven && !frame && !document.hidden) frame = requestAnimationFrame(tick); }
  function measure() {
    start = hero.offsetTop;
    range = Math.max(1, hero.offsetHeight - stage.offsetHeight);
    carousels.forEach(c => { c.max = c.track.scrollWidth - c.track.clientWidth; c.position = c.track.scrollLeft; c.root?.classList.toggle('sem-curso', c.max < 8); });
    sceneAPI?.resize(); dirty = true; schedule();
  }
  /* Fases da abertura, em fracao do curso do hero. A narrativa e uma so:
     assinatura -> pincel com Beleza e Sofisticacao -> Franciana em PNG.
     Um driver unico controla tudo, entao nao ha animacoes concorrentes. */
  const PHASE = {
    draw:     [0,   .20],
    titleOut: [.23, .33],
    brushIn:  [.26, .36],
    scrub:    [.29, .87],
    wordA:    [.38, .48],
    wordB:    [.52, .62],
    wordOut:  [.68, .78],
    brushOut: [.76, .87],
    reveal:   [.85, .97]
  };
  const at = (name, p) => smooth(PHASE[name][0], PHASE[name][1], p);

  function updateIntro() {
    progress = reduced.matches ? 1 : clamp((scrollY - start) / range);
    const still = reduced.matches;
    const drawn = still ? 1 : at('draw', progress);
    introMark.style.setProperty('--draw', drawn.toFixed(4));
    const reveal = still ? 1 : at('reveal', progress);
    const fade = still ? 1 : at('titleOut', progress);

    // Pincel: entra, o scroll conduz o tempo do video, sai antes da Franciana.
    const brushOn = still ? 0 : at('brushIn', progress) * (1 - at('brushOut', progress));
    brushScene.style.setProperty('--brush-in', brushOn.toFixed(4));
    if (brushOn > .008) loadBrushVideo();
    const wordsGone = still ? 1 : at('wordOut', progress);
    brushScene.style.setProperty('--word-a', (still ? 0 : at('wordA', progress) * (1 - wordsGone)).toFixed(4));
    brushScene.style.setProperty('--word-b', (still ? 0 : at('wordB', progress) * (1 - wordsGone)).toFixed(4));
    const [s0, s1] = PHASE.scrub;
    brushTarget = clamp((progress - s0) / (s1 - s0)) * (Number.isFinite(brushVideo.duration) ? brushVideo.duration : 0);
    if (brushOn > .008) seekBrush();

    const navigationVisible = still || progress >= .97;
    document.documentElement.classList.toggle('intro-pending', !navigationVisible);
    navbar.inert = !navigationVisible;
    navbar.setAttribute('aria-hidden', String(!navigationVisible));
    introMedia.style.opacity = still ? 0 : 1 - at('brushIn', progress);
    introVideo.style.transform = mobile.matches && !still ? `translate3d(0,${18 * progress}px,0) scale(1.025)` : '';
    videoTarget = clamp(progress / .22) * (Number.isFinite(introVideo.duration) ? introVideo.duration : 0);
    seekVideo();
    title.style.opacity = reduced.matches ? 1 : 1 - fade;
    title.style.transform = `translate3d(0,${-45 * fade}px,0)`;
    kicker.style.opacity = .8 + .2 * smooth(0, .15, progress);
    kicker.style.transform = `translateY(${12 * (1 - smooth(0, .15, progress))}px)`;
    heading.style.opacity = .75 + .25 * smooth(.06, .29, progress);
    heading.style.transform = `translateY(${20 * (1 - smooth(.06, .29, progress))}px)`;
    content.style.opacity = reveal;
    content.style.visibility = reveal > .01 ? 'visible' : 'hidden';
    content.style.transform = `translate3d(0,${28 * (1 - reveal)}px,0)`;
    content.inert = reveal < .92;
    portrait.style.opacity = reveal;
    portrait.style.visibility = reveal > .01 ? 'visible' : 'hidden';
    portrait.style.transform = `translate3d(${20 * (1 - reveal)}px,${14 * (1 - reveal)}px,0)`;
  }
  function tick(time) {
    if(document.hidden) return;
    frame = 0;
    const smoothActive = motion?.frame(time);
    const dt = Math.min(50, time - (lastTime || time)); lastTime = time;
    if (dirty) { updateIntro(); dirty = false; }
    let live = !!smoothActive;
    if (sceneAPI && heroVisible && !reduced.matches) { sceneAPI.render(time * .001, progress); live = true; }
    for (const c of carousels) {
      if (!c.visible || c.paused || reduced.matches || currentModal || c.hover || c.focus || c.drag || c.touch || time < c.resumeAt || c.max <= 0) continue;
      // Floating accumulator keeps sub-pixel velocity smooth in every browser.
      c.position += c.direction * dt * (Math.min(35,Math.max(0,Number(config.autoplaySpeed) || 18)) / 1000);
      if (c.position >= c.max || c.position <= 0) {
        c.position = Math.min(c.max, Math.max(0, c.position));
        c.direction *= -1; c.resumeAt = time + 1300;
      }
      c.track.scrollLeft = c.position; live = true;
    }
    // A single delayed wake resumes autoplay; no idle animation loop is required.
    if (live) schedule();
    else armResume();
  }
  let resumeTimer = 0;
  function armResume() {
    clearTimeout(resumeTimer);
    if (reduced.matches || document.hidden) return;
    const now = performance.now();
    const times = carousels.filter(c => c.visible && !c.paused && !c.hover && !c.focus && !c.drag && !c.touch && c.max > 0 && !currentModal).map(c => Math.max(20, c.resumeAt - now));
    if (times.length) resumeTimer = setTimeout(schedule, Math.min(...times));
  }
  function motionPreference() {
    document.documentElement.classList.toggle('mobile-layout', mobile.matches);
    document.documentElement.classList.toggle('cinematic', !reduced.matches);
    document.documentElement.classList.toggle('motion-ready', !reduced.matches);
    if (reduced.matches) { sceneAPI?.clear(); introVideo.pause(); playIntro.hidden=true; }
    loadIntroVideo();
    carousels.forEach(c => { c.position = c.track.scrollLeft; });
    measure();
  }
  addEventListener('scroll', () => { dirty = true; schedule(); }, { passive: true });
  new ResizeObserver(measure).observe(stage);
  new IntersectionObserver(entries => { heroVisible = entries[0].isIntersecting; schedule(); }, { threshold: 0 }).observe(stage);
  reduced.addEventListener('change', motionPreference);
  mobile.addEventListener('change', () => {
    introVideo.pause(); introVideo.loop=mobile.matches; introVideo.autoplay=mobile.matches;
    playIntro.hidden=true; motionPreference(); startMobileVideo();
  });
  document.addEventListener('visibilitychange', () => {
    lastTime = 0;
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; clearTimeout(resumeTimer); $$('video').forEach(v => v.pause()); }
    else { dirty = true; schedule(); startMobileVideo(); }
  });

  // Mobile navigation: hidden links are inert, Escape closes, focus stays in menu.
  const ham = $('#nb-ham'), menu = $('#nb-mob');
  function closeMenu(restore = true) {
    menu.hidden = true; menu.inert = true; menu.classList.remove('on');
    ham.setAttribute('aria-expanded', 'false'); ham.setAttribute('aria-label', 'Abrir menu');
    document.body.classList.remove('modal-open'); currentModal = null; motion?.pause(false);
    if (restore) ham.focus(); schedule();
  }
  ham.addEventListener('click', () => {
    if (!menu.hidden) return closeMenu();
    menu.hidden = false; menu.inert = false; menu.classList.add('on');
    ham.setAttribute('aria-expanded', 'true'); ham.setAttribute('aria-label', 'Fechar menu');
    document.body.classList.add('modal-open'); currentModal = 'menu'; motion?.pause(true); $('a', menu).focus();
  });
  $$('a', menu).forEach(a => a.addEventListener('click', () => closeMenu(false)));
  matchMedia('(min-width:851px)').addEventListener('change', e => { if(e.matches && !menu.hidden) closeMenu(false); });
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
    $$('.sh,.mp-card,.ctc-card,.hero-photo img').forEach(el => {
      el.classList.add('mobile-reveal');
      mobileRevealObserver.observe(el);
    });
  }
  setupMobileReveals();
  mobile.addEventListener('change', setupMobileReveals);
  reduced.addEventListener('change', setupMobileReveals);

  // Accessible photograph dialog, native focus trap and Escape handling.
  const dialog = $('#lightbox'), lbImage = $('#lb-img');
  let lastPhoto = null;
  function openPhoto(button) {
    lastPhoto = button; lbImage.src = button.dataset.img; lbImage.alt = $('img',button).alt;
    $('#lb-caption').textContent = lbImage.alt;
    dialog.showModal(); document.body.classList.add('modal-open'); currentModal = 'photo'; motion?.pause(true);
  }
  $('#lb-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', e => { if(e.target === dialog) { const r = dialog.getBoundingClientRect(); if(e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close(); } });
  dialog.addEventListener('close', () => { document.body.classList.remove('modal-open'); currentModal = null; motion?.pause(false); lastPhoto?.focus({preventScroll:true}); schedule(); });

  const galleryObserver = new IntersectionObserver(entries => { for(const e of entries) { const c=carousels.find(c=>c.track===e.target); if(c) c.visible=e.isIntersecting; } schedule(); }, {threshold:.05});
  $$('[data-carousel]').forEach(root => {
    const track = $('.portfolio-track',root), toggle = $('[data-autoplay]',root);
    const c = {root, track, position:0, max:0, direction:1, resumeAt:0, visible:false, paused:false, hover:false, focus:false, touch:false, drag:null, suppress:false};
    let lastTap = null, pointerType = 'mouse';
    carousels.push(c);
    function pause() { c.resumeAt = performance.now() + Math.max(1500,Number(config.autoplayPause) || 4500); c.position = track.scrollLeft; armResume(); }
    track.addEventListener('pointerenter', e => { if(e.pointerType === 'mouse') c.hover = true; });
    track.addEventListener('pointerleave', () => { c.hover = false; pause(); });
    track.addEventListener('focusin', e => { c.focus = e.target.matches(':focus-visible'); pause(); });
    track.addEventListener('focusout', e => { if(!track.contains(e.relatedTarget)) { c.focus = false; pause(); } });
    track.addEventListener('wheel', pause, {passive:true});
    track.addEventListener('touchstart', () => { c.touch=true; pause(); }, {passive:true});
    track.addEventListener('touchend', () => { c.touch=false; pause(); }, {passive:true});
    track.addEventListener('touchcancel', () => { c.touch=false; pause(); }, {passive:true});
    track.addEventListener('scroll', () => { if(c.drag || c.focus || c.hover || performance.now() < c.resumeAt) c.position = track.scrollLeft; }, {passive:true});
    track.addEventListener('pointerdown', e => {
      pointerType = e.pointerType;
      pause(); c.suppress = false;
      if(e.pointerType !== 'mouse' || e.button !== 0) return;
      c.drag = {id:e.pointerId,x:e.clientX,y:e.clientY,top:scrollY,left:track.scrollLeft,moved:false,axis:null};
    });
    track.addEventListener('pointermove', e => {
      if(!c.drag) return;
      const dx = e.clientX - c.drag.x;
      const dy = e.clientY - c.drag.y;
      if(!c.drag.axis && Math.max(Math.abs(dx),Math.abs(dy))>7) { c.drag.axis = Math.abs(dx)>Math.abs(dy)?'x':'y'; c.drag.moved = true; c.suppress = true; track.classList.add('dragging'); track.setPointerCapture(e.pointerId); }
      if(c.drag.axis==='x') { track.scrollLeft = c.drag.left - dx; c.position = track.scrollLeft; }
      if(c.drag.axis==='y') window.scrollTo({top:c.drag.top-dy,behavior:'instant'});
    });
    function endDrag(e) { if(!c.drag) return; if(track.hasPointerCapture(e.pointerId)) track.releasePointerCapture(e.pointerId); c.drag = null; track.classList.remove('dragging'); pause(); }
    track.addEventListener('pointerup', endDrag); track.addEventListener('pointercancel', endDrag); track.addEventListener('lostpointercapture', endDrag);
    track.addEventListener('click', e => {
      if(c.suppress) { e.preventDefault(); lastTap=null; return; }
      const button=e.target.closest('[data-img]'); if(!button)return;
      if(e.detail===0) { openPhoto(button); return; } // Keyboard and assistive activation.
      if(pointerType==='touch') {
        const now=performance.now();
        if(lastTap?.button===button && now-lastTap.time<350) { if(!dialog.open)openPhoto(button); lastTap=null; }
        else lastTap={button,time:now};
      }
    });
    track.addEventListener('dblclick', e => { const button=e.target.closest('[data-img]'); if(button && !c.suppress && !dialog.open)openPhoto(button); });
    track.addEventListener('keydown', e => {
      if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) {
        e.preventDefault(); pause();
        const left = e.key === 'Home' ? 0 : e.key === 'End' ? c.max : track.scrollLeft + (e.key === 'ArrowRight' ? 1 : -1) * track.clientWidth * .75;
        track.scrollTo({left,behavior:reduced.matches?'instant':'smooth'});
      }
    });
    $$('[data-direction]',root).forEach(b=>b.addEventListener('click',()=>{ pause(); track.scrollBy({left:Number(b.dataset.direction)*track.clientWidth*.8,behavior:reduced.matches?'instant':'smooth'}); }));
    toggle.addEventListener('click', () => { c.paused = !c.paused; toggle.setAttribute('aria-pressed',String(c.paused)); toggle.textContent = c.paused?'Retomar':'Pausar'; toggle.setAttribute('aria-label',c.paused?'Retomar movimento automático':'Pausar movimento automático'); pause(); });
    function reducedControl() { toggle.hidden = reduced.matches; }
    reduced.addEventListener('change',reducedControl); reducedControl();
    new ResizeObserver(measure).observe(track); galleryObserver.observe(track);
  });
  const videoObserver = new IntersectionObserver(entries=>entries.forEach(e=>{if(!e.isIntersecting)e.target.pause();}),{threshold:.05});
  $$('video[controls]').forEach((v,i)=>{ v.setAttribute('aria-label',['Transformação principal','Make e penteado, look completo','Make de formanda'][i]); videoObserver.observe(v); v.addEventListener('play',()=>$$('video[controls]').forEach(other=>{if(other!==v)other.pause();})); });

  document.addEventListener('click', e => {
    if(reduced.matches || !e.target.closest('a,button') || e.target.closest('dialog')) return;
    const r=e.target.closest('a,button').getBoundingClientRect();
    const star=document.createElement('span'); star.className='micro-spark'; star.setAttribute('aria-hidden','true');
    star.style.left=(e.detail?e.clientX:r.right-10)+'px';star.style.top=(e.detail?e.clientY:r.top+8)+'px';
    document.body.append(star);star.addEventListener('animationend',()=>star.remove(),{once:true});
  });

  // O mapa embutido saiu; resta o link externo, validado contra dominios Google.
  const lat=config.latitude, lng=config.longitude;
  const exact = typeof lat==='number' && typeof lng==='number' && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat)<=90 && Math.abs(lng)<=180;
  const mapsURL = window.FRAN_SAFETY.googleURL(config.mapsUrl) || (exact ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}` : '');
  if (mapsURL) $$('a[href*="maps.app.goo.gl"],a[href*="google.com/maps"]').forEach(a => { a.href = mapsURL; });
  if(localAsset(config.portraitImage) && config.portraitImage!==$('#hero-img').getAttribute('src')) {
    const img=$('#hero-img');img.addEventListener('error',()=>{img.src='images/franciana.png';},{once:true});img.src=localAsset(config.portraitImage);
  }
  for(const [host,value] of [['wa.me',config.whatsappUrl],['instagram.com',config.instagramUrl]]) {
    try { const url=new URL(value); if(url.protocol==='https:' && (url.hostname===host || url.hostname==='www.'+host)) $$('a[href*="'+host+'"]').forEach(a=>a.href=url.href); } catch { /* Keep original verified links. */ }
  }

  // Three.js uses one GPU draw call. Particle convergence runs in the vertex shader.
  async function initThree() {
    if(reduced.matches || sceneAPI || config.particles === false || navigator.connection?.saveData) return;
    try {
      const THREE = await import('./vendor/three.module.min.js');
      if(sceneAPI || reduced.matches) return;
      const canvas=$('#webgl-canvas');
      const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:false,powerPreference:'low-power'});
      const scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(38,1,.1,50);
      camera.position.z=8;
      const low=innerWidth<700 || (navigator.hardwareConcurrency || 8)<=4;
      const count=low?60:260;
      const positions=new Float32Array(count*3), targets=new Float32Array(count*3), seeds=new Float32Array(count);
      // Stable seed makes the composition deterministic and avoids random flicker on resize.
      let seed=31;const random=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
      for(let i=0;i<count;i++) {
        const j=i*3, angle=random()*Math.PI*2, radius=low ? .55+random()*.75 : .85+random()*.9;
        positions[j]=(random()-.5)*12;positions[j+1]=(random()-.5)*7;positions[j+2]=(random()-.5)*3;
        targets[j]=Math.cos(angle)*radius;targets[j+1]=Math.sin(angle)*radius*(low?.85:1.25);targets[j+2]=(random()-.5)*1.8;
        seeds[i]=random();
      }
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('target',new THREE.BufferAttribute(targets,3));geometry.setAttribute('seed',new THREE.BufferAttribute(seeds,1));
      const uniforms={uProgress:{value:0},uTime:{value:0},uMotion:{value:Math.min(.25,Math.max(.03,Number(config.particleMotion)||.12))},uDpr:{value:1},uCenter:{value:new THREE.Vector2(2,0)}};
      const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms,
        vertexShader:`attribute vec3 target; attribute float seed; uniform float uProgress; uniform float uTime; uniform float uMotion; uniform float uDpr; uniform vec2 uCenter; varying float vAlpha;
          void main(){ float p=smoothstep(0.04,0.91,uProgress); vec3 end=target+vec3(uCenter,0.0); vec3 pos=mix(position,end,p);
          pos.x+=sin(p*3.14159)*sin(seed*20.0)*0.65; pos.y+=sin(p*3.14159)*cos(seed*20.0)*0.4;
          pos.xy+=vec2(sin(uTime*.32+seed*20.0),cos(uTime*.26+seed*15.0))*uMotion;
          vec4 mv=modelViewMatrix*vec4(pos,1.0); gl_Position=projectionMatrix*mv; gl_PointSize=clamp((1.3+seed*1.8)*uDpr*(8.0/-mv.z),1.0,5.0*uDpr);
          vAlpha=(.18+seed*.4)*(.8+p*.2); }`,
        fragmentShader:`varying float vAlpha; void main(){float d=length(gl_PointCoord-.5);float a=(1.0-smoothstep(.08,.5,d))*vAlpha;gl_FragColor=vec4(${document.documentElement.dataset.theme === 'dark' ? '.94,.63,.63' : '.64,.29,.39'},a);}`});
      const points=new THREE.Points(geometry,material);points.frustumCulled=false;scene.add(points);
      let lost=false;
      const resize=()=>{
        const w=stage.clientWidth,h=stage.clientHeight;
        camera.aspect=w/h;camera.updateProjectionMatrix();
        const dpr=Math.min(devicePixelRatio||1,low?1.25:1.6);renderer.setPixelRatio(dpr);renderer.setSize(w,h,false);uniforms.uDpr.value=dpr;
        const r=portrait.getBoundingClientRect(),s=stage.getBoundingClientRect();
        const worldH=2*Math.tan(38*Math.PI/360)*8, worldW=worldH*w/h;
        uniforms.uCenter.value.set(((r.left-s.left+r.width/2)/w-.5)*worldW,(.5-(r.top-s.top+r.height/2)/h)*worldH);
      };
      sceneAPI={resize,clear:()=>renderer.clear(),render:(t,p)=>{if(!lost){uniforms.uTime.value=t;uniforms.uProgress.value=p;renderer.render(scene,camera);}},dispose:()=>{geometry.dispose();material.dispose();renderer.dispose();}};
      canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;});canvas.addEventListener('webglcontextrestored',()=>{lost=false;resize();schedule();});
      resize();schedule();
    } catch { /* Core page remains usable without WebGL or module support. */ $('#webgl-canvas').hidden=true; }
  }
  reduced.addEventListener('change',()=>{if(!reduced.matches)initThree();});
  addEventListener('pagehide',e=>{cancelAnimationFrame(frame);frame=0;clearTimeout(resumeTimer);if(!e.persisted){videoRequest.abort();if(videoObjectURL)URL.revokeObjectURL(videoObjectURL);sceneAPI?.dispose();motion?.dispose();}});
  addEventListener('pageshow',()=>{dirty=true;schedule();});
  motion?.init();
  if(tickerDriven) gsap.ticker.add(()=>tick(performance.now()));
  motionPreference();initThree();
})();
