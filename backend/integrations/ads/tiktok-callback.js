/* GET /api/integrations/ads/tiktok-callback?auth_code=&state=  (TikTok ads)
   TikTok redirects the browser here after portal auth. We exchange the auth_code
   for an access token + advertiser ids, discover the accounts, store them, then
   bounce to the dashboard. */
import { consumeOAuthState } from '../../_lib/automations.js';
import { tiktokConfigured, tiktokExchangeCode, tiktokDiscoverAccounts } from '../../_lib/adsProviders.js';
import { saveAccounts } from '../../_lib/ads.js';

function bounce(res, ok, reason) {
  const q = ok ? 'ads=connected' : `ads=error&reason=${encodeURIComponent(reason || 'failed')}`;
  res.setHeader('Location', `/dashboard/?${q}`);
  return res.status(302).end();
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'method' }); }
  if (!tiktokConfigured()) return res.status(503).json({ error: 'integration_not_configured' });

  // TikTok returns the code as `auth_code` (and `code` on some flows).
  const code = req.query.auth_code || req.query.code;
  const { state, error: oauthError } = req.query || {};
  if (oauthError) return bounce(res, false, String(oauthError));
  if (!code || !state) return bounce(res, false, 'missing_params');

  const consumed = await consumeOAuthState(String(state), 'ads_tiktok');
  if (!consumed) return bounce(res, false, 'bad_state');

  try {
    const exchanged = await tiktokExchangeCode(String(code));
    if (!exchanged) return bounce(res, false, 'exchange_failed');
    const accounts = await tiktokDiscoverAccounts(exchanged.token, exchanged.advertiserIds);
    if (!accounts.length) return bounce(res, false, 'no_ad_accounts');
    const saved = await saveAccounts(consumed.userId, accounts);
    return bounce(res, saved > 0, saved > 0 ? null : 'save_failed');
  } catch (err) {
    console.error('[ads/tiktok-callback]', err.message);
    return bounce(res, false, 'exchange_failed');
  }
}
