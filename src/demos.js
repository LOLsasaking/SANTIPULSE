/* Demos — expandable cards (list → modal). Click a row to expand; Play opens
   the live website. Descriptions come translated from #i18n-data. */
(function () {
  'use strict';

  var I18N = {};
  try { I18N = JSON.parse(document.getElementById('i18n-data').textContent); } catch (e) { I18N = {}; }
  var D = I18N.items || {};

  var WEBSITES = [
    { key: 'onfleek', name: 'On Fleek', type: 'video', media: 'demo-media/onfleek.mp4', url: 'https://on-fleek-ten.vercel.app/' },
    { key: 'suehtam', name: 'SUEHTAM', type: 'video', media: 'demo-media/suehtam.mp4', url: 'https://suehtam.vercel.app/' },
    { key: 'estimado', name: 'Barberia El Estimado', type: 'video', media: 'demo-media/estimado-web.mp4', url: 'https://www.barberiaelestimado.com/' },
    { key: 'urban', name: 'El Estimado Urban', type: 'image', media: 'demo-media/elestimado.jpg', url: 'https://barber-templates.vercel.app/urban' },
    { key: 'burgur', name: 'BURGUR', type: 'video', media: 'demo-media/burgur.mp4', url: 'https://restaurant-templates-rosy.vercel.app/burger.html' },
    { key: 'sakana', name: 'SAKANA', type: 'video', media: 'demo-media/sakana.mp4', url: 'https://restaurant-templates-rosy.vercel.app/sushi.html' },
    { key: 'tours', name: 'Tenerife Tours', type: 'video', media: 'demo-media/tenerife-tours.mp4', url: 'https://tenerife-tours.vercel.app/' },
    { key: 'vals', name: 'VALS', type: 'video', media: 'demo-media/vals.mp4', url: 'https://vals-xi.vercel.app/' },
    { key: 'megasur', name: 'MEGASUR Tenerife', type: 'video', media: 'demo-media/megasur.mp4', url: 'https://megasur-tenerife-demo.vercel.app/' },
    // ── NEW (2026-06-13) — live on Vercel.
    { key: 'elevate', name: 'ELEVATE Barber', type: 'video', media: 'demo-media/elevate-barber.mp4', url: 'https://elevate-barbershop-cyan.vercel.app/' },
    { key: 'bmwm3', name: 'BMW E30 M3', type: 'video', media: 'demo-media/bmw-e30.mp4', url: 'https://bmw-clone-eosin.vercel.app/' },
    { key: 'lara', name: 'The Lara Collection', type: 'video', media: 'demo-media/lara-collection.mp4', url: 'https://lara-collection.vercel.app/' },
  ];

  var PANELS = ['demo-media/panel-1.jpg', 'demo-media/panel-2.jpg', 'demo-media/panel-3.jpg'];

  var prefix = '';
  var me = document.querySelector('script[src*="demos.js"]');
  if (me) prefix = me.getAttribute('src').split('?')[0].replace(/demos\.js$/, '');

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }
  function domain(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return u; } }
  // Show the actual website: for videos render the first frame (#t=0.5) instead
  // of the generic panel poster; for image demos use the screenshot directly.
  function thumb(w) {
    if (w.type === 'image') return '<img src="' + prefix + w.media + '" alt="" loading="lazy" />';
    return '<video src="' + prefix + w.media + '#t=0.5" muted playsinline preload="metadata"></video>';
  }

  // ── List ──
  var gallery = document.getElementById('gallery');
  if (gallery) {
    gallery.innerHTML = WEBSITES.map(function (w, i) {
      return '<div class="exp-card" data-i="' + i + '">' +
        '<div class="exp-thumb">' + thumb(w) + '</div>' +
        '<div class="exp-meta"><h3>' + esc(w.name) + '</h3><p>' + esc(domain(w.url)) + ' &middot; santipulse.com</p></div>' +
        '<button class="exp-play" type="button" data-play="' + i + '">Play</button>' +
        '</div>';
    }).join('');
  }

  // ── Modal ──
  var overlay = document.createElement('div');
  overlay.className = 'exp-overlay';
  var modal = document.createElement('div');
  modal.className = 'exp-modal';
  modal.innerHTML =
    '<div class="exp-dialog">' +
      '<button class="exp-x" type="button" aria-label="Cerrar">&times;</button>' +
      '<div class="exp-media-wrap"></div>' +
      '<div class="exp-head"><div><h2></h2><p class="dom"></p></div><a class="exp-play" target="_blank" rel="noopener">Play &#9654;</a></div>' +
      '<div class="exp-bodytext"></div>' +
    '</div>';
  document.body.appendChild(overlay);
  document.body.appendChild(modal);

  function openModal(i) {
    var w = WEBSITES[i];
    modal.querySelector('h2').textContent = w.name;
    modal.querySelector('.dom').textContent = domain(w.url) + ' · santipulse.com';
    modal.querySelector('.exp-bodytext').textContent = D[w.key] || '';
    var play = modal.querySelector('a.exp-play');
    play.href = w.url;
    var mw = modal.querySelector('.exp-media-wrap');
    mw.innerHTML = w.type === 'video'
      ? '<video class="exp-media" src="' + prefix + w.media + '#t=0.5" autoplay loop muted playsinline></video>'
      : '<img class="exp-media" src="' + prefix + w.media + '" alt="" />';
    overlay.classList.add('open');
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    overlay.classList.remove('open');
    modal.classList.remove('open');
    document.body.style.overflow = '';
    var v = modal.querySelector('video');
    if (v) { try { v.pause(); } catch (e) {} }
  }

  if (gallery) {
    gallery.addEventListener('click', function (e) {
      var play = e.target.closest('[data-play]');
      if (play) { e.stopPropagation(); window.open(WEBSITES[+play.getAttribute('data-play')].url, '_blank', 'noopener'); return; }
      var card = e.target.closest('.exp-card');
      if (card) openModal(+card.getAttribute('data-i'));
    });
  }
  overlay.addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
  modal.querySelector('.exp-x').addEventListener('click', closeModal);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });
})();
