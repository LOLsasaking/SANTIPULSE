/* ============================================================
   OAuth state helper (ESM, service_role)
   ------------------------------------------------------------
   Shared CSRF-nonce round-trip for the OAuth connect flows used by the
   3 Pulse modules: Meta social (Insights publishing), Google Calendar
   (Recepcionista IA booking), and Meta/TikTok Ads (Gestor de Ads).

   The authorize endpoint creates a single-use, user-bound state; the
   callback verifies + consumes it. Backed by the oauth_states table.
   ============================================================ */
import crypto from 'node:crypto';
import { admin } from './auth.js';

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000; // 10 min

export async function createOAuthState(userId, provider, redirectTo = null) {
  const sb = admin();
  if (!sb) return null;
  const state = crypto.randomBytes(24).toString('hex');
  const { error } = await sb.from('oauth_states')
    .insert({ state, user_id: userId, provider, redirect_to: redirectTo });
  if (error) { console.error('[automations] createOAuthState:', error.message); return null; }
  return state;
}

/** Verify + consume a state nonce. Returns { userId, redirectTo } or null. */
export async function consumeOAuthState(state, provider) {
  const sb = admin();
  if (!sb || !state) return null;
  const { data } = await sb.from('oauth_states')
    .select('*').eq('state', state).eq('provider', provider).maybeSingle();
  if (!data) return null;
  // delete (single-use) regardless of outcome
  await sb.from('oauth_states').delete().eq('state', state);
  if (Date.now() - new Date(data.created_at).getTime() > OAUTH_STATE_TTL_MS) return null; // expired
  return { userId: data.user_id, redirectTo: data.redirect_to };
}
