/* GET /api/integrations/shopify/callback?code=&state=&shop=&hmac=...
   Shopify redirects the browser here after the merchant approves the install.
   Identity comes from the user-bound `state` nonce; we ALSO verify Shopify's
   HMAC signature on the query so the callback can't be forged. The shop the
   user authorized was stored in oauth_states.redirect_to. */
import { isConfigured, verifyHmac, isValidShop, exchangeCode, saveConnection } from '../../_lib/shopify.js';
import { consumeOAuthState } from '../../_lib/automations.js';

function bounce(res, ok, reason) {
  const q = ok ? 'shopify=connected' : `shopify=error&reason=${encodeURIComponent(reason || 'failed')}`;
  res.setHeader('Location', `/dashboard/?${q}`);
  return res.status(302).end();
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'method' }); }
  if (!isConfigured()) return res.status(503).json({ error: 'integration_not_configured' });

  const q = req.query || {};
  if (!verifyHmac(q)) return bounce(res, false, 'bad_hmac');

  const { code, state, shop } = q;
  if (!code || !state || !shop) return bounce(res, false, 'missing_params');
  if (!isValidShop(String(shop))) return bounce(res, false, 'invalid_shop');

  const consumed = await consumeOAuthState(String(state), 'shopify');
  if (!consumed) return bounce(res, false, 'bad_state');
  // The shop in the callback must match the one the user authorized.
  if (consumed.redirectTo && consumed.redirectTo !== String(shop)) return bounce(res, false, 'shop_mismatch');

  try {
    const creds = await exchangeCode(String(shop), String(code));
    if (!creds || !creds.accessToken) return bounce(res, false, 'exchange_failed');
    const saved = await saveConnection(consumed.userId, String(shop), creds);
    return bounce(res, saved, saved ? null : 'save_failed');
  } catch {
    return bounce(res, false, 'exchange_failed');
  }
}
