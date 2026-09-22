/* Optional motion layer. Each library enhances the native, readable document. */
(() => {
  'use strict';
  const config = window.FRAN_CONFIG || {};
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = matchMedia('(hover:hover) and (pointer:fine) and (min-width:851px)');
  let lenis = null, context = null, splits = [], paused = false, initialized = false;
  const number = (value, fallback, min, max) => Number.isFinite(Number(value)) ? Math.min(max, Math.max(min, Number(value))) : fallback;

  function cleanup() {
    lenis?.destroy(); lenis = null;
    context?.revert(); context = null;
    splits.forEach(({split,heading,label}) => {
      split.revert();
      if (label === null) heading.removeAttribute('aria-label'); else heading.setAttribute('aria-label',label);
    });
    splits = [];
  }

  function setup() {
    configurar();
    // Avisa que as animacoes foram (re)montadas. Remontar desfaz a quebra dos
    // titulos restaurando o HTML original, em portugues; a traducao reaplica.
    document.dispatchEvent(new CustomEvent('fm:movimento'));
  }
  function configurar() {
    cleanup();
    document.body.classList.toggle('no-noise', config.noise === false);
    if(reduce.matches || document.documentElement.classList.contains('modo-leve')) return;
    if(window.Lenis && config.smoothScroll !== false && pointer.matches) {
      lenis = new Lenis({
        autoRaf:false,
        lerp:number(config.scrollLerp,.09,.04,.2),
        smoothWheel:true,
        syncTouch:false,
        anchors:{offset:-90},
        prevent:node => !!node.closest('#nb-mob, dialog')
      });
      if(window.ScrollTrigger) lenis.on('scroll', ScrollTrigger.update);
      if(paused) lenis.stop();
    }
    if(window.gsap && window.ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);
      gsap.ticker.lagSmoothing(0);
      context = gsap.context(() => {
        if(window.SplitType && config.titleReveals !== false && pointer.matches) {
          document.querySelectorAll('[data-split]').forEach(heading => {
            const label = heading.getAttribute('aria-label');
            // O <br> nao entra no textContent: sem trocar por espaco, o rotulo
            // lido pelo leitor de tela saia "detrabalhar".
            const copia = heading.cloneNode(true);
            copia.querySelectorAll('br').forEach(br => br.replaceWith(' '));
            const text = copia.textContent.replace(/\s+/g,' ').trim();
            const split = new SplitType(heading,{types:'words',tagName:'span'});
            splits.push({split,heading,label});
            heading.setAttribute('aria-label',text);
            split.words.forEach(word => word.setAttribute('aria-hidden','true'));
            heading.closest('.sh')?.classList.remove('rv');
            gsap.from(split.words,{opacity:0,y:17,duration:.7,stagger:.055,ease:'power2.out',scrollTrigger:{trigger:heading,start:'top 89%',once:true}});
          });
        }
        if(config.parallax !== false && pointer.matches) {
          document.querySelectorAll('[data-parallax]').forEach(img => {
            gsap.fromTo(img,{yPercent:-3},{yPercent:3,ease:'none',scrollTrigger:{trigger:img.parentElement,start:'top bottom',end:'bottom top',scrub:.45}});
          });
        }
      });
      document.fonts.ready.then(()=>ScrollTrigger.refresh());
    }
  }
  window.FRAN_MOTION = {
    init() { if(initialized) return; initialized=true;setup();reduce.addEventListener('change',setup);pointer.addEventListener('change',setup); },
    frame(time) { lenis?.raf(time); return !!lenis; },
    pause(value) { paused=value; if(value)lenis?.stop();else lenis?.start(); },
    refresh() { lenis?.resize(); window.ScrollTrigger?.refresh(); },
    remontar: () => { if(initialized) setup(); },
    dispose:cleanup
  };
})();
