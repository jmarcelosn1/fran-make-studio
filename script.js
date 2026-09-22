/* FRAN MAKE STUDIO. Native scrolling, progressive enhancement, one frame scheduler. */
(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const config = window.FRAN_CONFIG || {};
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  // Menos movimento: pedido pelo sistema ou modo leve (ver medirQuadros).
  let modoLeve = document.documentElement.classList.contains('modo-leve');
  const calmo = {get matches() { return reduced.matches || modoLeve; }};
  const mobile = matchMedia('(max-width:850px), (pointer:coarse)');
  const hero = $('#hero'), stage = $('.hero-stage'), title = $('.intro-title');
  const kicker = $('#intro-kicker'), assinatura = $('.intro-signature');
  const content = $('.hero-content'), portrait = $('.hero-photo');
  const clamp = n => Math.min(1, Math.max(0, n));
  const traduz = texto => (window.FRAN_IDIOMA ? window.FRAN_IDIOMA.t(texto) : texto);
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  let frame = 0, dirty = true, heroVisible = true;
  let range = 1, start = 0, progress = 0;
  let currentModal = null;
  const motion = window.FRAN_MOTION;
  const tickerDriven = !!window.gsap;
  const introVideo = $('#intro-video'), introMedia = $('.intro-media'), navbar = $('#navbar');
  const introMark = $('.intro-mark');
  const brushScene = $('.brush-scene'), brushVideo = $('.brush-video');
  let brushLoading = false, brushURL = '', brushFonte = '', brushBroken = false, brushTarget = 0;
  let semAutoplay = false;
  // No touch interception or independent animation loop. Portrait light is behind the cutout.
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
      if (!finePointer.matches || calmo.matches || event.pointerType === 'touch') return;
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

     A fita leva os paineis mais tres copias de cada, so para encher a cauda.
     Sem essa folga, dois cliques seguidos esgotam os paineis a direita e abre
     um vao na borda; medido em 668px antes das copias existirem. As copias
     ficam fora da arvore de acessibilidade e nunca sao o painel aberto, porque
     a cada assentamento os originais voltam para as posicoes da frente. */
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

    /* Fatias animadas: o hover muda o alvo e elas deslizam ate la no mesmo laco
       da mola. Trocadas de uma vez, o painel estalava aberto quando a pagina
       rolava por baixo do ponteiro. Cada conjunto soma 1, entao a interpolacao
       nao muda a largura da fita e nao abre vao. */
    const partes = FATIAS.slice();
    let alvoPartes = FATIAS;
    const mirarPartes = () => {
      alvoPartes = (apontado < 1 || apontado > 3 || calmo.matches) ? FATIAS
        : FATIAS.map((_, i) => (apontado === i ? ESTICADA[i] : ESPREMIDA[i]));
    };
    const fatia = col => partes[col];
    const emMovimento = () => Math.abs(alvo - atual) > .002 || Math.abs(vel) > .01;

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
      const k = 1 - Math.exp(-dt * 9);
      let resto = 0;
      for (let i = 0; i < partes.length; i++) {
        partes[i] += (alvoPartes[i] - partes[i]) * k;
        resto = Math.max(resto, Math.abs(alvoPartes[i] - partes[i]));
      }
      if (resto < .0005) alvoPartes.forEach((v, i) => { partes[i] = v; });
      reancorar();
      desenhar();
      anim = parado && resto < .0005 ? 0 : requestAnimationFrame(quadro);
    }

    function mover() {
      if (calmo.matches) {
        atual = alvo; vel = 0; alvoPartes.forEach((v, i) => { partes[i] = v; });
        reancorar(); desenhar(); return;
      }
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
      p.addEventListener('pointermove', e => {
        // So movimento real do mouse. Quando a pagina rola por baixo de um
        // ponteiro parado o navegador tambem dispara evento, mas no mesmo ponto
        // da tela. O movementX servia para isso, mas o WebKit o deixa em zero.
        if (e.pointerType !== 'mouse' || (e.clientX === ponteiroX && e.clientY === ponteiroY)) return;
        if (performance.now() < rolandoAte || emMovimento()) return;
        const col = Math.round(fila().indexOf(p) - atual);
        if (col === apontado) return;
        apontado = col; mirarPartes(); mover();
      });
    });
    let rolandoAte = 0;
    // Ultima posicao do ponteiro, gravada depois do painel conferir o evento.
    let ponteiroX = -1, ponteiroY = -1;
    addEventListener('pointermove', e => { ponteiroX = e.clientX; ponteiroY = e.clientY; }, {passive:true});
    addEventListener('scroll', () => { rolandoAte = performance.now() + 220; }, {passive:true});
    sqStrip.addEventListener('pointerleave', () => { apontado = -1; mirarPartes(); mover(); });
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
  let videoFonte = videoSource;
  const posterSource = localAsset(config.introPoster || 'images/intro-poster.webp');
  if (posterSource) introVideo.poster = posterSource;
  async function loadIntroVideo() {
    if (navigator.connection?.saveData) autoplayRecusado();
    if (calmo.matches || navigator.connection?.saveData || videoLoading || introVideo.getAttribute('src') || !videoSource) return;
    videoLoading = true;
    if (mobile.matches) {
      introVideo.muted = true; introVideo.defaultMuted = true;
      introVideo.loop = true; introVideo.autoplay = true;
      videoFonte = localAsset(config.introMobileVideo) || videoSource;
    }
    try {
      // Blob inteiro na memoria: a Cloudflare Pages ignora pedidos parciais (HTTP
      // Range), e sem eles o Safari do iPhone nao toca e o desktop nao volta atras.
      const response = await fetch(videoFonte, {signal:videoRequest.signal});
      if (!response.ok) throw new Error('Video unavailable');
      const blob = await response.blob();
      if (videoRequest.signal.aborted) return;
      videoObjectURL = URL.createObjectURL(blob);
      introVideo.src = videoObjectURL;
      introVideo.load();
      startMobileVideo();
    } catch(error) {
      if (error.name !== 'AbortError') semVideo();
    }
  }
  // Sem video, no celular, vale o mesmo que sem autoplay.
  const semVideo = () => (mobile.matches ? autoplayRecusado() : introMedia.classList.add('poster-only'));
  async function loadBrushVideo() {
    if (mobile.matches || calmo.matches || navigator.connection?.saveData) return;
    if (brushLoading || brushBroken || brushVideo.getAttribute('src')) return;
    brushLoading = true;
    // O preload="none" do HTML so evita baixar antes da hora.
    brushVideo.preload = 'auto';
    try {
      // Buffer completo em memoria: hospedagem estatica sem HTTP Range nao
      // permite seek, e o scrub depende de buscar para frente e para tras.
      const source = brushFonte = 'images/pincel-scroll.mp4';
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
    if (mobile.matches || brushBroken || brushVideo.readyState < 1 || brushVideo.seeking) return;
    if (!Number.isFinite(brushVideo.duration)) return;
    const target = Math.min(brushTarget, Math.max(0, brushVideo.duration - .05));
    if (Math.abs(brushVideo.currentTime - target) > .025) brushVideo.currentTime = target;
  }
  brushVideo.addEventListener('loadedmetadata', () => { dirty = true; schedule(); });
  brushVideo.addEventListener('loadeddata', () => { seekBrush(); dirty = true; schedule(); });
  // Celular: o pincel gira com o dedo por quadros num canvas (seek de video e
  // lento e autoplay falha). 64 quadros em 4 folhas 8x2, recorte do quadro 414x648.
  const QUADROS = 64, POR_FOLHA = 16, COLUNAS = 8;
  const RECORTE = {x: 142, y: 27, w: 136, h: 602}, QUADRO = {w: 414, h: 648};
  const folhas = [];
  let telaPincel = null, ctxPincel = null, quadroPincel = -1, quadroAlvo = 0, geometria = null;
  function carregarQuadros() {
    if (telaPincel || !mobile.matches || calmo.matches) return;
    telaPincel = document.createElement('canvas');
    telaPincel.className = 'brush-quadros';
    telaPincel.setAttribute('aria-hidden', 'true');
    ctxPincel = telaPincel.getContext('2d');
    brushVideo.after(telaPincel);
    new ResizeObserver(() => { geometria = null; desenharPincel(quadroAlvo, true); }).observe(brushScene);
    for (let i = 0; i < QUADROS / POR_FOLHA; i++) {
      const folha = new Image();
      folha.decoding = 'async';
      if (i) folha.fetchPriority = 'low';
      folha.src = `images/pincel-quadros-${i + 1}.webp`;
      folha.decode().then(() => {
        folhas[i] = folha;
        brushScene.classList.add('quadros');
        desenharPincel(quadroAlvo, true);
      }).catch(() => {});
    }
  }
  function desenharPincel(alvo, forca) {
    quadroAlvo = alvo;
    if (!ctxPincel) return;
    // Enquanto a folha do quadro pedido nao chega, vale o carregado mais perto.
    let q = -1;
    for (let d = 0; d < QUADROS && q < 0; d++) {
      for (const c of [alvo - d, alvo + d]) if (c >= 0 && c < QUADROS && folhas[Math.floor(c / POR_FOLHA)]) { q = c; break; }
    }
    if (q < 0 || (q === quadroPincel && !forca)) return;
    if (!geometria) {
      // O mesmo "contain" do video e do poster, desenhado na densidade da tela.
      const w = brushScene.clientWidth, h = brushScene.clientHeight, dpr = Math.min(devicePixelRatio || 1, 2);
      telaPincel.width = Math.round(w * dpr); telaPincel.height = Math.round(h * dpr);
      const s = Math.min(w / QUADRO.w, h / QUADRO.h) * dpr;
      geometria = {s, x: (telaPincel.width - QUADRO.w * s) / 2 + RECORTE.x * s, y: (telaPincel.height - QUADRO.h * s) / 2 + RECORTE.y * s};
      ctxPincel.imageSmoothingQuality = 'high';
    }
    const {s, x, y} = geometria, n = q % POR_FOLHA;
    ctxPincel.drawImage(folhas[Math.floor(q / POR_FOLHA)], (n % COLUNAS) * RECORTE.w, Math.floor(n / COLUNAS) * RECORTE.h, RECORTE.w, RECORTE.h, x, y, RECORTE.w * s, RECORTE.h * s);
    quadroPincel = q;
    telaPincel.dataset.quadro = q;
  }
  // iOS em Modo de Pouca Energia (e o Instagram) recusa play() sem toque: fica a
  // capa respirando em CSS e o nome ja escrito.
  const recusou = error => { if (error?.name === 'NotAllowedError') autoplayRecusado(); };
  function autoplayRecusado() {
    if (semAutoplay) return;
    semAutoplay = true;
    introVideo.pause();
    introMedia.classList.add('poster-only');
    document.documentElement.classList.add('sem-autoplay');
    dirty = true; schedule();
  }
  document.addEventListener('visibilitychange', () => { dirty = true; acordarLuz(); schedule(); });
  // Alguns WebKit recusam video em blob: (erro 4) e tocam o mesmo arquivo pelo
  // endereco. Tenta o endereco uma vez antes de desistir do video.
  const tentarEndereco = (video, blobURL, endereco) => {
    if (!blobURL || video.src !== blobURL) return false;
    video.src = endereco; video.load();
    return true;
  };
  brushVideo.addEventListener('error', () => { if (!tentarEndereco(brushVideo, brushURL, brushFonte)) brushBroken = true; });
  function seekVideo() {
    if (mobile.matches || calmo.matches || introVideo.readyState < 1 || introVideo.seeking || !Number.isFinite(introVideo.duration)) return;
    const target = Math.min(videoTarget, Math.max(0, introVideo.duration - .05));
    if (Math.abs(introVideo.currentTime - target) > .025) introVideo.currentTime = target;
  }
  introVideo.addEventListener('loadedmetadata', () => { dirty = true; schedule(); });
  introVideo.addEventListener('loadeddata', seekVideo);
  async function startMobileVideo() {
    if (!mobile.matches || calmo.matches || semAutoplay || !introInView || document.hidden || !introVideo.getAttribute('src')) return;
    try { await introVideo.play(); }
    catch (error) { recusou(error); }
  }
  introVideo.addEventListener('canplay', startMobileVideo);
  new IntersectionObserver(entries => {
    introInView = entries[0].isIntersecting;
    if (mobile.matches) { if (introInView) startMobileVideo(); else introVideo.pause(); }
  }, {threshold:.05}).observe(introMedia);
  introVideo.addEventListener('seeked', seekVideo);
  introVideo.addEventListener('error', () => { if (!tentarEndereco(introVideo, videoObjectURL, videoFonte)) semVideo(); });

  function schedule() { if (!tickerDriven && !frame && !document.hidden) frame = requestAnimationFrame(tick); }
  function measure() {
    start = hero.offsetTop;
    range = Math.max(1, hero.offsetHeight - stage.offsetHeight);
    dirty = true; schedule();
  }
  /* Fases da abertura, em fracao do curso do hero. A narrativa e uma so:
     assinatura -> pincel com Beleza e Sofisticacao -> Franciana em PNG.
     Um driver unico controla tudo, entao nao ha animacoes concorrentes. */
  const PHASE = {
    draw:     [0,   .17],
    titleOut: [.21, .29],
    brushIn:  [.24, .33],
    scrub:    [.27, .80],
    wordA:    [.35, .44],
    wordB:    [.47, .56],
    wordOut:  [.61, .69],
    brushOut: [.69, .80],
    // Respiro entre o pincel sair e a Franciana entrar. Antes a revelacao
    // comecava com o pincel ainda na tela.
    reveal:   [.855, .97]
  };
  const at = (name, p) => smooth(PHASE[name][0], PHASE[name][1], p);

  function updateIntro() {
    progress = calmo.matches ? 1 : clamp((scrollY - start) / range);
    const still = calmo.matches;
    aplicarEntrada(still || semAutoplay ? 1 : at('draw', progress));
    // No celular o respiro preto entre o pincel e a Franciana e curto: num deslize
    // o intervalo longo parecia a tela piscando vazia.
    const reveal = still ? 1 : mobile.matches ? smooth(.82, .94, progress) : at('reveal', progress);
    // Foto e texto ficam visiveis, em opacidade 0, desde que o pincel sai: pintura
    // e camadas saem na tela preta, e a entrada vira so opacidade.
    const pronto = still || reveal > .01 || progress > .8;
    const fade = still ? 1 : at('titleOut', progress);

    // Pincel: entra por fade, o scroll conduz o tempo do video, e sai erguido,
    // acelerando para cima, como quem tira o pincel do rosto no fim do traco.
    const saida = still ? 0 : at('brushOut', progress);
    const brushOn = still ? 0 : at('brushIn', progress) * (1 - smooth(.72, 1, saida));
    brushScene.style.setProperty('--brush-in', brushOn.toFixed(4));
    brushScene.style.setProperty('--brush-out', (saida * saida).toFixed(4));
    if (brushOn > .008) { loadBrushVideo(); carregarQuadros(); }
    const wordsGone = still ? 1 : at('wordOut', progress);
    brushScene.style.setProperty('--word-a', (still ? 0 : at('wordA', progress) * (1 - wordsGone)).toFixed(4));
    brushScene.style.setProperty('--word-b', (still ? 0 : at('wordB', progress) * (1 - wordsGone)).toFixed(4));
    const [s0, s1] = PHASE.scrub, giro = clamp((progress - s0) / (s1 - s0));
    if (mobile.matches) desenharPincel(Math.round(giro * (QUADROS - 1)));
    else {
      brushTarget = giro * (Number.isFinite(brushVideo.duration) ? brushVideo.duration : 0);
      if (brushOn > .008) seekBrush();
    }

    const navigationVisible = still || progress >= .97;
    document.documentElement.classList.toggle('intro-pending', !navigationVisible);
    navbar.inert = !navigationVisible;
    navbar.setAttribute('aria-hidden', String(!navigationVisible));
    introMedia.style.opacity = still ? 0 : 1 - at('brushIn', progress);
    introVideo.style.transform = mobile.matches && !still ? `translate3d(0,${18 * progress}px,0) scale(1.025)` : '';
    videoTarget = clamp(progress / .22) * (Number.isFinite(introVideo.duration) ? introVideo.duration : 0);
    seekVideo();
    title.style.opacity = calmo.matches ? 1 : 1 - fade;
    title.style.transform = `translate3d(0,${-45 * fade}px,0)`;
    // 0,2% em vez de 0: invisivel no preto, mas o Chrome so rasteriza camada que
    // aparece, e assim o trabalho sai antes da entrada.
    const opaco = pronto ? Math.max(reveal, .002) : reveal;
    content.style.opacity = opaco;
    content.style.visibility = pronto ? 'visible' : 'hidden';
    content.style.transform = `translate3d(0,${28 * (1 - reveal)}px,0)`;
    content.inert = reveal < .92;
    portrait.style.opacity = opaco;
    portrait.style.visibility = pronto ? 'visible' : 'hidden';
    portrait.classList.toggle('apagado', !pronto);
    // Sobe de baixo: o palco corta a base, entao ela nasce da borda inferior.
    portrait.style.transform = `translate3d(0,${36 * (1 - reveal)}%,0)`;
  }
  /* Abertura: o scroll escreve o nome, e o CONHECA e a legenda acendem na mesma
     medida. Antes as legendas ja estavam na tela enquanto o nome ainda nao tinha
     sido escrito, e ficavam soltas. No topo, antes do primeiro scroll, aparece so
     o video: e o preco de o nome ser escrito pela mao de quem rola. */
  /* Beleza e Sofisticacao acendem letra a letra. As letras ficam em linha, nao
     em caixas, para manter o ajuste entre elas, e o "fi" anda junto para a
     ligadura nao quebrar. */
  function dividirPalavra(palavra, texto) {
    const unidades = texto.match(/fi|fl|./gu) || [];
    palavra.style.setProperty('--n', unidades.length);
    palavra.textContent = '';
    unidades.forEach((u, i) => {
      const letra = document.createElement('span');
      letra.className = 'letra';
      letra.style.setProperty('--i', i);
      letra.textContent = u;
      palavra.appendChild(letra);
    });
  }
  // O original fica guardado para a troca de idioma redividir a palavra traduzida.
  $$('.brush-word').forEach(palavra => {
    palavra.dataset.pt = palavra.textContent;
    dividirPalavra(palavra, traduz(palavra.dataset.pt));
  });
  function aplicarEntrada(e) {
    // Tudo sai do quanto o nome ja foi escrito: o CONHECA acende na mesma medida
    // e nunca fica na tela antes do nome; a legenda fecha o movimento.
    const t = clamp(e / .75);
    const escrito = 1 - (1 - t) * (1 - t);
    introMark.style.setProperty('--draw', escrito.toFixed(4));
    const k = smooth(0, .7, escrito);
    kicker.style.opacity = k;
    kicker.style.transform = `translateY(${8 * (1 - k)}px)`;
    const a = smooth(.66, 1, e);
    assinatura.style.opacity = a;
    assinatura.style.transform = `translateY(${8 * (1 - a)}px)`;
  }
  function tick(time) {
    if(document.hidden) return;
    frame = 0;
    const smoothActive = motion?.frame(time);
    if (dirty) { updateIntro(); dirty = false; }
    if (smoothActive) schedule();
  }
  function motionPreference() {
    // Trocar de modo muda a altura do hero. O Safari nao tem ancoragem de
    // rolagem e a tela caia no meio da intro; volta para a mesma secao.
    const secao = hero.getBoundingClientRect().bottom <= 0 ? $$('main > section').find(el => el.getBoundingClientRect().bottom > 0) : null;
    const topo = secao ? secao.getBoundingClientRect().top : 0;
    document.documentElement.classList.toggle('mobile-layout', mobile.matches);
    document.documentElement.classList.toggle('cinematic', !calmo.matches);
    document.documentElement.classList.toggle('motion-ready', !calmo.matches);
    if (calmo.matches) introVideo.pause();
    loadIntroVideo();
    measure();
    if (secao) scrollBy({top: secao.getBoundingClientRect().top - topo, behavior: 'instant'});
    acordarLuz();
  }
  addEventListener('scroll', () => { dirty = true; schedule(); }, { passive: true });
  new ResizeObserver(measure).observe(stage);
  new IntersectionObserver(entries => {
    heroVisible = entries[0].isIntersecting;
    acordarLuz();
    schedule();
  }, { threshold: 0 }).observe(stage);
  reduced.addEventListener('change', motionPreference);
  mobile.addEventListener('change', () => {
    introVideo.pause(); introVideo.loop=mobile.matches; introVideo.autoplay=mobile.matches;
    motionPreference(); startMobileVideo();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; $$('video').forEach(v => v.pause()); }
    else { dirty = true; schedule(); startMobileVideo(); }
  });

  // Mobile navigation: hidden links are inert, Escape closes, focus stays in menu.
  const ham = $('#nb-ham'), menu = $('#nb-mob');
  function closeMenu(restore = true) {
    menu.hidden = true; menu.inert = true; menu.classList.remove('on');
    ham.setAttribute('aria-expanded', 'false'); ham.setAttribute('aria-label', traduz('Abrir menu'));
    document.body.classList.remove('modal-open'); currentModal = null; motion?.pause(false);
    if (restore) ham.focus(); schedule();
  }
  ham.addEventListener('click', () => {
    if (!menu.hidden) return closeMenu();
    menu.hidden = false; menu.inert = false; menu.classList.add('on');
    ham.setAttribute('aria-expanded', 'true'); ham.setAttribute('aria-label', traduz('Fechar menu'));
    document.body.classList.add('modal-open'); currentModal = 'menu'; motion?.pause(true); $('a', menu).focus();
  });
  $$('a', menu).forEach(a => a.addEventListener('click', () => closeMenu(false)));
  matchMedia('(min-width:851px)').addEventListener('change', e => { if(e.matches && !menu.hidden) closeMenu(false); });
  // Troca de idioma: rotulo do menu conforme o estado, palavras do pincel e mapa.
  document.addEventListener('fm:idioma', e => {
    ham.setAttribute('aria-label', traduz(ham.getAttribute('aria-expanded') === 'true' ? 'Fechar menu' : 'Abrir menu'));
    $$('.brush-word').forEach(palavra => dividirPalavra(palavra, traduz(palavra.dataset.pt)));
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
    if (!mobile.matches || calmo.matches) return;
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


  document.addEventListener('click', e => {
    if(calmo.matches || !e.target.closest('a,button') || e.target.closest('dialog')) return;
    const r=e.target.closest('a,button').getBoundingClientRect();
    const star=document.createElement('span'); star.className='micro-spark'; star.setAttribute('aria-hidden','true');
    star.style.left=(e.detail?e.clientX:r.right-10)+'px';star.style.top=(e.detail?e.clientY:r.top+8)+'px';
    document.body.append(star);star.addEventListener('animationend',()=>star.remove(),{once:true});
  });

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
  if(localAsset(config.portraitImage) && config.portraitImage!==$('#hero-img').getAttribute('src')) {
    const img=$('#hero-img');img.addEventListener('error',()=>{img.src='images/franciana.png';},{once:true});img.src=localAsset(config.portraitImage);
  }
  for(const [host,value] of [['wa.me',config.whatsappUrl],['instagram.com',config.instagramUrl]]) {
    try { const url=new URL(value); if(url.protocol==='https:' && (url.hostname===host || url.hostname==='www.'+host)) $$('a[href*="'+host+'"]').forEach(a=>a.href=url.href); } catch { /* Keep original verified links. */ }
  }

  /* Contorno de luz: o Next.js Flare (vgpu.sh) refeito em WebGL 1, para rodar
     tambem sem WebGPU. Mesmo algoritmo; o traco aceso, la o N do logo, aqui e a
     borda da silhueta, com o canvas atras da foto. Luz menor e de alcance menor
     que o original, a pedido: queda 6.85 (spotReach .25), halo .07, extension
     .2 (decaimento .875, densidade .51) e raios a 80%. So a borda borrada entra:
     a linha nitida e o contorno fixo deixavam a foto com cara de recorte.
     Acima da cabeca so os raios se apagam, de baixo para cima: com a luz mais
     baixa que ela, eles subiam ate o menu e o fundo dele os cortava numa reta.
     Borda e desfoque saem uma vez; por quadro, so a composicao, a 30 quadros. */
  const luzes = [];
  const acordarLuz = () => luzes.forEach(acordar => acordar());
  function acenderLuz(img, o) {
    if (config.lightContour === false || !img) return;
    if (!img.complete || !img.naturalWidth) { img.addEventListener('load', () => acenderLuz(img, o), {once:true}); return; }
    const tela = Object.assign(document.createElement('canvas'), {className: o.classe});
    const gl = tela.getContext('webgl', {antialias: false, powerPreference: 'low-power'});
    if (!gl) return;
    // Sem GPU cada quadro pesaria na CPU: fica um quadro so, parado.
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const parado = !!info && /swiftshader|llvmpipe|software/i.test(gl.getParameter(info.UNMASKED_RENDERER_WEBGL));
    const W = o.N, H = Math.round(W * img.naturalHeight / img.naturalWidth), f = o.folga / (1 + 2 * o.folga);
    const m = Math.min(W, H);
    Object.assign(tela, {width: W, height: H});
    tela.setAttribute('aria-hidden', 'true');
    // A textura so leva o brilho borrado: calculada em meia resolucao, que a GPU
    // amplia com interpolacao sem diferenca visivel, e em lacos diretos. Era um
    // bloco de ~400ms numa CPU de celular; assim fica em poucas dezenas.
    const w = Math.round(W / 2), h = Math.round(H / 2), n = w * h, mt = Math.min(w, h);
    const ctx = Object.assign(document.createElement('canvas'), {width: w, height: h}).getContext('2d');
    const bx = Math.round(w * f), by = Math.round(h * f);
    ctx.drawImage(img, bx, by, w - 2 * bx, h - 2 * by);
    // Estica a ultima linha: o corte reto da cintura nao vira borda.
    ctx.drawImage(img, 0, img.naturalHeight - 1, img.naturalWidth, 1, bx, h - by - 1, w - 2 * bx, by + 1);
    const px = ctx.getImageData(0, 0, w, h).data;
    const a = new Float32Array(n);
    for (let i = 0; i < n; i++) a[i] = px[i * 4 + 3] / 255;
    // Passada separavel: em cada pixel, reduz os vizinhos a +-r na horizontal ou
    // na vertical, com borda repetida. Serve a dilatacao (max) e ao desfoque (soma).
    const passada = (de, horiz, r, junta, peso) => {
      const s = new Float32Array(n);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        let t = junta ? de[y * w + x] * peso[0] : de[y * w + x];
        for (let k = 1; k <= r; k++) {
          const p1 = horiz ? y * w + Math.min(w - 1, x + k) : Math.min(h - 1, y + k) * w + x;
          const p2 = horiz ? y * w + Math.max(0, x - k) : Math.max(0, y - k) * w + x;
          if (junta) t += (de[p1] + de[p2]) * peso[k];
          else t = Math.max(t, de[p1], de[p2]);
        }
        s[y * w + x] = t;
      }
      return s;
    };
    // Borda: o que o desenho ganha dilatado em 1px aqui (2px no tamanho final).
    const d = passada(passada(a, true, 1), false, 1);
    const traco = new Float32Array(n);
    for (let i = 0; i < n; i++) traco[i] = (d[i] - a[i]) ** 2;
    const sigma = mt / o.borrao, raio = Math.ceil(sigma * 3), g = [];
    for (let k = 0; k <= raio; k++) g.push(Math.exp(-k * k / (2 * sigma * sigma)));
    const total = g.reduce((t, v, k) => t + (k ? 2 * v : v), 0);
    const pesos = g.map(v => v / total);
    const borrado = passada(passada(traco, true, raio, true, pesos), false, raio, true, pesos);
    let pico = 1e-6;
    for (let i = 0; i < n; i++) if (borrado[i] > pico) pico = borrado[i];
    const dados = new Uint8Array(n * 4);
    for (let i = 0; i < n; i++) dados[i * 4 + 1] = borrado[i] / pico * 255;
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, dados);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const prog = gl.createProgram();
    const shader = (tipo, fonte) => { const sh = gl.createShader(tipo); gl.shaderSource(sh, fonte); gl.compileShader(sh); gl.attachShader(prog, sh); };
    shader(gl.VERTEX_SHADER, 'attribute vec2 p;varying vec2 u;void main(){u=vec2(p.x,-p.y)*.5+.5;gl_Position=vec4(p,0.,1.);}');
    // Composicao do composite.wgsl e do rim.wgsl, com a luz reduzida acima.
    shader(gl.FRAGMENT_SHADER, `precision highp float;uniform sampler2D t;uniform vec2 L,A;uniform float f,q;varying vec2 u;
float k(vec2 c){vec2 d=(L-c)*A;return 1./(1.+dot(d,d)*6.85);}
void main(){float b=texture2D(t,u).g*k(u),w=1.,W=0.,z=0.;
vec2 d=(u-L)*(${o.densidade}/${o.passos}.),c=u-d*fract(sin(dot(u,vec2(12.9898,78.233))+q)*43758.5453);
for(int i=0;i<${o.passos};i++){c-=d;z+=texture2D(t,c).g*k(c)*w;W+=w;w*=${o.decai};}
vec2 h=(u-L)*A;float H=exp(-dot(h,h)/.0049),S=b*.85*(1.+H*1.5);
vec3 C=vec3(.94,.64,.68),R=(C*H*b*.7+(mix(vec3(1.),C,.7)+C*.3)*S+C*z/W*2.6*smoothstep(.06,.3,u.y))*f*.8;
vec2 g=smoothstep(0.,.2,u)*smoothstep(0.,.2,1.-u);
vec3 o=(1.-exp(-R*smoothstep(1.35,.25,length((u-.5)*A))*1.3))*g.x*g.y;
gl_FragColor=vec4(o,max(o.r,max(o.g,o.b)));}`);
    gl.bindAttribLocation(prog, 0, 'p');
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    // O contexto nasceu com o canvas em 300x150.
    gl.viewport(0, 0, W, H);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const [uL, uF, uQ] = ['L', 'f', 'q'].map(n => gl.getUniformLocation(prog, n));
    gl.uniform2f(gl.getUniformLocation(prog, 'A'), W / m, H / m);
    const noCanvas = (x, y) => [f + x * (1 - 2 * f), f + y * (1 - 2 * f)];
    let luz = noCanvas(...o.centro), alvo = null, segura = 0, quadro = 0, ultimo = 0, antes = 0, vivo = false;
    const desenhar = forca => {
      gl.uniform2f(uL, luz[0], luz[1]); gl.uniform1f(uF, forca); gl.uniform1f(uQ, quadro++ * .618 % 1 * 100);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    // Respiracao do original: 6s acesa, 2s apagando ate 20%.
    const suave = v => v * v * (3 - 2 * v);
    const pulso = x => { x %= 12; return x < 6 ? 1 : x < 8 ? 1 - .8 * suave((x - 6) / 2) : x < 10 ? .2 : .2 + .8 * suave((x - 10) / 2); };
    const laco = agora => {
      if (!heroVisible || document.hidden || calmo.matches) { vivo = false; return; }
      requestAnimationFrame(laco);
      if (agora - ultimo < 33 || portrait.classList.contains('apagado')) return;
      ultimo = agora;
      const t = agora / 1000, dt = Math.min(Math.max(t - antes, 0), .05), fase = t * .32, r = .34 + .09 * Math.sin(fase * .83);
      antes = t;
      const destino = alvo || noCanvas(o.centro[0] + Math.cos(fase) * r * 1.1, o.centro[1] - Math.sin(fase) * r * .85), e = 1 - Math.exp(-dt / .3);
      luz = [luz[0] + (destino[0] - luz[0]) * e, luz[1] + (destino[1] - luz[1]) * e];
      segura += ((alvo ? 1 : 0) - segura) * (1 - Math.exp(-dt / .35));
      const p = pulso(t);
      desenhar(p + (1 - p) * segura);
    };
    stage.addEventListener('pointermove', ev => {
      if (ev.pointerType !== 'mouse') return;
      const b = tela.getBoundingClientRect();
      alvo = [Math.min(1, Math.max(0, (ev.clientX - b.left) / b.width)), Math.min(1, Math.max(0, (ev.clientY - b.top) / b.height))];
    }, {passive: true});
    stage.addEventListener('pointerleave', () => { alvo = null; });
    const acordar = () => {
      if (!tela.isConnected) return;
      if (calmo.matches || parado) { luz = noCanvas(o.centro[0] - .2, o.centro[1] - .25); desenhar(1); return; }
      if (!vivo && heroVisible && !document.hidden) { vivo = true; requestAnimationFrame(laco); }
    };
    tela.addEventListener('webglcontextlost', ev => { ev.preventDefault(); tela.remove(); });
    img.before(tela);
    luzes.push(acordar);
    acordar();
  }
  addEventListener('pagehide',e=>{cancelAnimationFrame(frame);frame=0;if(!e.persisted){videoRequest.abort();if(videoObjectURL)URL.revokeObjectURL(videoObjectURL);motion?.dispose();}});
  addEventListener('pageshow',()=>{dirty=true;schedule();});
  motion?.init();
  if(tickerDriven) gsap.ticker.add(()=>tick(performance.now()));
  motionPreference();
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
  /* Modo leve: com o requestAnimationFrame limitado a 30 quadros (Modo de Pouca
     Energia do iPhone, economia de bateria do Android) a abertura, conduzida por
     JS, anda aos trancos. A assinatura do teto e ter quase todos os quadros
     perto de 33 ms (aparelho so ocupado oscila entre 16 e 80+); nesse caso vale
     o layout de menos movimento, e o resto da sessao ja abre assim (boot.js). */
  function medirQuadros() {
    if (calmo.matches) return;
    const d = []; let ant = 0;
    const passo = t => {
      if (ant) d.push(t - ant);
      ant = t;
      if (d.length < 30) { requestAnimationFrame(passo); return; }
      d.sort((a, b) => a - b);
      const lento = d[7] > 26 && d[22] < 45;
      try { if (lento) sessionStorage.setItem('fm-leve', '1'); else sessionStorage.removeItem('fm-leve'); } catch { /* sem armazenamento */ }
      if (!lento) return;
      modoLeve = true;
      document.documentElement.classList.add('modo-leve');
      motion?.remontar?.();
      motionPreference();
      setupMobileReveals();
      dirty = true; schedule();
    };
    requestAnimationFrame(passo);
  }
  addEventListener('load', () => {
    setTimeout(medirQuadros, 400);
    carregarQuadros();
    parado(() => {
      if (quadroMapa?.dataset.src) { quadroMapa.src = quadroMapa.dataset.src; delete quadroMapa.dataset.src; }
      const m = mobile.matches;
      acenderLuz($('#hero-img'), {classe: 'hero-flare', folga: .1, centro: [.5, .45], N: m ? 320 : 512, passos: m ? 16 : 32, densidade: .51, decai: .875, borrao: 90});
    });
  }, {once:true});
})();
