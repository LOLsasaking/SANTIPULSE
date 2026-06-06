/* ============================================================
   /precios - pricing page plan buttons. CSP-safe (no inline JS).

   Click a plan:
   - logged in  -> POST /api/stripe/checkout with Supabase bearer token
   - logged out -> POST /api/stripe/checkout publicly; Stripe collects email
   ============================================================ */
(function () {
  'use strict';

  var STRINGS = {};
  try { STRINGS = JSON.parse(document.getElementById('precios-i18n').textContent); }
  catch (e) { STRINGS = {}; }
  var t = STRINGS.cta || {};
  var PLAN_ALIASES = {
    recepcionista: 'starter',
    social: 'pro',
    ads: 'agency',
    ai_receptionist: 'starter',
    social_insights: 'pro',
    ad_manager: 'agency',
  };

  function normalizePlan(plan) {
    return PLAN_ALIASES[plan] || plan;
  }

  function setAllDisabled(state) {
    document.querySelectorAll('[data-checkout], .btn-elegir-plan[data-plan]').forEach(function (b) { b.disabled = state; });
  }

  document.querySelectorAll('[data-checkout], .btn-elegir-plan[data-plan]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var plan = normalizePlan(btn.getAttribute('data-checkout') || btn.getAttribute('data-plan'));
      if (!plan) return;

      var orig = btn.textContent;
      setAllDisabled(true);
      btn.textContent = t.redirecting || 'Redirigiendo...';

      var Auth = window.SantiAuth;
      var authReady = Auth && Auth.available && Auth.available();
      var sessionPromise = authReady ? Auth.getSession() : Promise.resolve(null);

      sessionPromise
        .then(function (session) {
          var opts = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plan: plan, source: 'precios' }),
          };
          var request = session && Auth && Auth.apiFetch
            ? Auth.apiFetch('/api/stripe/checkout', opts)
            : fetch('/api/stripe/checkout', opts);

          return request
            .then(function (r) { return r.json(); })
            .then(function (d) {
              if (d && d.url) { window.location.href = d.url; return; }
              fail(btn, orig);
            });
        })
        .catch(function () { fail(btn, orig); });
    });
  });

  function fail(btn, orig) {
    setAllDisabled(false);
    btn.textContent = orig;
    alert(t.error || 'No se pudo iniciar el pago. Intentalo de nuevo.');
  }
})();
