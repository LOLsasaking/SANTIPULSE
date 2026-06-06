/* ============================================================
   OAuth state helper (ESM, service_role)
   ------------------------------------------------------------
   Shared CSRF-nonce round-trip for the OAuth connect flows used by the
   3 Pulse modules: Meta social (Insights publishing), Google Calendar
   (Recepcionista IA booking), and Meta/TikTok Ads (Gestor de Ads).

   The authorize endpoint creates a single-use, user-bound state when the
   oauth_states table exists. If that migration is missing in production, we
   fall back to a short-lived signed state token so connect buttons still open
   the provider consent URL instead of dead-ending on state_failed.
   ============================================================ */
import crypto from 'node:crypto';
import { admin } from './auth.js';

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000; // 10 min

export async function createOAuthState(userId, provider, redirectTo = null) {
  const sb = admin();
  if (!sb) return createSignedOAuthState(userId, provider, redirectTo);
  const state = crypto.randomBytes(24).toString('hex');
  const { error } = await sb.from('oauth_states')
    .insert({ state, user_id: userId, provider, redirect_to: redirectTo });
  if (error) {
    if (tableMissing(error)) return createSignedOAuthState(userId, provider, redirectTo);
    console.error('[automations] createOAuthState:', error.message);
    return null;
  }
  return state;
}

/** Verify + consume a state nonce. Returns { userId, redirectTo } or null. */
export async function consumeOAuthState(state, provider) {
  if (isSignedOAuthState(state)) return consumeSignedOAuthState(state, provider);
  const sb = admin();
  if (!sb || !state) return null;
  const { data, error } = await sb.from('oauth_states')
    .select('*').eq('state', state).eq('provider', provider).maybeSingle();
  if (error) {
    if (tableMissing(error)) return consumeSignedOAuthState(state, provider);
    console.error('[automations] consumeOAuthState:', error.message);
    return null;
  }
  if (!data) return null;
  // delete (single-use) regardless of outcome
  await sb.from('oauth_states').delete().eq('state', state);
  if (Date.now() - new Date(data.created_at).getTime() > OAUTH_STATE_TTL_MS) return null; // expired
  return { userId: data.user_id, redirectTo: data.redirect_to };
}

function createSignedOAuthState(userId, provider, redirectTo = null) {
  const secret = oauthStateSecret();
  if (!secret || !userId || !provider) return null;
  const payload = {
    u: String(userId),
    p: String(provider),
    r: redirectTo || null,
    t: Date.now(),
    n: crypto.randomBytes(16).toString('hex'),
  };
  const body = b64url(JSON.stringify(payload));
  return `${body}.${sign(body, secret)}`;
}

function consumeSignedOAuthState(state, provider) {
  const secret = oauthStateSecret();
  if (!secret || !state) return null;
  const [body, mac] = String(state).split('.');
  if (!body || !mac || !safeEqual(mac, sign(body, secret))) return null;
  let payload = null;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (payload?.p !== provider) return null;
  if (!payload?.u || !Number.isFinite(Number(payload.t))) return null;
  if (Date.now() - Number(payload.t) > OAUTH_STATE_TTL_MS) return null;
  return { userId: payload.u, redirectTo: payload.r || null };
}

function oauthStateSecret() {
  return process.env.OAUTH_STATE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.JWT_SECRET || '';
}

function isSignedOAuthState(value) {
  return typeof value === 'string' && value.includes('.');
}

function b64url(text) {
  return Buffer.from(text, 'utf8').toString('base64url');
}

function sign(body, secret) {
  return crypto.createHmac('sha256', secret).update(body).digest('base64url');
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function tableMissing(error) {
  if (!error) return false;
  const text = `${error.code || ''} ${error.message || ''} ${error.details || ''}`;
  return /PGRST205|schema cache|oauth_states|relation .* does not exist|could not find the table/i.test(text);
}
