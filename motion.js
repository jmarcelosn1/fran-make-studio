/* Optional motion layer. Each library enhances the native, readable document. */
(() => {
  'use strict';
  const config = window.FRAN_CONFIG || {};
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = matchMedia('(hover:hover) and (pointer:fine) and (min-width:851px)');
  let lenis = null, context = null, splits = [], paused = false, initialized = false;
  // O ticker do GSAP conduz o Lenis; sem GSAP, o Lenis usa o proprio requestAnimationFrame.
  const rafLenis = time => lenis?.raf(time * 1000);
  const number = (value, fallback, min, max) => Number.isFinite(Number(value)) ? Math.min(max, Math.max(min, Number(value))) : fallback;

  function cleanup() {
    window.gsap?.ticker.remove(rafLenis);
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
    if(reduce.matches) return;
    if(window.Lenis && config.smoothScroll !== false && pointer.matches) {
      lenis = new Lenis({
        autoRaf:!window.gsap,
        lerp:number(config.scrollLerp,.09,.04,.2),
        smoothWheel:true,
        syncTouch:false,
        anchors:{offset:-90},
        prevent:node => !!node.closest('#nb-mob, dialog')
      });
      if(window.ScrollTrigger) lenis.on('scroll', ScrollTrigger.update);
      window.gsap?.ticker.add(rafLenis);
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
          // Inicio se despedindo: a Franciana sobe mais devagar que o texto e a
          // luz rose apaga conforme a secao sai da tela. Na foto (o <figure> tem a
          // animacao de entrada, que venceria o transform) e na variavel da luz.
          const retrato = document.querySelector('#hero-img'), moldura = document.querySelector('.hero-photo');
          if(retrato && moldura) {
            const saida = {trigger:'#hero',start:'top top',end:'bottom top',scrub:.4};
            gsap.to(retrato,{y:90,ease:'none',scrollTrigger:saida});
            gsap.to(moldura,{'--luz':0,ease:'none',scrollTrigger:{...saida}});
          }
        }
      });
      document.fonts.ready.then(()=>ScrollTrigger.refresh());
    }
  }
  window.FRAN_MOTION = {
    init() { if(initialized) return; initialized=true;setup();reduce.addEventListener('change',setup);pointer.addEventListener('change',setup); },
    pause(value) { paused=value; if(value)lenis?.stop();else lenis?.start(); },
    refresh() { lenis?.resize(); window.ScrollTrigger?.refresh(); },
    remontar: () => { if(initialized) setup(); },
    dispose:cleanup
  };
})();
