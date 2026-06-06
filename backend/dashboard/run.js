/* ============================================================
   POST /api/dashboard/run - run a Pulse module action.
   Auth required. Body: { type: 'ai_receptionist'|'social_insights'|'ad_manager' }.
   ============================================================ */
import { requireUser } from '../lib/auth.js';
import { createJob, countUserRunsThisMonth, dbEnabled, finishJob } from '../lib/db.js';
import { parseBody } from '../lib/http.js';
import { getProfile, hasActiveSubscription } from '../lib/profile.js';
import { limitsFor } from '../lib/products.js';
import { PULSE_TYPES, runPulseModule } from '../pulse/modules.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method' });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  if (!dbEnabled()) return res.status(503).json({ error: 'db_not_configured' });

  const { type } = parseBody(req);
  if (!PULSE_TYPES.includes(type)) return res.status(400).json({ error: 'invalid_type' });

  const profile = await getProfile(user.id);
  if (!hasActiveSubscription(profile)) {
    return res.status(402).json({ error: 'needs_subscription', upgradeUrl: '/precios/' });
  }

  const plan = profile?.plan || 'none';
  const limits = limitsFor(plan);
  const used = await countUserRunsThisMonth(user.id);
  if (used >= limits.runsPerMonth) {
    return res.status(402).json({
      error: 'quota_exceeded',
      plan,
      used,
      limit: limits.runsPerMonth,
      upgradeUrl: '/precios/',
    });
  }

  const inputParams = {
    business_name: profile?.business_name || null,
    website_url: profile?.website_url || null,
    industry: profile?.industry || null,
    target_market: profile?.target_market || null,
  };

  const jobId = await createJob({ automationType: type, userId: user.id, isDemo: false, inputParams });
  try {
    const result = await runPulseModule(type, { ...(profile || {}), id: user.id });
    await finishJob({
      jobId,
      status: result.success ? 'completed' : 'failed',
      result,
      errorMessage: result.error,
    });
    return res.status(200).json({
      ok: true,
      result,
      usage: { used: used + 1, limit: limits.runsPerMonth, plan },
    });
  } catch (err) {
    await finishJob({ jobId, status: 'failed', errorMessage: err.message });
    return res.status(500).json({ error: 'run_failed' });
  }
}
