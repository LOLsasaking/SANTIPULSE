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

  // Send a magic link to the given email. redirectTo returns the user to /dashboard.
  function sendMagicLink(email) {
    var c = sb();
    if (!c) return Promise.reject(new Error('auth-unavailable'));
    var redirectTo = window.location.origin + '/dashboard/';
    return c.auth.signInWithOtp({ email: email, options: { emailRedirectTo: redirectTo } });
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
    getSession: getSession,
    signOut: signOut,
    apiFetch: apiFetch,
  };
})();
