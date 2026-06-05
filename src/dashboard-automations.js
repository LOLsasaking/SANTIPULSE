/* Dashboard — the 3 client automations (Integrations, Cart Recovery, Outreach,
   Social Scheduler). CSP-safe: same-origin apiFetch, no inline handlers, all
   dynamic text escaped. OAuth "Connect" buttons do a top-level navigation to the
   authorize endpoint (carrying the Bearer token as a one-time redirect is not
   possible for a plain <a>, so we fetch the authorize URL with auth, then follow
   the 302 target it would have sent — see connectProvider). */
(function () {
  'use strict';
  var Auth = window.SantiAuth;
  if (!Auth || !Auth.available()) return;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }
  function show(el) { if (el) el.classList.remove('hidden'); }
  function hide(el) { if (el) el.classList.add('hidden'); }
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  // ── Subscription gating: show forms only if active; else show the lock note.
  var subActive = false;
  function applySubGate() {
    qsa('[data-sub-gated]').forEach(function (el) { el.classList.toggle('hidden', !subActive); });
    qsa('[data-sub-lock]').forEach(function (el) { el.classList.toggle('hidden', subActive); });
  }

  // ── Surface OAuth callback result (?gmail=connected etc.) as a banner. ──
  function flashCallbackResult() {
    var p = new URLSearchParams(window.location.search);
    var providers = ['gmail', 'shopify', 'social'];
    var msgEl = qs('#integMsg');
    for (var i = 0; i < providers.length; i++) {
      var v = p.get(providers[i]);
      if (!v) continue;
      if (v === 'connected') {
        msgEl.className = 'msg ok';
        msgEl.textContent = 'Conectado correctamente: ' + providers[i] + '.';
      } else {
        msgEl.className = 'msg err';
        msgEl.textContent = 'No se pudo conectar ' + providers[i] + ' (' + (p.get('reason') || 'error') + ').';
      }
      show(msgEl);
      // clean the URL so a refresh doesn't re-show it
      window.history.replaceState({}, '', window.location.pathname);
      break;
    }
  }

  // ── Integrations status → render Connect/Disconnect state. ──
  function loadIntegrations() {
    Auth.apiFetch('/api/integrations/status')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (st) {
        hide(qs('#integLoading'));
        if (!st) { qs('#integLoading').textContent = 'No se pudieron cargar las integraciones.'; show(qs('#integLoading')); return; }
        show(qs('#integList'));
        renderInteg('gmail', st.gmail, st.gmail.email);
        renderInteg('shopify', st.shopify, st.shopify.shop);
        renderInteg('social', st.social, st.social.connected ? (st.social.accounts || []).map(function (a) { return a.username; }).join(', ') : null);
      })
      .catch(function () { hide(qs('#integLoading')); });
  }

  function renderInteg(key, info, detail) {
    var row = qs('[data-integ="' + key + '"]');
    if (!row) return;
    var stateEl = qs('[data-state]', row);
    var connectBtn = qs('[data-connect="' + key + '"]', row);
    var disconnectBtn = qs('[data-disconnect="' + key + '"]', row);
    var shopForm = qs('[data-shop-form]', row);

    if (!info.configured) {
      stateEl.textContent = 'No disponible (sin configurar en el servidor).';
      if (connectBtn) connectBtn.disabled = true;
      if (shopForm) hide(shopForm);
      return;
    }
    if (info.connected) {
      stateEl.textContent = 'Conectado' + (detail ? ' · ' + detail : '');
      if (connectBtn) hide(connectBtn);
      if (shopForm) hide(shopForm);
      show(disconnectBtn);
    } else {
      if (connectBtn) show(connectBtn);
      if (shopForm) show(shopForm);
      hide(disconnectBtn);
    }
  }

  // OAuth connect: the authorize endpoint needs the Bearer token (so it can bind
  // the CSRF state to this user), but a fetch can't follow a cross-origin 302 to
  // the consent screen. So authorize returns JSON { url } and we navigate the top
  // frame there ourselves.
  function connectProvider(provider, extraQuery) {
    var url = '/api/integrations/' + provider + '/authorize' + (extraQuery || '');
    Auth.apiFetch(url)
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d && d.url) { window.location.href = d.url; return; }
        throw new Error((d && d.error) || 'authorize_failed');
      })
      .catch(function (e) {
        var msgEl = qs('#integMsg');
        msgEl.className = 'msg err';
        msgEl.textContent = 'No se pudo iniciar la conexión (' + e.message + ').';
        show(msgEl);
      });
  }

  function wireIntegrations() {
    qsa('[data-connect]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var provider = btn.getAttribute('data-connect');
        if (provider === 'shopify') {
          var input = qs('[data-shop-input]', btn.closest('.integ-row'));
          var shop = (input && input.value || '').trim().toLowerCase();
          if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop)) {
            var msgEl = qs('#integMsg'); msgEl.className = 'msg err';
            msgEl.textContent = 'Introduce un dominio válido: mi-tienda.myshopify.com'; show(msgEl);
            return;
          }
          connectProvider('shopify', '?shop=' + encodeURIComponent(shop));
        } else {
          connectProvider(provider);
        }
      });
    });
    qsa('[data-disconnect]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var provider = btn.getAttribute('data-disconnect');
        btn.disabled = true;
        Auth.apiFetch('/api/integrations/disconnect', { method: 'POST', body: JSON.stringify({ provider: provider }) })
          .then(function () { loadIntegrations(); })
          .catch(function () { btn.disabled = false; });
      });
    });
  }

  /* ── Sequence step editor (shared by cart + outreach) ────────────────────── */
  function stepRow(index, step) {
    step = step || { delay_minutes: 0, subject: '', body: '' };
    var div = document.createElement('div');
    div.className = 'seq-step';
    div.innerHTML =
      '<div class="sh"><span class="sn">Paso ' + (index + 1) + '</span>' +
      '<button type="button" class="rm" data-rm title="Quitar">×</button></div>' +
      '<div class="grid2" style="margin-bottom:10px">' +
      '<div><label>Espera (minutos)</label><input data-f="delay_minutes" type="number" min="0" value="' + esc(step.delay_minutes) + '" /></div>' +
      '<div><label>Asunto</label><input data-f="subject" value="' + esc(step.subject) + '" /></div>' +
      '</div>' +
      '<label>Cuerpo</label><textarea data-f="body" rows="3">' + esc(step.body) + '</textarea>';
    div.querySelector('[data-rm]').addEventListener('click', function () {
      div.parentNode.removeChild(div);
      renumberSteps(div.closest('[data-steps]') || div.parentNode);
    });
    return div;
  }
  function renumberSteps(container) {
    if (!container) return;
    qsa('.seq-step .sn', container).forEach(function (sn, i) { sn.textContent = 'Paso ' + (i + 1); });
  }
  function collectSteps(container) {
    return qsa('.seq-step', container).map(function (st) {
      var get = function (f) { var el = qs('[data-f="' + f + '"]', st); return el ? el.value : ''; };
      return { delay_minutes: parseInt(get('delay_minutes'), 10) || 0, subject: get('subject'), body: get('body') };
    });
  }
  function initSteps(form, existing) {
    var container = qs('[data-steps]', form);
    container.innerHTML = '';
    var steps = (existing && existing.length) ? existing : [{ delay_minutes: 0, subject: '', body: '' }];
    steps.forEach(function (s, i) { container.appendChild(stepRow(i, s)); });
    var addBtn = qs('[data-add-step]', form);
    if (addBtn && !addBtn._wired) {
      addBtn._wired = true;
      addBtn.addEventListener('click', function () {
        container.appendChild(stepRow(qsa('.seq-step', container).length, {}));
      });
    }
  }

  function setFormMsg(form, kind, text) {
    var ok = qs('[data-ok]', form), err = qs('[data-err]', form);
    hide(ok); hide(err);
    if (kind === 'ok') { if (text) ok.textContent = text; show(ok); }
    else { err.textContent = text || 'Error.'; show(err); }
  }

  /* ── Cart Recovery ───────────────────────────────────────────────────────── */
  function loadCart() {
    Auth.apiFetch('/api/automations/cart-recovery')
      .then(function (r) { return r.status === 402 ? null : r.json(); })
      .then(function (data) {
        var form = qs('#cartForm');
        var c = data && data.campaign;
        if (c) {
          if (form.from_name) form.from_name.value = c.from_name || '';
          if (form.discount_code) form.discount_code.value = c.discount_code || '';
        }
        initSteps(form, c && c.steps);
        renderJobs(qs('#cartJobs'), (data && data.jobs) || [], 'cart');
      })
      .catch(function () { initSteps(qs('#cartForm'), null); });
  }
  function wireCart() {
    var form = qs('#cartForm');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var payload = {
        action: 'save',
        from_name: form.from_name.value || null,
        discount_code: form.discount_code.value || null,
        steps: collectSteps(form),
      };
      submitForm(form, '/api/automations/cart-recovery', payload, loadCart);
    });
    qs('[data-import="cart"]', form).addEventListener('click', function () {
      runImport(form, '/api/automations/cart-recovery', { action: 'import' }, this, loadCart);
    });
  }

  /* ── Outreach ────────────────────────────────────────────────────────────── */
  function loadOutreach() {
    Auth.apiFetch('/api/automations/outreach')
      .then(function (r) { return r.status === 402 ? null : r.json(); })
      .then(function (data) {
        var form = qs('#outreachForm');
        var c = data && data.campaign;
        if (c) {
          if (form.from_name) form.from_name.value = c.from_name || '';
          if (form.daily_cap) form.daily_cap.value = c.daily_cap || '';
        }
        initSteps(form, c && c.steps);
        renderJobs(qs('#outreachJobs'), (data && data.jobs) || [], 'outreach');
      })
      .catch(function () { initSteps(qs('#outreachForm'), null); });
  }
  function wireOutreach() {
    var form = qs('#outreachForm');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var payload = {
        action: 'save',
        from_name: form.from_name.value || null,
        daily_cap: parseInt(form.daily_cap.value, 10) || 50,
        steps: collectSteps(form),
      };
      submitForm(form, '/api/automations/outreach', payload, loadOutreach);
    });
    qs('[data-import="outreach"]', form).addEventListener('click', function () {
      var text = qs('[data-recipients]', form).value || '';
      if (!text.trim()) { setFormMsg(form, 'err', 'Pega al menos un destinatario.'); return; }
      runImport(form, '/api/automations/outreach', { action: 'import', recipients_text: text }, this, loadOutreach);
    });
  }

  /* ── Social Scheduler ────────────────────────────────────────────────────── */
  function loadSocial() {
    Auth.apiFetch('/api/automations/social')
      .then(function (r) { return r.status === 402 ? null : r.json(); })
      .then(function (data) {
        var sel = qs('#socialAccount');
        var accounts = (data && data.accounts) || [];
        if (!accounts.length) {
          sel.innerHTML = '<option value="">Conecta una cuenta en Integraciones</option>';
          sel.disabled = true;
        } else {
          sel.disabled = false;
          sel.innerHTML = accounts.map(function (a) {
            return '<option value="' + esc(a.id) + '">' + esc((a.provider === 'instagram' ? '📸 ' : '📘 ') + a.username) + '</option>';
          }).join('');
        }
        renderPosts(qs('#socialPosts'), (data && data.posts) || []);
      })
      .catch(function () {});
  }
  function wireSocial() {
    var form = qs('#socialForm');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var payload = {
        action: 'schedule',
        account_id: form.account_id.value,
        caption: form.caption.value || '',
        media_url: form.media_url.value || null,
        scheduled_for: form.scheduled_for.value ? new Date(form.scheduled_for.value).toISOString() : '',
      };
      if (!payload.account_id) { setFormMsg(form, 'err', 'Selecciona una cuenta.'); return; }
      submitForm(form, '/api/automations/social', payload, function () { form.caption.value = ''; form.media_url.value = ''; loadSocial(); });
    });
  }

  /* ── Shared submit / import / render helpers ─────────────────────────────── */
  function submitForm(form, endpoint, payload, reload) {
    var btn = form.querySelector('button[type="submit"]');
    btn.disabled = true; var orig = btn.textContent; btn.textContent = 'Guardando…';
    Auth.apiFetch(endpoint, { method: 'POST', body: JSON.stringify(payload) })
      .then(function (r) { return r.json().then(function (d) { return { status: r.status, d: d }; }); })
      .then(function (res) {
        if (res.status === 200 && res.d.ok) { setFormMsg(form, 'ok'); if (reload) reload(); }
        else if (res.status === 402) { setFormMsg(form, 'err', 'Necesitas una suscripción activa.'); }
        else { setFormMsg(form, 'err', errText(res.d.error)); }
      })
      .catch(function () { setFormMsg(form, 'err', 'No se pudo guardar.'); })
      .finally(function () { btn.disabled = false; btn.textContent = orig; });
  }
  function runImport(form, endpoint, payload, btn, reload) {
    btn.disabled = true; var orig = btn.textContent; btn.textContent = 'Importando…';
    Auth.apiFetch(endpoint, { method: 'POST', body: JSON.stringify(payload) })
      .then(function (r) { return r.json().then(function (d) { return { status: r.status, d: d }; }); })
      .then(function (res) {
        if (res.status === 200 && res.d.ok) {
          setFormMsg(form, 'ok', 'Importados: ' + (res.d.imported != null ? res.d.imported : 0) + '.');
          if (reload) reload();
        } else { setFormMsg(form, 'err', errText(res.d.error)); }
      })
      .catch(function () { setFormMsg(form, 'err', 'No se pudo importar.'); })
      .finally(function () { btn.disabled = false; btn.textContent = orig; });
  }
  function errText(code) {
    var M = {
      no_steps: 'Añade al menos un paso a la secuencia.',
      no_campaign: 'Guarda la secuencia primero.',
      shopify_not_connected: 'Conecta Shopify en Integraciones.',
      integration_not_configured: 'Integración no disponible.',
      no_recipients: 'No hay destinatarios válidos.',
      instagram_requires_media: 'Instagram necesita una URL de imagen.',
      invalid_media_url: 'La URL de imagen no es válida.',
      date_in_past: 'La fecha debe ser futura.',
      invalid_date: 'Fecha no válida.',
    };
    return M[code] || 'No se pudo completar.';
  }

  function jobStatusPill(s) {
    var map = {
      pending: ['hold', 'Pendiente'], sending: ['hold', 'Enviando'], completed: ['raise', 'Completado'],
      recovered: ['raise', 'Recuperado'], replied: ['raise', 'Respondido'], failed: ['lower', 'Fallido'],
      bounced: ['lower', 'Rebotado'], stopped: ['warn', 'Detenido'],
    };
    var m = map[s] || ['hold', s || '—'];
    return '<span class="pill ' + m[0] + '">' + esc(m[1]) + '</span>';
  }
  function renderJobs(box, jobs, kind) {
    if (!box) return;
    if (!jobs.length) { box.innerHTML = '<p class="muted" style="font-size:13px">Aún no hay envíos.</p>'; return; }
    var rows = jobs.map(function (j) {
      var who = kind === 'cart' ? j.customer_email : j.recipient_email;
      var extra = kind === 'cart' ? (j.cart_value != null ? (j.currency || '') + j.cart_value : '—') : (j.company || '—');
      return '<tr><td>' + esc(who) + '</td><td>' + esc(extra) + '</td><td>' + esc('Paso ' + ((j.step_index || 0) + 1)) +
        '</td><td>' + jobStatusPill(j.status) + '</td></tr>';
    }).join('');
    box.innerHTML = '<table><thead><tr><th>Destinatario</th><th>' +
      (kind === 'cart' ? 'Valor' : 'Empresa') + '</th><th>Paso</th><th>Estado</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }
  function renderPosts(box, posts) {
    if (!box) return;
    if (!posts.length) { box.innerHTML = '<p class="muted" style="font-size:13px">No hay posts programados.</p>'; return; }
    var rows = posts.map(function (p) {
      var when = p.scheduled_for ? new Date(p.scheduled_for).toLocaleString() : '—';
      var cap = (p.caption || '').slice(0, 40) + ((p.caption || '').length > 40 ? '…' : '');
      var st = jobStatusPill(p.status === 'scheduled' ? 'pending' : p.status === 'published' ? 'completed' : p.status);
      var cancel = p.status === 'scheduled'
        ? '<button class="link" data-cancel="' + esc(p.id) + '" style="padding:0">Cancelar</button>' : '';
      return '<tr><td>' + esc(cap || '—') + '</td><td class="mono" style="font-size:11px">' + esc(when) +
        '</td><td>' + st + '</td><td>' + cancel + '</td></tr>';
    }).join('');
    box.innerHTML = '<table><thead><tr><th>Post</th><th>Programado</th><th>Estado</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>';
    qsa('[data-cancel]', box).forEach(function (btn) {
      btn.addEventListener('click', function () {
        btn.disabled = true;
        Auth.apiFetch('/api/automations/social', { method: 'POST', body: JSON.stringify({ action: 'cancel', id: btn.getAttribute('data-cancel') }) })
          .then(function () { loadSocial(); }).catch(function () { btn.disabled = false; });
      });
    });
  }

  /* ── Boot: called by dashboard.js once it knows the subscription state. ──── */
  window.SantiAutomations = {
    init: function (isActive) {
      subActive = !!isActive;
      applySubGate();
      flashCallbackResult();
      loadIntegrations();
      wireIntegrations();
      if (subActive) {
        wireCart(); loadCart();
        wireOutreach(); loadOutreach();
        wireSocial(); loadSocial();
      }
    },
  };
})();
