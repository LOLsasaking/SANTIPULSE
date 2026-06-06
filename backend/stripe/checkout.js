/* POST /api/stripe/checkout - create a Stripe Checkout session for a plan.
   Auth optional. Body: { plan: "starter"|"pro"|"agency", source? }. Returns { url }.
   Logged-in dashboard purchases attach user_id for automatic subscription cache.
   Public pricing purchases still open Stripe and land on onboarding. */
import { getUser } from '../lib/auth.js';
import { getStripe, getProfileByUserId } from '../lib/stripe.js';
import { normalizePlanKey, priceIdFor, PLANS } from '../lib/products.js';
import { parseBody } from '../lib/http.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method' });
  }

  const body = parseBody(req);
  const plan = normalizePlanKey(body.plan || req.query?.plan);
  if (!PLANS[plan]) return res.status(400).json({ error: 'invalid_plan' });

  const priceRef = priceIdFor(plan);
  if (!priceRef) return res.status(500).json({ error: 'price_not_configured' });

  const stripe = await getStripe();
  if (!stripe) return res.status(500).json({ error: 'stripe_not_configured' });

  const priceId = await resolveCheckoutPrice(stripe, plan, priceRef);
  if (!priceId) return res.status(500).json({ error: 'stripe_price_invalid' });

  const origin = req.headers.origin || (process.env.SITE_URL || 'https://santipulse.com').replace(/\/$/, '');
  const user = await getUser(req);
  const isPublicPricing = !user || body.source === 'precios' || body.public === true;

  try {
    const profile = user ? await getProfileByUserId(user.id) : null;
    const metadata = user
      ? { user_id: user.id, plan, source: body.source || 'dashboard' }
      : { plan, source: 'public_pricing', public_checkout: 'true' };

    const mode = PLANS[plan].mode || 'subscription';
    const cancelPath = body.source === 'web'
      ? '/contratar/?payment=cancelled'
      : isPublicPricing ? '/precios/?payment=cancelled' : '/dashboard/?payment=cancelled';

    const sessionPayload = {
      mode,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      metadata,
      success_url: `${origin}/bienvenida/?session_id={CHECKOUT_SESSION_ID}${isPublicPricing ? '&public_checkout=1' : ''}`,
      cancel_url: `${origin}${cancelPath}`,
    };
    // subscription_data is only valid for recurring checkouts; one-time payments reject it.
    if (mode === 'subscription') sessionPayload.subscription_data = { metadata };
    if (profile?.stripe_customer_id) sessionPayload.customer = profile.stripe_customer_id;
    else if (user?.email) sessionPayload.customer_email = user.email;
    if (user?.id) sessionPayload.client_reference_id = user.id;

    const session = await stripe.checkout.sessions.create(sessionPayload);
    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('[stripe/checkout]', err.message);
    return res.status(500).json({ error: 'checkout_failed' });
  }
}

async function resolveCheckoutPrice(stripe, plan, priceRef) {
  const ref = String(priceRef || '').trim();
  if (ref.startsWith('price_')) return ref;
  if (!ref.startsWith('prod_')) {
    console.error(`[stripe/checkout] ${plan} has invalid price ref`);
    return null;
  }

  try {
    const prices = await stripe.prices.list({ product: ref, active: true, limit: 10 });
    const monthly = prices.data.find((p) => p.recurring?.interval === 'month');
    const recurring = monthly || prices.data.find((p) => p.recurring);
    const fallback = recurring || prices.data[0];
    if (!fallback?.id) {
      console.error(`[stripe/checkout] ${plan} product has no active prices`);
      return null;
    }
    return fallback.id;
  } catch (err) {
    console.error('[stripe/checkout] price lookup failed:', err.message);
    return null;
  }
}
