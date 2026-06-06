/* GET /api/integrations/revealbot/status */
import { requireUser } from '../../lib/auth.js';
import { pingRevealbot } from '../../lib/revealbot.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const user = await requireUser(req, res);
  if (!user) return;
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method' });
  }
  return res.status(200).json({ ok: true, revealbot: await pingRevealbot() });
}
