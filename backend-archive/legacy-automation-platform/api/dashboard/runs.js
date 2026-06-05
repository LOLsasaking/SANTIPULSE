/* GET /api/dashboard/runs — the user's automation run history. */
import { requireUser } from '../_lib/auth.js';
import { getUserJobs } from '../_lib/profile.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'method' }); }

  const user = await requireUser(req, res);
  if (!user) return;

  const runs = await getUserJobs(user.id);
  return res.status(200).json({ runs });
}
