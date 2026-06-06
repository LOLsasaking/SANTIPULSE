/* GET /api/integrations/calendar/authorize
   Auth required. Creates a CSRF state and returns { url } — the Google consent
   URL (calendar scope) the browser navigates to. JSON not 302 so apiFetch can
   read it. Responds 503 if Google OAuth isn't configured. */
import { requireUser } from '../../lib/auth.js';
import { isConfigured, buildAuthUrl } from '../../lib/calendar.js';
import { createOAuthState } from '../../lib/automations.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'method' }); }
  if (!isConfigured()) return res.status(503).json({ error: 'integration_not_configured' });

  const user = await requireUser(req, res);
  if (!user) return;

  const state = await createOAuthState(user.id, 'calendar', '/dashboard/');
  if (!state) return res.status(500).json({ error: 'state_failed' });

  const url = await buildAuthUrl(state);
  if (!url) return res.status(503).json({ error: 'integration_not_configured' });
  return res.status(200).json({ url });
}
