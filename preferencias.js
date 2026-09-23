/* Idioma de quem visita. O boot.js ja aplicou a escolha salva antes da
   primeira pintura; aqui ficam os botoes e a traducao. */
(() => {
  'use strict';
  const raiz = document.documentElement;
  const guardar = (chave, valor) => {
    try { localStorage.setItem(chave, valor); } catch { /* sem armazenamento, vale so nesta visita */ }
  };
  const lerSalvo = chave => { try { return localStorage.getItem(chave); } catch { return null; } };

  /* ---- idioma ----
     Traducao por correspondencia de texto, com um dicionario que so e baixado se
     a pessoa pedir ingles. Os titulos que a animacao quebra palavra por palavra
     levam data-i18n e sao trocados inteiros; o original deles e guardado agora,
     antes de o motion.js quebra-los. Nada passa por innerHTML. */
  let dicionario = null;
  let idioma = 'pt';
  const t = texto => (idioma === 'en' && dicionario && dicionario.t[texto]) || texto;
  window.FRAN_IDIOMA = {t, atual: () => idioma};

  // Texto como e lido: o <br> vira espaco.
  const textoDe = el => {
    const copia = el.cloneNode(true);
    copia.querySelectorAll('br').forEach(br => br.replaceWith(' '));
    return copia.textContent.replace(/\s+/g, ' ').trim();
  };
  const originaisChave = new Map();
  const textosPT = new Map();
  for (const el of document.querySelectorAll('[data-i18n]')) {
    originaisChave.set(el, [...el.childNodes].map(no => no.cloneNode(true)));
    textosPT.set(el, textoDe(el));
  }
  // Se o titulo tinha rotulo quando saiu do portugues. O rotulo em si sempre sai
  // do texto portugues original: capturado, ele podia vir em ingles, gravado
  // pelo motion.js numa remontagem feita com a pagina traduzida.
  const tinhaRotulo = new Map();
  const originaisTexto = new Map();
  const originaisAtributo = [];
  const ATRIBUTOS = ['alt', 'aria-label', 'aria-roledescription', 'title', 'placeholder'];
  const DINAMICOS = '#nb-ham,[data-idioma]';
  const normal = s => s.replace(/\s+/g, ' ').trim();
  const descricao = document.querySelector('meta[name="description"]');
  const tituloOriginal = document.title;
  const descricaoOriginal = descricao ? descricao.getAttribute('content') : '';

  // *italico* e | quebra de linha, montados com nos, sem innerHTML
  function montar(el, texto) {
    el.replaceChildren();
    texto.split('|').forEach((linha, i) => {
      if (i) el.append(document.createElement('br'));
      linha.split('*').forEach((trecho, j) => {
        if (!trecho) return;
        if (j % 2) { const em = document.createElement('em'); em.textContent = trecho; el.append(em); }
        else el.append(trecho);
      });
    });
  }

  function traduzirChaves() {
    originaisChave.forEach((_, el) => {
      const en = dicionario.k[el.dataset.i18n];
      if (!en) return;
      if (!tinhaRotulo.has(el)) tinhaRotulo.set(el, el.hasAttribute('aria-label'));
      el.removeAttribute('aria-label');   // o texto montado ja se le sozinho
      montar(el, en);
    });
  }
  // O motion.js avisa quando remonta as animacoes e devolve os titulos ao portugues.
  // Remontar desfaz a quebra restaurando o HTML que a biblioteca guardou, que
  // pode ser o de outro idioma. Em portugues, so volta o titulo que nao bate com
  // o original, para nao desfazer a animacao de palavras dos que estao certos.
  document.addEventListener('fm:movimento', () => {
    if (idioma === 'en' && dicionario) { traduzirChaves(); return; }
    originaisChave.forEach((nos, el) => {
      if (textoDe(el) === textosPT.get(el)) return;
      el.replaceChildren(...nos.map(no => no.cloneNode(true)));
      if (el.hasAttribute('aria-label')) el.setAttribute('aria-label', textosPT.get(el));
    });
  });

  function paraIngles() {
    traduzirChaves();
    const andar = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let no = andar.nextNode(); no; no = andar.nextNode()) {
      const pai = no.parentElement;
      if (!pai || pai.closest('script,style,[translate="no"],[data-i18n],.brush-word')) continue;
      const en = dicionario.t[normal(no.nodeValue)];
      if (!en) continue;
      originaisTexto.set(no, no.nodeValue);
      const [, antes, depois] = no.nodeValue.match(/^(\s*)[\s\S]*?(\s*)$/);
      no.nodeValue = antes + en + depois;
    }
    for (const el of document.querySelectorAll(ATRIBUTOS.map(a => '[' + a + ']').join(','))) {
      if (el.closest('[translate="no"]') || el.matches(DINAMICOS)) continue;
      for (const a of ATRIBUTOS) {
        const valor = el.getAttribute(a);
        const en = valor && dicionario.a[normal(valor)];
        if (!en) continue;
        originaisAtributo.push([el, a, valor]);
        el.setAttribute(a, en);
      }
    }
    document.title = dicionario.a[normal(tituloOriginal)] || tituloOriginal;
    if (descricao) descricao.setAttribute('content', dicionario.a[normal(descricaoOriginal)] || descricaoOriginal);
  }

  function paraPortugues() {
    originaisChave.forEach((nos, el) => {
      el.replaceChildren(...nos.map(no => no.cloneNode(true)));
      if (tinhaRotulo.get(el)) el.setAttribute('aria-label', textosPT.get(el));
    });
    tinhaRotulo.clear();
    originaisTexto.forEach((valor, no) => { no.nodeValue = valor; });
    originaisTexto.clear();
    originaisAtributo.forEach(([el, a, valor]) => el.setAttribute(a, valor));
    originaisAtributo.length = 0;
    document.title = tituloOriginal;
    if (descricao) descricao.setAttribute('content', descricaoOriginal);
  }

  const botoesIdioma = [...document.querySelectorAll('[data-idioma]')];
  function rotular() {
    const vaiParaIngles = idioma === 'pt';
    botoesIdioma.forEach(botao => {
      botao.textContent = vaiParaIngles ? 'EN' : 'PT';
      botao.lang = vaiParaIngles ? 'en' : 'pt-BR';
      botao.setAttribute('aria-label', vaiParaIngles ? 'English version' : 'Versão em português');
    });
  }

  async function mudarIdioma(novo) {
    if (novo === idioma) return;
    if (novo === 'en') {
      try {
        if (!dicionario) {
          const resposta = await fetch('i18n/en.json');
          if (!resposta.ok) throw new Error('dicionario indisponivel');
          dicionario = await resposta.json();
        }
      } catch {
        raiz.lang = 'pt-BR';
        return;
      }
      idioma = 'en';
      paraIngles();
    } else {
      idioma = 'pt';
      paraPortugues();
    }
    raiz.lang = idioma === 'en' ? 'en' : 'pt-BR';
    rotular();
    document.dispatchEvent(new CustomEvent('fm:idioma', {detail: idioma}));
  }

  botoesIdioma.forEach(botao => botao.addEventListener('click', () => {
    const novo = idioma === 'pt' ? 'en' : 'pt';
    guardar('fm-idioma', novo);
    mudarIdioma(novo);
  }));
  rotular();
  if (lerSalvo('fm-idioma') === 'en') {
    mudarIdioma('en').finally(() => raiz.classList.remove('carrega-idioma'));
  }

})();
