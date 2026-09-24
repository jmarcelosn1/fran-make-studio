/* Tema e idioma antes da primeira pintura. */
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

// Abertura: o nome se escreve numa tela preta e desliza para o lugar dele no
// inicio (script.js). Uma vez por sessao, so na home, sem ancora e sem menos
// movimento: quem volta do portfolio ou chega direto numa secao nao espera.
if (document.documentElement.hasAttribute('data-abertura') && !location.hash && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  let vista = false;
  try { vista = sessionStorage.getItem('fm-abertura') === '1'; sessionStorage.setItem('fm-abertura', '1'); } catch { vista = false; }
  if (!vista) document.documentElement.classList.add('abertura-on');
}

// Estado de clique dos botoes com brilho por 200ms, como no glow-button de
// referencia. So o :active some rapido demais num toque curto.
document.addEventListener('pointerdown', e => {
  const botao = e.target instanceof Element ? e.target.closest('.glow-btn') : null;
  if (!botao) return;
  botao.dataset.state = 'clicked';
  setTimeout(() => { if (botao.dataset.state === 'clicked') delete botao.dataset.state; }, 200);
}, {passive:true});
