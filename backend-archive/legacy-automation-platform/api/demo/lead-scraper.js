/* ============================================================
   POST /api/demo/lead-scraper  — Santipulse live demo
   ------------------------------------------------------------
   One-time free run per visitor. Scrapes a directory/listing
   page for business leads (name/email/phone/website), deduped.

   Body: { targetUrl, maxLeads }
   ============================================================ */
import { runLeadScraperDemo } from '../_lib/leadScraper.js';
import { hasUsedDemoTrial, markDemoTrialUsed, createJob, finishJob, dbEnabled } from '../_lib/db.js';
import { rateLimited, getIp, getFingerprint, parseBody, isValidHttpUrl, trialBlocked } from '../_lib/http.js';

const TYPE = 'lead_scraper';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ success: false, error: 'method' }); }

  const ip = getIp(req);
  if (rateLimited(ip)) return res.status(429).json({ success: false, error: 'rate' });

  const body = parseBody(req);
  const targetUrl = String(body.targetUrl || '').trim();
  const maxLeads = Math.min(Math.max(parseInt(body.maxLeads, 10) || 5, 1), 10);

  if (!isValidHttpUrl(targetUrl)) {
    return res.status(400).json({ success: false, error: 'A valid http(s) target URL is required.' });
  }

  const fingerprint = getFingerprint(req);

  if (dbEnabled() && (await hasUsedDemoTrial({ fingerprint, automationType: TYPE }))) {
    return trialBlocked(res, TYPE);
  }

  const jobId = await createJob({
    automationType: TYPE,
    fingerprint,
    inputParams: { targetUrl, maxLeads },
  });

  try {
    const result = await runLeadScraperDemo({ targetUrl, maxLeads });

    // Consume the trial only when the scrape succeeded and found something.
    if (result.success && result.leads.length > 0) {
      await markDemoTrialUsed({ fingerprint, automationType: TYPE });
    }

    await finishJob({ jobId, status: result.success ? 'completed' : 'failed', result, errorMessage: result.error });
    return res.status(200).json({ ...result, trialUsed: result.success && result.leads.length > 0 });
  } catch (err) {
    await finishJob({ jobId, status: 'failed', errorMessage: err.message });
    return res.status(500).json({ success: false, error: 'scrape_failed' });
  }
}
