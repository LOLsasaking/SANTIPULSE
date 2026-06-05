/* ============================================================
   /api/automations/cart-recovery  — manage the Cart Recovery automation
   ------------------------------------------------------------
   Auth + active subscription required.
     GET                       → { campaign, jobs[] }   (status overview)
     POST { action:'save', name, steps, from_name, discount_code }
                               → upsert the single campaign
     POST { action:'import' }  → pull abandoned checkouts from Shopify → jobs
   Sending itself is done by the cron worker, not here.
   ============================================================ */
import { requireUser } from '../_lib/auth.js';
import { getProfile, hasActiveSubscription } from '../_lib/profile.js';
import { parseBody } from '../_lib/http.js';
import { admin } from '../_lib/auth.js';
import { getConnection, fetchAbandonedCheckouts, isConfigured as shopifyConfigured } from '../_lib/shopify.js';
import { importCartJobs } from '../_lib/automations.js';
import { sanitizeSteps } from '../_lib/sequence.js';

async function getCampaign(userId) {
  const sb = admin();
  if (!sb) return null;
  const { data } = await sb.from('cart_recovery_campaigns')
    .select('*').eq('user_id', userId).order('created_at', { ascending: true }).limit(1).maybeSingle();
  return data || null;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const user = await requireUser(req, res);
  if (!user) return;

  const profile = await getProfile(user.id);
  if (!hasActiveSubscription(profile)) {
    return res.status(402).json({ error: 'needs_subscription', upgradeUrl: '/precios/' });
  }
  const sb = admin();
  if (!sb) return res.status(503).json({ error: 'db_not_configured' });

  // ── GET: overview ──
  if (req.method === 'GET') {
    const campaign = await getCampaign(user.id);
    const { data: jobs } = await sb.from('cart_recovery_jobs')
      .select('id, customer_email, cart_value, currency, step_index, status, next_send_at, created_at')
      .eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
    return res.status(200).json({ campaign, jobs: jobs || [] });
  }

  if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return res.status(405).json({ error: 'method' }); }

  const body = parseBody(req);
  const action = body.action;

  // ── POST save: upsert the single campaign ──
  if (action === 'save') {
    const steps = sanitizeSteps(body.steps);
    if (!steps.length) return res.status(400).json({ error: 'no_steps' });
    const existing = await getCampaign(user.id);
    const patch = {
      user_id: user.id,
      name: String(body.name || 'Cart Recovery').slice(0, 255),
      steps,
      from_name: body.from_name ? String(body.from_name).slice(0, 255) : null,
      discount_code: body.discount_code ? String(body.discount_code).slice(0, 64) : null,
      is_active: body.is_active !== false,
    };
    let row;
    if (existing) {
      ({ data: row } = await sb.from('cart_recovery_campaigns').update(patch).eq('id', existing.id).eq('user_id', user.id).select('*').single());
    } else {
      ({ data: row } = await sb.from('cart_recovery_campaigns').insert(patch).select('*').single());
    }
    return res.status(200).json({ ok: true, campaign: row });
  }

  // ── POST import: pull abandoned checkouts from Shopify ──
  if (action === 'import') {
    if (!shopifyConfigured()) return res.status(503).json({ error: 'integration_not_configured' });
    const campaign = await getCampaign(user.id);
    if (!campaign) return res.status(400).json({ error: 'no_campaign' });
    const conn = await getConnection(user.id);
    if (!conn) return res.status(400).json({ error: 'shopify_not_connected' });
    const carts = await fetchAbandonedCheckouts(conn, { limit: 50 });
    const imported = await importCartJobs(user.id, campaign, carts);
    return res.status(200).json({ ok: true, found: carts.length, imported });
  }

  return res.status(400).json({ error: 'invalid_action' });
}
