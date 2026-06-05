#!/usr/bin/env node
/* ============================================================
   Trend collector — heavy job for Insights de Redes.
   ------------------------------------------------------------
   Runs in GitHub Actions (off-platform, long-running, rate-limited).
   Flow:
     1. GET  {SITE}/api/insights/ingest  (Bearer CRON_SECRET) → targets
        = active insights_config rows (user_id, niche, region, hashtags…)
     2. For each target, collect trending formats via the OFFICIAL platform
        APIs (Instagram Graph hashtag search, TikTok Display API). Each
        provider is env-gated: without creds it is skipped and logged, so
        the job never fabricates data.
     3. POST {SITE}/api/insights/ingest  (Bearer CRON_SECRET) with the
        normalized trends. The server scores + stores them.

   Env:
     SITE_URL                 (required) e.g. https://santipulse.com
     CRON_SECRET              (required) shared secret for the ingest endpoint
     IG_GRAPH_TOKEN           (optional) Instagram Graph API access token
     IG_BUSINESS_ACCOUNT_ID   (optional) IG business account id (hashtag search)
     TIKTOK_ACCESS_TOKEN      (optional) TikTok Display/Business API token
   ============================================================ */

const SITE = (process.env.SITE_URL || '').replace(/\/$/, '');
const SECRET = process.env.CRON_SECRET || '';

if (!SITE || !SECRET) {
  console.error('Missing SITE_URL or CRON_SECRET — nothing to do.');
  process.exit(0); // soft-exit so the workflow stays green when unconfigured
}

const INGEST = `${SITE}/api/insights/ingest`;
const AUTH = { Authorization: `Bearer ${SECRET}`, 'Content-Type': 'application/json' };

async function main() {
  const targets = await getTargets();
  if (!targets.length) { console.log('No active insights configs. Done.'); return; }
  console.log(`Collecting trends for ${targets.length} target(s).`);

  let total = 0;
  for (const t of targets) {
    const trends = await collectForTarget(t);
    if (!trends.length) { console.log(`  ${t.user_id}: no trends collected (providers unconfigured?).`); continue; }
    const stored = await postTrends(t.user_id, trends);
    total += stored;
    console.log(`  ${t.user_id}: stored ${stored} trend(s).`);
  }
  console.log(`Done. ${total} trend(s) stored.`);
}

async function getTargets() {
  const resp = await fetch(INGEST, { headers: AUTH });
  if (!resp.ok) { console.error(`getTargets ${resp.status}`); return []; }
  const json = await resp.json().catch(() => ({}));
  return json.targets || [];
}

async function postTrends(userId, trends) {
  const resp = await fetch(INGEST, { method: 'POST', headers: AUTH, body: JSON.stringify({ user_id: userId, trends }) });
  if (!resp.ok) { console.error(`postTrends ${resp.status}`); return 0; }
  const json = await resp.json().catch(() => ({}));
  return json.stored || 0;
}

/* Aggregate every configured provider for one target. */
async function collectForTarget(target) {
  const platforms = target.platforms || ['instagram', 'tiktok'];
  const out = [];
  if (platforms.includes('instagram')) out.push(...await collectInstagram(target));
  if (platforms.includes('tiktok')) out.push(...await collectTikTok(target));
  return out;
}

/* ── Instagram Graph API (official) ──────────────────────────────────────────
   Uses hashtag search → recent/top media for the target's seed hashtags, then
   normalizes engagement metrics. Requires IG_GRAPH_TOKEN + IG_BUSINESS_ACCOUNT_ID
   with the instagram_basic + instagram_manage_insights perms (App Review). */
async function collectInstagram(target) {
  const token = process.env.IG_GRAPH_TOKEN;
  const igId = process.env.IG_BUSINESS_ACCOUNT_ID;
  if (!token || !igId) { console.log('  [instagram] not configured — skipping.'); return []; }

  const GRAPH = 'https://graph.facebook.com/v21.0';
  const hashtags = (target.hashtags || []).slice(0, 5);
  const trends = [];
  for (const tag of hashtags) {
    try {
      const search = await fetchJson(`${GRAPH}/ig_hashtag_search?user_id=${igId}&q=${encodeURIComponent(tag)}&access_token=${token}`);
      const hashtagId = search?.data?.[0]?.id;
      if (!hashtagId) continue;
      const media = await fetchJson(`${GRAPH}/${hashtagId}/top_media?user_id=${igId}&fields=id,caption,like_count,comments_count,media_type,permalink,timestamp&access_token=${token}`);
      for (const m of (media?.data || []).slice(0, 5)) {
        const ageHours = m.timestamp ? (Date.now() - new Date(m.timestamp).getTime()) / 3.6e6 : null;
        trends.push({
          platform: 'instagram',
          niche: target.niche || null,
          style: deriveStyle(m.caption, m.media_type),
          description: (m.caption || '').slice(0, 280),
          example_url: m.permalink || null,
          hashtags: [tag],
          metrics: { likes: m.like_count, comments: m.comments_count, age_hours: ageHours },
          source: 'instagram_graph',
        });
      }
    } catch (err) { console.error(`  [instagram:${tag}]`, err.message); }
  }
  return trends;
}

/* ── TikTok API (official) ───────────────────────────────────────────────────
   Placeholder for the TikTok Display/Business API. Without a token it is skipped.
   When TIKTOK_ACCESS_TOKEN is present, query the hashtag/video endpoints your
   app is approved for and normalize into the same trend shape. */
async function collectTikTok(target) {
  const token = process.env.TIKTOK_ACCESS_TOKEN;
  if (!token) { console.log('  [tiktok] not configured — skipping.'); return []; }
  // Implement against your approved TikTok API scope here. Left intentionally
  // empty (rather than fabricated) until the app's scopes are known.
  console.log('  [tiktok] token present but no approved endpoint wired yet — skipping.');
  return [];
}

function deriveStyle(caption, mediaType) {
  const c = String(caption || '').toLowerCase();
  if (mediaType === 'VIDEO' || /reel|video/.test(c)) return 'Video / Reel';
  if (mediaType === 'CAROUSEL_ALBUM' || /carrusel|carousel/.test(c)) return 'Carrusel';
  if (/antes.*despu|before.*after/.test(c)) return 'Antes / Después';
  if (/tutorial|cómo|how to/.test(c)) return 'Tutorial';
  return 'Foto / Post';
}

async function fetchJson(url) {
  const resp = await fetch(url);
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(json?.error?.message || `http ${resp.status}`);
  return json;
}

main().catch((err) => { console.error('collect-trends failed:', err.message); process.exit(1); });
