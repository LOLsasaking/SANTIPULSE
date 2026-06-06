/* ============================================================
   Social integration — Meta Graph OAuth + publish (ESM)
   ------------------------------------------------------------
   Social Scheduler's transport. The user connects via Facebook
   Login; we exchange for a long-lived token, discover their
   Pages (and each Page's linked Instagram business account), and
   store a page token per connected account. The worker publishes
   scheduled_posts through the Graph API.

   Fully env-gated: without META_APP_ID / META_APP_SECRET,
   isConfigured() is false and endpoints respond 503. Plain fetch.

   Tokens live in social_accounts (service_role only).
   ============================================================ */
import { admin } from './auth.js';

const GRAPH = 'https://graph.facebook.com/v21.0';
const SCOPES = [
  'pages_show_list',
  'pages_manage_posts',
  'pages_read_engagement',
  'instagram_basic',
  'instagram_content_publish',
  'business_management',
].join(',');

export function isConfigured() {
  return !!(process.env.META_APP_ID && process.env.META_APP_SECRET);
}

function redirectUri() {
  const base = (process.env.SITE_URL || 'https://santipulse.com').replace(/\/$/, '');
  return `${base}/api/integrations/social/callback/`;
}

/** Facebook Login consent URL. `state` is the CSRF nonce. */
export function buildAuthUrl(state) {
  if (!isConfigured()) return null;
  const p = new URLSearchParams({
    client_id: process.env.META_APP_ID,
    redirect_uri: redirectUri(),
    state,
    scope: SCOPES,
    response_type: 'code',
  });
  return `https://www.facebook.com/v21.0/dialog/oauth?${p.toString()}`;
}

async function graphGet(path, params) {
  const url = `${GRAPH}/${path}?${new URLSearchParams(params).toString()}`;
  const resp = await fetch(url);
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(json?.error?.message || `graph ${resp.status}`);
  return json;
}

/** Exchange ?code= for a short-lived user token, then upgrade to long-lived. */
export async function exchangeCode(code) {
  if (!isConfigured()) return null;
  const short = await graphGet('oauth/access_token', {
    client_id: process.env.META_APP_ID,
    client_secret: process.env.META_APP_SECRET,
    redirect_uri: redirectUri(),
    code,
  });
  const long = await graphGet('oauth/access_token', {
    grant_type: 'fb_exchange_token',
    client_id: process.env.META_APP_ID,
    client_secret: process.env.META_APP_SECRET,
    fb_exchange_token: short.access_token,
  });
  return { userToken: long.access_token, expiresIn: long.expires_in || null };
}

/** Discover the user's Pages + each Page's linked IG business account.
    Page access tokens derived from a long-lived user token are themselves
    long-lived. Returns an array of connectable accounts. */
export async function discoverAccounts(userToken) {
  const accounts = [];
  const pages = await graphGet('me/accounts', {
    access_token: userToken,
    fields: 'id,name,access_token,instagram_business_account{id,username}',
  });
  for (const page of pages.data || []) {
    accounts.push({
      provider: 'facebook',
      externalId: page.id,
      username: page.name,
      accessToken: page.access_token,
    });
    if (page.instagram_business_account) {
      accounts.push({
        provider: 'instagram',
        externalId: page.instagram_business_account.id,
        username: page.instagram_business_account.username || page.name,
        accessToken: page.access_token, // IG publishing uses the Page token
      });
    }
  }
  return accounts;
}

export async function saveAccounts(userId, accounts) {
  const sb = admin();
  if (!sb || !accounts.length) return 0;
  const rows = accounts.map((a) => ({
    user_id: userId,
    provider: a.provider,
    external_id: a.externalId,
    username: a.username,
    access_token: a.accessToken,
    status: 'active',
    connected_at: new Date().toISOString(),
  }));
  const { error } = await sb.from('social_accounts')
    .upsert(rows, { onConflict: 'user_id,provider,external_id' });
  if (error) { console.error('[social] saveAccounts:', error.message); return 0; }
  return rows.length;
}

export async function listAccounts(userId) {
  const sb = admin();
  if (!sb) return [];
  const { data } = await sb.from('social_accounts')
    .select('id, provider, external_id, username, status, connected_at')
    .eq('user_id', userId).eq('status', 'active')
    .order('connected_at', { ascending: false });
  return data || [];
}

export async function disconnect(userId, accountId) {
  const sb = admin();
  if (!sb) return false;
  const q = sb.from('social_accounts').update({ status: 'revoked' }).eq('user_id', userId);
  if (accountId) q.eq('id', accountId);
  const { error } = await q;
  return !error;
}

/* ── Publishing ───────────────────────────────────────────────────────────── */

async function graphPost(path, body) {
  const resp = await fetch(`${GRAPH}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(json?.error?.message || `graph ${resp.status}`);
  return json;
}

/** Publish one scheduled post to its account. `account` is the social_accounts
    row (carries access_token + provider + external_id). Returns { ok, id }. */
export async function publish(account, { caption, mediaUrl }) {
  if (!isConfigured()) return { ok: false, error: 'integration_not_configured' };
  if (!account || !account.access_token) return { ok: false, error: 'account_not_connected' };
  try {
    if (account.provider === 'instagram') {
      // IG is two-step: create a media container, then publish it. Requires media.
      if (!mediaUrl) return { ok: false, error: 'instagram_requires_media' };
      const container = await graphPost(`${account.external_id}/media`, {
        image_url: mediaUrl, caption: caption || '', access_token: account.access_token,
      });
      const published = await graphPost(`${account.external_id}/media_publish`, {
        creation_id: container.id, access_token: account.access_token,
      });
      return { ok: true, id: published.id };
    }
    // Facebook Page: a feed post (optionally with a linked photo).
    const path = mediaUrl ? `${account.external_id}/photos` : `${account.external_id}/feed`;
    const body = mediaUrl
      ? { url: mediaUrl, caption: caption || '', access_token: account.access_token }
      : { message: caption || '', access_token: account.access_token };
    const res = await graphPost(path, body);
    return { ok: true, id: res.post_id || res.id };
  } catch (err) {
    const msg = err?.message || 'publish_failed';
    console.error('[social] publish:', msg);
    return { ok: false, error: msg };
  }
}

export const socialScopes = SCOPES;
