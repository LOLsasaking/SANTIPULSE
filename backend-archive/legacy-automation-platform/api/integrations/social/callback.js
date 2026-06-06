/* GET /api/integrations/social/callback?code=&state=
   Facebook redirects the browser here after login. Identity comes from the
   user-bound `state` nonce. We exchange for a long-lived token, discover the
   user's Pages + linked IG accounts, persist them, then bounce to the dashboard. */
import { isConfigured, exchangeCode, discoverAccounts, saveAccounts } from '../../lib/socialMedia.js';
import { consumeOAuthState } from '../../lib/automations.js';

function bounce(res, ok, reason, count) {
  const q = ok
    ? `social=connected&accounts=${count || 0}`
    : `social=error&reason=${encodeURIComponent(reason || 'failed')}`;
  res.setHeader('Location', `/dashboard/?${q}`);
  return res.status(302).end();
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'method' }); }
  if (!isConfigured()) return res.status(503).json({ error: 'integration_not_configured' });

  const { code, state, error: oauthError } = req.query || {};
  if (oauthError) return bounce(res, false, String(oauthError));
  if (!code || !state) return bounce(res, false, 'missing_params');

  const consumed = await consumeOAuthState(String(state), 'meta');
  if (!consumed) return bounce(res, false, 'bad_state');

  try {
    const tok = await exchangeCode(String(code));
    if (!tok || !tok.userToken) return bounce(res, false, 'exchange_failed');
    const accounts = await discoverAccounts(tok.userToken);
    if (!accounts.length) return bounce(res, false, 'no_pages');
    const saved = await saveAccounts(consumed.userId, accounts);
    return bounce(res, saved > 0, saved > 0 ? null : 'save_failed', saved);
  } catch (err) {
    console.error('[social/callback]', err.message);
    return bounce(res, false, 'exchange_failed');
  }
}
