/* ============================================================
   Pulse subscription plans.
   Price IDs stay in Vercel env vars; no Stripe secrets live here.
   ============================================================ */

export const PLANS = {
  starter: {
    name: 'Starter',
    label: 'Recepcionista IA',
    priceMonthly: 49,
    priceEnv: 'STRIPE_PRICE_STARTER',
  },
  pro: {
    name: 'Pro',
    label: 'Pulse Pro',
    priceMonthly: 149,
    priceEnv: 'STRIPE_PRICE_PRO',
  },
  agency: {
    name: 'Agency',
    label: 'Pulse Agency',
    priceMonthly: 399,
    priceEnv: 'STRIPE_PRICE_AGENCY',
  },
};

export const LIMITS = {
  none: { runsPerMonth: 0, emailsPerMonth: 0, postsPerMonth: 0, adAccounts: 0 },
  starter: { runsPerMonth: 50, emailsPerMonth: 500, postsPerMonth: 30, adAccounts: 1 },
  pro: { runsPerMonth: 500, emailsPerMonth: 5000, postsPerMonth: 150, adAccounts: 3 },
  agency: {
    runsPerMonth: Infinity,
    emailsPerMonth: Infinity,
    postsPerMonth: Infinity,
    adAccounts: Infinity,
  },
};

export function limitsFor(planKey) {
  return LIMITS[planKey] || LIMITS.none;
}

export function priceIdFor(planKey) {
  const plan = PLANS[planKey];
  if (!plan) return null;
  return process.env[plan.priceEnv] || null;
}

export function planByPriceId(priceId) {
  for (const key of Object.keys(PLANS)) {
    if (priceIdFor(key) === priceId) return key;
  }
  return 'none';
}
