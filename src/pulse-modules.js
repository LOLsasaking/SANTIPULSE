/* ============================================================
   Pulse Modules — live dashboard panels (CSP-safe, no inline JS)
   ------------------------------------------------------------
   Renders the three REAL module panels under the run cards:
     • Recepcionista IA  → status, config, leads, calls, bookings, SOS
     • Insights de Redes → status, config, trending styles, post queue
     • Gestor de Ads     → status, accounts, campaigns, rules, alerts
   Each panel talks to /api/<module>/dashboard and shows Connect /
   Activate states from the server (never a token). Gated on an active
   subscription, mirroring SantiAutomations.
   ============================================================ */
(function () {
  'use strict';
  if (!window.SantiAuth || !window.SantiAuth.available()) return;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }
  function el(id) { return document.getElementById(id); }
  function api(path, opts) { return window.SantiAuth.apiFetch(path, opts).then(function (r) { return r.json().then(function (d) { return { status: r.status, d: d }; }); }); }
  function fmt(n, d) { var v = Number(n); return Number.isFinite(v) ? v.toFixed(d == null ? 0 : d) : '—'; }
  function dot(ok) { return '<span style="color:' + (ok ? '#7fe0a3' : 'rgba(255,255,255,.4)') + '">●</span>'; }

  var SantiPulse = {
    init: function (active) {
      var host = el('pulseModules');
      if (!host) return;
      if (!active) { host.innerHTML = '<div class="sub-lock muted">Los módulos en vivo requieren una suscripción activa. <a href="/precios/" style="color:#ff9aa6">Ver planes →</a></div>'; return; }
      this.renderReceptionist();
      this.renderInsights();
      this.renderAds();
      this.handleOAuthFlash();
    },

    /* ── Module 1: Recepcionista IA ── */
    renderReceptionist: function () {
      var box = el('recepBody');
      if (!box) return;
      box.innerHTML = '<p class="muted" style="font-size:13px">Cargando…</p>';
      api('/api/receptionist/dashboard').then(function (res) {
        if (res.status !== 200) { box.innerHTML = errLine(res); return; }
        var d = res.d, s = d.status || {}, c = d.config || {};
        var html = '';
        html += statusRow([
          ['Voz (Vapi)', s.voice], ['WhatsApp', s.whatsapp], ['Calendario', s.calendar],
        ]);
        // Quick config form
        html += '<form id="recepCfgForm" style="margin-top:14px">' +
          grid2(
            field('Saludo del agente', 'greeting', c.greeting || '', 'Hola, gracias por llamar…'),
            field('Teléfono (E.164)', 'phone_number', c.phone_number || '', '+34600000000')
          ) +
          grid2(
            field('WhatsApp phone_number_id', 'whatsapp_phone_id', c.whatsapp_phone_id || '', 'WABA phone id'),
            field('SOS email', 'sos_email', c.sos_email || '', 'tu@email.com')
          ) +
          '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:6px">' +
          '<button class="btn" type="submit">Guardar config</button>' +
          (s.voice.configured && !s.voice.connected ? '<button class="btn ghost" type="button" id="provisionAssistant">Crear asistente de voz</button>' : '') +
          (s.calendar.configured && !s.calendar.connected ? '<button class="btn ghost" type="button" data-connect-cal>Conectar Google Calendar</button>' : '') +
          '</div>' +
          '<div class="msg ok hidden" id="recepOk">Guardado.</div><div class="msg err hidden" id="recepErr"></div>' +
          '</form>';
        // CRM tables
        html += metricStrip([
          ['Leads', (d.leads || []).length], ['Llamadas', (d.calls || []).length],
          ['Citas', (d.bookings || []).length], ['SOS', (d.sos || []).length],
        ]);
        html += leadsTable(d.leads || []);
        if ((d.sos || []).length) html += sosTable(d.sos);
        box.innerHTML = html;

        var form = el('recepCfgForm');
        if (form) form.addEventListener('submit', function (e) {
          e.preventDefault();
          var payload = formData(form); payload.action = 'save_config';
          api('/api/receptionist/dashboard', { method: 'POST', body: JSON.stringify(payload) }).then(function (r) {
            flash('recepOk', 'recepErr', r.status === 200);
          });
        });
        var prov = el('provisionAssistant');
        if (prov) prov.addEventListener('click', function () {
          prov.disabled = true; prov.textContent = 'Creando…';
          api('/api/receptionist/dashboard', { method: 'POST', body: JSON.stringify({ action: 'provision_assistant' }) })
            .then(function () { SantiPulse.renderReceptionist(); });
        });
        bindCalConnect();
      });
    },

    /* ── Module 2: Insights de Redes ── */
    renderInsights: function () {
      var box = el('insightsBody');
      if (!box) return;
      box.innerHTML = '<p class="muted" style="font-size:13px">Cargando…</p>';
      api('/api/insights/dashboard').then(function (res) {
        if (res.status !== 200) { box.innerHTML = errLine(res); return; }
        var d = res.d, s = d.status || {}, c = d.config || {};
        var html = '';
        html += statusRow([
          ['Recolección', { configured: s.collection && s.collection.configured, connected: s.collection && s.collection.active }],
          ['Publicación', s.publishing],
        ]);
        html += '<form id="insCfgForm" style="margin-top:14px">' +
          grid2(
            field('Nicho', 'niche', c.niche || '', 'barbería / clínica / restaurante'),
            field('Zona', 'region', c.region || '', 'Tenerife')
          ) +
          field('Hashtags (separados por coma)', 'hashtags_text', (c.hashtags || []).join(', '), '#barberia, #fade') +
          '<button class="btn" type="submit" style="margin-top:6px">Guardar config</button>' +
          '<div class="msg ok hidden" id="insOk">Guardado.</div><div class="msg err hidden" id="insErr"></div>' +
          '</form>';
        html += '<p class="node-sub" style="margin:18px 0 8px">Estilos en tendencia (probabilidad viral)</p>';
        html += trendsTable(d.trends || []);
        if ((d.queue || []).length) {
          html += '<p class="node-sub" style="margin:18px 0 8px">Cola de publicación</p>' + queueTable(d.queue);
        }
        box.innerHTML = html;

        var form = el('insCfgForm');
        if (form) form.addEventListener('submit', function (e) {
          e.preventDefault();
          var payload = formData(form);
          payload.hashtags = String(payload.hashtags_text || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean);
          delete payload.hashtags_text;
          payload.action = 'save_config';
          api('/api/insights/dashboard', { method: 'POST', body: JSON.stringify(payload) }).then(function (r) {
            flash('insOk', 'insErr', r.status === 200);
          });
        });
      });
    },

    /* ── Module 3: Gestor de Ads ── */
    renderAds: function () {
      var box = el('adsBody');
      if (!box) return;
      box.innerHTML = '<p class="muted" style="font-size:13px">Cargando…</p>';
      api('/api/ads/dashboard').then(function (res) {
        if (res.status !== 200) { box.innerHTML = errLine(res); return; }
        var d = res.d, s = d.status || {};
        var html = '';
        html += statusRow([
          ['Meta Ads', s.meta], ['TikTok Ads', s.tiktok],
        ]);
        html += '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px">' +
          (s.meta && s.meta.configured ? '<button class="btn" type="button" data-connect-ads="meta">Conectar Meta Ads</button>' : '') +
          (s.tiktok && s.tiktok.configured ? '<button class="btn ghost" type="button" data-connect-ads="tiktok">Conectar TikTok Ads</button>' : '') +
          (d.accounts && d.accounts.length ? '<button class="btn ghost" type="button" id="adsSync">Sincronizar métricas</button>' : '') +
          '</div>';
        html += metricStrip([
          ['Cuentas', (d.accounts || []).length], ['Campañas', (d.campaigns || []).length],
          ['Reglas', (d.rules || []).length], ['Alertas', (d.alerts || []).length],
        ]);
        html += campaignsTable(d.campaigns || []);
        html += '<p class="node-sub" style="margin:18px 0 8px">Reglas de optimización</p>';
        html += ruleForm() + rulesTable(d.rules || []);
        if ((d.alerts || []).length) html += '<p class="node-sub" style="margin:18px 0 8px">Alertas</p>' + alertsTable(d.alerts);
        box.innerHTML = html;

        var sync = el('adsSync');
        if (sync) sync.addEventListener('click', function () {
          sync.disabled = true; sync.textContent = 'Sincronizando…';
          api('/api/ads/dashboard', { method: 'POST', body: JSON.stringify({ action: 'sync' }) })
            .then(function () { SantiPulse.renderAds(); });
        });
        var rf = el('adRuleForm');
        if (rf) rf.addEventListener('submit', function (e) {
          e.preventDefault();
          var payload = formData(rf); payload.action = 'create_rule';
          payload.threshold = Number(payload.threshold);
          if (payload.action_value) payload.action_value = Number(payload.action_value);
          api('/api/ads/dashboard', { method: 'POST', body: JSON.stringify(payload) }).then(function () { SantiPulse.renderAds(); });
        });
        bindAdsConnect();
      });
    },

    handleOAuthFlash: function () {
      var q = new URLSearchParams(window.location.search);
      ['ads', 'calendar'].forEach(function (k) {
        if (q.has(k)) {
          var msg = el('pulseFlash');
          if (msg) {
            var ok = q.get(k) === 'connected';
            msg.className = 'msg ' + (ok ? 'ok' : 'err');
            msg.textContent = (k === 'ads' ? 'Ads' : 'Calendario') + (ok ? ' conectado.' : ' no se pudo conectar (' + esc(q.get('reason') || '') + ').');
            msg.classList.remove('hidden');
          }
        }
      });
    },
  };

  /* ── shared renderers ── */
  function statusRow(items) {
    return '<div class="res-stats">' + items.map(function (it) {
      var label = it[0], st = it[1] || {};
      var state = !st.configured ? 'No configurado' : st.connected ? 'Conectado' : 'Listo para conectar';
      return '<div class="stat"><span class="k">' + esc(label) + '</span><span class="v" style="font-size:13px">' +
        dot(st.configured && st.connected) + ' ' + esc(state) + '</span></div>';
    }).join('') + '</div>';
  }
  function metricStrip(items) {
    return '<div class="res-stats" style="margin-top:14px">' + items.map(function (it) {
      return '<div class="stat"><span class="k">' + esc(it[0]) + '</span><span class="v">' + esc(String(it[1])) + '</span></div>';
    }).join('') + '</div>';
  }
  function field(label, name, val, ph) {
    return '<div><label>' + esc(label) + '</label><input name="' + esc(name) + '" value="' + esc(val) + '" placeholder="' + esc(ph || '') + '" /></div>';
  }
  function grid2(a, b) { return '<div class="grid2" style="margin-bottom:12px">' + a + b + '</div>'; }

  function leadsTable(leads) {
    if (!leads.length) return '<p class="muted" style="font-size:13px;margin-top:12px">Aún no hay leads. Entrarán al recibir llamadas o WhatsApp.</p>';
    return '<table style="margin-top:12px"><thead><tr><th>Nombre</th><th>Teléfono</th><th>Canal</th><th>Estado</th></tr></thead><tbody>' +
      leads.slice(0, 10).map(function (l) {
        return '<tr><td>' + esc(l.name || '—') + '</td><td class="mono">' + esc(l.phone || '—') + '</td><td>' + esc(l.source || '') + '</td><td><span class="pill hold">' + esc(l.status || '') + '</span></td></tr>';
      }).join('') + '</tbody></table>';
  }
  function sosTable(sos) {
    return '<p class="node-sub" style="margin:16px 0 8px">Alertas SOS</p><table><thead><tr><th>Motivo</th><th>Canal</th><th>Avisado</th><th>Fecha</th></tr></thead><tbody>' +
      sos.slice(0, 6).map(function (a) {
        return '<tr><td>' + esc(a.reason || '') + '</td><td>' + esc(a.channel || '') + '</td><td>' + esc(a.notified_via || '—') + '</td><td class="mono" style="font-size:11px">' + esc(a.created_at ? new Date(a.created_at).toLocaleString() : '') + '</td></tr>';
      }).join('') + '</tbody></table>';
  }
  function trendsTable(trends) {
    if (!trends.length) return '<p class="muted" style="font-size:13px">Aún no hay tendencias. Se recolectan automáticamente cada 6h cuando las APIs están conectadas.</p>';
    return '<table><thead><tr><th>Estilo</th><th>Plataforma</th><th>Momentum</th><th>Viral</th></tr></thead><tbody>' +
      trends.slice(0, 12).map(function (t) {
        var cls = t.viral_score >= 70 ? 'raise' : t.viral_score >= 40 ? 'hold' : 'lower';
        return '<tr><td>' + esc(t.style || '') + '</td><td>' + esc(t.platform || '') + '</td><td>' + esc(t.momentum || '') + '</td><td><span class="pill ' + cls + '">' + esc(String(t.viral_score == null ? '—' : t.viral_score)) + '</span></td></tr>';
      }).join('') + '</tbody></table>';
  }
  function queueTable(q) {
    return '<table><thead><tr><th>Texto</th><th>Plataforma</th><th>Programado</th><th>Estado</th></tr></thead><tbody>' +
      q.slice(0, 8).map(function (p) {
        return '<tr><td>' + esc((p.caption || '').slice(0, 40)) + '</td><td>' + esc(p.platform || '') + '</td><td class="mono" style="font-size:11px">' + esc(p.scheduled_for ? new Date(p.scheduled_for).toLocaleString() : '') + '</td><td><span class="pill hold">' + esc(p.status || '') + '</span></td></tr>';
      }).join('') + '</tbody></table>';
  }
  function campaignsTable(c) {
    if (!c.length) return '<p class="muted" style="font-size:13px;margin-top:12px">Conecta una cuenta y sincroniza para ver tus campañas y métricas.</p>';
    return '<table style="margin-top:12px"><thead><tr><th>Campaña</th><th>Gasto</th><th>CPC</th><th>ROAS</th><th>Estado</th></tr></thead><tbody>' +
      c.slice(0, 12).map(function (x) {
        var roasCls = x.roas >= 2 ? 'raise' : x.roas != null && x.roas < 1 ? 'lower' : 'hold';
        return '<tr><td>' + esc(x.name || '') + '</td><td class="mono">' + fmt(x.spend, 2) + '</td><td class="mono">' + fmt(x.cpc, 2) + '</td><td><span class="pill ' + roasCls + '">' + (x.roas == null ? '—' : fmt(x.roas, 2)) + '</span></td><td>' + esc(x.status || '') + '</td></tr>';
      }).join('') + '</tbody></table>';
  }
  function ruleForm() {
    return '<form id="adRuleForm" style="margin-bottom:14px">' +
      '<div class="grid2" style="margin-bottom:10px">' +
      '<div><label>Nombre de la regla</label><input name="name" placeholder="CPC alto → pausar" required /></div>' +
      '<div><label>Métrica</label>' + select('metric', [['cpc', 'CPC'], ['roas', 'ROAS'], ['ctr', 'CTR'], ['spend', 'Gasto']]) + '</div>' +
      '</div>' +
      '<div class="grid2" style="margin-bottom:10px">' +
      '<div><label>Condición</label>' + select('operator', [['>', '>'], ['<', '<'], ['>=', '≥'], ['<=', '≤']]) + '</div>' +
      '<div><label>Umbral</label><input name="threshold" type="number" step="0.01" placeholder="2.0" required /></div>' +
      '</div>' +
      '<div class="grid2" style="margin-bottom:10px">' +
      '<div><label>Acción</label>' + select('action', [['alert', 'Solo alerta'], ['pause', 'Pausar'], ['lower_budget', 'Bajar presupuesto'], ['scale_budget', 'Sugerir escalar']]) + '</div>' +
      '<div><label>Valor de acción (% opcional)</label><input name="action_value" type="number" step="1" placeholder="20" /></div>' +
      '</div>' +
      '<button class="btn" type="submit">Añadir regla</button>' +
      '</form>';
  }
  function select(name, opts) {
    return '<select name="' + esc(name) + '" style="width:100%;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:11px 13px;color:#fff;font-size:14px;font-family:inherit">' +
      opts.map(function (o) { return '<option value="' + esc(o[0]) + '">' + esc(o[1]) + '</option>'; }).join('') + '</select>';
  }
  function rulesTable(rules) {
    if (!rules.length) return '<p class="muted" style="font-size:13px">Sin reglas todavía.</p>';
    return '<table><thead><tr><th>Regla</th><th>Condición</th><th>Acción</th><th>Activa</th></tr></thead><tbody>' +
      rules.map(function (r) {
        return '<tr><td>' + esc(r.name || '') + '</td><td class="mono">' + esc(r.metric + ' ' + r.operator + ' ' + r.threshold) + '</td><td>' + esc(r.action || '') + '</td><td>' + (r.is_active ? 'sí' : 'no') + '</td></tr>';
      }).join('') + '</tbody></table>';
  }
  function alertsTable(a) {
    return '<table><thead><tr><th>Mensaje</th><th>Sev.</th><th>Acción</th><th>Fecha</th></tr></thead><tbody>' +
      a.slice(0, 8).map(function (x) {
        var cls = x.severity === 'critical' ? 'lower' : x.severity === 'warning' ? 'warn' : 'hold';
        return '<tr><td>' + esc((x.message || '').slice(0, 60)) + '</td><td><span class="pill ' + cls + '">' + esc(x.severity || '') + '</span></td><td>' + esc(x.action_taken || '') + '</td><td class="mono" style="font-size:11px">' + esc(x.created_at ? new Date(x.created_at).toLocaleDateString() : '') + '</td></tr>';
      }).join('') + '</tbody></table>';
  }

  /* ── connect handlers ── */
  function bindCalConnect() {
    var b = document.querySelector('[data-connect-cal]');
    if (b) b.addEventListener('click', function () {
      b.disabled = true;
      api('/api/integrations/calendar/authorize').then(function (r) {
        if (r.d && r.d.url) window.location.href = r.d.url; else b.disabled = false;
      });
    });
  }
  function bindAdsConnect() {
    document.querySelectorAll('[data-connect-ads]').forEach(function (b) {
      b.addEventListener('click', function () {
        var provider = b.getAttribute('data-connect-ads');
        b.disabled = true;
        api('/api/integrations/ads/authorize?provider=' + provider).then(function (r) {
          if (r.d && r.d.url) window.location.href = r.d.url; else b.disabled = false;
        });
      });
    });
  }

  /* ── small utils ── */
  function formData(form) {
    var out = {}; new FormData(form).forEach(function (v, k) { out[k] = v; }); return out;
  }
  function flash(okId, errId, ok) {
    var o = el(okId), e = el(errId);
    if (ok) { if (o) o.classList.remove('hidden'); if (e) e.classList.add('hidden'); }
    else { if (e) { e.textContent = 'No se pudo guardar.'; e.classList.remove('hidden'); } if (o) o.classList.add('hidden'); }
  }
  function errLine(res) {
    var d = res.d || {};
    if (res.status === 402) return '<div class="sub-lock muted">Requiere una suscripción activa. <a href="/precios/" style="color:#ff9aa6">Ver planes →</a></div>';
    return '<p class="muted" style="font-size:13px">No se pudo cargar (' + esc(d.error || res.status) + ').</p>';
  }

  window.SantiPulseModules = SantiPulse;
})();
