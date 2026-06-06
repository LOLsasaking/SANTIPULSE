/* ============================================================
   GET /api/ads/roi-pulse
   ------------------------------------------------------------
   Live ROI ticker from synced ad campaign metrics. Revealbot can
   enrich this later; Meta/TikTok campaign data remains the fallback.
   ============================================================ */
import { requireUser } from '../lib/auth.js';
import { getProfile, hasActiveSubscription } from '../lib/profile.js';
import { listCampaigns } from '../lib/ads.js';
import { getRevealbotSummary, revealbotConfigured } from '../lib/revealbot.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const user = await requireUser(req, res);
  if (!user) return;
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method' });
  }

  const profile = await getProfile(user.id);
  if (!hasActiveSubscription(profile)) {
    return res.status(402).json({ error: 'needs_subscription', upgradeUrl: '/precios/' });
  }

  const campaigns = await listCampaigns(user.id, 200);
  const direct = summarizeCampaigns(campaigns);
  const revealbot = await getRevealbotSummary();
  const pulse = normalizeRevealbotPulse(revealbot) || direct;

  return res.status(200).json({
    ok: true,
    pulse: {
      ...pulse,
      source: normalizeRevealbotPulse(revealbot) ? 'revealbot' : 'meta_tiktok',
      revealbot_configured: revealbotConfigured(),
      campaign_count: campaigns.length,
    },
  });
}

function summarizeCampaigns(campaigns) {
  const totals = campaigns.reduce((acc, c) => {
    acc.spend += num(c.spend);
    acc.revenue += num(c.revenue);
    acc.clicks += num(c.clicks);
    acc.conversions += num(c.conversions);
    acc.impressions += num(c.impressions);
    acc.currency = c.currency || acc.currency;
    if (c.synced_at && (!acc.synced_at || c.synced_at > acc.synced_at)) acc.synced_at = c.synced_at;
    return acc;
  }, { spend: 0, revenue: 0, clicks: 0, conversions: 0, impressions: 0, currency: 'EUR', synced_at: null });

  const roas = totals.spend > 0 && totals.revenue > 0 ? totals.revenue / totals.spend : null;
  const profit = totals.revenue - totals.spend;
  return {
    status: campaigns.length ? 'live' : 'empty',
    spend: round(totals.spend),
    revenue: round(totals.revenue),
    profit: round(profit),
    roas: roas == null ? null : round(roas, 2),
    clicks: totals.clicks,
    conversions: totals.conversions,
    impressions: totals.impressions,
    currency: totals.currency || 'EUR',
    synced_at: totals.synced_at,
  };
}

function normalizeRevealbotPulse(data) {
  if (!data) return null;
  const spend = num(data.spend ?? data.total_spend);
  const revenue = num(data.revenue ?? data.total_revenue);
  if (!spend && !revenue) return null;
  return {
    status: 'live',
    spend: round(spend),
    revenue: round(revenue),
    profit: round(revenue - spend),
    roas: spend > 0 && revenue > 0 ? round(revenue / spend, 2) : null,
    clicks: num(data.clicks),
    conversions: num(data.conversions),
    impressions: num(data.impressions),
    currency: data.currency || 'EUR',
    synced_at: data.synced_at || new Date().toISOString(),
  };
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function round(value, digits = 2) {
  return Number(num(value).toFixed(digits));
}
