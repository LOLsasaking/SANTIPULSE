/* POST /api/stripe/portal — open the Stripe Customer Portal. Auth required.
   Returns { url } to redirect the user to manage/cancel their subscription. */
import { requireUser } from '../lib/auth.js';
import { getStripe, getProfileByUserId } from '../lib/stripe.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'method' }); }

  const user = await requireUser(req, res);
  if (!user) return;

  const stripe = await getStripe();
  if (!stripe) return res.status(500).json({ error: 'stripe_not_configured' });

  const profile = await getProfileByUserId(user.id);
  if (!profile?.stripe_customer_id) return res.status(400).json({ error: 'no_customer' });

  const origin = req.headers.origin || (process.env.SITE_URL || 'https://santipulse.com').replace(/\/$/, '');

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/admin/`,
    });
    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('[stripe/portal]', err.message);
    return res.status(500).json({ error: 'portal_failed' });
  }
}
