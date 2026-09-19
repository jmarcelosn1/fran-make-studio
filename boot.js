/* Hide navigation before the first paint only when the scroll intro is enabled. */
if (new URLSearchParams(location.search).get('theme') !== 'light') {
  document.documentElement.dataset.theme = 'dark';
}
document.documentElement.classList.toggle('mobile-layout', matchMedia('(max-width:850px), (pointer:coarse)').matches);
// Somente a pagina que declara data-intro tem a abertura que esconde a navbar.
// Sem essa checagem, paginas sem script.js ficariam com a navbar oculta para sempre.
if (document.documentElement.hasAttribute('data-intro') && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.documentElement.classList.add('cinematic', 'intro-pending');
}
