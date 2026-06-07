/* GET /api/dashboard/me — current user + profile + subscription state. */
import { isAdminUser, isCompedEmail, requireUser } from '../lib/auth.js';
import { getProfile, hasActiveSubscription } from '../lib/profile.js';
import { reconcileSubscriptionByEmail } from '../lib/stripe.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'method' }); }

  const user = await requireUser(req, res);
  if (!user) return;

  let profile = await getProfile(user.id);

  // Option A: a buyer may have paid on /precios while logged out (no user_id on
  // the webhook). On first login with the same email, link their Stripe sub here.
  const comped = isCompedEmail(user);
  if (!comped && !hasActiveSubscription(profile) && !profile?.stripe_customer_id) {
    const linked = await reconcileSubscriptionByEmail(user);
    if (linked) profile = await getProfile(user.id);
  }

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
