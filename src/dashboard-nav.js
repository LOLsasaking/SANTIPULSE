/* ============================================================
   Dashboard shell — sidebar nav switching, mobile toggle, top-bar
   fill, and overview stat cards. CSP-safe (external, no inline).
   Works alongside dashboard.js (data/auth) + pulse-modules.js (panels).
   ============================================================ */
(function () {
  'use strict';

  // ── GSAP + ScrollTrigger staggered reveal of a section's cards ──
  // CSP-safe: GSAP is loaded from the allow-listed jsdelivr CDN in dashboard.html.
  // Degrades gracefully (no-op) if GSAP failed to load.
  function playReveal(name) {
    if (!window.gsap) return;
    var sec = document.querySelector('.section[data-section="' + name + '"]');
    if (!sec) return;
    var items = sec.querySelectorAll('[data-reveal]');
    if (!items.length) return;
    window.gsap.fromTo(items,
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out', stagger: 0.08, overwrite: true });
  }

  // ── Sidebar section switching ──
  function switchTo(name) {
    document.querySelectorAll('.nav-item[data-nav]').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-nav') === name);
    });
    document.querySelectorAll('.section[data-section]').forEach(function (s) {
      s.classList.toggle('active', s.getAttribute('data-section') === name);
    });
    // close mobile sidebar after pick
    var sb = document.getElementById('sidebar');
    if (sb) sb.classList.remove('open');
    playReveal(name);
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { window.scrollTo(0, 0); }
  }

  document.addEventListener('click', function (e) {
    var nav = e.target.closest && e.target.closest('[data-nav]');
    if (nav) { switchTo(nav.getAttribute('data-nav')); return; }
  });

  // ── Mobile menu toggle ──
  var toggle = document.getElementById('menuToggle');
  if (toggle) toggle.addEventListener('click', function () {
    var sb = document.getElementById('sidebar');
    if (sb) sb.classList.toggle('open');
  });

  // ── Floating mascot → Pulse Tip popover (the 'Soul', always reachable) ──
  var fab = document.getElementById('pulseMascotBtn');
  var fabPop = document.getElementById('pulseFabPop');
  if (fab && fabPop) {
    fab.addEventListener('click', function (e) {
      e.stopPropagation();
      fabPop.classList.toggle('hidden');
    });
    document.addEventListener('click', function (e) {
      if (fabPop.classList.contains('hidden')) return;
      if (e.target.closest('#pulseFabPop') || e.target.closest('#pulseMascotBtn')) return;
      fabPop.classList.add('hidden');
    });
  }

  // ── Deep-link via ?tab= and OAuth return (?ads=connected etc → relevant tab) ──
  function initialTab() {
    var q = new URLSearchParams(window.location.search);
    if (q.get('tab')) return q.get('tab');
    if (q.has('ads')) return 'services';
    if (q.has('social')) return 'services';
    if (q.has('calendar')) return 'services';
    return null;
  }
  var t = initialTab();
  if (t) {
    // wait a tick so the app is unhidden by dashboard.js
    document.addEventListener('DOMContentLoaded', function () { setTimeout(function () { switchTo(t); }, 50); });
  }

  // ── Top-bar fill (avatar + plan text). dashboard.js sets #userEmail +
  //    #planBadge; mirror those into the chip once they're populated. ──
  function syncTopbar() {
    var emailEl = document.getElementById('userEmail');
    var av = document.getElementById('userAvatar');
    var planText = document.getElementById('planBadgeText');
    var planBadge = document.getElementById('planBadge');
    if (av && emailEl && emailEl.textContent && emailEl.textContent !== '…') {
      av.textContent = (emailEl.textContent.trim()[0] || 'S').toUpperCase();
    }
    if (planText && planBadge) {
      var p = planBadge.textContent && planBadge.textContent !== 'none' ? planBadge.textContent : 'Sin plan';
      planText.textContent = p;
    }
  }
  setInterval(syncTopbar, 800);

  // ── Overview stat cards — pulled from the module endpoints (best-effort). ──
  function num(v) { return (v == null ? '—' : String(v)); }
  function loadStats() {
    if (!window.SantiAuth || !window.SantiAuth.available()) return;
    var f = window.SantiAuth.apiFetch;
    f('/api/receptionist/dashboard').then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      if (!d) return;
      setText('statLeads', num((d.leads || []).length));
      setText('statCalls', num((d.calls || []).length));
    }).catch(function () {});
    f('/api/insights/dashboard').then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      if (!d) return; setText('statTrends', num((d.trends || []).length));
    }).catch(function () {});
    f('/api/ads/dashboard').then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      if (!d) return; setText('statCampaigns', num((d.campaigns || []).length));
    }).catch(function () {});
  }
  function setText(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; }

  // Load stats once the user is known to be active (poll for the app being shown).
  var tries = 0;
  var statTimer = setInterval(function () {
    tries++;
    var app = document.getElementById('app');
    if (app && !app.classList.contains('hidden')) { loadStats(); playReveal('overview'); clearInterval(statTimer); }
    if (tries > 40) clearInterval(statTimer);
  }, 400);

  // ══ Conexiones — Truth Layer ════════════════════════════════════════════
  //   Calls the auth'd /api/admin/verify-connections route, which performs a
  //   REAL handshake against each provider. A row only goes green when the
  //   provider returned 2xx. Expired Meta tokens (reauth:true) swap the badge
  //   for a "Re-autenticar con Facebook" button that kicks off OAuth again.
  function escAttr(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); }

  function renderConnRow(key, info) {
    var row = document.querySelector('.conn-row[data-integration="' + key + '"]');
    if (!row) return;
    var msg = row.querySelector('.status-message');
    var side = row.querySelector('.conn-side') || row;
    // strip any prior badge/button on the right side
    row.querySelectorAll('.status-badge, .reauth-btn').forEach(function (n) { n.remove(); });

    if (msg) msg.textContent = info.message || '';

    if (info.status === 'connected') {
      var ok = document.createElement('span');
      ok.className = 'status-badge badge ok';
      ok.textContent = 'Conectado';
      side.appendChild(ok);
      return;
    }

    // Expired Meta token → offer re-auth instead of a dead badge.
    if (info.reauth) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'reauth-btn';
      btn.textContent = 'Re-autenticar con Facebook';
      btn.addEventListener('click', function () {
        btn.disabled = true;
        window.SantiAuth.apiFetch('/api/integrations/social/authorize')
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (d) { if (d && d.url) window.location.href = d.url; else btn.disabled = false; })
          .catch(function () { btn.disabled = false; });
      });
      side.appendChild(btn);
      return;
    }

    // Optional providers that are simply not configured → neutral, not alarming.
    if (info.optional && info.status === 'missing') {
      var opt = document.createElement('span');
      opt.className = 'status-badge badge none';
      opt.textContent = 'Opcional';
      side.appendChild(opt);
      return;
    }

    var bad = document.createElement('span');
    bad.className = 'status-badge badge err';
    bad.textContent = info.status === 'missing' ? 'Sin configurar' : 'Acción requerida';
    side.appendChild(bad);
  }

  function loadConnections() {
    if (!window.SantiAuth || !window.SantiAuth.available()) return;
    var errEl = document.getElementById('connectionsError');
    if (errEl) errEl.classList.add('hidden');
    // reset rows to a checking state
    document.querySelectorAll('.conn-row[data-integration]').forEach(function (row) {
      var b = row.querySelector('.status-badge');
      if (b) { b.className = 'status-badge badge none'; b.textContent = 'Comprobando…'; }
    });
    window.SantiAuth.apiFetch('/api/admin/verify-connections')
      .then(function (r) {
        if (r.status === 401) { window.location.replace('/login/'); throw new Error('401'); }
        if (r.status === 403) throw new Error('403');
        return r.json();
      })
      .then(function (data) {
        if (!data || !data.success || !data.integrations) throw new Error('bad_response');
        Object.keys(data.integrations).forEach(function (key) {
          renderConnRow(key, data.integrations[key]);
        });
      })
      .catch(function (e) {
        if (e.message === '401') return;
        if (errEl) {
          errEl.textContent = e.message === '403'
            ? 'Esta vista solo está disponible para el administrador.'
            : 'No se pudo verificar las conexiones.';
          errEl.classList.remove('hidden');
        }
      });
  }

  // Wrap each row's badge in a .conn-side so the re-auth button has a home.
  function ensureConnSides() {
    document.querySelectorAll('.conn-row[data-integration]').forEach(function (row) {
      if (row.querySelector('.conn-side')) return;
      var badge = row.querySelector('.status-badge');
      var side = document.createElement('div');
      side.className = 'conn-side';
      if (badge) { row.removeChild(badge); side.appendChild(badge); }
      row.appendChild(side);
    });
  }

  // Lazy-load when the Conexiones tab is first opened, plus a manual re-check.
  var connectionsLoaded = false;
  document.addEventListener('click', function (e) {
    var nav = e.target.closest && e.target.closest('[data-nav="connections"]');
    if (nav && !connectionsLoaded) { ensureConnSides(); connectionsLoaded = true; loadConnections(); }
    var recheck = e.target.closest && e.target.closest('#recheckConnections');
    if (recheck) { ensureConnSides(); loadConnections(); }
  });

  // Expose for other scripts if needed.
  window.SantiDashNav = { switchTo: switchTo, loadStats: loadStats, loadConnections: loadConnections, playReveal: playReveal };
})();

// ── Corner mascot (= chatbot mascot, per language) + topbar language changer ──
(function () {
  'use strict';
  function dlang() {
    var l = 'es';
    try { l = localStorage.getItem('sp_lang') || 'es'; } catch (e) {}
    return /^(es|en|fr|de|it)$/.test(l) ? l : 'es';
  }
  var lang = dlang();
  var FLAG = function (t) { return '/demo-media/flags/' + t + '.png'; };
  var MASCOT = function (t) { return '/demo-media/chatbot-' + t + '.png'; };

  var fabImg = document.getElementById('pulseMascotImg');
  if (fabImg) fabImg.src = MASCOT(lang);

  var tr = document.querySelector('.top-right');
  if (!tr) return;
  var NAMES = { es: 'Español', en: 'English', fr: 'Français', de: 'Deutsch', it: 'Italiano' };
  var LANGS = ['es', 'en', 'fr', 'de', 'it'];

  var wrap = document.createElement('div');
  wrap.className = 'dash-lang';
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'dash-lang-btn';
  btn.setAttribute('aria-haspopup', 'true');
  btn.innerHTML = '<img src="' + FLAG(lang) + '" alt="" /><span>' + lang.toUpperCase() + '</span>' +
    '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>';
  var menu = document.createElement('div');
  menu.className = 'dash-lang-menu hidden';
  LANGS.forEach(function (t) {
    var b = document.createElement('button');
    b.type = 'button';
    if (t === lang) b.className = 'active';
    b.innerHTML = '<img src="' + FLAG(t) + '" alt="" /><span>' + NAMES[t] + '</span>';
    b.addEventListener('click', function () {
      try { localStorage.setItem('sp_lang', t); } catch (e) {}
      if (window.SantiDashI18n) window.SantiDashI18n.apply(t);
      if (fabImg) fabImg.src = MASCOT(t);
      btn.querySelector('img').src = FLAG(t);
      btn.querySelector('span').textContent = t.toUpperCase();
      menu.querySelectorAll('button').forEach(function (x) { x.classList.remove('active'); });
      b.classList.add('active');
      menu.classList.add('hidden');
      wrap.classList.remove('open');
    });
    menu.appendChild(b);
  });
  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    var open = menu.classList.toggle('hidden') === false;
    wrap.classList.toggle('open', open);
  });
  document.addEventListener('click', function (e) {
    if (menu.classList.contains('hidden')) return;
    if (e.target.closest('.dash-lang')) return;
    menu.classList.add('hidden');
    wrap.classList.remove('open');
  });
  wrap.appendChild(btn);
  wrap.appendChild(menu);
  var chip = tr.querySelector('.user-chip');
  if (chip) tr.insertBefore(wrap, chip); else tr.appendChild(wrap);
})();
