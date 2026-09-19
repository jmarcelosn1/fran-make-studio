/* Shared URL boundary: browser runtime and unit tests use the same implementation. */
((root) => {
  'use strict';
  const api = Object.freeze({
    localAsset(value, base) {
      try {
        if (typeof value !== 'string' || !value) return '';
        const origin = new URL(base), url = new URL(value, origin);
        return url.origin === origin.origin && /^https?:$/.test(url.protocol) && !url.username && !url.password && /\.(mp4|webm|webp|png|jpe?g)$/i.test(url.pathname) ? url.href : '';
      } catch { return ''; }
    },
    googleURL(value, embed = false) {
      try {
        const url = new URL(value);
        const allowed = ['google.com', 'www.google.com', 'maps.google.com', 'www.google.com.br'];
        if (!embed) allowed.push('maps.app.goo.gl', 'goo.gl');
        return url.protocol === 'https:' && !url.username && !url.password && allowed.includes(url.hostname) && (!embed || /^\/maps\/embed(?:\/|$)/.test(url.pathname)) ? url.href : '';
      } catch { return ''; }
    }
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FRAN_SAFETY = api;
})(globalThis);
