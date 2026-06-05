/* GET /api/integrations/calendar/callback?code=&state=
   Google redirects the BROWSER here after consent. Identity comes from the
   single-use, user-bound `state` nonce. We verify+consume it, exchange the code,
   persist the refresh token, then bounce back to the dashboard. */
import { isConfigured, exchangeCode, saveConnection } from '../../_lib/calendar.js';
import { consumeOAuthState } from '../../_lib/automations.js';

function bounce(res, ok, reason) {
  const q = ok ? 'calendar=connected' : `calendar=error&reason=${encodeURIComponent(reason || 'failed')}`;
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

  const consumed = await consumeOAuthState(String(state), 'calendar');
  if (!consumed) return bounce(res, false, 'bad_state');

  try {
    const tokens = await exchangeCode(String(code));
    if (!tokens) return bounce(res, false, 'exchange_failed');
    const saved = await saveConnection(consumed.userId, tokens);
    return bounce(res, saved, saved ? null : 'save_failed');
  } catch (err) {
    return bounce(res, false, err.message === 'no_refresh_token' ? 'no_refresh_token' : 'exchange_failed');
  }
}
