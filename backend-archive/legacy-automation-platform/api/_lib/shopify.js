/* ============================================================
   Shopify integration — OAuth + abandoned checkouts (ESM)
   ------------------------------------------------------------
   Cart Recovery's data source. The user installs our app on their
   Shopify store (OAuth); we store the Admin API access token and
   poll abandoned checkouts, turning each into a cart_recovery_job.

   Fully env-gated: without SHOPIFY_API_KEY / SHOPIFY_API_SECRET,
   isConfigured() is false and endpoints respond 503. Plain fetch,
   no extra dependency.

   Tokens live in shopify_connections (service_role only).
   ============================================================ */
import crypto from 'node:crypto';
import { admin } from './auth.js';

const SCOPES = 'read_checkouts,read_orders,read_customers';
const API_VERSION = '2024-10';

export function isConfigured() {
  return !!(process.env.SHOPIFY_API_KEY && process.env.SHOPIFY_API_SECRET);
}

function redirectUri() {
  const base = (process.env.SITE_URL || 'https://santipulse.com').replace(/\/$/, '');
  return `${base}/api/integrations/shopify/callback/`;
}

// Shopify shop domains must be <name>.myshopify.com — validate to avoid SSRF.
const SHOP_RE = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i;
export function isValidShop(shop) {
  return typeof shop === 'string' && SHOP_RE.test(shop.trim());
}

/** Consent URL for installing the app on `shop`. `state` is the CSRF nonce. */
export function buildAuthUrl(shop, state) {
  if (!isConfigured() || !isValidShop(shop)) return null;
  const p = new URLSearchParams({
    client_id: process.env.SHOPIFY_API_KEY,
    scope: SCOPES,
    redirect_uri: redirectUri(),
    state,
  });
  return `https://${shop.trim()}/admin/oauth/authorize?${p.toString()}`;
}

/** Verify the HMAC Shopify signs the callback query with (prevents forgery). */
export function verifyHmac(query) {
  if (!isConfigured()) return false;
  const { hmac, ...rest } = query;
  if (!hmac) return false;
  const message = Object.keys(rest).sort()
    .map((k) => `${k}=${Array.isArray(rest[k]) ? rest[k].join(',') : rest[k]}`).join('&');
  const digest = crypto.createHmac('sha256', process.env.SHOPIFY_API_SECRET).update(message).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(digest, 'utf8'), Buffer.from(String(hmac), 'utf8'));
  } catch { return false; }
}

/** Exchange the callback ?code= for a permanent Admin API access token. */
export async function exchangeCode(shop, code) {
  if (!isConfigured() || !isValidShop(shop)) return null;
  const resp = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_API_KEY,
      client_secret: process.env.SHOPIFY_API_SECRET,
      code,
    }),
  });
  if (!resp.ok) { console.error('[shopify] exchangeCode:', resp.status); return null; }
  const data = await resp.json();
  return { accessToken: data.access_token, scope: data.scope };
}

export async function saveConnection(userId, shop, { accessToken, scope }) {
  const sb = admin();
  if (!sb) return false;
  const { error } = await sb.from('shopify_connections').upsert({
    user_id: userId, shop_domain: shop, access_token: accessToken, scope,
    status: 'active', connected_at: new Date().toISOString(),
  }, { onConflict: 'user_id,shop_domain' });
  if (error) { console.error('[shopify] saveConnection:', error.message); return false; }
  return true;
}

export async function getConnection(userId) {
  const sb = admin();
  if (!sb) return null;
  const { data } = await sb.from('shopify_connections')
    .select('*').eq('user_id', userId).eq('status', 'active')
    .order('connected_at', { ascending: false }).limit(1).maybeSingle();
  return data || null;
}

export async function disconnect(userId, shop) {
  const sb = admin();
  if (!sb) return false;
  const q = sb.from('shopify_connections').update({ status: 'revoked' }).eq('user_id', userId);
  if (shop) q.eq('shop_domain', shop);
  const { error } = await q;
  return !error;
}

/** Fetch recent abandoned checkouts from the store's Admin API.
    Returns a normalized array the cart-recovery importer turns into jobs. */
export async function fetchAbandonedCheckouts(connection, { limit = 50 } = {}) {
  if (!connection) return [];
  const url = `https://${connection.shop_domain}/admin/api/${API_VERSION}/checkouts.json?limit=${Math.min(limit, 250)}`;
  const resp = await fetch(url, {
    headers: { 'X-Shopify-Access-Token': connection.access_token, 'Content-Type': 'application/json' },
  });
  if (!resp.ok) { console.error('[shopify] fetchAbandonedCheckouts:', resp.status); return []; }
  const data = await resp.json();
  const checkouts = Array.isArray(data.checkouts) ? data.checkouts : [];
  return checkouts
    .filter((c) => c.email && !c.completed_at)            // unconverted, has an email
    .map((c) => ({
      cartToken: String(c.token || c.id),
      email: c.email,
      name: c.customer ? [c.customer.first_name, c.customer.last_name].filter(Boolean).join(' ') : null,
      value: c.total_price ? parseFloat(c.total_price) : null,
      currency: c.currency || c.presentment_currency || null,
      recoveryUrl: c.abandoned_checkout_url || null,
    }));
}

export const shopifyScopes = SCOPES;
