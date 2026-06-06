/* ============================================================
   Gestor de Ads — data layer, campaign sync, rule engine (ESM)
   ------------------------------------------------------------
   - Account/campaign/rule/alert storage (service_role).
   - syncAccount(): pull campaigns + metrics from the provider and
     upsert ad_campaigns.
   - evaluateAdRules(): the optimization engine the cron worker runs.
     For each active rule, compare a campaign metric to a threshold and
     fire the action (pause / lower budget) or raise an alert
     (scale suggestion / high CPC) — with a per-rule cooldown.
   ============================================================ */
import { admin } from './auth.js';
import { fetchCampaigns, pauseCampaign, setDailyBudget } from './adsProviders.js';

/* ── Accounts ───────────────────────────────────────────────────────────── */
export async function listAccounts(userId) {
  const sb = admin();
  if (!sb) return [];
  const { data } = await sb.from('ad_accounts')
    .select('id, provider, external_id, name, currency, status, connected_at')
    .eq('user_id', userId).eq('status', 'active')
    .order('connected_at', { ascending: false });
  return data || [];
}

export async function saveAccounts(userId, accounts) {
  const sb = admin();
  if (!sb || !accounts.length) return 0;
  const rows = accounts.map((a) => ({
    user_id: userId, provider: a.provider, external_id: a.externalId,
    name: a.name, currency: a.currency, access_token: a.accessToken,
    token_expires_at: a.expiresAt || null, status: 'active',
    connected_at: new Date().toISOString(),
  }));
  const { error } = await sb.from('ad_accounts')
    .upsert(rows, { onConflict: 'user_id,provider,external_id' });
  if (error) { console.error('[ads] saveAccounts:', error.message); return 0; }
  return rows.length;
}

export async function disconnectAccount(userId, accountId) {
  const sb = admin();
  if (!sb) return false;
  const { error } = await sb.from('ad_accounts')
    .update({ status: 'revoked' }).eq('user_id', userId).eq('id', accountId);
  return !error;
}

/* ── Campaign sync ──────────────────────────────────────────────────────── */
/** Pull campaigns + metrics from the provider and upsert them. Returns count. */
export async function syncAccount(userId, accountId) {
  const sb = admin();
  if (!sb) return { ok: false, error: 'db_not_configured' };
  const { data: account } = await sb.from('ad_accounts')
    .select('*').eq('id', accountId).eq('user_id', userId).eq('status', 'active').maybeSingle();
  if (!account) return { ok: false, error: 'account_not_found' };

  let campaigns;
  try { campaigns = await fetchCampaigns(account); }
  catch (err) { console.error('[ads] syncAccount fetch:', err.message); return { ok: false, error: err.message }; }

  const now = new Date().toISOString();
  const rows = campaigns.map((c) => ({
    user_id: userId, account_id: accountId, provider: c.provider,
    external_id: c.external_id, name: c.name, objective: c.objective, status: c.status,
    daily_budget: c.daily_budget, lifetime_budget: c.lifetime_budget, currency: c.currency,
    spend: c.spend, impressions: c.impressions, clicks: c.clicks,
    conversions: c.conversions, revenue: c.revenue, cpc: c.cpc, ctr: c.ctr, roas: c.roas,
    metrics_window: c.metrics_window || 'last_7d', synced_at: now,
  }));
  if (rows.length) {
    const { error } = await sb.from('ad_campaigns')
      .upsert(rows, { onConflict: 'account_id,external_id' });
    if (error) { console.error('[ads] syncAccount upsert:', error.message); return { ok: false, error: error.message }; }
  }
  return { ok: true, synced: rows.length };
}

export async function listCampaigns(userId, limit = 100) {
  const sb = admin();
  if (!sb) return [];
  const { data } = await sb.from('ad_campaigns')
    .select('*').eq('user_id', userId).order('spend', { ascending: false }).limit(limit);
  return data || [];
}

/* ── Rules ──────────────────────────────────────────────────────────────── */
const RULE_FIELDS = ['account_id', 'name', 'is_active', 'metric', 'operator', 'threshold',
  'action', 'action_value', 'min_spend', 'cooldown_hours'];

export async function listRules(userId) {
  const sb = admin();
  if (!sb) return [];
  const { data } = await sb.from('ad_rules').select('*').eq('user_id', userId)
    .order('created_at', { ascending: false });
  return data || [];
}

export async function createRule(userId, body) {
  const sb = admin();
  if (!sb) return null;
  const row = { user_id: userId };
  for (const k of RULE_FIELDS) if (body[k] !== undefined) row[k] = body[k];
  if (!row.name || !row.metric || !row.operator || row.threshold == null || !row.action) return null;
  const { data, error } = await sb.from('ad_rules').insert(row).select('*').single();
  if (error) { console.error('[ads] createRule:', error.message); return null; }
  return data;
}

export async function updateRule(userId, id, body) {
  const sb = admin();
  if (!sb) return null;
  const patch = {};
  for (const k of RULE_FIELDS) if (body[k] !== undefined) patch[k] = body[k];
  const { data } = await sb.from('ad_rules').update(patch).eq('id', id).eq('user_id', userId).select('*').maybeSingle();
  return data || null;
}

export async function deleteRule(userId, id) {
  const sb = admin();
  if (!sb) return false;
  const { error } = await sb.from('ad_rules').delete().eq('id', id).eq('user_id', userId);
  return !error;
}

/* ── Alerts ─────────────────────────────────────────────────────────────── */
export async function listAlerts(userId, limit = 50) {
  const sb = admin();
  if (!sb) return [];
  const { data } = await sb.from('ad_alerts')
    .select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(limit);
  return data || [];
}

/* ── Rule engine (cron worker) ──────────────────────────────────────────────
   For every active rule, evaluate against the matching campaigns' latest synced
   metrics. Fire at most once per (rule, campaign) within cooldown_hours.
   Actions:
     'pause'        → pause the campaign at the provider + critical alert
     'lower_budget' → reduce daily budget by action_value % + warning alert
     'scale_budget' → SUGGEST a scale (alert only — never auto-spends more)
     'alert'        → alert only
   Returns { fired, errors }. Designed to be import()'d lazily by the worker. */
export async function evaluateAdRules(sb, ownerProfile) {
  const summary = { fired: 0, errors: 0 };
  const { data: rules } = await sb.from('ad_rules').select('*').eq('is_active', true);
  if (!rules || !rules.length) return summary;

  // Cache campaigns + accounts per (user/account) to avoid refetching.
  const campaignCache = new Map();
  async function campaignsFor(userId, accountId) {
    const key = `${userId}:${accountId || 'all'}`;
    if (campaignCache.has(key)) return campaignCache.get(key);
    let q = sb.from('ad_campaigns').select('*').eq('user_id', userId);
    if (accountId) q = q.eq('account_id', accountId);
    const { data } = await q;
    campaignCache.set(key, data || []);
    return data || [];
  }
  const accountCache = new Map();
  async function accountFor(id) {
    if (accountCache.has(id)) return accountCache.get(id);
    const { data } = await sb.from('ad_accounts').select('*').eq('id', id).maybeSingle();
    accountCache.set(id, data || null);
    return data || null;
  }

  const nowMs = Date.now();
  for (const rule of rules) {
    try {
      const campaigns = await campaignsFor(rule.user_id, rule.account_id);
      for (const c of campaigns) {
        const value = metricValue(c, rule.metric);
        if (value == null) continue;
        if (num(c.spend) < num(rule.min_spend)) continue;           // ignore low-spend noise
        if (!compare(value, rule.operator, num(rule.threshold))) continue;

        // Cooldown: skip if this rule fired for this campaign recently.
        if (await firedRecently(sb, rule.id, c.id, rule.cooldown_hours, nowMs)) continue;

        const fired = await fireAction(sb, rule, c, value, accountFor, ownerProfile);
        if (fired) summary.fired++;
      }
    } catch (err) { console.error('[ads] evaluateAdRules:', err.message); summary.errors++; }
  }
  return summary;
}

function metricValue(c, metric) {
  const v = c[metric];
  return v == null ? null : Number(v);
}

function compare(value, op, threshold) {
  switch (op) {
    case '>': return value > threshold;
    case '<': return value < threshold;
    case '>=': return value >= threshold;
    case '<=': return value <= threshold;
    default: return false;
  }
}

async function firedRecently(sb, ruleId, campaignId, cooldownHours, nowMs) {
  const since = new Date(nowMs - (cooldownHours || 24) * 3.6e6).toISOString();
  const { data } = await sb.from('ad_alerts')
    .select('id').eq('rule_id', ruleId).eq('campaign_id', campaignId)
    .gte('created_at', since).limit(1);
  return !!(data && data.length);
}

async function fireAction(sb, rule, campaign, value, accountFor, ownerProfile) {
  let actionTaken = 'alert_only';
  let severity = 'warning';
  let message = `${rule.name}: ${rule.metric.toUpperCase()} ${value.toFixed(2)} ${rule.operator} ${rule.threshold} en "${campaign.name}".`;

  try {
    if (rule.action === 'pause') {
      const account = await accountFor(campaign.account_id);
      if (account) {
        await pauseCampaign(account, campaign.external_id);
        await sb.from('ad_campaigns').update({ status: 'PAUSED' }).eq('id', campaign.id);
        actionTaken = 'paused'; severity = 'critical';
        message += ' Campaña pausada automáticamente.';
      }
    } else if (rule.action === 'lower_budget' && rule.action_value && campaign.daily_budget) {
      const account = await accountFor(campaign.account_id);
      const newBudget = Math.max(1, num(campaign.daily_budget) * (1 - num(rule.action_value) / 100));
      if (account) {
        await setDailyBudget(account, campaign.external_id, newBudget);
        await sb.from('ad_campaigns').update({ daily_budget: newBudget }).eq('id', campaign.id);
        actionTaken = 'lowered_budget'; severity = 'warning';
        message += ` Presupuesto diario reducido a ${newBudget.toFixed(2)}.`;
      }
    } else if (rule.action === 'scale_budget') {
      // SUGGEST only — never auto-increase spend.
      actionTaken = 'suggested_scale'; severity = 'info';
      const pct = rule.action_value ? `${rule.action_value}%` : '20%';
      message += ` Rendimiento alto: considera subir el presupuesto ~${pct}.`;
    }
  } catch (err) {
    console.error('[ads] fireAction:', err.message);
    message += ` (acción falló: ${err.message})`;
  }

  // Notify (best-effort email) for warning/critical.
  let notified = false;
  if (severity !== 'info' && process.env.RESEND_API_KEY) {
    try {
      const profile = ownerProfile ? await ownerProfile(rule.user_id) : null;
      await sendAdAlertEmail(profile, message, severity);
      notified = true;
    } catch (e) { console.error('[ads] alert email:', e.message); }
  }

  const { data } = await sb.from('ad_alerts').insert({
    user_id: rule.user_id, rule_id: rule.id, campaign_id: campaign.id,
    severity, metric: rule.metric, metric_value: value, threshold: rule.threshold,
    action_taken: actionTaken, message, notified,
  }).select('id').maybeSingle();
  return !!data;
}

async function sendAdAlertEmail(profile, message, severity) {
  const key = process.env.RESEND_API_KEY;
  const to = profile?.email || process.env.LEAD_NOTIFY_TO;
  const from = process.env.LEAD_NOTIFY_FROM || 'onboarding@resend.dev';
  if (!key || !to) return;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const icon = severity === 'critical' ? '🔴' : '🟠';
  const html = `<h2>${icon} Alerta de Ads — Gestor de Ads</h2><p>${esc(message)}</p>`;
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: `Santipulse <${from}>`, to: [to], subject: `${icon} Alerta de campaña`, html }),
  });
  if (!resp.ok) { const t = await resp.text().catch(() => ''); throw new Error(`Resend ${resp.status}: ${t}`); }
}

function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
