/* GET /api/integrations/gmail/authorize
   Auth required. Creates a CSRF state and returns { url } — the consent-screen
   URL the browser then navigates to (top-level). Returns JSON, not a 302, so the
   authenticated apiFetch can read it (a fetch can't follow a cross-origin 302 and
   expose its Location). Responds 503 if Google OAuth isn't configured. */
import { requireUser } from '../../_lib/auth.js';
import { isConfigured, buildAuthUrl } from '../../_lib/gmail.js';
import { createOAuthState } from '../../_lib/automations.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'method' }); }
  if (!isConfigured()) return res.status(503).json({ error: 'integration_not_configured' });

  const user = await requireUser(req, res);
  if (!user) return;

  const state = await createOAuthState(user.id, 'gmail', '/dashboard/');
  if (!state) return res.status(500).json({ error: 'state_failed' });

  const url = await buildAuthUrl(state);
  if (!url) return res.status(503).json({ error: 'integration_not_configured' });
  return res.status(200).json({ url });
}
