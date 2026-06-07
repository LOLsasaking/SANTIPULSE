/* Login page — sends a Supabase magic link. CSP-safe. */
(function () {
  'use strict';

  var form = document.getElementById('loginForm');
  var btn = document.getElementById('submitBtn');
  var ok = document.getElementById('ok');
  var err = document.getElementById('err');
  var status = document.getElementById('loginStatus');
  if (!form) return;

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function hideAllMessages() {
    ok.classList.add('hidden');
    err.classList.add('hidden');
    if (status) status.classList.add('hidden');
  }
  function showErr(msg) {
    err.textContent = msg;
    err.classList.remove('hidden');
    ok.classList.add('hidden');
    if (status) status.classList.add('hidden');
  }
  function showStatus(msg) {
    if (!status) return;
    status.textContent = msg;
    status.classList.remove('hidden');
    ok.classList.add('hidden');
    err.classList.add('hidden');
  }

  if (window.SantiAuth && window.SantiAuth.available() && window.SantiAuth.hasAuthCallback && window.SantiAuth.hasAuthCallback()) {
    form.classList.add('hidden');
    showStatus('Accediendo...');
    window.SantiAuth.finishAuthCallback('/dashboard/')
      .then(function (session) {
        if (!session) throw new Error('session-missing');
        window.location.replace('/dashboard/');
      })
      .catch(function () {
        form.classList.remove('hidden');
        showErr('El enlace ha caducado o no se pudo validar. Pide un enlace nuevo e inténtalo otra vez.');
      });
    return;
  }

  // If already logged in, go straight to the dashboard.
  if (window.SantiAuth && window.SantiAuth.available()) {
    window.SantiAuth.getSession().then(function (s) {
      if (s) window.location.replace('/dashboard/');
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    hideAllMessages();

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
