/* Demos gallery. Descriptions come translated from #i18n-data; URLs/media shared.
   Videos lazy-load and only play when scrolled into view. */
(function () {
  'use strict';

  var I18N = {};
  try { I18N = JSON.parse(document.getElementById('i18n-data').textContent); } catch (e) { I18N = {}; }
  var D = I18N.items || {};
  var liveLabel = I18N.live || 'Ver en vivo';

  var WEBSITES = [
    { key: 'onfleek', name: 'On Fleek', type: 'video', media: 'demo-media/onfleek.mp4', url: 'https://on-fleek-ten.vercel.app/' },
    { key: 'suehtam', name: 'SUEHTAM', type: 'video', media: 'demo-media/suehtam.mp4', url: 'https://suehtam.vercel.app/' },
    { key: 'estimado', name: 'Barberia El Estimado', type: 'video', media: 'demo-media/estimado-web.mp4', url: 'https://www.barberiaelestimado.com/' },
    { key: 'urban', name: 'El Estimado Urban', type: 'image', media: 'demo-media/elestimado.jpg', url: 'https://barber-templates.vercel.app/urban' },
    { key: 'burgur', name: 'BURGUR', type: 'video', media: 'demo-media/burgur.mp4', url: 'https://restaurant-templates-rosy.vercel.app/burger.html' },
    { key: 'sakana', name: 'SAKANA', type: 'video', media: 'demo-media/sakana.mp4', url: 'https://restaurant-templates-rosy.vercel.app/sushi.html' },
    { key: 'tours', name: 'Tenerife Tours', type: 'video', media: 'demo-media/tenerife-tours.mp4', url: 'https://tenerife-tours.vercel.app/' },
    { key: 'vals', name: 'VALS', type: 'video', media: 'demo-media/vals.mp4', url: 'https://vals-xi.vercel.app/' },
  ];

  var prefix = '';
  var me = document.querySelector('script[src*="demos.js"]');
  if (me) prefix = me.getAttribute('src').split('?')[0].replace(/demos\.js$/, '');

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }

  var PANELS = ['demo-media/panel-1.jpg', 'demo-media/panel-2.jpg', 'demo-media/panel-3.jpg'];
  function card(w, i) {
    var desc = D[w.key] || '';
    var poster = prefix + PANELS[i % 3];
    var preview = w.type === 'video'
      ? '<video data-src="' + prefix + w.media + '" poster="' + poster + '" loop muted playsinline preload="none"></video>'
      : '<img src="' + prefix + w.media + '" alt="' + esc(w.name) + '" loading="lazy" width="640" height="400"/>';
    return '' +
      '<a href="' + w.url + '" target="_blank" rel="noopener" class="demo-card card rounded-2xl overflow-hidden block group">' +
      '  <div class="demo-thumb relative">' + preview +
      '    <div class="absolute inset-0 bg-gradient-to-t from-ink/85 via-transparent to-transparent"></div>' +
      '    <span class="absolute top-3 right-3 inline-flex items-center gap-1.5 text-[10px] font-mono font-bold tracking-[0.15em] uppercase px-2.5 py-1 rounded-full bg-white text-ink">' +
      '      ' + esc(liveLabel) +
      '    </span>' +
      '  </div>' +
      '  <div class="p-5">' +
      '    <h3 class="font-display font-extrabold text-lg uppercase tracking-tight mb-1">' + esc(w.name) + '</h3>' +
      '    <p class="text-white/55 text-xs leading-relaxed">' + esc(desc) + '</p>' +
      '  </div>' +
      '</a>';
  }

  var gallery = document.getElementById('gallery');
  if (gallery) gallery.innerHTML = WEBSITES.map(card).join('');

  if (!('IntersectionObserver' in window)) return;
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      var v = en.target;
      if (en.isIntersecting) {
        if (!v.src && v.dataset.src) v.src = v.dataset.src;
        var p = v.play();
        if (p && p.catch) p.catch(function () {});
      } else if (!v.paused) {
        v.pause();
      }
    });
  }, { rootMargin: '200px' });

  document.querySelectorAll('#gallery video[data-src]').forEach(function (v) { io.observe(v); });
})();
