/* Dashboard — auth-gated. Loads profile/subscription/runs, saves profile,
   handles logout + upgrade. CSP-safe; talks to /api/dashboard/* and /api/stripe/*. */
(function () {
  'use strict';

  var loading = document.getElementById('loading');
  var app = document.getElementById('app');

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }
  function show(el) { el.classList.remove('hidden'); }
  function hide(el) { el.classList.add('hidden'); }

  if (!window.SantiAuth || !window.SantiAuth.available()) {
    loading.textContent = 'Acceso no configurado.';
    return;
  }

  // Gate: must be logged in.
  window.SantiAuth.getSession().then(function (session) {
    if (!session) { window.location.replace('/login/'); return; }
    boot();
  });

  function boot() {
    window.SantiAuth.apiFetch('/api/dashboard/me')
      .then(function (r) { if (r.status === 401) { window.location.replace('/login/'); throw new Error('401'); } return r.json(); })
      .then(function (data) {
        renderUser(data);
        fillProfile(data.profile);
        loadRuns();
        hide(loading);
        show(app);
      })
      .catch(function (e) { if (e.message !== '401') loading.textContent = 'No se pudo cargar el panel.'; });
  }

  function renderUser(data) {
    document.getElementById('userEmail').textContent = data.user.email;
    var badge = document.getElementById('planBadge');
    var sub = data.subscription || {};
    badge.textContent = sub.plan && sub.plan !== 'none' ? sub.plan : (sub.status || 'none');
    badge.className = 'badge ' + (sub.active ? 'active' : 'none');

    if (sub.active) {
      hide(document.getElementById('plans'));
      show(document.getElementById('portalBtn'));
      hide(document.getElementById('lockedNote'));
    } else {
      show(document.getElementById('plans'));
      hide(document.getElementById('portalBtn'));
      show(document.getElementById('lockedNote'));
    }

    // Boot the 3 client automations (Integrations + Cart/Outreach/Social),
    // gated on the subscription state we just computed.
    if (window.SantiAutomations) window.SantiAutomations.init(!!sub.active);
  }

  function fillProfile(p) {
    if (!p) return;
    var form = document.getElementById('profileForm');
    ['business_name', 'website_url', 'industry', 'sender_name', 'my_current_price', 'floor_price', 'max_leads_per_run'].forEach(function (k) {
      if (form[k] != null && p[k] != null) form[k].value = p[k];
    });
    // URL fields are stored as JSONB arrays; show as text.
    if (form.competitor_urls && Array.isArray(p.competitor_urls)) {
      form.competitor_urls.value = p.competitor_urls.join('\n');
    }
    if (form.lead_target_urls && Array.isArray(p.lead_target_urls)) {
      form.lead_target_urls.value = p.lead_target_urls[0] || '';
    }
  }

  // ── Save profile ──
  var profileForm = document.getElementById('profileForm');
  var profileOk = document.getElementById('profileOk');
  var profileErr = document.getElementById('profileErr');
  var saveBtn = document.getElementById('saveBtn');

  profileForm.addEventListener('submit', function (e) {
    e.preventDefault();
    hide(profileOk); hide(profileErr);
    var fd = new FormData(profileForm);
    var payload = {};
    fd.forEach(function (v, k) { if (v !== '') payload[k] = v; });

    // URL fields are stored as JSONB arrays — convert from the form's text.
    if (payload.competitor_urls != null) {
      payload.competitor_urls = String(payload.competitor_urls)
        .split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
    }
    if (payload.lead_target_urls != null) {
      var u = String(payload.lead_target_urls).trim();
      payload.lead_target_urls = u ? [u] : [];
    }

    saveBtn.disabled = true;
    var orig = saveBtn.textContent; saveBtn.textContent = 'Guardando…';

    window.SantiAuth.apiFetch('/api/dashboard/profile', { method: 'POST', body: JSON.stringify(payload) })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (res.ok) show(profileOk);
        else { profileErr.textContent = 'No se pudo guardar.'; show(profileErr); }
      })
      .catch(function () { profileErr.textContent = 'No se pudo guardar.'; show(profileErr); })
      .finally(function () { saveBtn.disabled = false; saveBtn.textContent = orig; });
  });

  // ── Run history ──
  function loadRuns() {
    window.SantiAuth.apiFetch('/api/dashboard/runs')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var runs = (data && data.runs) || [];
        var body = document.getElementById('runsBody');
        if (!runs.length) { hide(document.getElementById('runsWrap')); show(document.getElementById('runsEmpty')); return; }
        body.innerHTML = runs.map(function (j) {
          var date = j.created_at ? new Date(j.created_at).toLocaleString() : '—';
          var st = j.status || '';
          var scls = st === 'completed' ? 'raise' : st === 'failed' ? 'lower' : 'hold';
          var stxt = st === 'completed' ? 'Completado' : st === 'failed' ? 'Fallido' : st === 'running' ? 'En curso' : st;
          var ico = j.automation_type === 'lead_scraper' ? '🎯' : '📊';
          return '<tr><td>' + ico + ' ' + esc((j.automation_type || '').replace(/_/g, ' ')) +
            '</td><td><span class="pill ' + scls + '">' + esc(stxt) + '</span></td><td>' +
            (j.is_demo ? 'sí' : 'no') + '</td><td class="mono" style="font-size:11px;color:rgba(255,255,255,.6)">' + esc(date) + '</td></tr>';
        }).join('');
      })
      .catch(function () {});
  }

  // ── Plan buttons → Stripe checkout (one per plan) ──
  document.querySelectorAll('[data-checkout]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var plan = btn.getAttribute('data-checkout');
      // disable all plan buttons while redirecting
      var all = document.querySelectorAll('[data-checkout]');
      all.forEach(function (b) { b.disabled = true; });
      var orig = btn.textContent;
      btn.textContent = 'Redirigiendo…';

      window.SantiAuth.apiFetch('/api/stripe/checkout', { method: 'POST', body: JSON.stringify({ plan: plan }) })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (d && d.url) { window.location.href = d.url; return; }
          all.forEach(function (b) { b.disabled = false; });
          btn.textContent = orig;
          alert('No se pudo iniciar el pago. Inténtalo de nuevo.');
        })
        .catch(function () {
          all.forEach(function (b) { b.disabled = false; });
          btn.textContent = orig;
          alert('No se pudo iniciar el pago. Inténtalo de nuevo.');
        });
    });
  });

  // ── Run automation (paid) → /api/dashboard/run ──
  var runMsg = document.getElementById('runMsg');
  var runResult = document.getElementById('runResult');
  function setRunMsg(kind, html) {
    runMsg.className = 'msg ' + kind;            // kind: 'ok' | 'err' | ''
    runMsg.innerHTML = html;
    show(runMsg);
  }
  function money(n) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    return '$' + Number(n).toFixed(2);
  }
  function actionPill(a) {
    var cls = a === 'LOWER_PRICE' ? 'lower' : a === 'RAISE_PRICE' ? 'raise' : 'hold';
    var txt = a === 'LOWER_PRICE' ? 'Bajar precio' : a === 'RAISE_PRICE' ? 'Subir precio' : 'Mantener';
    return '<span class="pill ' + cls + '">' + txt + '</span>';
  }
  function stat(k, v, color) {
    return '<div class="stat"><span class="k">' + esc(k) + '</span><span class="v"' +
      (color ? ' style="color:' + color + '"' : '') + '>' + v + '</span></div>';
  }
  // Render the actual run output, not just a "done" line.
  function renderResult(type, result, usage) {
    var html = '';
    var title = type === 'price_monitor' ? 'Monitor de precios' : 'Captación de leads';
    var quota = usage && usage.limit && usage.limit !== 999999 ? usage.used + '/' + usage.limit : (usage ? String(usage.used) : '');
    html += '<div class="res-head"><span class="rt">' + esc(title) + '</span>' +
      (quota ? '<span class="muted mono" style="font-size:11px">' + esc(quota) + ' este mes</span>' : '') + '</div>';

    if (type === 'price_monitor') {
      var rows = (result.results || []);
      html += '<div class="res-stats">' +
        stat('Comprobadas', result.checked || 0) +
        stat('Con precio', result.priced || 0, '#7fe0a3') +
        stat('Sin precio', (result.checked || 0) - (result.priced || 0), '#ffcf7a') +
        '</div>';
      html += rows.map(function (r, i) {
        var rep = r.repricing || {};
        if (!r.success) {
          return '<div class="res-row" style="animation-delay:' + (i * 0.05) + 's">' +
            '<span class="url">' + esc(r.url || '—') + '</span>' +
            '<span class="pill fail">Sin precio</span></div>';
        }
        return '<div class="res-row" style="animation-delay:' + (i * 0.05) + 's">' +
          '<span class="url">' + esc(r.url || '—') + '</span>' +
          '<span class="px" title="Precio competidor">' + money(r.competitorPrice) + '</span>' +
          '<span class="px" style="color:#E23B4E" title="Tu sugerencia">→ ' + money(rep.suggestion) + '</span>' +
          actionPill(rep.action) + '</div>';
      }).join('') || '<p class="muted" style="font-size:13px">Sin resultados.</p>';
    } else {
      var leads = (result.leads || []);
      html += '<div class="res-stats">' + stat('Leads encontrados', result.totalFound || leads.length, '#7fe0a3') + '</div>';
      if (leads.length) {
        html += '<table style="margin-top:4px"><thead><tr><th>Nombre</th><th>Email</th><th>Teléfono</th><th>Web</th></tr></thead><tbody>' +
          leads.map(function (l) {
            var site = l.website ? '<a href="' + esc(l.website) + '" target="_blank" rel="noopener" style="color:#E23B4E">↗</a>' : '—';
            return '<tr><td>' + esc(l.name || '—') + '</td><td>' + esc(l.email || '—') +
              '</td><td>' + esc(l.phone || '—') + '</td><td>' + site + '</td></tr>';
          }).join('') + '</tbody></table>';
      } else {
        html += '<p class="muted" style="font-size:13px">No se encontraron leads en esa página.</p>';
      }
    }
    runResult.innerHTML = html;
    show(runResult);
  }

  document.querySelectorAll('[data-run]').forEach(function (card) {
    card.addEventListener('click', function () {
      var type = card.getAttribute('data-run');
      var go = card.querySelector('[data-go]');
      var goOrig = go ? go.innerHTML : '';
      var allCards = document.querySelectorAll('[data-run]');
      allCards.forEach(function (c) { c.disabled = true; });
      card.setAttribute('data-state', 'running');
      if (go) go.innerHTML = '<span class="spinner"></span> Ejecutando…';
      hide(runResult);
      setRunMsg('', '<span class="spinner"></span> Ejecutando la automatización… esto puede tardar unos segundos.');

      window.SantiAuth.apiFetch('/api/dashboard/run', { method: 'POST', body: JSON.stringify({ type: type }) })
        .then(function (r) { return r.json().then(function (d) { return { status: r.status, d: d }; }); })
        .then(function (res) {
          var d = res.d || {};
          if (res.status === 200 && d.ok) {
            hide(runMsg);
            renderResult(type, d.result || {}, d.usage);
            loadRuns();
          } else if (res.status === 402 && d.error === 'needs_subscription') {
            setRunMsg('err', 'Necesitas una suscripción activa. <a href="/precios/" style="color:#ff9aa6">Ver planes →</a>');
          } else if (res.status === 402 && d.error === 'quota_exceeded') {
            setRunMsg('err', 'Has alcanzado tu límite mensual (' + esc(String(d.used)) + '/' + esc(String(d.limit)) +
              '). <a href="/precios/" style="color:#ff9aa6">Sube de plan →</a>');
          } else if (res.status === 400 && d.error === 'no_inputs') {
            var field = d.field === 'lead_target_urls' ? 'una URL objetivo de leads' : 'URLs de competidores';
            setRunMsg('err', 'Añade ' + field + ' en tu perfil y guarda antes de ejecutar.');
          } else {
            setRunMsg('err', 'No se pudo ejecutar. Inténtalo de nuevo.');
          }
        })
        .catch(function () { setRunMsg('err', 'No se pudo ejecutar. Inténtalo de nuevo.'); })
        .finally(function () {
          allCards.forEach(function (c) { c.disabled = false; });
          card.setAttribute('data-state', 'idle');
          if (go) go.innerHTML = goOrig;
        });
    });
  });

  // ── Manage subscription → Stripe portal ──
  var portalBtn = document.getElementById('portalBtn');
  if (portalBtn) {
    portalBtn.addEventListener('click', function () {
      portalBtn.disabled = true;
      window.SantiAuth.apiFetch('/api/stripe/portal', { method: 'POST' })
        .then(function (r) { return r.json(); })
        .then(function (d) { if (d && d.url) window.location.href = d.url; else { portalBtn.disabled = false; } })
        .catch(function () { portalBtn.disabled = false; });
    });
  }

  // ── Logout ──
  document.getElementById('logoutBtn').addEventListener('click', function () {
    window.SantiAuth.signOut().then(function () { window.location.replace('/'); });
  });
})();
