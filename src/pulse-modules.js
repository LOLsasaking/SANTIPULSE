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
      var bodies = ['recepBody', 'insightsBody', 'adsBody', 'vaultBody'];
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
      this.renderVault();
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
            '<p>Solo datos esenciales: si falta algo, no se guarda. Si todo esta listo, SantiPulse activa el asistente y el hub.</p></div>' +
            '<div class="simple-status">' + statusRow([
              ['Voz IA', s.voice],
              ['WhatsApp', s.whatsapp],
              ['Calendario', s.calendar],
            ]) + '</div>' +
          '</div>' +
          '<form id="recepCfgForm" class="easy-form" novalidate>' +
            grid2(
              field('Saludo del agente', 'greeting', c.greeting || '', 'Hola, gracias por llamar...', 'text'),
              field('Telefono publico del negocio', 'phone_number', c.phone_number || '', '+34600000000', 'tel', 'required')
            ) +
            grid2(
              field('Email de emergencia SOS', 'sos_email', c.sos_email || '', 'tu@email.com', 'email', 'required'),
              field('Tu WhatsApp del negocio (lo conectamos por ti)', 'whatsapp_number', c.whatsapp_number || '', '+34600000000', 'tel')
            ) +
            (window.__IS_ADMIN
              ? grid2(
                  field('ID de telefono WhatsApp Business (admin)', 'whatsapp_phone_id', c.whatsapp_phone_id || '', 'Phone number ID de Meta', 'text'),
                  field('Vapi phone number ID (admin)', 'vapi_phone_number_id', c.vapi_phone_number_id || '', 'ID del numero en Vapi (Telnyx import)', 'text')
                )
              : '') +
            '<p class="node-sub" style="margin:16px 0 10px">Personaliza tu recepcionista</p>' +
            grid2(
              selectField('Pais del numero de tu recepcionista', 'phone_country', [['us', 'EE.UU. (+1) — al instante'], ['es', 'España (+34) — en 24-48h']], c.phone_country || 'us'),
              selectField('Voz', 'voice', [['femenina', 'Voz femenina'], ['masculina', 'Voz masculina']], c.voice || 'femenina')
            ) +
            grid2(
              selectField('Idioma', 'language', [['es', 'Español'], ['en', 'English']], c.language || 'es'),
              '<div></div>'
            ) +
            field('Horario del negocio', 'hours_text', c.hours_text || '', 'L-V 9:00-19:00, S 10:00-14:00', 'text') +
            '<div style="margin:12px 0"><label>Instrucciones para tu recepcionista</label>' +
            '<textarea name="extra_instructions" rows="3" placeholder="Ej.: si preguntan por precios, di que un técnico llama en 1h; no aceptar reservas para hoy...">' + esc(c.extra_instructions || '') + '</textarea></div>' +
            '<div class="module-actions">' +
              '<button class="btn" type="submit" id="activateReceptionist">Activar por mi</button>' +
              connectButton('calendar', s.calendar, 'Conectar Google Calendar') +
            '</div>' +
            '<div class="msg ok hidden" id="recepOk"></div><div class="msg err hidden" id="recepErr"></div>' +
          '</form>' +
          voiceConsole(s.voice, c) +
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
              msg('recepOk', 'ok', (s.voice && s.voice.configured)
                ? 'Recepcionista IA activada. Las llamadas, WhatsApp y SOS quedan listos para operar.'
                : 'Datos guardados. Falta configurar Vapi en Vercel para activar llamadas automaticas.');
            })
            .catch(function (err) {
              msg('recepErr', 'err', err.message || 'No se pudo activar.');
            })
            .finally(function () {
              btn.disabled = false;
              btn.textContent = original;
            });
        });
        var panic = el('panicBtn');
        if (panic) {
          panic.addEventListener('click', function () {
            clearMsg('recepOk'); clearMsg('recepErr');
            var original = panic.textContent;
            panic.disabled = true;
            panic.textContent = 'Avisando...';
            api('/api/receptionist/sos', {
              method: 'POST',
              body: JSON.stringify({ reason: 'panic_button', detail: 'SOS humano pulsado desde el panel.' }),
            })
              .then(function (sosRes) {
                if (!sosRes.ok) throw new Error(errorText(sosRes.d, 'No se pudo avisar al equipo humano.'));
                msg('recepOk', 'ok', 'SOS humano enviado. El aviso quedo registrado y se notifico al contacto de emergencia.');
              })
              .catch(function (err) { msg('recepErr', 'err', err.message || 'No se pudo enviar SOS.'); })
              .finally(function () {
                panic.disabled = false;
                panic.textContent = original;
              });
          });
        }
        var callForm = el('testCallForm');
        if (callForm) {
          callForm.addEventListener('submit', function (e) {
            e.preventDefault();
            clearMsg('recepOk'); clearMsg('recepErr');
            var payload = formData(callForm);
            var btn = el('testCallBtn');
            var original = btn.textContent;
            btn.disabled = true;
            btn.textContent = 'Llamando...';
            api('/api/receptionist/dashboard', {
              method: 'POST',
              body: JSON.stringify({ action: 'call', to: payload.to }),
            })
              .then(function (callRes) {
                if (!callRes.ok) throw new Error(errorText(callRes.d, 'No se pudo lanzar la llamada.'));
                msg('recepOk', 'ok', 'Llamada de prueba lanzada desde Vapi.');
              })
              .catch(function (err) { msg('recepErr', 'err', err.message || 'No se pudo llamar.'); })
              .finally(function () {
                btn.disabled = false;
                btn.textContent = original;
              });
          });
        }
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
            '<p>Define nicho y zona. SantiPulse escanea, resume y deja una idea lista para publicar cuando haya senales.</p></div>' +
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
              '<button class="btn" type="submit" id="scanInsights">Escanear y preparar post</button>' +
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
            '<p>Sin reglas tecnicas: eliges el contenido, presupuesto y dias. SantiPulse prepara el lanzamiento pagado.</p></div>' +
            '<div class="simple-status">' + statusRow([
              ['Meta Ads', { configured: s.meta && s.meta.configured, connected: s.connected }],
              ['TikTok Ads', { configured: s.tiktok && s.tiktok.configured, connected: s.connected }],
              ['Revealbot', { configured: s.revealbot && s.revealbot.configured, connected: false }],
            ]) + '</div>' +
          '</div>' +
          '<div id="adsRoiCard">' + loadingLine() + '</div>' +
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

        renderRoiPulse('adsRoiCard');

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

    renderVault: function () {
      var box = el('vaultBody');
      if (!box) return;
      box.innerHTML = loadingLine();
      api('/api/vault').then(function (res) {
        if (!res.ok) { box.innerHTML = errLine(res); return; }
        var items = (res.d && res.d.items) || [];
        box.innerHTML =
          '<div class="simple-panel accent-green">' +
            '<div><p class="eyebrow">Knowledge Vault</p><h2>Tu IA estudia tu negocio real</h2>' +
            '<p>Sube menus, PDFs o notas. SantiPulse resume el contexto y lo usa en Recepcionista IA e Insights de Redes.</p></div>' +
            '<div class="simple-status">' + metricStrip([
              ['Documentos', items.length],
              ['Estado', items.some(function (x) { return x.status === 'metadata_only'; }) ? 'Revisar' : 'Listo'],
            ]) + '</div>' +
          '</div>' +
          '<form id="vaultForm" class="easy-form" novalidate>' +
            grid2(
              field('Titulo', 'title', '', 'Menu de verano / FAQ / Servicios', 'text', 'required'),
              '<div><label>Archivo PDF, menu o texto</label><input name="vault_file" type="file" accept=".pdf,.txt,.md,.csv,.json,image/*,application/pdf" /></div>'
            ) +
            '<div style="margin-bottom:12px"><label>Notas del negocio</label><textarea name="notes" rows="5" placeholder="Precios, horarios, servicios, politicas, preguntas frecuentes..."></textarea></div>' +
            '<div class="module-actions"><button class="btn" type="submit" id="saveVault">Guardar en Boveda</button></div>' +
            '<div class="msg ok hidden" id="vaultOk"></div><div class="msg err hidden" id="vaultErr"></div>' +
          '</form>' +
          '<div class="edge-grid">' +
            '<div class="edge-card"><b>Recepcionista IA</b><p>Usa la Boveda para responder con contexto real del negocio.</p></div>' +
            '<div class="edge-card"><b>Insights de Redes</b><p>Mezcla tendencias con servicios, menus y tono propio.</p></div>' +
            '<div class="edge-card"><b>Human SOS</b><p>Si la IA no sabe, escala a una persona con historial guardado.</p></div>' +
          '</div>' +
          vaultList(items);

        var form = el('vaultForm');
        form.addEventListener('submit', function (e) {
          e.preventDefault();
          clearMsg('vaultOk'); clearMsg('vaultErr');
          var payload = formData(form);
          var file = form.vault_file && form.vault_file.files && form.vault_file.files[0];
          if (!payload.title && !file) {
            msg('vaultErr', 'err', 'Pon un titulo o sube un archivo.');
            return;
          }
          if (!payload.notes && !file) {
            msg('vaultErr', 'err', 'Anade notas o sube un archivo para guardar contexto.');
            return;
          }
          var btn = el('saveVault');
          var original = btn.textContent;
          btn.disabled = true;
          btn.textContent = 'Guardando...';
          fileToBase64(file).then(function (fileBase64) {
            return api('/api/vault', {
              method: 'POST',
              body: JSON.stringify({
                title: payload.title,
                notes: payload.notes,
                fileName: file ? file.name : '',
                mimeType: file ? file.type : '',
                fileBase64: fileBase64 || '',
              }),
            });
          }).then(function (saveRes) {
            if (!saveRes.ok) throw new Error(errorText(saveRes.d, 'No se pudo guardar la Boveda.'));
            msg('vaultOk', 'ok', 'Guardado. La IA ya puede usar este contexto en los modulos.');
            form.reset();
            SantiPulse.renderVault();
          }).catch(function (err) {
            msg('vaultErr', 'err', err.message || 'No se pudo guardar.');
          }).finally(function () {
            btn.disabled = false;
            btn.textContent = original;
          });
        });

        document.querySelectorAll('[data-delete-vault]').forEach(function (button) {
          button.addEventListener('click', function () {
            var id = button.getAttribute('data-delete-vault');
            button.disabled = true;
            api('/api/vault', { method: 'DELETE', body: JSON.stringify({ id: id }) })
              .then(function (delRes) {
                if (!delRes.ok) throw new Error(errorText(delRes.d, 'No se pudo borrar.'));
                SantiPulse.renderVault();
              })
              .catch(function (err) {
                button.disabled = false;
                msg('vaultErr', 'err', err.message || 'No se pudo borrar.');
              });
          });
        });
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

  function voiceConsole(voiceStatus, config) {
    var ready = !!(voiceStatus && voiceStatus.configured && voiceStatus.connected && config && config.vapi_phone_number_id);
    return '<div class="voice-console">' +
      '<form id="testCallForm" novalidate>' +
        '<p><b>Control de voz IA</b><br>Zona lista para Vapi Web SDK. Hoy lanza llamadas de prueba desde el backend y mantiene el SOS humano a mano.</p>' +
        '<label>Telefono para prueba</label><input name="to" type="tel" placeholder="+34600000000" ' + (ready ? '' : 'disabled') + ' />' +
        '<div class="module-actions">' +
          '<button class="btn ghost" id="testCallBtn" type="submit" ' + (ready ? '' : 'disabled title="Conecta Vapi y un phone number id primero"') + '>Llamar prueba</button>' +
          '<button class="btn danger" id="panicBtn" type="button">SOS humano</button>' +
        '</div>' +
      '</form>' +
    '</div>';
  }

  function renderRoiPulse(hostId) {
    var host = el(hostId);
    if (!host) return;
    api('/api/ads/roi-pulse').then(function (res) {
      if (!res.ok) {
        host.innerHTML = '<div class="msg err">No se pudo cargar ROI Pulse.</div>';
        return;
      }
      var p = (res.d && res.d.pulse) || {};
      host.innerHTML = roiTiles(p, false);
    }).catch(function () {
      host.innerHTML = '<div class="msg err">No se pudo cargar ROI Pulse.</div>';
    });
  }

  function roiTiles(p, compact) {
    var currency = p.currency || 'EUR';
    var status = p.status === 'empty' ? 'Sin campanas sincronizadas' : (p.source === 'revealbot' ? 'Revealbot conectado' : 'Meta/TikTok');
    return '<div class="roi-pulse' + (compact ? ' compact' : '') + '">' +
      '<div class="roi-tile lead"><div class="k">ROI Pulse</div><div class="v">' + esc(status) + '</div><div class="s">' + esc(String(p.campaign_count || 0)) + ' campanas visibles.</div></div>' +
      '<div class="roi-tile"><div class="k">Gasto</div><div class="v">' + esc(formatMoney(p.spend, currency)) + '</div><div class="s">Ads</div></div>' +
      '<div class="roi-tile"><div class="k">Ingresos</div><div class="v">' + esc(formatMoney(p.revenue, currency)) + '</div><div class="s">Atribuido</div></div>' +
      '<div class="roi-tile"><div class="k">ROAS</div><div class="v">' + esc(p.roas == null ? '-' : Number(p.roas).toFixed(2) + 'x') + '</div><div class="s">Retorno</div></div>' +
      '<div class="roi-tile"><div class="k">Beneficio</div><div class="v">' + esc(formatMoney(p.profit, currency)) + '</div><div class="s">Estimado</div></div>' +
    '</div>';
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
      var text = !st.configured ? 'No configurado' : ok ? 'Conectado' : 'Pendiente';
      return '<div class="status-chip"><span class="k">' + esc(it[0]) + '</span><span class="v">' +
        '<span class="status-dot ' + (ok ? 'on' : 'off') + '"></span>' + esc(text) + '</span></div>';
    }).join('') + '</div>';
  }

  function connectButton(kind, status, label) {
    if (!status || status.connected) return '';
    if (!status.configured) return '<button class="btn ghost" type="button" disabled title="Faltan claves OAuth en Vercel">Pendiente de claves</button>';
    var attr = kind === 'calendar' ? 'data-connect-calendar' : kind === 'social' ? 'data-connect-social' : 'data-connect-ads-meta';
    return '<button class="btn ghost" type="button" ' + attr + '>' + esc(label) + '</button>';
  }

  function bindConnect(selector, path, errId, label) {
    document.querySelectorAll(selector).forEach(function (button) {
      button.addEventListener('click', function () {
        clearMsg(errId);
        var original = button.textContent;
        var controller = window.AbortController ? new AbortController() : null;
        var timedOut = false;
        button.disabled = true;
        button.setAttribute('aria-busy', 'true');
        button.textContent = 'Abriendo...';
        var timer = window.setTimeout(function () {
          if (!button.disabled) return;
          timedOut = true;
          if (controller) controller.abort();
          button.disabled = false;
          button.removeAttribute('aria-busy');
          button.textContent = original;
          msg(errId, 'err', label + ' esta tardando demasiado. Revisa las claves OAuth y el redirect URL en Vercel.');
        }, 12000);
        api(path, controller ? { signal: controller.signal } : undefined)
          .then(function (res) {
            window.clearTimeout(timer);
            if (res.d && res.d.url) {
              window.location.assign(res.d.url);
              return;
            }
            button.disabled = false;
            button.removeAttribute('aria-busy');
            button.textContent = original;
            msg(errId, 'err', connectionErrorText(label, res.status, res.d));
          })
          .catch(function () {
            window.clearTimeout(timer);
            if (timedOut) return;
            button.disabled = false;
            button.removeAttribute('aria-busy');
            button.textContent = original;
            msg(errId, 'err', 'No se pudo abrir ' + label + '. Revisa la conexion y vuelve a intentar.');
          });
      });
    });
  }

  function connectionErrorText(label, status, data) {
    if (status === 401) return 'Tu sesion expiro. Vuelve a entrar al panel.';
    if (status === 503 || (data && data.error === 'integration_not_configured')) {
      return label + ' no esta configurado todavia. Revisa las claves y el redirect URL en Vercel.';
    }
    if (data && data.error === 'state_failed') {
      return 'No se pudo preparar la conexion OAuth. Revisa Supabase y vuelve a intentar.';
    }
    return errorText(data, 'No se pudo preparar la conexion con ' + label + '.');
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

  function vaultList(items) {
    if (!items.length) {
      return '<div class="vault-list"><div class="vault-item"><div><h4>Boveda vacia</h4><p>Sube tu menu, servicios, FAQs o politicas para personalizar la IA.</p></div></div></div>';
    }
    return '<div class="vault-list">' + items.map(function (item) {
      var status = item.status === 'metadata_only' ? 'Archivo pendiente' : 'Listo';
      return '<div class="vault-item">' +
        '<div><h4>' + esc(item.title || item.file_name || 'Documento') + '</h4>' +
        '<p>' + esc(item.summary || 'Contexto guardado.') + '</p>' +
        '<p class="mono" style="margin-top:7px;font-size:10.5px">' + esc(status) + (item.file_name ? ' - ' + esc(item.file_name) : '') + '</p></div>' +
        '<button class="btn ghost sm" type="button" data-delete-vault="' + esc(item.id) + '">Borrar</button>' +
      '</div>';
    }).join('') + '</div>';
  }

  function fileToBase64(file) {
    if (!file) return Promise.resolve('');
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result || '')); };
      reader.onerror = function () { reject(new Error('No se pudo leer el archivo.')); };
      reader.readAsDataURL(file);
    });
  }

  function validateReceptionist(payload, form) {
    var fields = [];
    var names = {
      phone_number: 'telefono publico del negocio',
      sos_email: 'email de emergencia SOS',
    };
    form.querySelectorAll('.field-invalid').forEach(function (node) { node.classList.remove('field-invalid'); });
    if (!/^\+[1-9][0-9]{7,15}$/.test(payload.phone_number || '')) fields.push('phone_number');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.sos_email || '')) fields.push('sos_email');
    fields.forEach(function (name) {
      var input = form.querySelector('[name="' + name + '"]');
      if (input) input.classList.add('field-invalid');
    });
    return {
      ok: fields.length === 0,
      message: fields.length
        ? 'Falta completar: ' + fields.map(function (name) { return names[name] || name; }).join(', ') + '.'
        : 'ok',
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
  function formatMoney(value, currency) {
    var n = Number(value);
    if (!Number.isFinite(n)) return '-';
    try {
      return new Intl.NumberFormat('es-ES', { style: 'currency', currency: currency || 'EUR', maximumFractionDigits: 0 }).format(n);
    } catch {
      return n.toFixed(0) + ' ' + (currency || 'EUR');
    }
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
      missing_sos_email: 'Configura el email SOS antes de avisar al equipo humano.',
      empty_vault_item: 'Anade notas o sube un archivo para guardar contexto.',
      file_too_large: 'El archivo es demasiado grande para la Boveda.',
      save_failed: 'No se pudo guardar en la Boveda.',
    };
    return data.message || map[data.error] || fallback;
  }
  function errLine(res) {
    if (res.status === 402) return '<div class="sub-lock">Requiere una suscripcion activa. <a href="/precios/">Ver planes</a></div>';
    return '<p class="muted" style="font-size:13px">No se pudo cargar (' + esc((res.d && res.d.error) || res.status) + ').</p>';
  }

  window.SantiPulseModules = SantiPulse;
})();
