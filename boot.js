/* Hide navigation before the first paint only when the scroll intro is enabled. */
if (new URLSearchParams(location.search).get('theme') !== 'light') {
  document.documentElement.dataset.theme = 'dark';
}
document.documentElement.classList.toggle('mobile-layout', matchMedia('(max-width:850px), (pointer:coarse)').matches);

// Chegando por link com ancora, como do portfolio para #servicos, o navegador
// pinta o topo antes de rolar ate o alvo, e a intro aparecia por um quadro. O
// hero fica oculto ate a rolagem acontecer.
const ancora = location.hash.slice(1);
const saltaParaAncora = ancora !== '' && ancora !== 'hero';
if (saltaParaAncora) {
  document.documentElement.classList.add('salto-ancora');
  document.addEventListener('DOMContentLoaded', () => {
    let alvo = null;
    try { alvo = document.getElementById(decodeURIComponent(ancora)); } catch { alvo = null; }
    if (alvo) alvo.scrollIntoView({block:'start'});
    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.documentElement.classList.remove('salto-ancora');
    }));
  }, {once:true});
}

// Somente a pagina que declara data-intro tem a abertura que esconde a navbar.
// Sem essa checagem, paginas sem script.js ficariam com a navbar oculta para sempre.
if (document.documentElement.hasAttribute('data-intro') && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.documentElement.classList.add('cinematic');
  // Quem chega direto numa secao ja passou da abertura: a navbar nao some.
  if (!saltaParaAncora) document.documentElement.classList.add('intro-pending');
}
