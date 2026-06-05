/* Contact form -> POST /api/lead. Translated messages from #i18n-data. CSP-safe. */
(function () {
  'use strict';

  var I18N = {};
  try { I18N = JSON.parse(document.getElementById('i18n-data').textContent); } catch (e) { I18N = {}; }
  var t = I18N.form || {};
  var L = I18N.lang || 'es';

  // Stamp load time for the server-side time-trap
  var loadedAt = document.getElementById('loadedAt');
  if (loadedAt) loadedAt.value = String(Date.now());

  var form = document.getElementById('form');
  if (!form) return;
  var ok = document.getElementById('ok');
  var err = document.getElementById('err');
  var btn = document.getElementById('submitBtn');

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    ok.classList.add('hidden');
    err.classList.add('hidden');

    var name = (form.name.value || '').trim();
    var email = (form.email.value || '').trim();
    var message = (form.message.value || '').trim();
    var phone = (form.phone.value || '').trim();
    var business = (form.business.value || '').trim();

    // Collect the "need" checkboxes
    var need = [];
    form.querySelectorAll('input[name="need"]:checked').forEach(function (c) { need.push(c.value); });

    // Client-side validation (server re-validates)
    if (name.length < 2 || !EMAIL_RE.test(email)) {
      err.textContent = t.invalid || 'Revisa tu nombre y un email válido.';
      err.classList.remove('hidden');
      err.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    var original = btn.textContent;
    btn.disabled = true;
    btn.textContent = t.sending || 'Enviando...';

    fetch('/api/lead/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name, email: email, phone: phone, business: business,
        need: need, message: message,
        company: form.company ? form.company.value : '',     // honeypot
        loadedAt: form.loadedAt ? form.loadedAt.value : '',
        lang: L
      })
    })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (res.ok && res.d && res.d.ok) {
          form.reset();
          ok.classList.remove('hidden');
          ok.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          err.textContent = (res.d && res.d.error === 'invalid')
            ? (t.invalid || 'Revisa los datos.')
            : (t.error || 'Algo salió mal. Inténtalo de nuevo.');
          err.classList.remove('hidden');
        }
      })
      .catch(function () {
        err.textContent = t.error || 'Algo salió mal. Inténtalo de nuevo.';
        err.classList.remove('hidden');
      })
      .finally(function () {
        btn.disabled = false;
        btn.textContent = original;
      });
  });
})();
