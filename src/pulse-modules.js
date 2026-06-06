/* ============================================================
   Pulse Modules - easy client dashboard panels.
   Goal: one obvious action per module, no rule-builder maze.
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
  function api(path, opts) {
    return window.SantiAuth.apiFetch(path, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        return { status: r.status, ok: r.ok, d: d };
      });
    });
  }
  function formData(form) {
    var out = {};
    new FormData(form).forEach(function (v, k) { out[k] = String(v || '').trim(); });
    return out;
  }
  function msg(id, kind, text) {
    var node = el(id);
    if (!node) return;
    node.className = 'msg ' + kind;
    node.textContent = text;
    node.classList.remove('hidden');
  }
  function clearMsg(id) {
    var node = el(id);
    if (node) node.classList.add('hidden');
  }

  var SantiPulse = {
    init: function (active) {
      var bodies = ['recepBody', 'insightsBody', 'adsBody'];
      var anyHost = bodies.some(function (id) { return !!el(id); });
      if (!anyHost) return;
      if (!active) {
        var lock = '<div class="sub-lock">Los modulos en vivo requieren una suscripcion activa. <a href="/precios/">Ver planes</a></div>';
        bodies.forEach(function (id) { var b = el(id); if (b) b.innerHTML = lock; });
        return;
      }
      this.renderReceptionist();
      this.renderInsights();
      this.renderAds();
      this.handleOAuthFlash();
    },

    renderReceptionist: function () {
      var box = el('recepBody');
      if (!box) return;
      box.innerHTML = loadingLine();
      api('/api/receptionist/dashboard').then(function (res) {
        if (!res.ok) { box.innerHTML = errLine(res); return; }
        var d = res.d || {};
        var s = d.status || {};
        var c = d.config || {};

        box.innerHTML =
          '<div class="simple-panel accent-green">' +
            '<div><p class="eyebrow">Recepcionista IA</p><h2>Activa llamadas, WhatsApp y SOS humano</h2>' +
            '<p>Completa los tres datos clave una vez. Despues SantiPulse crea o actualiza el asistente y deja el hub listo.</p></div>' +
            '<div class="simple-status">' + statusRow([
              ['Voz IA', s.voice],
              ['WhatsApp', s.whatsapp],
              ['Calendario', s.calendar],
            ]) + '</div>' +
          '</div>' +
          '<form id="recepCfgForm" class="easy-form" novalidate>' +
            grid2(
              field('Saludo del agente', 'greeting', c.greeting || '', 'Hola, gracias por llamar...', 'text'),
              field('Telefono del negocio', 'phone_number', c.phone_number || '', '+34600000000', 'tel', 'required')
            ) +
            grid2(
              field('ID del numero de WhatsApp', 'whatsapp_phone_id', c.whatsapp_phone_id || '', 'Phone number ID de Meta', 'text', 'required'),
              field('Email SOS humano', 'sos_email', c.sos_email || '', 'tu@email.com', 'email', 'required')
            ) +
            '<div class="module-actions">' +
              '<button class="btn" type="submit" id="activateReceptionist">Guardar y activar</button>' +
              connectButton('calendar', s.calendar, 'Conectar Google Calendar') +
            '</div>' +
            '<div class="msg ok hidden" id="recepOk"></div><div class="msg err hidden" id="recepErr"></div>' +
          '</form>' +
          metricStrip([
            ['Leads', (d.leads || []).length],
            ['Llamadas', (d.calls || []).length],
            ['Citas', (d.bookings || []).length],
            ['SOS', (d.sos || []).length],
          ]) +
          leadsTable(d.leads || []);

        var form = el('recepCfgForm');
        form.addEventListener('submit', function (e) {
          e.preventDefault();
          clearMsg('recepOk'); clearMsg('recepErr');
          var payload = formData(form);
          var validation = validateReceptionist(payload, form);
          if (!validation.ok) {
            msg('recepErr', 'err', validation.message);
            return;
          }

          var btn = el('activateReceptionist');
          var original = btn.textContent;
          btn.disabled = true;
          btn.textContent = 'Activando...';
          payload.action = 'save_config';

          api('/api/receptionist/dashboard', { method: 'POST', body: JSON.stringify(payload) })
            .then(function (saveRes) {
              if (!saveRes.ok) throw new Error(errorText(saveRes.d, 'No se pudo guardar la configuracion.'));
              if (s.voice && s.voice.configured) {
                return api('/api/receptionist/dashboard', {
                  method: 'POST',
                  body: JSON.stringify({ action: 'provision_assistant' }),
                }).then(function (provRes) {
                  if (!provRes.ok) throw new Error(errorText(provRes.d, 'La config se guardo, pero Vapi no activo el asistente.'));
                  return provRes;
                });
              }
              return saveRes;
            })
            .then(function () {
              msg('recepOk', 'ok', 'Recepcionista IA activada. Las llamadas, WhatsApp y SOS quedan listos para operar.');
            })
            .catch(function (err) {
              msg('recepErr', 'err', err.message || 'No se pudo activar.');
            })
            .finally(function () {
              btn.disabled = false;
              btn.textContent = original;
            });
        });
        bindConnect('[data-connect-calendar]', '/api/integrations/calendar/authorize', 'recepErr', 'Google Calendar');
      });
    },

    renderInsights: function () {
      var box = el('insightsBody');
      if (!box) return;
      box.innerHTML = loadingLine();
      api('/api/insights/dashboard').then(function (res) {
        if (!res.ok) { box.innerHTML = errLine(res); return; }
        var d = res.d || {};
        var s = d.status || {};
        var c = d.config || {};

        box.innerHTML =
          '<div class="simple-panel accent-blue">' +
            '<div><p class="eyebrow">Insights de Redes</p><h2>Escanea tendencias y prepara posts</h2>' +
            '<p>Define nicho y zona. Al ejecutar, SantiPulse guarda el contexto y genera el resumen de accion.</p></div>' +
            '<div class="simple-status">' + statusRow([
              ['Escaneo', { configured: true, connected: s.collection && s.collection.active }],
              ['Publicacion', s.publishing],
            ]) + '</div>' +
          '</div>' +
          '<form id="insCfgForm" class="easy-form" novalidate>' +
            grid2(
              field('Nicho', 'niche', c.niche || '', 'barberia / clinica / restaurante', 'text', 'required'),
              field('Zona', 'region', c.region || '', 'Tenerife', 'text', 'required')
            ) +
            field('Hashtags base', 'hashtags_text', (c.hashtags || []).join(', '), '#barberia, #fade', 'text') +
            '<div class="module-actions">' +
              '<button class="btn" type="submit" id="scanInsights">Guardar y escanear</button>' +
              connectButton('social', s.publishing, 'Conectar Instagram/Facebook') +
            '</div>' +
            '<div class="msg ok hidden" id="insOk"></div><div class="msg err hidden" id="insErr"></div>' +
          '</form>' +
          '<div id="insRunResult"></div>' +
          '<p class="node-sub" style="margin:18px 0 8px">Tendencias detectadas</p>' +
          trendsTable(d.trends || []) +
          ((d.queue || []).length ? '<p class="node-sub" style="margin:18px 0 8px">Posts preparados</p>' + queueTable(d.queue) : '');

        var form = el('insCfgForm');
        form.addEventListener('submit', function (e) {
          e.preventDefault();
          clearMsg('insOk'); clearMsg('insErr');
          var payload = formData(form);
          if (!payload.niche || !payload.region) {
            msg('insErr', 'err', 'Completa nicho y zona para que el escaneo sea util.');
            return;
          }
          payload.hashtags = String(payload.hashtags_text || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean);
          delete payload.hashtags_text;
          payload.action = 'save_config';

          var btn = el('scanInsights');
          var original = btn.textContent;
          btn.disabled = true;
          btn.textContent = 'Escaneando...';
          api('/api/insights/dashboard', { method: 'POST', body: JSON.stringify(payload) })
            .then(function (saveRes) {
              if (!saveRes.ok) throw new Error(errorText(saveRes.d, 'No se pudo guardar la configuracion.'));
              return runPulse('social_insights');
            })
            .then(function (runRes) {
              msg('insOk', 'ok', 'Escaneo lanzado. SantiPulse preparo el resumen y actualizo el historial.');
              renderMiniResult('insRunResult', runRes.d && runRes.d.result);
            })
            .catch(function (err) { msg('insErr', 'err', err.message || 'No se pudo escanear.'); })
            .finally(function () {
              btn.disabled = false;
              btn.textContent = original;
            });
        });
        bindConnect('[data-connect-social]', '/api/integrations/social/authorize', 'insErr', 'Instagram/Facebook');
      });
    },

    renderAds: function () {
      var box = el('adsBody');
      if (!box) return;
      box.innerHTML = loadingLine();
      api('/api/ads/dashboard').then(function (res) {
        if (!res.ok) { box.innerHTML = errLine(res); return; }
        var d = res.d || {};
        var s = d.status || {};
        var posts = d.posts || [];

        box.innerHTML =
          '<div class="simple-panel accent-yellow">' +
            '<div><p class="eyebrow">Gestor de Ads</p><h2>Elige un post, presupuesto y paga</h2>' +
            '<p>El cliente no toca reglas. SantiPulse recibe la orden pagada y la deja lista para lanzar.</p></div>' +
            '<div class="simple-status">' + statusRow([
              ['Meta Ads', { configured: s.meta && s.meta.configured, connected: s.connected }],
              ['TikTok Ads', { configured: s.tiktok && s.tiktok.configured, connected: s.connected }],
            ]) + '</div>' +
          '</div>' +
          '<form id="adLaunchForm" class="easy-form ad-launch" novalidate>' +
            adPostChooser(posts) +
            grid2(
              selectField('Plataforma', 'platform', [['meta', 'Instagram / Facebook'], ['tiktok', 'TikTok']], 'meta'),
              field('Presupuesto total EUR', 'budget_eur', '50', '50', 'number', 'required min="10" max="5000" step="5"')
            ) +
            selectField('Duracion', 'duration_days', [['3', '3 dias'], ['7', '7 dias'], ['14', '14 dias'], ['30', '30 dias']], '7') +
            '<div class="module-actions">' +
              '<button class="btn" type="submit" id="launchAd">Pagar y lanzar anuncio</button>' +
              connectButton('ads-meta', s.meta, 'Conectar Meta Ads') +
            '</div>' +
            '<div class="msg ok hidden" id="adsOk"></div><div class="msg err hidden" id="adsErr"></div>' +
          '</form>' +
          metricStrip([
            ['Posts listos', posts.length],
            ['Cuentas', (d.accounts || []).length],
            ['Campanas', (d.campaigns || []).length],
            ['Alertas', (d.alerts || []).length],
          ]) +
          '<details class="quiet-details"><summary>Ver campanas actuales</summary>' + campaignsTable(d.campaigns || []) + '</details>';

        var form = el('adLaunchForm');
        form.addEventListener('submit', function (e) {
          e.preventDefault();
          clearMsg('adsOk'); clearMsg('adsErr');
          var payload = formData(form);
          if (!payload.post_id && !payload.caption) {
            msg('adsErr', 'err', 'Elige un post o escribe el texto del anuncio.');
            return;
          }
          if (Number(payload.budget_eur) < 10) {
            msg('adsErr', 'err', 'El presupuesto minimo es 10 EUR.');
            return;
          }
          var btn = el('launchAd');
          var original = btn.textContent;
          btn.disabled = true;
          btn.textContent = 'Abriendo pago...';
          api('/api/stripe/ad-checkout', { method: 'POST', body: JSON.stringify(payload) })
            .then(function (checkout) {
              if (checkout.d && checkout.d.url) {
                window.location.href = checkout.d.url;
                return;
              }
              throw new Error(errorText(checkout.d, 'No se pudo abrir el pago del anuncio.'));
            })
            .catch(function (err) {
              msg('adsErr', 'err', err.message || 'No se pudo abrir el pago.');
              btn.disabled = false;
              btn.textContent = original;
            });
        });
        bindConnect('[data-connect-ads-meta]', '/api/integrations/ads/authorize?provider=meta', 'adsErr', 'Meta Ads');
      });
    },

    handleOAuthFlash: function () {
      var q = new URLSearchParams(window.location.search);
      var flash = el('pulseFlash');
      if (!flash) return;
      var labels = { ads: 'Ads', calendar: 'Calendario', social: 'Instagram/Facebook' };
      ['ads', 'calendar', 'social'].forEach(function (key) {
        if (!q.has(key)) return;
        var ok = q.get(key) === 'connected';
        flash.className = 'msg ' + (ok ? 'ok' : 'err');
        flash.textContent = labels[key] + (ok ? ' conectado.' : ' no se pudo conectar: ' + (q.get('reason') || 'revisa credenciales'));
        flash.classList.remove('hidden');
      });
    },
  };

  function loadingLine() {
    return '<p class="muted" style="font-size:13px">Cargando...</p>';
  }

  function runPulse(type) {
    return api('/api/dashboard/run', { method: 'POST', body: JSON.stringify({ type: type }) }).then(function (res) {
      if (!res.ok) throw new Error(errorText(res.d, 'No se pudo ejecutar el modulo.'));
      return res;
    });
  }

  function statusRow(items) {
    return '<div class="status-grid">' + items.map(function (it) {
      var st = it[1] || {};
      var ok = !!(st.configured && st.connected);
      var text = !st.configured ? 'No configurado' : ok ? 'Conectado' : 'Listo';
      return '<div class="status-chip"><span class="k">' + esc(it[0]) + '</span><span class="v">' +
        '<span class="status-dot ' + (ok ? 'on' : 'off') + '"></span>' + esc(text) + '</span></div>';
    }).join('') + '</div>';
  }

  function connectButton(kind, status, label) {
    if (!status || !status.configured || status.connected) return '';
    var attr = kind === 'calendar' ? 'data-connect-calendar' : kind === 'social' ? 'data-connect-social' : 'data-connect-ads-meta';
    return '<button class="btn ghost" type="button" ' + attr + '>' + esc(label) + '</button>';
  }

  function bindConnect(selector, path, errId, label) {
    document.querySelectorAll(selector).forEach(function (button) {
      button.addEventListener('click', function () {
        clearMsg(errId);
        var original = button.textContent;
        button.disabled = true;
        button.textContent = 'Abriendo...';
        var timer = window.setTimeout(function () {
          if (!button.disabled) return;
          button.disabled = false;
          button.textContent = original;
          msg(errId, 'err', label + ' esta tardando demasiado. Revisa las claves OAuth en Vercel e intenta otra vez.');
        }, 12000);
        api(path)
          .then(function (res) {
            window.clearTimeout(timer);
            if (res.d && res.d.url) {
              window.location.assign(res.d.url);
              return;
            }
            button.disabled = false;
            button.textContent = original;
            msg(errId, 'err', errorText(res.d, label + ' no esta configurado en Vercel.'));
          })
          .catch(function () {
            window.clearTimeout(timer);
            button.disabled = false;
            button.textContent = original;
            msg(errId, 'err', 'No se pudo abrir ' + label + '. Revisa la conexion y vuelve a intentar.');
          });
      });
    });
  }

  function field(label, name, val, ph, type, attrs) {
    return '<div><label>' + esc(label) + '</label><input name="' + esc(name) + '" type="' + esc(type || 'text') +
      '" value="' + esc(val) + '" placeholder="' + esc(ph || '') + '" ' + (attrs || '') + ' /></div>';
  }
  function selectField(label, name, opts, selected) {
    return '<div><label>' + esc(label) + '</label><select name="' + esc(name) + '">' +
      opts.map(function (o) {
        return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(selected) ? ' selected' : '') + '>' + esc(o[1]) + '</option>';
      }).join('') + '</select></div>';
  }
  function grid2(a, b) {
    return '<div class="grid2" style="margin-bottom:12px">' + a + b + '</div>';
  }
  function metricStrip(items) {
    return '<div class="res-stats" style="margin-top:16px">' + items.map(function (it) {
      return '<div class="stat"><span class="k">' + esc(it[0]) + '</span><span class="v">' + esc(String(it[1])) + '</span></div>';
    }).join('') + '</div>';
  }

  function validateReceptionist(payload, form) {
    var fields = [];
    form.querySelectorAll('.field-invalid').forEach(function (node) { node.classList.remove('field-invalid'); });
    if (!/^\+[1-9][0-9]{7,15}$/.test(payload.phone_number || '')) fields.push('phone_number');
    if (!payload.whatsapp_phone_id) fields.push('whatsapp_phone_id');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.sos_email || '')) fields.push('sos_email');
    fields.forEach(function (name) {
      var input = form.querySelector('[name="' + name + '"]');
      if (input) input.classList.add('field-invalid');
    });
    return {
      ok: fields.length === 0,
      message: 'Completa telefono del negocio, ID de WhatsApp y email SOS antes de guardar.',
    };
  }

  function adPostChooser(posts) {
    if (posts.length) {
      return '<div style="margin-bottom:12px"><label>Post a promocionar</label><select name="post_id">' +
        posts.map(function (p) {
          var text = (p.caption || 'Post sin texto').slice(0, 84);
          return '<option value="' + esc(p.id) + '">' + esc(text) + '</option>';
        }).join('') + '</select></div>' +
        '<textarea name="caption" rows="3" placeholder="Opcional: ajusta el texto para el anuncio"></textarea>';
    }
    return '<div style="margin-bottom:12px"><label>Texto del post/anuncio</label>' +
      '<textarea name="caption" rows="4" placeholder="Escribe el post que quieres promocionar" required></textarea></div>';
  }

  function renderMiniResult(id, result) {
    var host = el(id);
    if (!host || !result) return;
    host.innerHTML = '<div class="res-row mini-done"><span class="pill raise">Hecho</span><p>' +
      esc(result.summary || 'Modulo ejecutado.') + '</p></div>';
  }

  function leadsTable(leads) {
    if (!leads.length) return '<p class="muted" style="font-size:13px;margin-top:12px">Aun no hay leads. Entraran automaticamente al recibir llamadas o WhatsApp.</p>';
    return '<table style="margin-top:12px"><thead><tr><th>Nombre</th><th>Telefono</th><th>Canal</th><th>Estado</th></tr></thead><tbody>' +
      leads.slice(0, 8).map(function (l) {
        return '<tr><td>' + esc(l.name || '-') + '</td><td class="mono">' + esc(l.phone || '-') + '</td><td>' + esc(l.source || '') + '</td><td><span class="pill hold">' + esc(l.status || '') + '</span></td></tr>';
      }).join('') + '</tbody></table>';
  }
  function trendsTable(trends) {
    if (!trends.length) return '<p class="muted" style="font-size:13px">Aun no hay tendencias. Pulsa Guardar y escanear para crear el primer resumen.</p>';
    return '<table><thead><tr><th>Estilo</th><th>Plataforma</th><th>Momentum</th><th>Viral</th></tr></thead><tbody>' +
      trends.slice(0, 8).map(function (t) {
        var cls = t.viral_score >= 70 ? 'raise' : t.viral_score >= 40 ? 'hold' : 'lower';
        return '<tr><td>' + esc(t.style || '') + '</td><td>' + esc(t.platform || '') + '</td><td>' + esc(t.momentum || '') + '</td><td><span class="pill ' + cls + '">' + esc(String(t.viral_score == null ? '-' : t.viral_score)) + '</span></td></tr>';
      }).join('') + '</tbody></table>';
  }
  function queueTable(posts) {
    return '<table><thead><tr><th>Post</th><th>Plataforma</th><th>Programado</th><th>Estado</th></tr></thead><tbody>' +
      posts.slice(0, 8).map(function (p) {
        return '<tr><td>' + esc((p.caption || '').slice(0, 54)) + '</td><td>' + esc(p.platform || '') + '</td><td class="mono" style="font-size:11px">' +
          esc(p.scheduled_for ? new Date(p.scheduled_for).toLocaleString() : '') + '</td><td><span class="pill hold">' + esc(p.status || '') + '</span></td></tr>';
      }).join('') + '</tbody></table>';
  }
  function campaignsTable(campaigns) {
    if (!campaigns.length) return '<p class="muted" style="font-size:13px;margin-top:12px">Todavia no hay campanas sincronizadas.</p>';
    return '<table style="margin-top:12px"><thead><tr><th>Campana</th><th>Gasto</th><th>CPC</th><th>ROAS</th><th>Estado</th></tr></thead><tbody>' +
      campaigns.slice(0, 8).map(function (x) {
        return '<tr><td>' + esc(x.name || '') + '</td><td class="mono">' + esc(money(x.spend)) + '</td><td class="mono">' + esc(money(x.cpc)) +
          '</td><td>' + esc(x.roas == null ? '-' : Number(x.roas).toFixed(2)) + '</td><td>' + esc(x.status || '') + '</td></tr>';
      }).join('') + '</tbody></table>';
  }
  function money(value) {
    var n = Number(value);
    return Number.isFinite(n) ? n.toFixed(2) : '-';
  }
  function errorText(data, fallback) {
    if (!data) return fallback;
    var map = {
      integration_not_configured: 'La integracion no esta configurada en Vercel.',
      state_failed: 'No se pudo preparar la conexion OAuth.',
      missing_required_config: 'Completa los campos obligatorios antes de guardar.',
      needs_subscription: 'Necesitas una suscripcion activa.',
      quota_exceeded: 'Has llegado al limite mensual del plan.',
      invalid_budget: 'El presupuesto debe estar entre 10 y 5000 EUR.',
      invalid_duration: 'La duracion debe estar entre 1 y 60 dias.',
      missing_post: 'Elige un post o escribe el texto del anuncio.',
      stripe_not_configured: 'Stripe no esta configurado.',
    };
    return data.message || map[data.error] || fallback;
  }
  function errLine(res) {
    if (res.status === 402) return '<div class="sub-lock">Requiere una suscripcion activa. <a href="/precios/">Ver planes</a></div>';
    return '<p class="muted" style="font-size:13px">No se pudo cargar (' + esc((res.d && res.d.error) || res.status) + ').</p>';
  }

  window.SantiPulseModules = SantiPulse;
})();
