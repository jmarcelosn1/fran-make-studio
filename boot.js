/* Hide navigation before the first paint only when the scroll intro is enabled. */
if (new URLSearchParams(location.search).get('theme') !== 'light') {
  document.documentElement.dataset.theme = 'dark';
}
document.documentElement.classList.toggle('mobile-layout', matchMedia('(max-width:850px), (pointer:coarse)').matches);
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.documentElement.classList.add('cinematic', 'intro-pending');
}
