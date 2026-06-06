/* ============================================================
   GET/POST /api/insights/dashboard
   ------------------------------------------------------------
   Auth-gated dashboard API for Insights de Redes.
     GET  → { config, trends, queue, accounts, status }
     POST → action: 'save_config' | 'queue_post' | 'update_post'
   Trends are read sorted by viral_score (best first). Publishing of
   queued posts is done by the cron worker via the Meta Graph.
   ============================================================ */
import { requireUser } from '../lib/auth.js';
import { getProfile, hasActiveSubscription } from '../lib/profile.js';
import { parseBody } from '../lib/http.js';
import * as social from '../lib/socialMedia.js';
import {
  getConfig, saveConfig, listTrends, listQueue, queuePost, updateQueuePost,
} from '../lib/insights.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const user = await requireUser(req, res);
  if (!user) return;

  if (req.method === 'GET') {
    const [config, trends, queue, accounts] = await Promise.all([
      getConfig(user.id), listTrends(user.id), listQueue(user.id), social.listAccounts(user.id),
    ]);
    return res.status(200).json({
      config: config || null,
      trends, queue,
      accounts: accounts.map((a) => ({ id: a.id, provider: a.provider, username: a.username })),
      status: {
        collection: { configured: !!process.env.CRON_SECRET, active: config?.is_active !== false },
        publishing: { configured: social.isConfigured(), connected: accounts.length > 0 },
      },
    });
  }

  if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return res.status(405).json({ error: 'method' }); }
  const profile = await getProfile(user.id);
  if (!hasActiveSubscription(profile)) return res.status(402).json({ error: 'needs_subscription', upgradeUrl: '/precios/' });

  const body = parseBody(req);
  const action = body.action || 'save_config';

  if (action === 'save_config') {
    const saved = await saveConfig(user.id, body);
    if (!saved) return res.status(500).json({ error: 'save_failed' });
    return res.status(200).json({ ok: true, config: saved });
  }

  if (action === 'queue_post') {
    const post = await queuePost(user.id, {
      accountId: body.account_id, trendId: body.trend_id, platform: body.platform,
      caption: body.caption, mediaUrl: body.media_url, scheduledFor: body.scheduled_for,
      status: body.status || 'scheduled',
    });
    if (!post) return res.status(500).json({ error: 'queue_failed' });
    return res.status(200).json({ ok: true, post });
  }

  if (action === 'update_post') {
    if (!body.id) return res.status(400).json({ error: 'missing_id' });
    const post = await updateQueuePost(user.id, body.id, body);
    if (!post) return res.status(404).json({ error: 'not_found' });
    return res.status(200).json({ ok: true, post });
  }

  return res.status(400).json({ error: 'unknown_action' });
}
