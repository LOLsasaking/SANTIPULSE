/* GET /api/dashboard/me — current user + profile + subscription state. */
import { isAdminUser, requireUser } from '../lib/auth.js';
import { getProfile, hasActiveSubscription } from '../lib/profile.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'method' }); }

  const user = await requireUser(req, res);
  if (!user) return;

  const profile = await getProfile(user.id);
  return res.status(200).json({
    user: { id: user.id, email: user.email },
    isAdmin: isAdminUser(user),
    profile: profile || null,
    subscription: {
      status: profile?.subscription_status || 'none',
      plan: profile?.plan || 'none',
      active: hasActiveSubscription(profile),
    },
  });
}
