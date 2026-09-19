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
    document.querySelectorAll('.tilt-visual').forEach(el => el.vanillaTilt?.destroy());
    document.documentElement.classList.remove('story-active');
  }
  /* Cena do pincel. O scroll controla o tempo do video e nada mais: nenhum
     transform, scale ou rotacao entra no pincel, porque o movimento ja esta
     gravado no arquivo. Sem loop proprio, sem segundo requestAnimationFrame.
     A classe brush-ready so e aplicada quando tudo inicializa, entao uma
     falha de CDN deixa a secao curta e estatica em vez de um vazio alto. */
  function brushScene() {
    const scene = document.querySelector('#pincel');
    const sticky = scene?.querySelector('.brush-sticky');
    const video = scene?.querySelector('.brush-video');
    if (!scene || !sticky || !video || !window.ScrollTrigger) return null;

    // Scrub so onde seek e confiavel. No celular o clipe toca ao entrar em
    // cena, mesma decisao ja adotada pelo video da intro deste projeto.
    const scrubbable = pointer.matches;
    const source = scrubbable ? 'images/pincel-scroll.mp4' : 'images/pincel-scroll-mobile.mp4';
    let duration = 0, target = 0, applied = -1, broken = false, active = false, scrub = null;
    let objectURL = '', loading = false;
    const abort = new AbortController();
    const timeAt = p => Math.min(Math.max(p, 0) * duration, Math.max(0, duration - .05));

    async function load() {
      if (broken || loading || video.getAttribute('src')) return;
      loading = true;
      video.preload = 'auto';
      if (!scrubbable) { video.loop = true; video.src = source; video.load(); return; }
      try {
        // Buffer completo em memoria: hospedagem estatica sem HTTP Range nao
        // permite seek, e o scrub depende de buscar para frente e para tras.
        const response = await fetch(source, {signal:abort.signal});
        if (!response.ok) throw new Error('brush video unavailable');
        const blob = await response.blob();
        if (abort.signal.aborted) return;
        objectURL = URL.createObjectURL(blob);
        video.src = objectURL;
        video.load();
      } catch (error) {
        if (error.name !== 'AbortError') broken = true;
      }
    }
    video.addEventListener('loadedmetadata', () => {
      if (!Number.isFinite(video.duration) || video.duration <= .2) return;
      duration = video.duration;
      if (scrub) { target = timeAt(scrub.progress); applied = -1; }
    }, {once:true});
    video.addEventListener('error', () => { broken = true; }, {once:true});

    // Um unico seek por frame, e so quando o tempo mudou o bastante para valer.
    const seek = () => {
      if (!active || broken || !duration || !scrubbable || video.seeking) return;
      if (Math.abs(target - applied) < 1/48) return;
      applied = target;
      try { video.currentTime = target; } catch { broken = true; }
    };
    gsap.ticker.add(seek);

    ScrollTrigger.create({trigger:scene,start:'top bottom+=70%',end:'bottom top-=70%',onEnter:load,onEnterBack:load});
    scrub = ScrollTrigger.create({
      trigger:scene,start:'top top',end:'bottom bottom',scrub:true,invalidateOnRefresh:true,
      onToggle:self => {
        active = self.isActive;
        if (scrubbable) return;
        if (active) video.play().catch(()=>{}); else video.pause();
      },
      onUpdate:self => {
        const p = self.progress;
        const enter = Math.min(1, p / .15);
        const leave = Math.min(1, Math.max(0, (p - .85) / .15));
        sticky.style.setProperty('--brush-in', (enter * (1 - leave)).toFixed(3));
        if (duration) target = timeAt(p);
      }
    });
    scene.classList.add('brush-ready');
    return () => {
      gsap.ticker.remove(seek);
      abort.abort();
      video.pause();
      if (objectURL) { URL.revokeObjectURL(objectURL); objectURL = ''; }
      scene.classList.remove('brush-ready');
      sticky.style.removeProperty('--brush-in');
    };
  }

  function setup() {
    cleanup();
    document.body.classList.toggle('no-noise', config.noise === false);
    if(reduce.matches) return;
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
            const text = heading.textContent.replace(/\s+/g,' ').trim();
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
        const story = document.querySelector('[data-look-story]');
        if(story) {
          document.documentElement.classList.add('story-active');
          const frames = [...story.querySelectorAll('[data-look-frame]')];
          const buttons = [...story.querySelectorAll('[data-look-step]')];
          const timeline = gsap.timeline({scrollTrigger:{
            trigger:story,start:()=>'top top+='+(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav'))+24),
            end:()=>'+='+Math.max(650,story.offsetHeight-story.querySelector('.look-stage').offsetHeight),
            scrub:.35,invalidateOnRefresh:true,
            onUpdate:self => {
              const current = self.progress < .36 ? 0 : self.progress < .77 ? 1 : 2;
              buttons.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===current)));
            }
          }});
          gsap.set(frames.slice(1),{autoAlpha:0});
          if (!pointer.matches) {
            gsap.set(frames.slice(1),{yPercent:-6});
            timeline.to(frames[0],{autoAlpha:0,yPercent:10,duration:1,ease:'none'},.6)
              .to(frames[1],{autoAlpha:1,yPercent:0,duration:1,ease:'none'},.6)
              .to(frames[1],{autoAlpha:0,yPercent:10,duration:1,ease:'none'},2)
              .to(frames[2],{autoAlpha:1,yPercent:0,duration:1,ease:'none'},2);
          } else {
            timeline.to(frames[1],{autoAlpha:1,duration:1,ease:'none'},.6)
              .to(frames[2],{autoAlpha:1,duration:1,ease:'none'},2);
          }
          timeline.to({}, {duration:.4});
          buttons.forEach((button,i)=>{
            button.onclick = () => {
              const trigger=timeline.scrollTrigger;
              const position=trigger.start+(trigger.end-trigger.start)*[0,.53,1][i];
              if(lenis) lenis.scrollTo(position,{duration:.8});
              else window.scrollTo({top:position,behavior:'smooth'});
            };
          });
        }
        const disposeBrush = brushScene();
        return () => disposeBrush?.();
      });
      document.fonts.ready.then(()=>ScrollTrigger.refresh());
    }
    if(window.VanillaTilt && config.tilt !== false && pointer.matches) {
      VanillaTilt.init(document.querySelectorAll('.tilt-visual'),{
        max:number(config.tiltMax,3,0,6),speed:600,perspective:1400,scale:1,
        glare:false,gyroscope:false,reset:true
      });
    }
  }
  window.FRAN_MOTION = {
    init() { if(initialized) return; initialized=true;setup();reduce.addEventListener('change',setup);pointer.addEventListener('change',setup); },
    frame(time) { lenis?.raf(time); return !!lenis; },
    pause(value) { paused=value; if(value)lenis?.stop();else lenis?.start(); },
    refresh() { lenis?.resize(); window.ScrollTrigger?.refresh(); },
    dispose:cleanup
  };
})();
