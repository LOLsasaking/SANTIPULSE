/* ============================================================
   /precios — pricing page plan buttons. CSP-safe (no inline JS).
   Loaded after the vendored supabase.js + auth.js (window.SantiAuth).

   Click a plan:
     • logged in  → POST /api/stripe/checkout → redirect to Stripe
     • logged out → send to /login/ to sign in first
   Mirrors the dashboard's data-checkout handler, but adds the
   logged-out → login redirect since this page is public.
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
      btn.textContent = t.redirecting || 'Redirecting…';

      var Auth = window.SantiAuth;
      // Auth unavailable (e.g. anon key not configured) → fall back to login.
      if (!Auth || !Auth.available || !Auth.available()) {
        window.location.href = loginHref(plan);
        return;
      }

      Auth.getSession()
        .then(function (session) {
          if (!session) {
            // Not logged in → sign in first, remembering the chosen plan.
            window.location.href = loginHref(plan);
            return;
          }
          // Logged in → create a checkout session and go to Stripe.
          return Auth.apiFetch('/api/stripe/checkout', {
            method: 'POST',
            body: JSON.stringify({ plan: plan }),
          })
            .then(function (r) { return r.json(); })
            .then(function (d) {
              if (d && d.url) { window.location.href = d.url; return; }
              fail(btn, orig);
            });
        })
        .catch(function () { fail(btn, orig); });
    });
  });

  // Carry the chosen plan through login via ?plan= (dashboard can read it later).
  function loginHref(plan) {
    return '/login/?plan=' + encodeURIComponent(plan);
  }

  function fail(btn, orig) {
    setAllDisabled(false);
    btn.textContent = orig;
    alert(t.error || 'Could not start checkout. Please try again.');
  }
})();
