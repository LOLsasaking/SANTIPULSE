/* ============================================================
   GET/POST /api/ads/dashboard
   ------------------------------------------------------------
   Auth-gated dashboard API for Gestor de Ads.
     GET  → { accounts, campaigns, rules, alerts, status }
     POST → action: 'sync' | 'create_rule' | 'update_rule' | 'delete_rule'
            | 'disconnect'
   Rule evaluation itself runs in the cron worker (evaluateAdRules);
   'sync' refreshes campaign metrics on demand.
   ============================================================ */
import { requireUser } from '../lib/auth.js';
import { getProfile, hasActiveSubscription } from '../lib/profile.js';
import { parseBody } from '../lib/http.js';
import { metaConfigured, tiktokConfigured } from '../lib/adsProviders.js';
import { revealbotConfigured } from '../lib/revealbot.js';
import {
  listAccounts, listCampaigns, listRules, listAlerts,
  syncAccount, createRule, updateRule, deleteRule, disconnectAccount,
} from '../lib/ads.js';
import { listQueue } from '../lib/insights.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const user = await requireUser(req, res);
  if (!user) return;

  if (req.method === 'GET') {
    const [accounts, campaigns, rules, alerts, posts] = await Promise.all([
      listAccounts(user.id), listCampaigns(user.id), listRules(user.id), listAlerts(user.id), listQueue(user.id, 50),
    ]);
    return res.status(200).json({
      accounts, campaigns, rules, alerts, posts,
      status: {
        meta: { configured: metaConfigured() },
        tiktok: { configured: tiktokConfigured() },
        revealbot: { configured: revealbotConfigured() },
        connected: accounts.length > 0,
      },
    });
  }

  if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return res.status(405).json({ error: 'method' }); }
  const profile = await getProfile(user.id);
  if (!hasActiveSubscription(profile)) return res.status(402).json({ error: 'needs_subscription', upgradeUrl: '/precios/' });

  const body = parseBody(req);
  const action = body.action || 'sync';

  if (action === 'sync') {
    const accounts = body.account_id
      ? [{ id: body.account_id }]
      : await listAccounts(user.id);
    let total = 0; const errors = [];
    for (const a of accounts) {
      const r = await syncAccount(user.id, a.id);
      if (r.ok) total += r.synced; else errors.push(r.error);
    }
    return res.status(200).json({ ok: true, synced: total, errors });
  }

  if (action === 'create_rule') {
    const rule = await createRule(user.id, body);
    if (!rule) return res.status(400).json({ error: 'invalid_rule' });
    return res.status(200).json({ ok: true, rule });
  }

  if (action === 'update_rule') {
    if (!body.id) return res.status(400).json({ error: 'missing_id' });
    const rule = await updateRule(user.id, body.id, body);
    if (!rule) return res.status(404).json({ error: 'not_found' });
    return res.status(200).json({ ok: true, rule });
  }

  if (action === 'delete_rule') {
    if (!body.id) return res.status(400).json({ error: 'missing_id' });
    const ok = await deleteRule(user.id, body.id);
    return res.status(ok ? 200 : 404).json({ ok });
  }

  if (action === 'disconnect') {
    if (!body.account_id) return res.status(400).json({ error: 'missing_account_id' });
    const ok = await disconnectAccount(user.id, body.account_id);
    return res.status(ok ? 200 : 404).json({ ok });
  }

  return res.status(400).json({ error: 'unknown_action' });
}
