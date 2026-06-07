/* GET /api/dashboard/me — current user + profile + subscription state. */
import { isAdminUser, isCompedEmail, requireUser } from '../lib/auth.js';
import { getProfile, hasActiveSubscription } from '../lib/profile.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'method' }); }

  const user = await requireUser(req, res);
  if (!user) return;

  const profile = await getProfile(user.id);
  const comped = isCompedEmail(user);
  const active = hasActiveSubscription(profile) || comped;
  const plan = (profile?.plan && profile.plan !== 'none')
    ? profile.plan
    : (comped ? 'agency' : 'none');
  return res.status(200).json({
    user: { id: user.id, email: user.email },
    isAdmin: isAdminUser(user),
    profile: profile || null,
    subscription: {
      status: active ? (profile?.subscription_status || 'active') : 'none',
      plan,
      active,
    },
  });
}
