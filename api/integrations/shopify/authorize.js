/* GET /api/integrations/shopify/authorize?shop=<name>.myshopify.com
   Auth required. Validates the shop domain, creates a CSRF state, then
   302-redirects to the store's app-install consent screen. */
import { requireUser } from '../../_lib/auth.js';
import { isConfigured, isValidShop, buildAuthUrl } from '../../_lib/shopify.js';
import { createOAuthState } from '../../_lib/automations.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'method' }); }
  if (!isConfigured()) return res.status(503).json({ error: 'integration_not_configured' });

  const user = await requireUser(req, res);
  if (!user) return;

  const shop = String((req.query && req.query.shop) || '').trim().toLowerCase();
  if (!isValidShop(shop)) return res.status(400).json({ error: 'invalid_shop' });

  // Stash the shop in redirect_to so the callback knows which store to bind.
  const state = await createOAuthState(user.id, 'shopify', shop);
  if (!state) return res.status(500).json({ error: 'state_failed' });

  const url = buildAuthUrl(shop, state);
  if (!url) return res.status(503).json({ error: 'integration_not_configured' });
  return res.status(200).json({ url });
}
