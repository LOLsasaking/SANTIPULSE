/* ============================================================
   Insights de Redes — data layer + viral scoring (ESM, service_role)
   ------------------------------------------------------------
   Helpers for the trend-insights module: per-user config, trend
   storage, a viral-probability score, and the post queue (which
   publishes through the existing Meta Graph social_accounts).

   Trend COLLECTION runs as a heavy job (GitHub Actions, official
   APIs) that POSTs results to /api/insights/ingest. This module is
   the storage + scoring + read side.
   ============================================================ */
import { admin } from './auth.js';

/* ── Config ─────────────────────────────────────────────────────────────── */
export async function getConfig(userId) {
  const sb = admin();
  if (!sb) return null;
  const { data } = await sb.from('insights_config').select('*').eq('user_id', userId).maybeSingle();
  return data || null;
}

const CONFIG_FIELDS = ['is_active', 'niche', 'region', 'competitors', 'hashtags', 'platforms'];

export async function saveConfig(userId, body) {
  const sb = admin();
  if (!sb) return null;
  const patch = { user_id: userId };
  for (const k of CONFIG_FIELDS) if (body[k] !== undefined) patch[k] = body[k];
  const { data, error } = await sb.from('insights_config')
    .upsert(patch, { onConflict: 'user_id' }).select('*').single();
  if (error) { console.error('[insights] saveConfig:', error.message); return null; }
  return data;
}

/* ── Viral scoring ──────────────────────────────────────────────────────────
   A transparent 0-100 heuristic from a raw metrics bag. Inputs (any subset):
     views, likes, comments, shares, growth (% per day), age_hours
   Weighted toward velocity (engagement rate + growth + recency). Pure function
   so the GitHub Action and the API agree on the number. */
export function viralScore(metrics = {}) {
  const views = num(metrics.views);
  const likes = num(metrics.likes);
  const comments = num(metrics.comments);
  const shares = num(metrics.shares);
  const growth = num(metrics.growth);          // % per day
  const ageHours = num(metrics.age_hours) || num(metrics.ageHours);

  // Engagement rate (per view), capped — strong signal of resonance.
  const eng = views > 0 ? (likes + 2 * comments + 3 * shares) / views : 0;
  const engScore = clamp(eng * 1000, 0, 40);   // 4% weighted eng ≈ 40 pts

  // Absolute reach, log-scaled so a viral post isn't 100x a normal one.
  const reachScore = views > 0 ? clamp(Math.log10(views) * 6, 0, 30) : 0;

  // Growth velocity.
  const growthScore = clamp(growth * 0.5, 0, 20);

  // Recency bonus: fresh content scores higher (trend is current).
  const recencyScore = ageHours != null ? clamp(20 - ageHours / 12, 0, 10) : 5;

  return Math.round(clamp(engScore + reachScore + growthScore + recencyScore, 0, 100));
}

export function momentumFrom(metrics = {}) {
  const growth = num(metrics.growth);
  const ageHours = num(metrics.age_hours) || num(metrics.ageHours);
  if (growth >= 30 && (ageHours == null || ageHours < 48)) return 'rising';
  if (growth <= 5) return 'fading';
  return 'peak';
}

function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

/* ── Trends ─────────────────────────────────────────────────────────────── */
/** Bulk-store collected trends for a user. Each item: { platform, niche, style,
    description, example_url, hashtags, metrics, source }. Scores computed here. */
export async function storeTrends(userId, items = []) {
  const sb = admin();
  if (!sb || !items.length) return 0;
  const rows = items.map((t) => ({
    user_id: userId,
    platform: t.platform || 'instagram',
    niche: t.niche || null,
    style: String(t.style || 'Trend').slice(0, 255),
    description: t.description || null,
    example_url: t.example_url || t.exampleUrl || null,
    hashtags: t.hashtags || null,
    metrics: t.metrics || null,
    viral_score: t.viral_score != null ? t.viral_score : viralScore(t.metrics || {}),
    momentum: t.momentum || momentumFrom(t.metrics || {}),
    source: t.source || 'official_api',
    collected_at: t.collected_at || new Date().toISOString(),
  }));
  const { data, error } = await sb.from('trend_insights').insert(rows).select('id');
  if (error) { console.error('[insights] storeTrends:', error.message); return 0; }
  return data ? data.length : 0;
}

export async function listTrends(userId, { limit = 50, platform } = {}) {
  const sb = admin();
  if (!sb) return [];
  let q = sb.from('trend_insights').select('*').eq('user_id', userId);
  if (platform) q = q.eq('platform', platform);
  const { data } = await q.order('viral_score', { ascending: false }).limit(limit);
  return data || [];
}

/* ── Post queue ─────────────────────────────────────────────────────────── */
export async function queuePost(userId, { accountId, trendId, platform, caption, mediaUrl, scheduledFor, status = 'scheduled' }) {
  const sb = admin();
  if (!sb) return null;
  const { data, error } = await sb.from('insights_post_queue').insert({
    user_id: userId, account_id: accountId || null, trend_id: trendId || null,
    platform: platform || null, caption: caption || null, media_url: mediaUrl || null,
    scheduled_for: scheduledFor || new Date().toISOString(), status,
  }).select('*').single();
  if (error) { console.error('[insights] queuePost:', error.message); return null; }
  return data;
}

export async function listQueue(userId, limit = 100) {
  const sb = admin();
  if (!sb) return [];
  const { data } = await sb.from('insights_post_queue')
    .select('*').eq('user_id', userId).order('scheduled_for', { ascending: true }).limit(limit);
  return data || [];
}

export async function updateQueuePost(userId, id, patch) {
  const sb = admin();
  if (!sb) return null;
  const allowed = {};
  for (const k of ['caption', 'media_url', 'scheduled_for', 'status', 'account_id']) {
    if (patch[k] !== undefined) allowed[k] = patch[k];
  }
  const { data } = await sb.from('insights_post_queue')
    .update(allowed).eq('id', id).eq('user_id', userId).select('*').maybeSingle();
  return data || null;
}
