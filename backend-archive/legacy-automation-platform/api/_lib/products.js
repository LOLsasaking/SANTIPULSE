/* ============================================================
   Stripe plans (ESM). Price IDs come from env (set in Vercel).
   Create the products at https://dashboard.stripe.com/products,
   then set STRIPE_PRICE_STARTER / _PRO / _AGENCY.
   ============================================================ */

export const PLANS = {
  starter: { name: 'Starter', priceMonthly: 49,  priceEnv: 'STRIPE_PRICE_STARTER' },
  pro:     { name: 'Pro',     priceMonthly: 149, priceEnv: 'STRIPE_PRICE_PRO' },
  agency:  { name: 'Agency',  priceMonthly: 399, priceEnv: 'STRIPE_PRICE_AGENCY' },
};

/* Per-plan usage limits for PAID automation runs. These match exactly what the
   dashboard plan cards advertise, so what a user sees == what is enforced:
     • urls          — max price-monitor competitor URLs processed per run
     • runsPerMonth  — max paid scraper runs (is_demo:false) in a calendar month
     • emailsPerMonth— max outreach + cart-recovery emails SENT per month
     • postsPerMonth — max social posts PUBLISHED per month
   Infinity = unlimited (Agency). 'none' = no active plan → cannot run.        */
export const LIMITS = {
  none:    { urls: 0,        runsPerMonth: 0,        emailsPerMonth: 0,        postsPerMonth: 0 },
  starter: { urls: 5,        runsPerMonth: 50,       emailsPerMonth: 500,      postsPerMonth: 30 },
  pro:     { urls: 25,       runsPerMonth: 500,      emailsPerMonth: 5000,     postsPerMonth: 150 },
  agency:  { urls: Infinity, runsPerMonth: Infinity, emailsPerMonth: Infinity, postsPerMonth: Infinity },
};

export function limitsFor(planKey) {
  return LIMITS[planKey] || LIMITS.none;
}

export function priceIdFor(planKey) {
  const plan = PLANS[planKey];
  if (!plan) return null;
  return process.env[plan.priceEnv] || null;
}

/** Reverse lookup: Stripe price id → plan key ('none' if unknown). */
export function planByPriceId(priceId) {
  for (const key of Object.keys(PLANS)) {
    if (priceIdForKey(key) === priceId) return key;
  }
  return 'none';
}
function priceIdForKey(key) { return process.env[PLANS[key].priceEnv] || null; }
