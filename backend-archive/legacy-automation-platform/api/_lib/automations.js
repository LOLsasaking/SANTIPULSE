/* ============================================================
   Data layer for the 3 client automations (ESM, service_role)
   ------------------------------------------------------------
   Thin Supabase helpers shared by the management endpoints and
   the cron worker. All writes use the service_role client (admin()),
   so RLS is bypassed and every query is scoped by user_id in code.

   Covers: oauth_states, cart_recovery_campaigns/jobs,
   scheduled_posts, outreach_campaigns/jobs, email_tracking.
   ============================================================ */
import crypto from 'node:crypto';
import { admin } from './auth.js';

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000; // 10 min

// ── OAuth state (CSRF nonce) ──────────────────────────────────────────────────
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

// ── Generic owned-row helpers ─────────────────────────────────────────────────
function table(name) { const sb = admin(); return sb ? sb.from(name) : null; }

export async function listOwned(tableName, userId, { select = '*', limit = 100, order = 'created_at' } = {}) {
  const t = table(tableName);
  if (!t) return [];
  const { data, error } = await t.select(select).eq('user_id', userId)
    .order(order, { ascending: false }).limit(limit);
  if (error) { console.error(`[automations] list ${tableName}:`, error.message); return []; }
  return data || [];
}

export async function insertOwned(tableName, userId, row) {
  const t = table(tableName);
  if (!t) return null;
  const { data, error } = await t.insert({ ...row, user_id: userId }).select('*').single();
  if (error) { console.error(`[automations] insert ${tableName}:`, error.message); return null; }
  return data;
}

/** Update a row, but only if it belongs to userId (defense in depth). */
export async function updateOwned(tableName, userId, id, patch) {
  const t = table(tableName);
  if (!t) return null;
  const { data, error } = await t.update(patch).eq('id', id).eq('user_id', userId).select('*').maybeSingle();
  if (error) { console.error(`[automations] update ${tableName}:`, error.message); return null; }
  return data;
}

export async function deleteOwned(tableName, userId, id) {
  const t = table(tableName);
  if (!t) return false;
  const { error } = await t.delete().eq('id', id).eq('user_id', userId);
  return !error;
}

// ── Cart recovery ─────────────────────────────────────────────────────────────
/** Insert abandoned-cart jobs for a campaign, deduped on (user, cart_token).
    `carts` is the normalized array from shopify.fetchAbandonedCheckouts.
    Schedules step 0 at the campaign's first-step delay. Returns count imported. */
export async function importCartJobs(userId, campaign, carts) {
  const sb = admin();
  if (!sb || !carts.length) return 0;
  const firstDelay = (campaign.steps?.[0]?.delay_minutes ?? 60);
  const nextSend = new Date(Date.now() + firstDelay * 60 * 1000).toISOString();
  const rows = carts.map((c) => ({
    campaign_id: campaign.id, user_id: userId,
    cart_token: c.cartToken, customer_email: c.email, customer_name: c.name,
    cart_value: c.value, currency: c.currency, recovery_url: c.recoveryUrl,
    step_index: 0, status: 'pending', next_send_at: nextSend,
  }));
  const { data, error } = await sb.from('cart_recovery_jobs')
    .upsert(rows, { onConflict: 'user_id,cart_token', ignoreDuplicates: true })
    .select('id');
  if (error) { console.error('[automations] importCartJobs:', error.message); return 0; }
  return data ? data.length : 0;
}

// ── Outreach ──────────────────────────────────────────────────────────────────
/** Insert outreach recipients as jobs, deduped on (campaign, recipient_email).
    Schedules step 0 immediately. Returns count imported. */
export async function importOutreachJobs(userId, campaign, recipients) {
  const sb = admin();
  if (!sb || !recipients.length) return 0;
  const now = new Date().toISOString();
  const rows = recipients.map((r) => ({
    campaign_id: campaign.id, user_id: userId,
    recipient_email: r.email, recipient_name: r.name || null, company: r.company || null,
    merge_data: r.merge || null, step_index: 0, status: 'pending', next_send_at: now,
  }));
  const { data, error } = await sb.from('outreach_jobs')
    .upsert(rows, { onConflict: 'campaign_id,recipient_email', ignoreDuplicates: true })
    .select('id');
  if (error) { console.error('[automations] importOutreachJobs:', error.message); return 0; }
  return data ? data.length : 0;
}

// ── Email tracking ────────────────────────────────────────────────────────────
export async function createTrackingToken({ userId, source, jobId, stepIndex, recipient, providerId }) {
  const sb = admin();
  if (!sb) return null;
  const token = crypto.randomBytes(20).toString('hex');
  const { error } = await sb.from('email_tracking').insert({
    user_id: userId, source, job_id: jobId, step_index: stepIndex,
    recipient, token, provider_id: providerId || null,
  });
  if (error) { console.error('[automations] createTrackingToken:', error.message); return null; }
  return token;
}

// ── Monthly usage counts (for per-plan quota enforcement in the worker) ───────
function monthStartIso() {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), 1)).toISOString();
}

/** Emails (outreach + cart) SENT by this user in the current calendar month. */
export async function countEmailsThisMonth(userId) {
  const sb = admin();
  if (!sb || !userId) return 0;
  const { count } = await sb.from('email_tracking')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId).gte('sent_at', monthStartIso());
  return count || 0;
}

/** Social posts PUBLISHED by this user in the current calendar month. */
export async function countPostsThisMonth(userId) {
  const sb = admin();
  if (!sb || !userId) return 0;
  const { count } = await sb.from('post_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId).eq('status', 'published').gte('created_at', monthStartIso());
  return count || 0;
}

export async function recordTrackingEvent(token, kind /* 'open' | 'click' */) {
  const sb = admin();
  if (!sb || !token) return;
  const { data } = await sb.from('email_tracking').select('id, open_count, click_count')
    .eq('token', token).maybeSingle();
  if (!data) return;
  const now = new Date().toISOString();
  const patch = kind === 'click'
    ? { click_count: (data.click_count || 0) + 1, clicked_at: now }
    : { open_count: (data.open_count || 0) + 1, opened_at: now };
  // set first-touch timestamp only once
  if (kind === 'click' && data.click_count) delete patch.clicked_at;
  if (kind === 'open' && data.open_count) delete patch.opened_at;
  await sb.from('email_tracking').update(patch).eq('id', data.id);
}
