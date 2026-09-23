(() => {
  'use strict';
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const assets=[
    ['noivas','noiva-vestido-branco','Noiva, vestido e véu'],['noivas','noiva2','Noiva, produção completa'],['noivas','noivacapa','Noiva, grande dia'],['noivas','noiva3','Noiva, beleza natural'],
    ['sociais','social-olhar-suave','Social, olhar suave'],['sociais','social-olhar-dourado','Social, esfumado dourado'],['sociais','social-iluminada','Social, pele iluminada'],['sociais','make5new','Social, make e cachos'],['sociais','make1','Social, tons suaves'],['sociais','make2','Social, olhar marcante'],['sociais','make3','Social, luz na medida'],['sociais','make4','Social, acabamento radiante'],
    ['formandas','formanda-verde-01','Formanda, o olhar'],['formandas','formanda-verde-02','Formanda, a expressão'],['formandas','formanda-verde-03','Formanda, produção completa'],['marca','logo-transparente','Logo com transparência'],['marca','franciana','Franciana com transparência']
  ];
  assets.forEach(([category,file,title])=>{
    const card=document.createElement('article');card.className='asset-card';card.dataset.category=category;
    const img=document.createElement('img');img.src='images/'+file+'.webp';img.alt=title;img.loading='lazy';
    const heading=document.createElement('h3');heading.textContent=title;
    const small=document.createElement('small');small.textContent=category;
    const code=document.createElement('code');code.textContent=file+'.webp';
    card.append(img,heading,small,code);$('#asset-grid').append(card);
  });
  $$('[data-filter]').forEach(button=>button.addEventListener('click',()=>{
    $$('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
    $$('.asset-card').forEach(card=>card.hidden=button.dataset.filter!=='all'&&card.dataset.category!==button.dataset.filter);
  }));
  $('#story-progress').addEventListener('input',e=>{
    const p=Number(e.target.value)/100;$('#story-value').textContent=e.target.value+'%';
    const imgs=$$('.demo-photos img');imgs[1].style.opacity=Math.min(1,Math.max(0,(p-.15)/.35));imgs[2].style.opacity=Math.min(1,Math.max(0,(p-.6)/.35));
  });
  $$('[data-weight]').forEach(button=>button.addEventListener('click',()=>{
    $('.display-sample').style.fontWeight=button.dataset.weight;
    $$('[data-weight]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  }));
  const defaults={...window.FRAN_CONFIG};
  const booleans=['smoothScroll','titleReveals','parallax','noise'];
  const numbers=['scrollLerp'];
  const text=['portraitImage','whatsappUrl','instagramUrl','mapsEmbedUrl','mapsUrl'];
  function fill(){[...booleans,...numbers,...text,'latitude','longitude'].forEach(key=>{if(booleans.includes(key))$('#'+key).checked=defaults[key]!==false;else $('#'+key).value=defaults[key]??'';});render();}
  function values(){const data={...defaults};booleans.forEach(k=>data[k]=$('#'+k).checked);numbers.forEach(k=>data[k]=Number($('#'+k).value));text.forEach(k=>data[k]=$('#'+k).value.trim());['latitude','longitude'].forEach(k=>data[k]=$('#'+k).value===''?null:Number($('#'+k).value));return data;}
  function source(){return '/* Configuração do Fran Make Studio. */\nwindow.FRAN_CONFIG = Object.freeze('+JSON.stringify(values(),null,2)+');\n';}
  function render(){$('#config-preview').textContent=source();}
  function validate(){
    if(!$('#config-form').reportValidity())return false;
    const c=values();
    if((c.latitude===null)!==(c.longitude===null)){$('#config-status').textContent='Preencha latitude e longitude juntas, ou deixe ambas vazias.';return false;}
    for(const [key,host] of [['whatsappUrl','wa.me'],['instagramUrl','instagram.com']]){try{const u=new URL(c[key]);if(u.protocol!=='https:'||![host,'www.'+host].includes(u.hostname))throw Error();}catch{$('#config-status').textContent='Confira o link de '+(key==='whatsappUrl'?'WhatsApp (https://wa.me/...)':'Instagram (https://instagram.com/...)')+'.';return false;}}
    $('#config-status').textContent='Configuração válida. Substitua o config.js na pasta do site depois de salvar o arquivo.';return true;
  }
  $('#config-form').addEventListener('input',render);
  $('#config-form').addEventListener('submit',e=>{e.preventDefault();if(!validate())return;const url=URL.createObjectURL(new Blob([source()],{type:'text/javascript;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='config.js';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  $('#copy-config').addEventListener('click',async()=>{if(!validate())return;try{await navigator.clipboard.writeText(source());$('#config-status').textContent='Configuração copiada.';}catch{$('#config-status').textContent='Selecione a prévia abaixo para copiar ou use Baixar config.js.';}});
  $('#reset-config').addEventListener('click',()=>{fill();$('#config-status').textContent='Valores do config.js atual restaurados.';});fill();
  const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  $('#faq-search').addEventListener('input',e=>{const q=normalize(e.target.value);let count=0;$$('#faq-list details').forEach(d=>{d.hidden=!normalize(d.textContent).includes(q);if(!d.hidden)count++;});$('#faq-empty').hidden=count>0;});
  const storageKey='fran-guide-checklist-v2';let saved={};try{saved=JSON.parse(localStorage.getItem(storageKey)||'{}');}catch{}
  function checklist(){const state={};$$('[data-check]').forEach(i=>state[i.dataset.check]=i.checked);const done=Object.values(state).filter(Boolean).length;$('#check-progress').value=done;$('#check-status').textContent=done+' de 7 etapas concluídas';try{localStorage.setItem(storageKey,JSON.stringify(state));}catch{}}
  $$('[data-check]').forEach(i=>{i.checked=!!saved[i.dataset.check];i.addEventListener('change',checklist);});checklist();
  const navObserver=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){$$('aside nav a').forEach(a=>a.classList.toggle('active',a.hash==='#'+e.target.id));}},{rootMargin:'-10% 0px -65% 0px'});$$('main section,main header').forEach(el=>navObserver.observe(el));
})();
