/* ============================================================
   GET/POST /api/cron/process  — the background worker (Vercel Cron)
   ------------------------------------------------------------
   Runs on a schedule (see vercel.json "crons"). One invocation:
     • insights_post_queue — publish due trend posts via the owner's
       connected Meta (Facebook/Instagram) account (Insights de Redes)
     • ad_rules            — evaluate the optimization rule engine against
       each campaign's latest synced metrics (Gestor de Ads)

   Auth: Vercel Cron sends  Authorization: Bearer <CRON_SECRET>.  We reject
   anything else, so the endpoint can't be triggered by the public. If
   CRON_SECRET is unset, the worker refuses to run (fail-closed).

   Idempotent-ish: each post is flipped to 'publishing' before the network
   call and only marked 'published' on success, so a crash mid-batch leaves
   it retryable. Batches are small to stay under the function timeout.
   ============================================================ */
import { admin } from '../_lib/auth.js';
import { getProfile } from '../_lib/profile.js';
import { publish, isConfigured as socialConfigured } from '../_lib/socialMedia.js';
import { limitsFor } from '../_lib/products.js';

const BATCH = 15;

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

  const summary = { posts: 0, ads: 0, skipped: 0, errors: 0 };
  const nowIso = new Date().toISOString();

  // Per-run cache of owner profiles + quota.
  const profileCache = new Map();
  async function ownerProfile(userId) {
    if (profileCache.has(userId)) return profileCache.get(userId);
    const p = await getProfile(userId);
    profileCache.set(userId, p);
    return p;
  }
  const quotaCache = new Map(); // userId -> { posts, limits }
  async function quotaFor(userId, profile) {
    if (quotaCache.has(userId)) return quotaCache.get(userId);
    const plan = (profile && profile.plan) || 'none';
    const limits = limitsFor(plan);
    const posts = await countPostsThisMonth(sb, userId);
    const q = { posts, limits };
    quotaCache.set(userId, q);
    return q;
  }

  // ── 1. Insights post queue (Insights de Redes) ────────────────────────────
  if (socialConfigured()) {
    const { data: queued } = await sb.from('insights_post_queue')
      .select('*').eq('status', 'scheduled').lte('scheduled_for', nowIso)
      .order('scheduled_for', { ascending: true }).limit(BATCH);
    for (const post of queued || []) {
      try {
        if (!post.account_id) { await failInsightsPost(sb, post.id, 'no_account'); summary.errors++; continue; }
        const profile = await ownerProfile(post.user_id);
        const q = await quotaFor(post.user_id, profile);
        if (q.posts >= q.limits.postsPerMonth) { summary.skipped++; continue; }

        await sb.from('insights_post_queue').update({ status: 'publishing' }).eq('id', post.id);
        const { data: account } = await sb.from('social_accounts')
          .select('*').eq('id', post.account_id).eq('status', 'active').maybeSingle();
        if (!account) { await failInsightsPost(sb, post.id, 'account_not_connected'); summary.errors++; continue; }

        const r = await publish(account, { caption: post.caption, mediaUrl: post.media_url });
        if (!r.ok) { await failInsightsPost(sb, post.id, r.error); summary.errors++; continue; }

        await sb.from('insights_post_queue')
          .update({ status: 'published', external_post_id: r.id || null, last_error: null }).eq('id', post.id);
        await sb.from('post_logs').insert({ post_id: null, user_id: post.user_id, status: 'published', detail: `insights:${r.id || ''}` });
        q.posts++;
        summary.posts++;
      } catch (err) { console.error('[cron/insights]', err.message); summary.errors++; }
    }
  }

  // ── 2. Ad rule engine (Gestor de Ads) ─────────────────────────────────────
  try {
    const { evaluateAdRules } = await import('../_lib/ads.js');
    const adSummary = await evaluateAdRules(sb, ownerProfile);
    summary.ads = adSummary.fired;
    summary.errors += adSummary.errors;
  } catch (err) { console.error('[cron/ads]', err.message); }

  return res.status(200).json({ ok: true, processed: summary, at: nowIso });
}

async function failInsightsPost(sb, id, error) {
  await sb.from('insights_post_queue').update({ status: 'failed', last_error: String(error || 'failed').slice(0, 500) }).eq('id', id);
}

/** Social posts published by this user in the current calendar month (quota). */
async function countPostsThisMonth(sb, userId) {
  if (!userId) return 0;
  const n = new Date();
  const monthStart = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), 1)).toISOString();
  const { count } = await sb.from('post_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId).eq('status', 'published').gte('created_at', monthStart);
  return count || 0;
}
