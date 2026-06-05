/* GET/POST /api/dashboard/profile — read or update the business profile. */
import { requireUser } from '../_lib/auth.js';
import { getProfile, saveProfile } from '../_lib/profile.js';
import { parseBody } from '../_lib/http.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const user = await requireUser(req, res);
  if (!user) return;

  if (req.method === 'GET') {
    const profile = await getProfile(user.id);
    return res.status(200).json({ profile: profile || null });
  }

  if (req.method === 'POST') {
    const body = parseBody(req);
    const profile = await saveProfile(user.id, body);
    if (!profile) return res.status(500).json({ error: 'save_failed' });
    return res.status(200).json({ profile });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'method' });
}
