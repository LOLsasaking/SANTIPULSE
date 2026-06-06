/* ============================================================
   GET/POST /api/cron/process  — the background worker (Vercel Cron)
   ------------------------------------------------------------
   Runs on a schedule (see vercel.json "crons"). One invocation drains a
   bounded batch of DUE work across all three automations:
     • cart_recovery_jobs   — send the next sequence step via the owner's Gmail
     • outreach_jobs        — send the next sequence step via the owner's Gmail
     • scheduled_posts      — publish via the owner's connected social account

   Auth: Vercel Cron sends  Authorization: Bearer <CRON_SECRET>.  We reject
   anything else, so the endpoint can't be triggered by the public. If
   CRON_SECRET is unset, the worker refuses to run (fail-closed).

   Idempotent-ish: each item is flipped to a 'sending'/'publishing' state
   before the network call and only advanced on success, so a crash mid-batch
   leaves it retryable. Batches are small to stay under the function timeout.
   ============================================================ */
import { admin } from '../_lib/auth.js';
import { getProfile } from '../_lib/profile.js';
import { sendAs, isConfigured as gmailConfigured } from '../_lib/gmail.js';
import { publish, isConfigured as socialConfigured } from '../_lib/socialMedia.js';
import { renderTemplate } from '../_lib/sequence.js';
import { createTrackingToken, countEmailsThisMonth, countPostsThisMonth } from '../_lib/automations.js';
import { limitsFor } from '../_lib/products.js';

const BATCH = 15;           // max items per automation per run
const SITE = (process.env.SITE_URL || 'https://santipulse.com').replace(/\/$/, '');

function authorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // fail closed
  const h = req.headers['authorization'] || '';
  return h === `Bearer ${secret}`;
}

// Append the open pixel (+ wrap nothing else — link tracking is opt-in per link
// via {{track}} not auto-rewrite, to keep bodies predictable).
function withPixel(html, token) {
  if (!token) return html;
  const pixel = `<img src="${SITE}/api/track/${token}" width="1" height="1" alt="" style="display:none">`;
  return `${html}\n${pixel}`;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!authorized(req)) return res.status(401).json({ error: 'unauthorized' });

  const sb = admin();
  if (!sb) return res.status(503).json({ error: 'db_not_configured' });

  const summary = { cart: 0, outreach: 0, posts: 0, skipped: 0, errors: 0 };
  const nowIso = new Date().toISOString();

  // Per-run cache of owner profiles (avoid refetching for batched same-user jobs).
  const profileCache = new Map();
  async function ownerProfile(userId) {
    if (profileCache.has(userId)) return profileCache.get(userId);
    const p = await getProfile(userId);
    profileCache.set(userId, p);
    return p;
  }

  // Per-run monthly-quota tracker. Counts are loaded once per owner from the DB,
  // then decremented locally as this run sends/publishes — so a user can't blow
  // past their plan's emailsPerMonth / postsPerMonth even within one batch.
  const quotaCache = new Map(); // userId -> { emails, posts, limits }
  async function quotaFor(userId, profile) {
    if (quotaCache.has(userId)) return quotaCache.get(userId);
    const plan = (profile && profile.plan) || 'none';
    const limits = limitsFor(plan);
    const [emails, posts] = await Promise.all([countEmailsThisMonth(userId), countPostsThisMonth(userId)]);
    const q = { emails, posts, limits };
    quotaCache.set(userId, q);
    return q;
  }

  // ── 1. Cart recovery ──────────────────────────────────────────────────────
  if (gmailConfigured()) {
    const { data: cartJobs } = await sb.from('cart_recovery_jobs')
      .select('*').eq('status', 'pending').lte('next_send_at', nowIso)
      .order('next_send_at', { ascending: true }).limit(BATCH);
    for (const job of cartJobs || []) {
      try {
        const campaign = await getCampaign(sb, 'cart_recovery_campaigns', job.campaign_id);
        if (!campaign || !campaign.is_active) { await finishCart(sb, job.id, 'stopped'); continue; }
        const step = (campaign.steps || [])[job.step_index];
        if (!step) { await finishCart(sb, job.id, 'completed'); continue; }

        const profile = await ownerProfile(job.user_id);
        if (!profile || !profile.gmail_refresh_token) { await failItem(sb, 'cart_recovery_jobs', job.id, 'gmail_not_connected'); summary.errors++; continue; }

        const q = await quotaFor(job.user_id, profile);
        if (q.emails >= q.limits.emailsPerMonth) { summary.skipped++; continue; } // leave pending; retried next cycle/month

        await sb.from('cart_recovery_jobs').update({ status: 'sending' }).eq('id', job.id);
        const data = {
          name: job.customer_name || '', email: job.customer_email,
          cart_value: job.cart_value || '', recovery_url: job.recovery_url || '',
          discount_code: campaign.discount_code || '',
        };
        const token = await createTrackingToken({ userId: job.user_id, source: 'cart', jobId: job.id, stepIndex: job.step_index, recipient: job.customer_email });
        const html = withPixel(renderTemplate(step.body, data), token);
        const r = await sendAs(profile, { to: job.customer_email, subject: renderSubject(step.subject, data), html, fromName: campaign.from_name });
        if (!r.ok) { await failItem(sb, 'cart_recovery_jobs', job.id, r.error); summary.errors++; continue; }

        q.emails++;
        await advance(sb, 'cart_recovery_jobs', job, campaign.steps);
        summary.cart++;
      } catch (err) { console.error('[cron/cart]', err.message); summary.errors++; }
    }
  }

  // ── 2. Cold outreach ──────────────────────────────────────────────────────
  if (gmailConfigured()) {
    const { data: outJobs } = await sb.from('outreach_jobs')
      .select('*').eq('status', 'pending').lte('next_send_at', nowIso)
      .order('next_send_at', { ascending: true }).limit(BATCH);
    for (const job of outJobs || []) {
      try {
        const campaign = await getCampaign(sb, 'outreach_campaigns', job.campaign_id);
        if (!campaign || !campaign.is_active) { await finishItem(sb, 'outreach_jobs', job.id, 'stopped'); continue; }
        const step = (campaign.steps || [])[job.step_index];
        if (!step) { await finishItem(sb, 'outreach_jobs', job.id, 'completed'); continue; }

        const profile = await ownerProfile(job.user_id);
        if (!profile || !profile.gmail_refresh_token) { await failItem(sb, 'outreach_jobs', job.id, 'gmail_not_connected'); summary.errors++; continue; }

        const q = await quotaFor(job.user_id, profile);
        if (q.emails >= q.limits.emailsPerMonth) { summary.skipped++; continue; } // leave pending; retried next cycle/month

        await sb.from('outreach_jobs').update({ status: 'sending' }).eq('id', job.id);
        const data = {
          name: job.recipient_name || '', email: job.recipient_email,
          company: job.company || '', ...(job.merge_data || {}),
        };
        const token = await createTrackingToken({ userId: job.user_id, source: 'outreach', jobId: job.id, stepIndex: job.step_index, recipient: job.recipient_email });
        const html = withPixel(renderTemplate(step.body, data), token);
        const r = await sendAs(profile, { to: job.recipient_email, subject: renderSubject(step.subject, data), html, fromName: campaign.from_name });
        if (!r.ok) { await failItem(sb, 'outreach_jobs', job.id, r.error); summary.errors++; continue; }

        q.emails++;
        await advance(sb, 'outreach_jobs', job, campaign.steps);
        summary.outreach++;
      } catch (err) { console.error('[cron/outreach]', err.message); summary.errors++; }
    }
  }

  // ── 3. Social scheduler ───────────────────────────────────────────────────
  if (socialConfigured()) {
    const { data: posts } = await sb.from('scheduled_posts')
      .select('*').eq('status', 'scheduled').lte('scheduled_for', nowIso)
      .order('scheduled_for', { ascending: true }).limit(BATCH);
    for (const post of posts || []) {
      try {
        const profile = await ownerProfile(post.user_id);
        const q = await quotaFor(post.user_id, profile);
        if (q.posts >= q.limits.postsPerMonth) { summary.skipped++; continue; } // leave scheduled; retried next month

        await sb.from('scheduled_posts').update({ status: 'publishing' }).eq('id', post.id);
        const { data: account } = await sb.from('social_accounts')
          .select('*').eq('id', post.account_id).eq('status', 'active').maybeSingle();
        if (!account) { await failPost(sb, post.id, 'account_not_connected'); summary.errors++; continue; }

        const r = await publish(account, { caption: post.caption, mediaUrl: post.media_url });
        if (!r.ok) { await failPost(sb, post.id, r.error); summary.errors++; continue; }

        await sb.from('scheduled_posts').update({ status: 'published', external_post_id: r.id || null, last_error: null }).eq('id', post.id);
        await sb.from('post_logs').insert({ post_id: post.id, user_id: post.user_id, status: 'published', detail: r.id || null });
        q.posts++;
        summary.posts++;
      } catch (err) { console.error('[cron/social]', err.message); summary.errors++; }
    }
  }

  return res.status(200).json({ ok: true, processed: summary, at: nowIso });
}

// ── helpers ───────────────────────────────────────────────────────────────────
async function getCampaign(sb, tableName, id) {
  const { data } = await sb.from(tableName).select('*').eq('id', id).maybeSingle();
  return data || null;
}

function renderSubject(subject, data) {
  // subjects are plain text: fill merge tags, strip the <br> conversion
  return renderTemplate(subject, data).replace(/<br>\n?/g, ' ').trim();
}

// Advance a sequence job to its next step, or mark completed if none left.
async function advance(sb, tableName, job, steps) {
  const nextIndex = job.step_index + 1;
  const nextStep = (steps || [])[nextIndex];
  if (!nextStep) {
    await sb.from(tableName).update({ status: 'completed', step_index: nextIndex }).eq('id', job.id);
    return;
  }
  const nextSend = new Date(Date.now() + (nextStep.delay_minutes || 0) * 60 * 1000).toISOString();
  await sb.from(tableName).update({ status: 'pending', step_index: nextIndex, next_send_at: nextSend, last_error: null }).eq('id', job.id);
}

async function finishCart(sb, id, status) { await sb.from('cart_recovery_jobs').update({ status }).eq('id', id); }
async function finishItem(sb, tableName, id, status) { await sb.from(tableName).update({ status }).eq('id', id); }
async function failItem(sb, tableName, id, error) {
  await sb.from(tableName).update({ status: 'pending', last_error: String(error || 'failed').slice(0, 500) }).eq('id', id);
}
async function failPost(sb, id, error) {
  await sb.from('scheduled_posts').update({ status: 'failed', last_error: String(error || 'failed').slice(0, 500) }).eq('id', id);
}
