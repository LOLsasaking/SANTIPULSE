/* ============================================================
   Stripe client + billing data layer (ESM, Supabase-backed)
   ------------------------------------------------------------
   Stripe is an optionalDependency, imported lazily so the rest
   of the API still loads if it's not installed locally.
   ============================================================ */
import { admin } from './auth.js';

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
