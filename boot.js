/* Hide navigation before the first paint only when the scroll intro is enabled. */
if (new URLSearchParams(location.search).get('theme') !== 'light') {
  document.documentElement.dataset.theme = 'dark';
}
// Ingles salvo: a pagina fica oculta ate o dicionario chegar, para nao piscar em
// portugues. O preferencias.js libera; este limite cobre o caso de ele falhar.
let idiomaSalvo = null;
try { idiomaSalvo = localStorage.getItem('fm-idioma'); } catch { idiomaSalvo = null; }
if (idiomaSalvo === 'en' && document.documentElement.hasAttribute('data-idiomas')) {
  document.documentElement.lang = 'en';
  document.documentElement.classList.add('carrega-idioma');
  setTimeout(() => document.documentElement.classList.remove('carrega-idioma'), 2500);
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

// Estado de clique dos botoes com brilho por 200ms, como no glow-button de
// referencia. So o :active some rapido demais num toque curto.
document.addEventListener('pointerdown', e => {
  const botao = e.target instanceof Element ? e.target.closest('.glow-btn') : null;
  if (!botao) return;
  botao.dataset.state = 'clicked';
  setTimeout(() => { if (botao.dataset.state === 'clicked') delete botao.dataset.state; }, 200);
}, {passive:true});
