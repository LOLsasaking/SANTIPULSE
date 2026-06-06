/* GET /api/integrations/social/authorize
   Auth required. Creates a CSRF state, then 302-redirects to Facebook Login. */
import { requireUser } from '../../lib/auth.js';
import { isConfigured, buildAuthUrl } from '../../lib/socialMedia.js';
import { createOAuthState } from '../../lib/automations.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'method' }); }
  if (!isConfigured()) return res.status(503).json({ error: 'integration_not_configured' });

  const user = await requireUser(req, res);
  if (!user) return;

  const state = await createOAuthState(user.id, 'meta', '/dashboard/');
  if (!state) return res.status(500).json({ error: 'state_failed' });

  const url = buildAuthUrl(state);
  if (!url) return res.status(503).json({ error: 'integration_not_configured' });
  return res.status(200).json({ url });
}
