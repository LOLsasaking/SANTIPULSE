/* ============================================================
   POST /api/dashboard/run  — run a PAID automation (not a demo).
   ------------------------------------------------------------
   Auth required. Body: { type: 'price_monitor' | 'lead_scraper' }.
   Inputs come from the user's saved business profile (set in the
   dashboard), NOT the request — the browser is never trusted for
   what to run, only which automation.

   Gating, in order:
     1. requireUser            → 401 if not logged in
     2. active subscription    → 402 needs_subscription  (→ /precios)
     3. monthly run quota      → 402 quota_exceeded
     4. profile has inputs     → 400 no_inputs
   Then runs the engine (price-monitor caps URLs to the plan limit),
   records the job as is_demo:false, and returns the result + usage.
   ============================================================ */
import { requireUser } from '../_lib/auth.js';
import { getProfile, hasActiveSubscription } from '../_lib/profile.js';
import { createJob, finishJob, countUserRunsThisMonth, dbEnabled } from '../_lib/db.js';
import { parseBody, isValidHttpUrl } from '../_lib/http.js';
import { limitsFor } from '../_lib/products.js';
import { runPriceMonitorDemo } from '../_lib/priceMonitor.js';
import { runLeadScraperDemo } from '../_lib/leadScraper.js';

const TYPES = ['price_monitor', 'lead_scraper'];

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'method' }); }

  // 1) Auth
  const user = await requireUser(req, res);
  if (!user) return;

  if (!dbEnabled()) return res.status(503).json({ error: 'db_not_configured' });

  const { type } = parseBody(req);
  if (!TYPES.includes(type)) return res.status(400).json({ error: 'invalid_type' });

  // 2) Subscription gate
  const profile = await getProfile(user.id);
  if (!hasActiveSubscription(profile)) {
    return res.status(402).json({ error: 'needs_subscription', upgradeUrl: '/precios/' });
  }

  const plan = profile.plan || 'none';
  const limits = limitsFor(plan);

  // 3) Monthly run quota
  const used = await countUserRunsThisMonth(user.id);
  if (used >= limits.runsPerMonth) {
    return res.status(402).json({
      error: 'quota_exceeded', plan, used, limit: limits.runsPerMonth, upgradeUrl: '/precios/',
    });
  }

  // 4) Inputs from the saved profile
  let inputParams, runner;
  if (type === 'price_monitor') {
    const urls = (Array.isArray(profile.competitor_urls) ? profile.competitor_urls : [])
      .filter(isValidHttpUrl)
      .slice(0, limits.urls === Infinity ? undefined : limits.urls);
    if (!urls.length) return res.status(400).json({ error: 'no_inputs', field: 'competitor_urls' });
    inputParams = { urls, myCurrentPrice: profile.my_current_price || 0, floorPrice: profile.floor_price || 0 };
    runner = () => runPriceMonitor(inputParams);
  } else {
    const urls = (Array.isArray(profile.lead_target_urls) ? profile.lead_target_urls : []).filter(isValidHttpUrl);
    if (!urls.length) return res.status(400).json({ error: 'no_inputs', field: 'lead_target_urls' });
    const maxLeads = Math.min(Math.max(parseInt(profile.max_leads_per_run, 10) || 10, 1), 100);
    inputParams = { targetUrl: urls[0], maxLeads }; // scraper runs one directory page
    runner = () => runLeadScraperDemo(inputParams);
  }

  // Record the paid job, run it, save the result.
  const jobId = await createJob({ automationType: type, userId: user.id, isDemo: false, inputParams });
  try {
    const result = await runner();
    await finishJob({ jobId, status: result.success ? 'completed' : 'failed', result, errorMessage: result.error });
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

// Price monitor across multiple competitor URLs; aggregate per-URL results.
async function runPriceMonitor({ urls, myCurrentPrice, floorPrice }) {
  const results = [];
  for (const competitorUrl of urls) {
    const r = await runPriceMonitorDemo({ competitorUrl, myCurrentPrice, floorPrice });
    results.push({ url: competitorUrl, ...r });
  }
  const ok = results.filter((r) => r.success).length;
  return {
    success: ok > 0,
    checked: results.length,
    priced: ok,
    results,
    error: ok === 0 ? 'No price could be read from any of your competitor URLs.' : undefined,
  };
}
