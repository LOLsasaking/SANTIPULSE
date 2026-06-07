/* ============================================================
   /api/admin/verify-connections — API Connection "Truth"
   ------------------------------------------------------------
   Performs REAL health pings against each external service using
   the stored ENV keys. The dashboard shows "connected" ONLY when
   the provider returns 2xx. Missing key → "missing". Bad/expired
   key → "error" (Meta expired tokens flagged with reauth:true so
   the UI can show "Re-authenticate with Facebook").

   Auth: requires a logged-in admin (Supabase bearer token).
   ============================================================ */
import { requireAdmin } from '../lib/auth.js';
import { pingRevealbot } from '../lib/revealbot.js';
import { vaultReadiness } from '../lib/vault.js';

const TIMEOUT_MS = 8000;

/** fetch with a hard timeout so one dead provider can't hang the route. */
async function ping(url, opts = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal });
    let json = null;
    try { json = await res.json(); } catch { /* non-JSON body is fine */ }
    return { ok: res.ok, status: res.status, json };
  } catch (err) {
    return { ok: false, status: 0, json: null, err: String(err && err.message || err) };
  } finally {
    clearTimeout(timer);
  }
}

function missing(message) {
  return { status: 'missing', message };
}

export default async function handler(req, res) {
  const user = await requireAdmin(req, res);
  if (!user) return; // requireAdmin already sent 401/403

  const env = process.env;
  const results = {
    openai: missing('Falta OPENAI_API_KEY'),
    vapi: missing('Falta VAPI_API_KEY'),
    twilio: missing('Falta TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN'),
    make: missing('Falta MAKE_WEBHOOK_URL / MAKE_API_KEY'),
    meta: missing('Falta META_ACCESS_TOKEN'),
    tiktok: missing('Falta TIKTOK_ACCESS_TOKEN'),
    apify: missing('Falta APIFY_API_TOKEN'),
    stripe: missing('Falta STRIPE_SECRET_KEY'),
    supabase: missing('Falta SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY'),
    revealbot: missing('Falta REVEALBOT_API_KEY / REVEALBOT_ACCOUNT_ID'),
    vault: missing('Falta tabla/bucket de Boveda en Supabase'),
    vercel: missing('Falta VERCEL_TOKEN (solo para CI/CD)'),
  };

  // ── 0. OpenAI ("the brain") ──
  if (env.OPENAI_API_KEY) {
    const r = await ping('https://api.openai.com/v1/models?limit=1', {
      headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
    });
    results.openai = r.ok
      ? { status: 'connected', message: 'Activo' }
      : { status: 'error', message: r.status === 401 ? 'Clave inválida' : `Error ${r.status || 'red'}` };
  }

  // ── 1. Vapi (AI voice) ──
  if (env.VAPI_API_KEY) {
    const r = await ping('https://api.vapi.ai/assistant?limit=1', {
      headers: { Authorization: `Bearer ${env.VAPI_API_KEY}` },
    });
    results.vapi = r.ok
      ? { status: 'connected', message: 'Activo' }
      : { status: 'error', message: r.status === 401 ? 'Clave inválida' : `Error ${r.status || 'red'}` };
  }

  // ── 2. Meta (Facebook/Instagram) — detect EXPIRED token for reauth ──
  if (env.META_ACCESS_TOKEN) {
    const r = await ping(`https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${encodeURIComponent(env.META_ACCESS_TOKEN)}`);
    if (r.ok) {
      results.meta = { status: 'connected', message: r.json && r.json.name ? `Autenticado (${r.json.name})` : 'Autenticado' };
    } else {
      // Graph error subcodes: 463/467 = expired/invalid session, type OAuthException
      const e = r.json && r.json.error;
      const expired = !!e && (e.code === 190 || e.type === 'OAuthException');
      results.meta = expired
        ? { status: 'error', message: 'Token caducado', reauth: true }
        : { status: 'error', message: (e && e.message) || `Error ${r.status || 'red'}` };
    }
  }

  // ── 3. Stripe (payments) ──
  if (env.STRIPE_SECRET_KEY) {
    const r = await ping('https://api.stripe.com/v1/account', {
      headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
    });
    results.stripe = r.ok
      ? { status: 'connected', message: 'Activo' }
      : { status: 'error', message: r.status === 401 ? 'Clave secreta inválida' : `Error ${r.status || 'red'}` };
  }

  // ── 4. Supabase (database) — also proves the `leads` table exists ──
  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    const r = await ping(`${env.SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/leads?select=id&limit=1`, {
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });
    if (r.ok) {
      results.supabase = { status: 'connected', message: 'Base de datos online' };
    } else if (r.status === 404 || (r.json && /relation .* does not exist|could not find the table/i.test(JSON.stringify(r.json)))) {
      results.supabase = { status: 'error', message: 'Tabla "leads" no encontrada' };
    } else {
      results.supabase = { status: 'error', message: `Error ${r.status || 'red'}` };
    }
  }

  // ── Twilio (phone numbers for the AI receptionist) ──
  if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN) {
    const auth = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString('base64');
    const r = await ping(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(env.TWILIO_ACCOUNT_SID)}.json`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    results.twilio = r.ok
      ? { status: 'connected', message: 'Cuenta activa' }
      : { status: 'error', message: r.status === 401 ? 'Credenciales inválidas' : `Error ${r.status || 'red'}` };
  }

  // ── Make.com (optional WhatsApp workflow bridge) — presence only, no health endpoint ──
  if (env.MAKE_WEBHOOK_URL || env.MAKE_API_KEY) {
    results.make = { status: 'connected', message: 'Configurado', optional: true };
  } else {
    results.make = { status: 'missing', message: 'Opcional · sin configurar', optional: true };
  }

  // ── TikTok for Business (optional social) — presence only ──
  if (env.TIKTOK_ACCESS_TOKEN || (env.TIKTOK_CLIENT_KEY && env.TIKTOK_CLIENT_SECRET)) {
    results.tiktok = { status: 'connected', message: 'Configurado', optional: true };
  } else {
    results.tiktok = { status: 'missing', message: 'Opcional · sin configurar', optional: true };
  }

  // ── Apify (optional trend scraping) ──
  if (env.APIFY_API_TOKEN) {
    const r = await ping(`https://api.apify.com/v2/users/me?token=${encodeURIComponent(env.APIFY_API_TOKEN)}`);
    results.apify = r.ok
      ? { status: 'connected', message: 'Token activo', optional: true }
      : { status: 'error', message: r.status === 401 ? 'Token inválido' : `Error ${r.status || 'red'}`, optional: true };
  } else {
    results.apify.optional = true;
  }

  // ── 5. Revealbot (optional ads engine) ──
  results.revealbot = await pingRevealbot();

  // ── Vercel (hosting / CI-CD token — optional, the site hosts without it) ──
  if (env.VERCEL_TOKEN) {
    const r = await ping('https://api.vercel.com/v2/user', {
      headers: { Authorization: `Bearer ${env.VERCEL_TOKEN}` },
    });
    results.vercel = r.ok
      ? { status: 'connected', message: 'Token activo', optional: true }
      : { status: 'error', message: r.status === 401 ? 'Token inválido' : `Error ${r.status || 'red'}`, optional: true };
  } else {
    results.vercel.optional = true;
  }

  // ── 6. Knowledge Vault readiness ──
  results.vault = await vaultReadiness();

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    success: true,
    timestamp: new Date().toISOString(),
    integrations: results,
  });
}
