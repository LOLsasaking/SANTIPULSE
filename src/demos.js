/* Demos gallery. Descriptions come translated from #i18n-data; URLs/media shared.
   Videos lazy-load + only play when scrolled into view (performance). CSP-safe. */
(function () {
  'use strict';

  var I18N = {};
  try { I18N = JSON.parse(document.getElementById('i18n-data').textContent); } catch (e) { I18N = {}; }
  var D = I18N.items || {};            // { onfleek: "desc", suehtam: "...", ... }
  var liveLabel = I18N.live || 'Ver en vivo';

  // key order preserves the original gallery order
  var WEBSITES = [
    { key:'onfleek',   name:'On Fleek',               emoji:'💈', type:'video', media:'demo-media/onfleek.mp4',      url:'https://on-fleek-ten.vercel.app/' },
    { key:'suehtam',   name:'SUEHTAM',                emoji:'🧥', type:'video', media:'demo-media/suehtam.mp4',      url:'https://suehtam.vercel.app/' },
    { key:'estimado',  name:'Barbería El Estimado',   emoji:'✂️', type:'video', media:'demo-media/estimado-web.mp4', url:'https://www.barberiaelestimado.com/' },
    { key:'urban',     name:'El Estimado · Urban',    emoji:'💈', type:'image', media:'demo-media/elestimado.jpg',   url:'https://barber-templates.vercel.app/urban' },
    { key:'burgur',    name:'BURGUR',                 emoji:'🍔', type:'video', media:'demo-media/burgur.mp4',       url:'https://restaurant-templates-rosy.vercel.app/burger.html' },
    { key:'sakana',    name:'SAKANA',                 emoji:'🍣', type:'video', media:'demo-media/sakana.mp4',       url:'https://restaurant-templates-rosy.vercel.app/sushi.html' },
    { key:'tours',     name:'Tenerife Tours',         emoji:'🌋', type:'video', media:'demo-media/tenerife-tours.mp4', url:'https://tenerife-tours.vercel.app/' },
    { key:'vals',      name:'VALS',                   emoji:'🚙', type:'video', media:'demo-media/vals.mp4',         url:'https://vals-xi.vercel.app/' }
  ];

  // asset prefix: figure out from this script's own src (…/demos.js)
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
    var poster = prefix + PANELS[i % 3];   // rotate the 3 hero photos across cards
    var preview = w.type === 'video'
      // poster = panel photo so the card always shows an image (never blank); video lazy-loads via observer
      ? '<video data-src="' + prefix + w.media + '" poster="' + poster + '" loop muted playsinline preload="none"></video>'
      : '<img src="' + prefix + w.media + '" alt="' + esc(w.name) + '" loading="lazy" width="640" height="400"/>';
    return '' +
      '<a href="' + w.url + '" target="_blank" rel="noopener" class="demo-card card rounded-2xl overflow-hidden block group">' +
      '  <div class="demo-thumb relative">' + preview +
      '    <div class="absolute inset-0 bg-gradient-to-t from-ink/85 via-transparent to-transparent"></div>' +
      '    <span class="absolute top-3 right-3 inline-flex items-center gap-1.5 text-[10px] font-mono font-bold tracking-[0.15em] uppercase px-2.5 py-1 rounded-full bg-white text-ink">' +
      '      ' + esc(liveLabel) + ' <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M7 17L17 7M7 7h10v10"/></svg>' +
      '    </span>' +
      '  </div>' +
      '  <div class="p-5">' +
      '    <h3 class="font-display font-extrabold text-lg uppercase tracking-tight mb-1">' + w.emoji + ' ' + esc(w.name) + '</h3>' +
      '    <p class="text-white/55 text-xs leading-relaxed">' + esc(desc) + '</p>' +
      '  </div>' +
      '</a>';
  }

  var gallery = document.getElementById('gallery');
  if (gallery) gallery.innerHTML = WEBSITES.map(card).join('');

  // Lazy-load videos: attach src + play only when the card scrolls into view.
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      var v = en.target;
      if (en.isIntersecting) {
        if (!v.src && v.dataset.src) v.src = v.dataset.src;
        var p = v.play(); if (p && p.catch) p.catch(function () {});
      } else if (!v.paused) {
        v.pause();
      }
    });
  }, { rootMargin: '200px' });

  document.querySelectorAll('#gallery video[data-src]').forEach(function (v) { io.observe(v); });

  /* ── Live interactive automations ──────────────────────────────────────────
     Reads the translated `tools` block from the same #i18n-data payload, fills
     labels, and wires the two forms to /api/demo/*. CSP-safe: same-origin fetch,
     no inline handlers, all dynamic text escaped. */
  var T = I18N.tools;
  if (!T) return; // no tools section on this build → nothing to wire

  // dotted-path lookup, e.g. "pm.title" or "tools.pm.title" (tolerates a leading "tools." prefix)
  function tget(path) {
    var p = path.replace(/^tools\./, '');
    return p.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, T);
  }

  // Fill text + button labels from data-i18n / data-i18n-label attributes.
  document.querySelectorAll('[data-i18n]').forEach(function (el) {
    var v = tget(el.getAttribute('data-i18n'));
    if (v != null) el.textContent = v;
  });
  document.querySelectorAll('[data-i18n-label]').forEach(function (btn) {
    var v = tget(btn.getAttribute('data-i18n-label'));
    if (v != null) { btn.dataset.label = v; btn.textContent = v; }
  });

  function setBusy(btn, busy, runningText) {
    btn.disabled = busy;
    btn.innerHTML = busy
      ? '<span class="spinner"></span> ' + esc(runningText)
      : esc(btn.dataset.label || '');
  }

  function errorBox(msg) {
    return '<div class="alert error">' + esc(msg) + '</div>';
  }

  function actionBadge(action) {
    var cls = action === 'LOWER_PRICE' ? 'lower' : action === 'RAISE_PRICE' ? 'raise' : 'hold';
    return '<span class="badge ' + cls + '">' + esc(action.replace(/_/g, ' ')) + '</span>';
  }

  function renderPrice(box, data) {
    if (!data.success) { box.innerHTML = errorBox(data.error || T.err.generic); return; }
    var r = data.repricing;
    box.innerHTML =
      '<div class="grid grid-cols-2 gap-4 mb-4">' +
      '  <div class="stat"><span class="k">' + esc(T.res.competitor) + '</span><span class="v">$' + esc(data.competitorPrice) + '</span></div>' +
      '  <div class="stat"><span class="k">' + esc(T.res.suggestion) + '</span><span class="v" style="color:#e23b4e">$' + esc(r.suggestion) + '</span></div>' +
      '</div>' +
      '<div class="mb-3">' + actionBadge(r.action) + '</div>' +
      '<p class="text-white/60 text-xs leading-relaxed">' + esc(r.reasoning) + '</p>';
  }

  function renderLeads(box, data) {
    if (!data.success) { box.innerHTML = errorBox(data.error || T.err.generic); return; }
    if (!data.leads || !data.leads.length) { box.innerHTML = errorBox(T.res.empty); return; }
    var rows = data.leads.map(function (l) {
      var site = l.website ? '<a href="' + esc(l.website) + '" target="_blank" rel="noopener">↗</a>' : '';
      return '<tr><td>' + esc(l.name || '—') + '</td><td>' + esc(l.email || '—') + '</td><td>' + esc(l.phone || '—') + '</td><td>' + site + '</td></tr>';
    }).join('');
    box.innerHTML =
      '<p class="meta mb-3">' + esc(data.totalFound) + ' ' + esc(T.res.leads) + '</p>' +
      '<table><thead><tr>' +
      '<th>' + esc(T.res.name) + '</th><th>' + esc(T.res.email) + '</th><th>' + esc(T.res.phone) + '</th><th>' + esc(T.res.web) + '</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>';
  }

  function wire(form, endpoint, running, render) {
    var btn = form.querySelector('.tool-btn');
    var box = form.querySelector('[data-result]');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var fd = new FormData(form);
      var payload = {};
      fd.forEach(function (v, k) { payload[k] = v; });

      // basic client-side URL sanity (server re-validates anyway)
      var urlField = payload.competitorUrl || payload.targetUrl || '';
      if (!/^https?:\/\/\S+/i.test(urlField)) {
        box.hidden = false; box.innerHTML = errorBox(T.err.badurl); return;
      }

      setBusy(btn, true, running);
      box.hidden = false; box.innerHTML = '';

      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then(function (res) { return res.json().then(function (j) { return { status: res.status, body: j }; }); })
        .then(function (r) {
          if (r.status === 403) { box.innerHTML = errorBox((r.body && r.body.error) || T.err.trial); return; }
          if (r.status === 429) { box.innerHTML = errorBox(T.err.generic); return; }
          render(box, r.body);
        })
        .catch(function () { box.innerHTML = errorBox(T.err.generic); })
        .finally(function () { setBusy(btn, false, running); });
    });
  }

  var priceForm = document.querySelector('form[data-tool="price"]');
  var leadsForm = document.querySelector('form[data-tool="leads"]');
  // Trailing slash: site is trailingSlash:true, so "/api/x" 308-redirects and a
  // redirected POST can drop its body. Call the slash form directly.
  if (priceForm) wire(priceForm, '/api/demo/price-monitor/', T.pm.running, renderPrice);
  if (leadsForm) wire(leadsForm, '/api/demo/lead-scraper/', T.ls.running, renderLeads);

  /* ── The 5 automations: plain-language explanation + Before/After ROI ──────
     Renders from I18N.autos. Two of the five (status:'live') are the tools above;
     the other three are client-only (status:'paid'). Also drops the plain-language
     "what it does" line under each live tool form. */
  renderAutos(I18N.autos);

  function renderAutos(A) {
    if (!A) return;

    // Plain-language explanation under each live tool (price / leads).
    var it = A.items || {};
    addWhat(priceForm, it.price);
    addWhat(leadsForm, it.leads);

    var grid = document.getElementById('autos-grid');
    if (!grid) return;
    setText('autos-eyebrow', A.eyebrow);
    setText('autos-heading', A.heading);
    setText('autos-intro', A.intro);

    // icon per automation key (decorative)
    var ICON = { price: '🏷️', leads: '🎯', outreach: '✉️', cart: '🛒', social: '📅' };
    // render in a stable order
    var ORDER = ['price', 'leads', 'outreach', 'cart', 'social'];
    grid.innerHTML = ORDER
      .filter(function (k) { return it[k]; })
      .map(function (k) { return autoCard(k, it[k], A); })
      .join('');
  }

  function autoCard(key, d, A) {
    var live = d.status === 'live';
    var tag = live ? (A.liveTag || 'Free demo') : (A.paidTag || 'For clients');
    var icon = ({ price: '🏷️', leads: '🎯', outreach: '✉️', cart: '🛒', social: '📅' })[key] || '⚡';
    return '' +
      '<div class="auto-card">' +
      '  <div class="auto-head">' +
      '    <span class="auto-name">' + icon + ' ' + esc(d.name) + '</span>' +
      '    <span class="auto-tag ' + (live ? 'live' : 'paid') + '">' + esc(tag) + '</span>' +
      '  </div>' +
      '  <p class="auto-what">' + esc(d.what) + '</p>' +
      '  <div class="ba">' +
      '    <div class="ba-col ba-before"><span class="lab">' + esc(A.beforeLabel) + '</span>' + esc(d.before) + '</div>' +
      '    <div class="ba-col ba-after"><span class="lab">' + esc(A.afterLabel) + '</span>' + esc(d.after) + '</div>' +
      '  </div>' +
      '  <div class="roi">' +
      '    <div class="roi-cell"><div class="ico">⏱</div><div class="val">' + esc(d.time) + '</div><div class="key">' + esc(A.timeKey || '') + '</div></div>' +
      '    <div class="roi-cell"><div class="ico">💰</div><div class="val">' + esc(d.money) + '</div><div class="key">' + esc(A.moneyKey || '') + '</div></div>' +
      '    <div class="roi-cell"><div class="ico">📈</div><div class="val">' + esc(d.extraV) + '</div><div class="key">' + esc(d.extraK) + '</div></div>' +
      '  </div>' +
      '</div>';
  }

  // Insert the plain-language "what it does" line right under a tool form's desc.
  function addWhat(form, item) {
    if (!form || !item || !item.what) return;
    var desc = form.querySelector('[data-i18n$=".desc"]');
    if (!desc) return;
    var p = document.createElement('p');
    p.className = 'text-white/45 text-xs leading-relaxed mb-5 -mt-3';
    p.textContent = item.what;
    desc.parentNode.insertBefore(p, desc.nextSibling);
  }

  function setText(id, v) {
    var el = document.getElementById(id);
    if (el && v != null) el.textContent = v;
  }
})();
