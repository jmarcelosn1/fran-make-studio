/* Preferencias de quem visita: tema claro ou escuro. O boot.js ja aplicou a
   escolha antes da primeira pintura; aqui ficam so os botoes. */
(() => {
  'use strict';
  const raiz = document.documentElement;
  const guardar = (chave, valor) => {
    try { localStorage.setItem(chave, valor); } catch { /* sem armazenamento, vale so nesta visita */ }
  };

  const corDoTema = document.querySelector('meta[name="theme-color"]');
  const botoesTema = [...document.querySelectorAll('[data-tema]')];
  function aplicarTema(tema) {
    raiz.dataset.theme = tema;
    if (corDoTema) corDoTema.content = tema === 'light' ? '#fff9f6' : '#000000';
    // Rotulo fixo, "Tema claro", com aria-pressed dizendo se esta ligado.
    botoesTema.forEach(botao => botao.setAttribute('aria-pressed', String(tema === 'light')));
  }
  aplicarTema(raiz.dataset.theme === 'light' ? 'light' : 'dark');
  botoesTema.forEach(botao => botao.addEventListener('click', () => {
    const novo = raiz.dataset.theme === 'light' ? 'dark' : 'light';
    aplicarTema(novo);
    guardar('fm-tema', novo);
  }));
})();
