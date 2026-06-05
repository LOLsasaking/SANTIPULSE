/* Login page — sends a Supabase magic link. CSP-safe. */
(function () {
  'use strict';

  var form = document.getElementById('loginForm');
  var btn = document.getElementById('submitBtn');
  var ok = document.getElementById('ok');
  var err = document.getElementById('err');
  if (!form) return;

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function showErr(msg) { err.textContent = msg; err.classList.remove('hidden'); ok.classList.add('hidden'); }

  // If already logged in, go straight to the dashboard.
  if (window.SantiAuth && window.SantiAuth.available()) {
    window.SantiAuth.getSession().then(function (s) {
      if (s) window.location.replace('/dashboard/');
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    ok.classList.add('hidden');
    err.classList.add('hidden');

    var email = (document.getElementById('email').value || '').trim();
    if (!EMAIL_RE.test(email)) { showErr('Introduce un email válido.'); return; }

    if (!window.SantiAuth || !window.SantiAuth.available()) {
      showErr('El acceso no está configurado todavía. Inténtalo más tarde.');
      return;
    }

    var original = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Enviando…';

    window.SantiAuth.sendMagicLink(email)
      .then(function (res) {
        if (res && res.error) { showErr(res.error.message || 'No se pudo enviar el enlace.'); return; }
        form.classList.add('hidden');
        ok.classList.remove('hidden');
      })
      .catch(function () { showErr('No se pudo enviar el enlace. Inténtalo de nuevo.'); })
      .finally(function () { btn.disabled = false; btn.textContent = original; });
  });
})();
