/* ============================================================
   Ad platform providers — Meta Marketing API + TikTok Business API (ESM)
   ------------------------------------------------------------
   Read campaign performance and apply actions (pause / budget) for
   Gestor de Ads. Each provider is a small adapter over the official
   REST API. Tokens live per-connection in ad_accounts (service_role).

   Meta OAuth reuses the existing Facebook Login app (META_APP_ID /
   META_APP_SECRET) with the ads_read + ads_management scopes. TikTok
   uses its own app creds (TIKTOK_APP_ID / TIKTOK_APP_SECRET); both are
   env-gated so an unconfigured provider reports not-configured.
   ============================================================ */

const META_GRAPH = 'https://graph.facebook.com/v21.0';
const TIKTOK_API = 'https://business-api.tiktok.com/open_api/v1.3';

export function metaConfigured() {
  return !!(process.env.META_APP_ID && process.env.META_APP_SECRET);
}
export function tiktokConfigured() {
  return !!(process.env.TIKTOK_APP_ID && process.env.TIKTOK_APP_SECRET);
}
export function providerConfigured(provider) {
  return provider === 'tiktok' ? tiktokConfigured() : metaConfigured();
}

/* ── Meta OAuth (ads scopes) ────────────────────────────────────────────────
   Reuses the Facebook Login flow but requests ad scopes and a different
   redirect so the callback can distinguish ads from social-posting connects. */
const META_ADS_SCOPES = ['ads_read', 'ads_management', 'business_management'].join(',');

function metaRedirect() {
  const base = (process.env.SITE_URL || 'https://santipulse.com').replace(/\/$/, '');
  return `${base}/api/integrations/ads/callback/`;
}

export function buildMetaAuthUrl(state) {
  if (!metaConfigured()) return null;
  const p = new URLSearchParams({
    client_id: process.env.META_APP_ID,
    redirect_uri: metaRedirect(),
    state,
    scope: META_ADS_SCOPES,
    response_type: 'code',
  });
  return `https://www.facebook.com/v21.0/dialog/oauth?${p.toString()}`;
}

async function metaGet(path, params) {
  const url = `${META_GRAPH}/${path}?${new URLSearchParams(params).toString()}`;
  const resp = await fetch(url);
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(json?.error?.message || `meta ${resp.status}`);
  return json;
}

async function metaPost(path, body) {
  const resp = await fetch(`${META_GRAPH}/${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(json?.error?.message || `meta ${resp.status}`);
  return json;
}

export async function metaExchangeCode(code) {
  if (!metaConfigured()) return null;
  const short = await metaGet('oauth/access_token', {
    client_id: process.env.META_APP_ID, client_secret: process.env.META_APP_SECRET,
    redirect_uri: metaRedirect(), code,
  });
  const long = await metaGet('oauth/access_token', {
    grant_type: 'fb_exchange_token',
    client_id: process.env.META_APP_ID, client_secret: process.env.META_APP_SECRET,
    fb_exchange_token: short.access_token,
  });
  return { token: long.access_token, expiresIn: long.expires_in || null };
}

/** Discover the user's ad accounts. Returns [{ provider, externalId, name, currency, accessToken }]. */
export async function metaDiscoverAccounts(userToken) {
  const res = await metaGet('me/adaccounts', {
    access_token: userToken, fields: 'id,account_id,name,currency',
  });
  return (res.data || []).map((a) => ({
    provider: 'meta',
    externalId: a.id,                  // act_<id>
    name: a.name,
    currency: a.currency,
    accessToken: userToken,            // long-lived user token works for ads API
  }));
}

/* ── Meta: campaigns + insights ─────────────────────────────────────────────── */
export async function metaFetchCampaigns(account, { window = 'last_7d' } = {}) {
  const datePreset = window === 'last_30d' ? 'last_30d' : window === 'today' ? 'today' : 'last_7d';
  const res = await metaGet(`${account.external_id}/campaigns`, {
    access_token: account.access_token,
    fields: `id,name,objective,status,daily_budget,lifetime_budget,insights.date_preset(${datePreset}){spend,impressions,clicks,ctr,cpc,actions,action_values}`,
    limit: 50,
  });
  return (res.data || []).map((c) => normalizeMetaCampaign(c, account.currency));
}

function normalizeMetaCampaign(c, currency) {
  const ins = c.insights?.data?.[0] || {};
  const spend = num(ins.spend);
  const clicks = num(ins.clicks);
  const impressions = num(ins.impressions);
  // Conversions + revenue from the actions/action_values arrays (purchase).
  const conversions = sumAction(ins.actions, ['purchase', 'omni_purchase', 'offsite_conversion.fb_pixel_purchase']);
  const revenue = sumAction(ins.action_values, ['purchase', 'omni_purchase', 'offsite_conversion.fb_pixel_purchase']);
  const roas = spend > 0 ? revenue / spend : null;
  return {
    provider: 'meta',
    external_id: c.id,
    name: c.name,
    objective: c.objective || null,
    status: c.status || null,
    daily_budget: c.daily_budget ? num(c.daily_budget) / 100 : null,   // Meta returns minor units
    lifetime_budget: c.lifetime_budget ? num(c.lifetime_budget) / 100 : null,
    currency: currency || null,
    spend, impressions, clicks,
    conversions, revenue,
    cpc: clicks > 0 ? spend / clicks : num(ins.cpc),
    ctr: num(ins.ctr),
    roas,
    metrics_window: datePresetLabel(c),
  };
}

export async function metaPauseCampaign(account, externalId) {
  await metaPost(externalId, { status: 'PAUSED', access_token: account.access_token });
  return { ok: true };
}

export async function metaSetDailyBudget(account, externalId, dailyBudgetMajor) {
  const minor = Math.round(Number(dailyBudgetMajor) * 100);
  await metaPost(externalId, { daily_budget: minor, access_token: account.access_token });
  return { ok: true };
}

/* ── TikTok Business API ─────────────────────────────────────────────────────
   Mirrors the Meta adapter. Env-gated; without TIKTOK_APP_ID/SECRET the OAuth
   builder returns null and the discovery/fetch helpers throw not_configured. */
function tiktokRedirect() {
  const base = (process.env.SITE_URL || 'https://santipulse.com').replace(/\/$/, '');
  return `${base}/api/integrations/ads/tiktok-callback/`;
}

export function buildTikTokAuthUrl(state) {
  if (!tiktokConfigured()) return null;
  const p = new URLSearchParams({
    app_id: process.env.TIKTOK_APP_ID,
    redirect_uri: tiktokRedirect(),
    state,
  });
  return `https://business-api.tiktok.com/portal/auth?${p.toString()}`;
}

async function tiktokFetch(path, { method = 'GET', token, body, query } = {}) {
  const url = `${TIKTOK_API}/${path}${query ? `?${new URLSearchParams(query)}` : ''}`;
  const resp = await fetch(url, {
    method,
    headers: { 'Access-Token': token || '', 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await resp.json().catch(() => ({}));
  if (json.code && json.code !== 0) throw new Error(json.message || `tiktok ${json.code}`);
  if (!resp.ok) throw new Error(json.message || `tiktok ${resp.status}`);
  return json.data || json;
}

export async function tiktokExchangeCode(code) {
  if (!tiktokConfigured()) return null;
  const data = await tiktokFetch('oauth2/access_token/', {
    method: 'POST',
    body: { app_id: process.env.TIKTOK_APP_ID, secret: process.env.TIKTOK_APP_SECRET, auth_code: code },
  });
  return { token: data.access_token, advertiserIds: data.advertiser_ids || [] };
}

export async function tiktokDiscoverAccounts(token, advertiserIds = []) {
  if (!advertiserIds.length) return [];
  const data = await tiktokFetch('advertiser/info/', {
    token, query: { advertiser_ids: JSON.stringify(advertiserIds), fields: JSON.stringify(['advertiser_id', 'advertiser_name', 'currency']) },
  });
  return (data.list || []).map((a) => ({
    provider: 'tiktok',
    externalId: a.advertiser_id,
    name: a.advertiser_name,
    currency: a.currency,
    accessToken: token,
  }));
}

export async function tiktokFetchCampaigns(account) {
  const data = await tiktokFetch('campaign/get/', {
    token: account.access_token,
    query: { advertiser_id: account.external_id, page_size: 50 },
  });
  const campaigns = data.list || [];
  // Pull report metrics for the same campaigns (last 7 days).
  let metricsById = {};
  try {
    const report = await tiktokFetch('report/integrated/get/', {
      token: account.access_token,
      query: {
        advertiser_id: account.external_id,
        report_type: 'BASIC',
        data_level: 'AUCTION_CAMPAIGN',
        dimensions: JSON.stringify(['campaign_id']),
        metrics: JSON.stringify(['spend', 'impressions', 'clicks', 'ctr', 'cpc', 'conversion', 'total_complete_payment_rate']),
        start_date: daysAgo(7), end_date: daysAgo(0),
        page_size: 100,
      },
    });
    for (const r of report.list || []) {
      metricsById[r.dimensions?.campaign_id] = r.metrics || {};
    }
  } catch (err) { console.error('[ads:tiktok] report:', err.message); }

  return campaigns.map((c) => {
    const m = metricsById[c.campaign_id] || {};
    const spend = num(m.spend);
    const clicks = num(m.clicks);
    const conversions = num(m.conversion);
    return {
      provider: 'tiktok',
      external_id: c.campaign_id,
      name: c.campaign_name,
      objective: c.objective_type || null,
      status: c.operation_status || c.secondary_status || null,
      daily_budget: c.budget_mode === 'BUDGET_MODE_DAY' ? num(c.budget) : null,
      lifetime_budget: c.budget_mode === 'BUDGET_MODE_TOTAL' ? num(c.budget) : null,
      currency: account.currency || null,
      spend, impressions: num(m.impressions), clicks,
      conversions, revenue: null,
      cpc: clicks > 0 ? spend / clicks : num(m.cpc),
      ctr: num(m.ctr),
      roas: null,
      metrics_window: 'last_7d',
    };
  });
}

export async function tiktokPauseCampaign(account, externalId) {
  await tiktokFetch('campaign/status/update/', {
    method: 'POST', token: account.access_token,
    body: { advertiser_id: account.external_id, campaign_ids: [externalId], operation_status: 'DISABLE' },
  });
  return { ok: true };
}

export async function tiktokSetDailyBudget(account, externalId, dailyBudgetMajor) {
  await tiktokFetch('campaign/update/', {
    method: 'POST', token: account.access_token,
    body: { advertiser_id: account.external_id, campaign_id: externalId, budget: Number(dailyBudgetMajor) },
  });
  return { ok: true };
}

/* ── Unified dispatch (used by sync + rule engine) ─────────────────────────── */
export async function fetchCampaigns(account, opts) {
  if (account.provider === 'tiktok') return tiktokFetchCampaigns(account);
  return metaFetchCampaigns(account, opts);
}
export async function pauseCampaign(account, externalId) {
  if (account.provider === 'tiktok') return tiktokPauseCampaign(account, externalId);
  return metaPauseCampaign(account, externalId);
}
export async function setDailyBudget(account, externalId, budget) {
  if (account.provider === 'tiktok') return tiktokSetDailyBudget(account, externalId, budget);
  return metaSetDailyBudget(account, externalId, budget);
}

/* ── helpers ────────────────────────────────────────────────────────────────── */
function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function sumAction(arr, types) {
  if (!Array.isArray(arr)) return 0;
  return arr.filter((a) => types.includes(a.action_type)).reduce((s, a) => s + num(a.value), 0);
}
function datePresetLabel() { return 'last_7d'; }
function daysAgo(n) {
  const d = new Date(Date.now() - n * 864e5);
  return d.toISOString().slice(0, 10);
}
