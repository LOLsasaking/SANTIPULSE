/* ============================================================
   Dashboard shell — sidebar nav switching, mobile toggle, top-bar
   fill, and overview stat cards. CSP-safe (external, no inline).
   Works alongside dashboard.js (data/auth) + pulse-modules.js (panels).
   ============================================================ */
(function () {
  'use strict';

  // ── Sidebar section switching ──
  function switchTo(name) {
    document.querySelectorAll('.nav-item[data-nav]').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-nav') === name);
    });
    document.querySelectorAll('.section[data-section]').forEach(function (s) {
      s.classList.toggle('active', s.getAttribute('data-section') === name);
    });
    // close mobile sidebar after pick
    var sb = document.getElementById('sidebar');
    if (sb) sb.classList.remove('open');
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { window.scrollTo(0, 0); }
  }

  document.addEventListener('click', function (e) {
    var nav = e.target.closest && e.target.closest('.nav-item[data-nav]');
    if (nav) { switchTo(nav.getAttribute('data-nav')); return; }
  });

  // ── Mobile menu toggle ──
  var toggle = document.getElementById('menuToggle');
  if (toggle) toggle.addEventListener('click', function () {
    var sb = document.getElementById('sidebar');
    if (sb) sb.classList.toggle('open');
  });

  // ── Deep-link via ?tab= and OAuth return (?ads=connected etc → relevant tab) ──
  function initialTab() {
    var q = new URLSearchParams(window.location.search);
    if (q.get('tab')) return q.get('tab');
    if (q.has('ads')) return 'ads';
    if (q.has('social')) return 'insights';
    if (q.has('calendar')) return 'receptionist';
    return null;
  }
  var t = initialTab();
  if (t) {
    // wait a tick so the app is unhidden by dashboard.js
    document.addEventListener('DOMContentLoaded', function () { setTimeout(function () { switchTo(t); }, 50); });
  }

  // ── Top-bar fill (avatar + plan text). dashboard.js sets #userEmail +
  //    #planBadge; mirror those into the chip once they're populated. ──
  function syncTopbar() {
    var emailEl = document.getElementById('userEmail');
    var av = document.getElementById('userAvatar');
    var planText = document.getElementById('planBadgeText');
    var planBadge = document.getElementById('planBadge');
    if (av && emailEl && emailEl.textContent && emailEl.textContent !== '…') {
      av.textContent = (emailEl.textContent.trim()[0] || 'S').toUpperCase();
    }
    if (planText && planBadge) {
      var p = planBadge.textContent && planBadge.textContent !== 'none' ? planBadge.textContent : 'Sin plan';
      planText.textContent = p;
    }
  }
  setInterval(syncTopbar, 800);

  // ── Overview stat cards — pulled from the module endpoints (best-effort). ──
  function num(v) { return (v == null ? '—' : String(v)); }
  function loadStats() {
    if (!window.SantiAuth || !window.SantiAuth.available()) return;
    var f = window.SantiAuth.apiFetch;
    f('/api/receptionist/dashboard').then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      if (!d) return;
      setText('statLeads', num((d.leads || []).length));
      setText('statCalls', num((d.calls || []).length));
    }).catch(function () {});
    f('/api/insights/dashboard').then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      if (!d) return; setText('statTrends', num((d.trends || []).length));
    }).catch(function () {});
    f('/api/ads/dashboard').then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      if (!d) return; setText('statCampaigns', num((d.campaigns || []).length));
    }).catch(function () {});
  }
  function setText(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; }

  // Load stats once the user is known to be active (poll for the app being shown).
  var tries = 0;
  var statTimer = setInterval(function () {
    tries++;
    var app = document.getElementById('app');
    if (app && !app.classList.contains('hidden')) { loadStats(); clearInterval(statTimer); }
    if (tries > 40) clearInterval(statTimer);
  }, 400);

  // Expose for other scripts if needed.
  window.SantiDashNav = { switchTo: switchTo, loadStats: loadStats };
})();
