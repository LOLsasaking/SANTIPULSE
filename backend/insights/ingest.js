/* ============================================================
   POST /api/insights/ingest
   ------------------------------------------------------------
   Ingestion endpoint for the trend-collection heavy job (GitHub
   Actions / a worker calling official TikTok/Instagram APIs). The
   job does the rate-limited, long-running scraping off-platform and
   POSTs normalized trends here for scoring + storage.

   Auth: Bearer CRON_SECRET (same secret as the cron worker). Fail-closed.

   Body:
     { user_id: "<uuid>", trends: [ { platform, niche, style,
       description, example_url, hashtags, metrics, source } ] }
   `metrics` is a raw bag (views/likes/comments/shares/growth/age_hours);
   viral_score is computed server-side unless provided.

   GET (Bearer CRON_SECRET) → list active insights_config rows, so the
   heavy job knows which users/niches to collect for.
   ============================================================ */
import { admin } from '../_lib/auth.js';
import { parseBody } from '../_lib/http.js';
import { storeTrends } from '../_lib/insights.js';

function authorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // fail closed
  const h = req.headers['authorization'] || '';
  return h === `Bearer ${secret}`;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!authorized(req)) return res.status(401).json({ error: 'unauthorized' });

  const sb = admin();
  if (!sb) return res.status(503).json({ error: 'db_not_configured' });

  // GET — hand the heavy job the list of users/niches to collect for.
  if (req.method === 'GET') {
    const { data } = await sb.from('insights_config')
      .select('user_id, niche, region, competitors, hashtags, platforms')
      .eq('is_active', true);
    return res.status(200).json({ targets: data || [] });
  }

  if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return res.status(405).json({ error: 'method' }); }

  const body = parseBody(req);
  const userId = body.user_id || body.userId;
  const trends = Array.isArray(body.trends) ? body.trends : [];
  if (!userId) return res.status(400).json({ error: 'missing_user_id' });
  if (!trends.length) return res.status(400).json({ error: 'no_trends' });

  const stored = await storeTrends(userId, trends);
  return res.status(200).json({ ok: true, stored });
}
