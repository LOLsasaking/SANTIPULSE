/* ============================================================
   Stripe client + billing data layer (ESM, Supabase-backed)
   ------------------------------------------------------------
   Stripe is an optionalDependency, imported lazily so the rest
   of the API still loads if it's not installed locally.
   ============================================================ */
import { admin } from './auth.js';
import { normalizePlanKey, planByPriceId } from './products.js';

let _stripe = null;
export async function getStripe() {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  const { default: Stripe } = await import('stripe');
  _stripe = new Stripe(key, { apiVersion: '2024-06-20' });
  return _stripe;
}

// ── Profile billing updates (service role) ──────────────────────────────────

export async function setCustomerId(userId, stripeCustomerId) {
  const sb = admin();
  if (!sb) return;
  await sb.from('profiles').update({ stripe_customer_id: stripeCustomerId }).eq('id', userId);
}

export async function getProfileByUserId(userId) {
  const sb = admin();
  if (!sb) return null;
  const { data } = await sb.from('profiles').select('*').eq('id', userId).single();
  return data || null;
}

export async function findProfileBySubscription(subscriptionId) {
  const sb = admin();
  if (!sb) return null;
  const { data } = await sb.from('profiles').select('*').eq('subscription_id', subscriptionId).maybeSingle();
  return data || null;
}

export async function findProfileByCustomer(customerId) {
  const sb = admin();
  if (!sb) return null;
  const { data } = await sb.from('profiles').select('*').eq('stripe_customer_id', customerId).maybeSingle();
  return data || null;
}

export async function updateSubscription(userId, { status, subscriptionId, plan, expiresAt, customerId }) {
  const sb = admin();
  if (!sb) return;
  const patch = { subscription_status: status, subscription_id: subscriptionId, plan, plan_expires_at: expiresAt };
  if (customerId) patch.stripe_customer_id = customerId;
  await sb.from('profiles').update(patch).eq('id', userId);
}

// Like updateSubscription but creates the profile row if it doesn't exist yet —
// needed when a public (logged-out) buyer logs in for the first time after paying.
export async function upsertSubscription(userId, { status, subscriptionId, plan, expiresAt, customerId }) {
  const sb = admin();
  if (!sb) return;
  const patch = { id: userId, subscription_status: status, subscription_id: subscriptionId, plan, plan_expires_at: expiresAt };
  if (customerId) patch.stripe_customer_id = customerId;
  await sb.from('profiles').upsert(patch, { onConflict: 'id' });
}

// Option A reconciliation: a buyer can pay on /precios WITHOUT being logged in,
// so the webhook has no user_id to attach. When that buyer later logs in with the
// same email, this links their paid Stripe subscription to their account by email:
// look up the Stripe customer(s) for the email, find a live subscription, and
// upsert it onto their profile. Returns the linked { status, plan } or null.
export async function reconcileSubscriptionByEmail(user) {
  if (!user?.id || !user?.email) return null;
  const stripe = await getStripe();
  if (!stripe) return null;
  try {
    const customers = await stripe.customers.list({ email: user.email, limit: 10 });
    let best = null;
    for (const customer of customers.data) {
      const subs = await stripe.subscriptions.list({ customer: customer.id, status: 'all', limit: 10 });
      for (const sub of subs.data) {
        if (!['active', 'trialing', 'past_due'].includes(sub.status)) continue;
        if (!best || sub.created > best.sub.created) best = { sub, customerId: customer.id };
      }
    }
    if (!best) return null;
    const priceId = best.sub.items.data[0]?.price?.id;
    const plan = normalizePlanKey(best.sub.metadata?.plan || planByPriceId(priceId));
    await upsertSubscription(user.id, {
      status: best.sub.status,
      subscriptionId: best.sub.id,
      plan,
      expiresAt: best.sub.current_period_end ? new Date(best.sub.current_period_end * 1000).toISOString() : null,
      customerId: best.customerId,
    });
    return { status: best.sub.status, plan };
  } catch (err) {
    console.error('[stripe] reconcileSubscriptionByEmail:', err.message);
    return null;
  }
}

// ── Idempotency ─────────────────────────────────────────────────────────────

export async function alreadyProcessed(eventId) {
  const sb = admin();
  if (!sb) return false;
  const { data } = await sb.from('stripe_events').select('stripe_event_id').eq('stripe_event_id', eventId).maybeSingle();
  return !!data;
}

export async function recordEvent(eventId, type) {
  const sb = admin();
  if (!sb) return;
  await sb.from('stripe_events').insert({ stripe_event_id: eventId, event_type: type });
}
