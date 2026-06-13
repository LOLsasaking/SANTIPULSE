/* ============================================================
   Automation demos — Supabase data layer (ESM)
   ------------------------------------------------------------
   Replaces the package's raw-`pg` queries.js with the same
   @supabase/supabase-js client style used in api/lead.js.

   Uses the SERVICE ROLE key (server-only) which bypasses RLS.
   If Supabase env vars are absent, every helper degrades to a
   no-op so the scrapers still run in local dev — trial gating
   and job history are simply skipped (logged once).
   ============================================================ */
import { createClient } from '@supabase/supabase-js';

let _client = null;
let _warned = false;

function getClient() {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    if (!_warned) {
      console.warn('[automation/db] Supabase env vars missing — trial gating & job history disabled.');
      _warned = true;
    }
    return null;
  }
  _client = createClient(url, key, { auth: { persistSession: false } });
  return _client;
}

/** True if Supabase is configured (used to decide whether to enforce the trial gate). */
export function dbEnabled() {
  return !!getClient();
}

// ── API cost / token logging (margin tracking → api_costs table) ──────────────
// USD per 1M tokens [input, output]. Extend as you add models/providers.
const TOKEN_PRICES = {
  'gpt-4o-mini': [0.15, 0.60],
  'gpt-4o': [2.5, 10],
  'gpt-4.1-mini': [0.40, 1.60],
  'gpt-4.1': [2.0, 8.0],
};

/** Record one AI request's token usage + estimated cost. Never throws. */
export async function logApiCost({ userId = null, jobId = null, provider = 'openai', model = '', usage = null } = {}) {
  const sb = getClient();
  if (!sb || !usage) return;
  const inTok = usage.prompt_tokens || usage.input_tokens || 0;
  const outTok = usage.completion_tokens || usage.output_tokens || 0;
  const [pIn, pOut] = TOKEN_PRICES[model] || [0.15, 0.60];
  const cost = (inTok * pIn + outTok * pOut) / 1e6;
  try {
    await sb.from('api_costs').insert({
      user_id: userId, job_id: jobId, provider, model,
      input_tokens: inTok, output_tokens: outTok, cost_usd: Number(cost.toFixed(6)),
    });
  } catch (e) { /* best-effort */ }
}

// ── Demo trials ───────────────────────────────────────────────────────────────

export async function hasUsedDemoTrial({ fingerprint, automationType }) {
  const sb = getClient();
  if (!sb) return false; // no DB → don't block in local dev
  const { data, error } = await sb
    .from('demo_trials')
    .select('id')
    .eq('fingerprint', fingerprint)
    .eq('automation_type', automationType)
    .limit(1);
  if (error) { console.error('[automation/db] hasUsedDemoTrial:', error.message); return false; }
  return !!(data && data.length);
}

export async function markDemoTrialUsed({ fingerprint, automationType }) {
  const sb = getClient();
  if (!sb) return;
  // upsert on the (fingerprint, automation_type) unique constraint → idempotent
  const { error } = await sb
    .from('demo_trials')
    .upsert({ fingerprint, automation_type: automationType }, { onConflict: 'fingerprint,automation_type', ignoreDuplicates: true });
  if (error) console.error('[automation/db] markDemoTrialUsed:', error.message);
}

// ── Automation jobs ───────────────────────────────────────────────────────────

/** Insert a job row in 'running' state. Returns the job id, or null if no DB.
    Backward-compatible: demos call with just { automationType, fingerprint,
    inputParams } → is_demo:true, no user. Paid runs pass { userId, isDemo:false }. */
export async function createJob({ automationType, fingerprint, inputParams, userId = null, isDemo = true }) {
  const sb = getClient();
  if (!sb) return null;
  const row = {
    automation_type: automationType,
    is_demo: isDemo,
    status: 'running',
    fingerprint: fingerprint ?? null,
    input_params: inputParams,
    started_at: new Date().toISOString(),
  };
  if (userId) row.user_id = userId;
  const { data, error } = await sb
    .from('automation_jobs')
    .insert(row)
    .select('id')
    .single();
  if (error) { console.error('[automation/db] createJob:', error.message); return null; }
  return data.id;
}

/** Count a user's PAID runs (is_demo:false) in the current calendar month.
    Used to enforce per-plan monthly run quotas. Returns 0 if no DB. */
export async function countUserRunsThisMonth(userId) {
  const sb = getClient();
  if (!sb || !userId) return 0;
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const { count, error } = await sb
    .from('automation_jobs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_demo', false)
    .gte('created_at', monthStart);
  if (error) { console.error('[automation/db] countUserRunsThisMonth:', error.message); return 0; }
  return count || 0;
}

export async function finishJob({ jobId, status, result, errorMessage }) {
  const sb = getClient();
  if (!sb || !jobId) return;
  const { error } = await sb
    .from('automation_jobs')
    .update({
      status,
      result: result ?? null,
      error_message: errorMessage ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq('id', jobId);
  if (error) console.error('[automation/db] finishJob:', error.message);
}
