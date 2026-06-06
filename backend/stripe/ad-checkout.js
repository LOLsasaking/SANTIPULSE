/* POST /api/stripe/ad-checkout
   One-off Checkout for a simple "promote this post" request.
   Auth required. Body: { platform, post_id?, caption?, budget_eur, duration_days }. */
import { requireUser } from '../lib/auth.js';
import { getStripe, getProfileByUserId } from '../lib/stripe.js';
import { parseBody } from '../lib/http.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method' });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  const stripe = await getStripe();
  if (!stripe) return res.status(500).json({ error: 'stripe_not_configured' });

  const body = parseBody(req);
  const platform = clean(body.platform || 'meta', 24);
  const postId = clean(body.post_id || '', 80);
  const caption = clean(body.caption || '', 500);
  const budget = Math.round(Number(body.budget_eur || body.budget || 0));
  const days = Math.round(Number(body.duration_days || body.days || 0));

  if (!['meta', 'instagram', 'facebook', 'tiktok'].includes(platform)) {
    return res.status(400).json({ error: 'invalid_platform' });
  }
  if (!postId && caption.length < 8) {
    return res.status(400).json({ error: 'missing_post' });
  }
  if (!Number.isFinite(budget) || budget < 10 || budget > 5000) {
    return res.status(400).json({ error: 'invalid_budget' });
  }
  if (!Number.isFinite(days) || days < 1 || days > 60) {
    return res.status(400).json({ error: 'invalid_duration' });
  }

  const origin = req.headers.origin || (process.env.SITE_URL || 'https://santipulse.com').replace(/\/$/, '');
  const profile = await getProfileByUserId(user.id);
  const description = caption || `Post ${postId}`;

  try {
    const sessionPayload = {
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'eur',
          unit_amount: budget * 100,
          product_data: {
            name: 'SantiPulse Ads Launch',
            description: `${platform.toUpperCase()} · ${days} dia(s) · ${description.slice(0, 120)}`,
          },
        },
        quantity: 1,
      }],
      allow_promotion_codes: false,
      metadata: {
        kind: 'ad_launch',
        user_id: user.id,
        platform,
        post_id: postId,
        caption: caption.slice(0, 500),
        budget_eur: String(budget),
        duration_days: String(days),
      },
      success_url: `${origin}/bienvenida/?ad=paid&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard/?ads=cancelled`,
    };
    if (profile?.stripe_customer_id) sessionPayload.customer = profile.stripe_customer_id;
    else if (user.email) sessionPayload.customer_email = user.email;
    if (user.id) sessionPayload.client_reference_id = user.id;

    const session = await stripe.checkout.sessions.create(sessionPayload);
    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('[stripe/ad-checkout]', err.message);
    return res.status(500).json({ error: 'checkout_failed' });
  }
}

function clean(value, max) {
  return String(value == null ? '' : value).trim().slice(0, max);
}
