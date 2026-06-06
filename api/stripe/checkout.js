/* POST /api/stripe/checkout — create a Stripe Checkout session for a plan.
   Auth required. Body: { plan: "starter"|"pro"|"agency" }. Returns { url }. */
import { requireUser } from '../_lib/auth.js';
import { getStripe, getProfileByUserId } from '../_lib/stripe.js';
import { priceIdFor, PLANS } from '../_lib/products.js';
import { parseBody } from '../_lib/http.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'method' }); }

  const user = await requireUser(req, res);
  if (!user) return;

  const { plan } = parseBody(req);
  if (!PLANS[plan]) return res.status(400).json({ error: 'invalid_plan' });

  const priceId = priceIdFor(plan);
  if (!priceId) return res.status(500).json({ error: 'price_not_configured' });

  const stripe = await getStripe();
  if (!stripe) return res.status(500).json({ error: 'stripe_not_configured' });

  const origin = req.headers.origin || (process.env.SITE_URL || 'https://santipulse.com').replace(/\/$/, '');

  try {
    const profile = await getProfileByUserId(user.id);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer: profile?.stripe_customer_id || undefined,
      customer_email: profile?.stripe_customer_id ? undefined : user.email,
      client_reference_id: user.id,
      allow_promotion_codes: true,
      metadata: { user_id: user.id, plan },
      subscription_data: { metadata: { user_id: user.id, plan } },
      success_url: `${origin}/admin/?payment=success`,
      cancel_url: `${origin}/admin/?payment=cancelled`,
    });
    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('[stripe/checkout]', err.message);
    return res.status(500).json({ error: 'checkout_failed' });
  }
}
