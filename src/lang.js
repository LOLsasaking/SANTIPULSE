/* Language switcher dropdown — shared by every page. No inline JS (CSP-safe). */
(function () {
  'use strict';
  var btn = document.getElementById('langBtn');
  var menu = document.getElementById('langMenu');
  if (!btn || !menu) return;
  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    var open = menu.classList.toggle('hidden');
    btn.setAttribute('aria-expanded', String(!open));
  });
  document.addEventListener('click', function () {
    menu.classList.add('hidden');
    btn.setAttribute('aria-expanded', 'false');
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { menu.classList.add('hidden'); btn.setAttribute('aria-expanded', 'false'); }
  });
})();
