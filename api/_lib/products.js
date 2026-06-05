/* ============================================================
   Stripe plan configuration (ESM). Price IDs come from env.
   Create the products at https://dashboard.stripe.com/products,
   then set STRIPE_PRICE_STARTER / _PRO / _AGENCY.
   ============================================================ */

export const PLANS = {
  starter: { name: 'Starter', priceMonthly: 49, priceEnv: 'STRIPE_PRICE_STARTER' },
  pro: { name: 'Pro', priceMonthly: 149, priceEnv: 'STRIPE_PRICE_PRO' },
  agency: { name: 'Agency', priceMonthly: 399, priceEnv: 'STRIPE_PRICE_AGENCY' },
};

export function priceIdFor(planKey) {
  const plan = PLANS[planKey];
  if (!plan) return null;
  return process.env[plan.priceEnv] || null;
}

export function planByPriceId(priceId) {
  for (const key of Object.keys(PLANS)) {
    if ((process.env[PLANS[key].priceEnv] || null) === priceId) return key;
  }
  return 'none';
}
