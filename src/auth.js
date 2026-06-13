/* ============================================================
   Shared browser auth helper (Supabase Auth) — CSP-safe.
   Loaded after the vendored supabase.js UMD bundle. Exposes
   window.SantiAuth for the login + dashboard pages.
   ============================================================ */
(function () {
  'use strict';

  var cfg = window.__SB || {};
  var client = null;

  function sb() {
    if (client) return client;
    if (!window.supabase || !cfg.url || !cfg.anonKey) return null;
    client = window.supabase.createClient(cfg.url, cfg.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
    return client;
  }

  // Send a magic link via our backend (/api/auth/magic-link), which emails a
  // branded, mascot + per-language sign-in message through Resend. Supabase's
  // hosted templates can't localize, so the server owns the email now.
  function sendMagicLink(email) {
    var lang = 'es';
    try { lang = window.localStorage.getItem('sp_lang') || 'es'; } catch (e) {}
    if (!/^(es|en|fr|de|it)$/.test(lang)) lang = 'es';
    return fetch('/api/auth/magic-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, lang: lang }),
    }).then(function (r) {
      if (r.ok) return {};
      return r.json().catch(function () { return {}; }).then(function (d) {
        var msg = d.error === 'rate_limited' ? 'Demasiados intentos. Espera un minuto.' :
          d.error === 'invalid_email' ? 'Introduce un email válido.' :
          'No se pudo enviar el enlace.';
        return { error: { message: msg } };
      });
    });
  }

  function hasAuthCallback() {
    var qs = new URLSearchParams(window.location.search || '');
    var hs = new URLSearchParams(String(window.location.hash || '').replace(/^#/, ''));
    return qs.has('code') || qs.has('token_hash') || qs.has('error') ||
      hs.has('access_token') || hs.has('refresh_token') || hs.has('error');
  }

  function cleanAuthUrl(targetPath) {
    if (!window.history || !window.history.replaceState) return;
    var path = targetPath || window.location.pathname || '/dashboard/';
    window.history.replaceState({}, document.title, path);
  }

  function wait(ms) {
    return new Promise(function (resolve) { window.setTimeout(resolve, ms); });
  }

  function waitForSession(attempts) {
    attempts = attempts || 8;
    var c = sb();
    if (!c) return Promise.resolve(null);
    function poll(left) {
      return c.auth.getSession().then(function (r) {
        var session = (r.data && r.data.session) || null;
        if (session || left <= 0) return session;
        return wait(160).then(function () { return poll(left - 1); });
      });
    }
    return poll(attempts);
  }

  // Finish Supabase magic-link redirects explicitly. This covers both PKCE
  // (?code=...) and implicit (#access_token=...) links, then removes callback
  // credentials from the visible URL.
  function finishAuthCallback(targetPath) {
    var c = sb();
    if (!c) return Promise.reject(new Error('auth-unavailable'));
    var qs = new URLSearchParams(window.location.search || '');
    var hs = new URLSearchParams(String(window.location.hash || '').replace(/^#/, ''));
    var callback = hasAuthCallback();
    var authError = qs.get('error_description') || qs.get('error') || hs.get('error_description') || hs.get('error');
    if (authError) {
      cleanAuthUrl(targetPath);
      return Promise.reject(new Error(authError));
    }

    var work = Promise.resolve(null);
    if (qs.has('code') && c.auth.exchangeCodeForSession) {
      work = c.auth.exchangeCodeForSession(qs.get('code')).then(function (r) {
        if (r && r.error) throw r.error;
        return (r.data && r.data.session) || null;
      });
    } else if (hs.has('access_token') && hs.has('refresh_token') && c.auth.setSession) {
      work = c.auth.setSession({
        access_token: hs.get('access_token'),
        refresh_token: hs.get('refresh_token'),
      }).then(function (r) {
        if (r && r.error) throw r.error;
        return (r.data && r.data.session) || null;
      });
    }

    return work.then(function (session) {
      return session || waitForSession(callback ? 10 : 3);
    }).then(function (session) {
      if (callback) cleanAuthUrl(targetPath);
      // Keep the language fresh in user metadata for existing users (OTP
      // `data` only applies on first signup) so future emails localize right.
      if (session && c.auth.updateUser) {
        var lang = 'es';
        try { lang = window.localStorage.getItem('sp_lang') || 'es'; } catch (e) {}
        if (/^(es|en|fr|de|it)$/.test(lang)) c.auth.updateUser({ data: { lang: lang } }).catch(function () {});
      }
      return session || null;
    }).catch(function (err) {
      if (callback) cleanAuthUrl(targetPath);
      throw err;
    });
  }

  // Current session (or null). Resolves after detectSessionInUrl handles the hash.
  function getSession() {
    var c = sb();
    if (!c) return Promise.resolve(null);
    return c.auth.getSession().then(function (r) { return (r.data && r.data.session) || null; });
  }

  function signOut() {
    var c = sb();
    if (!c) return Promise.resolve();
    return c.auth.signOut();
  }

  // The site is deployed with trailingSlash:true, so "/api/x" 308-redirects to
  // "/api/x/". A redirected fetch can drop the body/Authorization and breaks
  // POSTs — so we normalise to the trailing-slash form up front (matching how
  // contratar.js already calls "/api/lead/").
  function withSlash(url) {
    var hash = '', query = '', path = url;
    var h = path.indexOf('#'); if (h !== -1) { hash = path.slice(h); path = path.slice(0, h); }
    var q = path.indexOf('?'); if (q !== -1) { query = path.slice(q); path = path.slice(0, q); }
    if (path.charAt(path.length - 1) !== '/') path += '/';
    return path + query + hash;
  }

  // fetch() wrapper that attaches the Supabase access token as a Bearer header,
  // so serverless functions can verify the user.
  function apiFetch(url, opts) {
    opts = opts || {};
    return getSession().then(function (session) {
      var headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
      if (session && session.access_token) headers['Authorization'] = 'Bearer ' + session.access_token;
      return fetch(withSlash(url), Object.assign({}, opts, { headers: headers }));
    });
  }

  window.SantiAuth = {
    available: function () { return !!sb(); },
    sendMagicLink: sendMagicLink,
    hasAuthCallback: hasAuthCallback,
    finishAuthCallback: finishAuthCallback,
    waitForSession: waitForSession,
    getSession: getSession,
    signOut: signOut,
    apiFetch: apiFetch,
  };
})();
