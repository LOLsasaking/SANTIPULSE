/* GET /api/integrations/ads/authorize?provider=meta|tiktok
   Auth required. Returns { url } — the provider's consent URL for connecting an
   AD account (ads scopes). JSON not 302 so apiFetch can read it. 503 if the
   chosen provider isn't configured. */
import { requireUser } from '../../lib/auth.js';
import { createOAuthState } from '../../lib/automations.js';
import {
  metaConfigured, tiktokConfigured, buildMetaAuthUrl, buildTikTokAuthUrl,
} from '../../lib/adsProviders.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'method' }); }

  const user = await requireUser(req, res);
  if (!user) return;

  const provider = (req.query.provider || 'meta').toLowerCase();
  if (provider === 'tiktok') {
    if (!tiktokConfigured()) return res.status(503).json({ error: 'integration_not_configured' });
    const state = await createOAuthState(user.id, 'ads_tiktok', '/dashboard/');
    if (!state) return res.status(500).json({ error: 'state_failed' });
    const url = buildTikTokAuthUrl(state);
    return url ? res.status(200).json({ url }) : res.status(503).json({ error: 'integration_not_configured' });
  }

  if (!metaConfigured()) return res.status(503).json({ error: 'integration_not_configured' });
  const state = await createOAuthState(user.id, 'ads_meta', '/dashboard/');
  if (!state) return res.status(500).json({ error: 'state_failed' });
  const url = buildMetaAuthUrl(state);
  return url ? res.status(200).json({ url }) : res.status(503).json({ error: 'integration_not_configured' });
}
