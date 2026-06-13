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

  var MODULES = {
    ai_receptionist: { label: 'Recepcionista IA', icon: 'TEL' },
    social_insights: { label: 'Insights de Redes', icon: 'RED' },
    ad_manager: { label: 'Gestor de Ads', icon: 'ADS' },
  };
  function moduleName(type) {
    return (MODULES[type] && MODULES[type].label) || String(type || '').replace(/_/g, ' ');
  }
  function moduleIcon(type) {
    return (MODULES[type] && MODULES[type].icon) || 'PLS';
  }
  function statusClass(status) {
    return status === 'active' ? 'raise' : status === 'pending' ? 'warn' : status === 'issue' ? 'lower' : 'hold';
  }

  function applyAdminVisibility(isAdmin) {
    window.__IS_ADMIN = !!isAdmin;
    document.body.setAttribute('data-role', isAdmin ? 'admin' : 'client');
    document.querySelectorAll('[data-admin-only]').forEach(function (el) {
      el.classList.toggle('hidden', !isAdmin);
      el.setAttribute('aria-hidden', isAdmin ? 'false' : 'true');
    });

    var activeAdmin = document.querySelector('.section.active[data-admin-only]');
    if (!isAdmin && activeAdmin) {
      if (window.SantiDashNav && window.SantiDashNav.switchTo) window.SantiDashNav.switchTo('overview');
      else {
        activeAdmin.classList.remove('active');
        var overview = document.querySelector('.section[data-section="overview"]');
        if (overview) overview.classList.add('active');
      }
    }
  }

  function renderServiceStatus(services) {
    var host = document.getElementById('serviceStatusGrid');
    if (!host) return;
    var list = services && services.length ? services : [
      { id: 'ai_receptionist', name: 'Recepcionista IA', description: 'Atiende llamadas, WhatsApp y reservas con contexto.', status: 'issue', label: 'Sin datos', summary: 'No se pudo leer el estado todavía.', action: 'Reintentar' },
      { id: 'social_insights', name: 'Insights de Redes', description: 'Tendencias y captions listos para publicar.', status: 'issue', label: 'Sin datos', summary: 'No se pudo leer el estado todavía.', action: 'Reintentar' },
      { id: 'ad_manager', name: 'Gestor de Ads', description: 'Post, presupuesto y ROI en una vista simple.', status: 'issue', label: 'Sin datos', summary: 'No se pudo leer el estado todavía.', action: 'Reintentar' },
    ];

    host.innerHTML = list.map(function (svc) {
      var icon = moduleIcon(svc.id);
      var pill = statusClass(svc.status);
      return '<article class="service-card">' +
        '<div class="service-top"><div><h3>' + esc(svc.name) + '</h3><p>' + esc(svc.description) + '</p></div><span class="service-icon">' + esc(icon) + '</span></div>' +
        '<div class="status-line"><span class="pill ' + pill + '">' + esc(svc.label || svc.status || 'Estado') + '</span>' +
          '<button type="button" class="svc-action mono" data-svc-action data-svc-status="' + esc(svc.status || '') + '" style="background:none;border:0;padding:0;cursor:pointer;color:var(--red);font-weight:700;font-family:inherit;font-size:inherit">' + esc(svc.action || 'Automatizar ahora') + '</button>' +
        '</div>' +
        '<p style="margin-top:14px">' + esc(svc.summary || '') + '</p>' +
      '</article>';
    }).join('');

    // Bind the action buttons once: "Reintentar" re-fetches status (works for
    // any user, subscribed or not); an active-state action jumps to Servicios.
    if (!host.dataset.bound) {
      host.dataset.bound = '1';
      host.addEventListener('click', function (e) {
        var btn = e.target.closest && e.target.closest('[data-svc-action]');
        if (!btn) return;
        if (btn.getAttribute('data-svc-status') === 'issue') {
          loadServiceStatus();
          return;
        }
        var nav = document.querySelector('.nav-item[data-nav="services"]');
        if (nav) nav.click(); else loadServiceStatus();
      });
    }
  }

  function loadServiceStatus() {
    var host = document.getElementById('serviceStatusGrid');
    if (!host) return;
    window.SantiAuth.apiFetch('/api/dashboard/service-status')
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (!res.ok || !res.d || !res.d.services) throw new Error('service_status');
        renderServiceStatus(res.d.services);
      })
      .catch(function () {
        renderServiceStatus(null);
      });
  }

  if (!window.SantiAuth || !window.SantiAuth.available()) {
    loading.textContent = 'Acceso no configurado.';
    return;
  }

  // dashboard_auth_gate: must be logged in, but first let Supabase finish any
  // magic-link callback so /dashboard/?code=... does not bounce back to /login/.
  function dashboard_auth_gate() {
    var auth = window.SantiAuth;
    var callback = auth.hasAuthCallback && auth.hasAuthCallback();
    var first = callback && auth.finishAuthCallback
      ? auth.finishAuthCallback('/dashboard/').catch(function () { return null; })
      : auth.waitForSession
        ? auth.waitForSession(3)
        : auth.getSession();

    first.then(function (session) {
      if (session) { boot(); return; }
      return auth.getSession().then(function (latest) {
        if (!latest) { window.location.replace('/login/'); return; }
        boot();
      });
    }).catch(function () {
      window.location.replace('/login/');
    });
  }
  dashboard_auth_gate();

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

    // Mascot welcome ("Hola, [User]. Soy Pulse…") — prefer a human name, fall
    // back to the business name, then the email local-part.
    var nameEl = document.getElementById('welcomeName');
    if (nameEl) {
      var p = data.profile || {};
      var name = String(p.sender_name || p.business_name || (data.user.email || '').split('@')[0] || 'crack').trim();
      nameEl.textContent = name;
    }
    var fab = document.getElementById('pulseMascotBtn');
    if (fab) fab.classList.remove('hidden');

    var isAdmin = !!data.isAdmin;
    applyAdminVisibility(isAdmin);
    loadServiceStatus();

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
      renderLockedRoiTicker();
    }

    // Boot the 3 Pulse modules' live panels (Recepcionista IA / Insights de
    // Redes / Gestor de Ads), gated on the subscription state we just computed.
    if (window.SantiPulseModules) window.SantiPulseModules.init(!!sub.active);
    if (sub.active) loadRoiPulseTicker();
  }

  function fillProfile(p) {
    if (!p) return;
    var form = document.getElementById('profileForm');
    ['business_name', 'website_url', 'industry', 'sender_name', 'target_market'].forEach(function (k) {
      if (form[k] != null && p[k] != null) form[k].value = p[k];
    });
  }

  function loadRoiPulseTicker() {
    var host = document.getElementById('roiPulseTicker');
    if (!host) return;
    window.SantiAuth.apiFetch('/api/ads/roi-pulse')
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (!res.ok) return;
        var p = (res.d && res.d.pulse) || {};
        var currency = p.currency || 'EUR';
        var status = p.status === 'empty' ? 'Sin campanas' : (p.source === 'revealbot' ? 'Revealbot' : 'Meta/TikTok');
        host.innerHTML =
          '<div class="roi-tile lead"><div class="k">ROI Pulse</div><div class="v">' + esc(status) + '</div><div class="s">' + esc(String(p.campaign_count || 0)) + ' campanas sincronizadas.</div></div>' +
          '<div class="roi-tile"><div class="k">Gasto</div><div class="v">' + esc(formatMoney(p.spend, currency)) + '</div><div class="s">Ads</div></div>' +
          '<div class="roi-tile"><div class="k">Ingresos</div><div class="v">' + esc(formatMoney(p.revenue, currency)) + '</div><div class="s">Atribuido</div></div>' +
          '<div class="roi-tile"><div class="k">ROAS</div><div class="v">' + esc(p.roas == null ? '-' : Number(p.roas).toFixed(2) + 'x') + '</div><div class="s">Retorno</div></div>' +
          '<div class="roi-tile"><div class="k">Beneficio</div><div class="v">' + esc(formatMoney(p.profit, currency)) + '</div><div class="s">Estimado</div></div>';

        // Feed the same numbers to Pulse so the mascot tip reflects real ROI.
        var roasTxt = p.roas == null ? null : Number(p.roas).toFixed(2) + 'x';
        setPulseTip(
          roasTxt
            ? 'Tu ROAS actual es ' + roasTxt + '. ' + (Number(p.roas) >= 1
                ? 'Vas en verde — sube el presupuesto del anuncio ganador.'
                : 'Por debajo de 1x: revisa creatividades antes de subir gasto.')
            : 'Sistema al 100%. Lanza tu primer anuncio y verás el ROI aquí en directo.',
          roasTxt ? 'Beneficio estimado ' + formatMoney(p.profit, currency) : ''
        );
      })
      .catch(function () {});
  }

  // Pulse Tip + floating-mascot popover share one copy source.
  function setPulseTip(body, metric) {
    var b = document.getElementById('pulseTipBody');
    var m = document.getElementById('pulseTipMetric');
    var fb = document.getElementById('pulseFabBody');
    if (b) b.textContent = body;
    if (m) m.textContent = metric || '';
    if (fb) fb.textContent = body;
  }

  function renderLockedRoiTicker() {
    setPulseTip('Activa un plan y desbloquearás el ROI en directo. A partir de ahí te aviso de cada oportunidad de inversión.', '');
    var host = document.getElementById('roiPulseTicker');
    if (!host) return;
    host.innerHTML =
      '<div class="roi-tile lead"><div class="k">ROI Pulse</div><div class="v">Bloqueado</div><div class="s">Activa un plan para ver gasto, ingresos y ROAS.</div></div>' +
      '<div class="roi-tile"><div class="k">Gasto</div><div class="v">-</div><div class="s">Ads</div></div>' +
      '<div class="roi-tile"><div class="k">Ingresos</div><div class="v">-</div><div class="s">Atribuido</div></div>' +
      '<div class="roi-tile"><div class="k">ROAS</div><div class="v">-</div><div class="s">Retorno</div></div>' +
      '<div class="roi-tile"><div class="k">Beneficio</div><div class="v">-</div><div class="s">Estimado</div></div>';
  }

  function formatMoney(value, currency) {
    var n = Number(value);
    if (!Number.isFinite(n)) return '-';
    try {
      return new Intl.NumberFormat('es-ES', { style: 'currency', currency: currency || 'EUR', maximumFractionDigits: 0 }).format(n);
    } catch {
      return n.toFixed(0) + ' ' + (currency || 'EUR');
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
          var ico = moduleIcon(j.automation_type);
          return '<tr><td><span class="mono" style="font-size:10px;color:#E23B4E">' + esc(ico) + '</span> ' + esc(moduleName(j.automation_type)) +
            '</td><td><span class="pill ' + scls + '">' + esc(stxt) + '</span></td><td>' +
            (j.is_demo ? 'sí' : 'no') + '</td><td class="mono" style="font-size:11px;color:var(--muted)">' + esc(date) + '</td></tr>';
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
  function stat(k, v, color) {
    return '<div class="stat"><span class="k">' + esc(k) + '</span><span class="v"' +
      (color ? ' style="color:' + color + '"' : '') + '>' + v + '</span></div>';
  }
  // Render the actual run output, not just a "done" line.
  function renderResult(type, result, usage) {
    var html = '';
    var title = result.title || moduleName(type);
    var quota = usage && usage.limit && usage.limit !== 999999 ? usage.used + '/' + usage.limit : (usage ? String(usage.used) : '');
    html += '<div class="res-head"><span class="rt">' + esc(title) + '</span>' +
      (quota ? '<span class="muted mono" style="font-size:11px">' + esc(quota) + ' este mes</span>' : '') + '</div>';

    var metrics = result.metrics || [];
    if (metrics.length) {
      html += '<div class="res-stats">' + metrics.map(function (m) {
        return stat(m.label || 'Dato', esc(m.value || '—'), '#1d9b68');
      }).join('') + '</div>';
    }
    html += '<p class="muted" style="font-size:13px;line-height:1.6;margin:0 0 12px">' + esc(result.summary || 'Módulo Pulse ejecutado.') + '</p>';

    var actions = result.autoActions || result.nextActions || [];
    if (actions.length) {
      html += '<div class="res-row" style="align-items:flex-start;display:block">' +
        '<span class="pill raise">Hecho por SantiPulse</span>' +
        '<ul style="margin:12px 0 0 18px;color:var(--muted);font-size:13px;line-height:1.7">' +
        actions.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') +
        '</ul></div>';
    }

    runResult.innerHTML = html;
    show(runResult);
  }

  // Service Hub neo-toggles: flipping a module ON activates/runs it. On any
  // failure (no sub, quota, error) the toggle reverts to OFF/standby.
  document.querySelectorAll('input[data-run]').forEach(function (input) {
    input.addEventListener('change', function () {
      if (!input.checked) { hide(runMsg); return; }   // turned OFF = standby, no-op
      var type = input.getAttribute('data-run');
      var allInputs = document.querySelectorAll('input[data-run]');
      allInputs.forEach(function (c) { c.disabled = true; });
      hide(runResult);
      setRunMsg('', '<span class="spinner"></span> Activando el módulo Pulse… esto puede tardar unos segundos.');

      window.SantiAuth.apiFetch('/api/dashboard/run', { method: 'POST', body: JSON.stringify({ type: type }) })
        .then(function (r) { return r.json().then(function (d) { return { status: r.status, d: d }; }); })
        .then(function (res) {
          var d = res.d || {};
          if (res.status === 200 && d.ok) {
            hide(runMsg);
            renderResult(type, d.result || {}, d.usage);
            loadRuns();
            // Module reported it could not activate (e.g. missing config):
            // flip the toggle back to STANDBY so the state isn't misleading.
            if (d.result && d.result.success === false) input.checked = false;
          } else {
            input.checked = false;                    // revert on failure
            if (res.status === 402 && d.error === 'needs_subscription') {
              setRunMsg('err', 'Necesitas una suscripción activa. <a href="/precios/">Ver planes →</a>');
            } else if (res.status === 402 && d.error === 'quota_exceeded') {
              setRunMsg('err', 'Has alcanzado tu límite mensual (' + esc(String(d.used)) + '/' + esc(String(d.limit)) +
                '). <a href="/precios/">Sube de plan →</a>');
            } else if (res.status === 400 && d.error === 'invalid_type') {
              setRunMsg('err', 'Ese módulo Pulse no está disponible.');
            } else {
              setRunMsg('err', 'No se pudo activar. Inténtalo de nuevo.');
            }
          }
        })
        .catch(function () { input.checked = false; setRunMsg('err', 'No se pudo activar. Inténtalo de nuevo.'); })
        .finally(function () { allInputs.forEach(function (c) { c.disabled = false; }); });
    });
  });

  // Human SOS: one-click escalation for the client-facing support panel.
  var supportSosBtn = document.getElementById('supportSosBtn');
  var supportMsg = document.getElementById('supportMsg');
  function setSupportMsg(kind, text) {
    if (!supportMsg) return;
    supportMsg.className = 'msg ' + kind;
    supportMsg.textContent = text;
    show(supportMsg);
  }
  if (supportSosBtn) {
    supportSosBtn.addEventListener('click', function () {
      var orig = supportSosBtn.textContent;
      supportSosBtn.disabled = true;
      supportSosBtn.textContent = 'Activando...';
      setSupportMsg('', 'Registrando alerta humana...');
      window.SantiAuth.apiFetch('/api/receptionist/sos', {
        method: 'POST',
        body: JSON.stringify({
          reason: 'support_button',
          detail: 'SOS humano solicitado desde el panel cliente.',
        }),
      })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (res) {
          if (!res.ok) throw new Error((res.d && res.d.error) || 'sos_failed');
          setSupportMsg('ok', 'SOS registrado. Una persona revisará esta cuenta.');
        })
        .catch(function () {
          setSupportMsg('err', 'No se pudo activar el SOS. Inténtalo de nuevo.');
        })
        .finally(function () {
          supportSosBtn.disabled = false;
          supportSosBtn.textContent = orig;
        });
    });
  }

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
