/* ============================================================
   Profile + jobs data layer (server-side, service role) — ESM
   ============================================================ */
import { admin } from './auth.js';

export async function getProfile(userId) {
  const sb = admin();
  if (!sb) return null;
  const { data, error } = await sb.from('profiles').select('*').eq('id', userId).single();
  if (error) { console.error('[profile] get:', error.message); return null; }
  return data;
}

// Whitelisted, server-controlled set of editable business-profile fields.
const EDITABLE = [
  'business_name', 'website_url', 'industry', 'target_market', 'sender_name',
];

export async function saveProfile(userId, body) {
  const sb = admin();
  if (!sb) return null;
  const patch = {};
  for (const k of EDITABLE) {
    if (body[k] !== undefined) patch[k] = body[k];
  }
  patch.id = userId;
  const { data, error } = await sb
    .from('profiles')
    .upsert(patch, { onConflict: 'id' })
    .select('*')
    .single();
  if (error) { console.error('[profile] save:', error.message); return null; }
  return data;
}

export async function getUserJobs(userId, limit = 25) {
  const sb = admin();
  if (!sb) return [];
  const { data, error } = await sb
    .from('automation_jobs')
    .select('id, automation_type, is_demo, status, result, error_message, created_at, completed_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) { console.error('[profile] jobs:', error.message); return []; }
  return data || [];
}

/** Active-subscription check used to gate paid automations. */
export function hasActiveSubscription(profile) {
  return profile && ['active', 'trialing'].includes(profile.subscription_status);
}
