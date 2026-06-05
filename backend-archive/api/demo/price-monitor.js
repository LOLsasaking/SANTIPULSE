/* ============================================================
   POST /api/demo/price-monitor  — Santipulse live demo
   ------------------------------------------------------------
   One-time free run per visitor. Scrapes a competitor price and
   returns a repricing suggestion. Same hardening as api/lead.js:
   method guard, rate limit, trial gate, never-trust-the-browser.

   Body: { competitorUrl, myCurrentPrice, floorPrice }
   ============================================================ */
import { runPriceMonitorDemo } from '../_lib/priceMonitor.js';
import { hasUsedDemoTrial, markDemoTrialUsed, createJob, finishJob, dbEnabled } from '../_lib/db.js';
import { rateLimited, getIp, getFingerprint, parseBody, isValidHttpUrl, trialBlocked } from '../_lib/http.js';

const TYPE = 'price_monitor';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ success: false, error: 'method' }); }

  const ip = getIp(req);
  if (rateLimited(ip)) return res.status(429).json({ success: false, error: 'rate' });

  const body = parseBody(req);
  const competitorUrl = String(body.competitorUrl || '').trim();
  const myCurrentPrice = parseFloat(body.myCurrentPrice) || 0;
  const floorPrice = parseFloat(body.floorPrice) || 0;

  if (!isValidHttpUrl(competitorUrl)) {
    return res.status(400).json({ success: false, error: 'A valid http(s) competitor URL is required.' });
  }

  const fingerprint = getFingerprint(req);

  // Trial gate (only enforced when Supabase is configured).
  if (dbEnabled() && (await hasUsedDemoTrial({ fingerprint, automationType: TYPE }))) {
    return trialBlocked(res, TYPE);
  }

  const jobId = await createJob({
    automationType: TYPE,
    fingerprint,
    inputParams: { competitorUrl, myCurrentPrice, floorPrice },
  });

  try {
    const result = await runPriceMonitorDemo({ competitorUrl, myCurrentPrice, floorPrice });

    // Consume the trial only on a run that actually produced a price.
    if (result.success) await markDemoTrialUsed({ fingerprint, automationType: TYPE });

    await finishJob({ jobId, status: result.success ? 'completed' : 'failed', result, errorMessage: result.error });
    return res.status(200).json({ ...result, trialUsed: result.success });
  } catch (err) {
    await finishJob({ jobId, status: 'failed', errorMessage: err.message });
    return res.status(500).json({ success: false, error: 'scrape_failed' });
  }
}
