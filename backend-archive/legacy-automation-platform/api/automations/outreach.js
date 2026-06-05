/* ============================================================
   /api/automations/outreach  — manage the Cold Outreach automation
   ------------------------------------------------------------
   Auth + active subscription required.
     GET                          → { campaign, jobs[], stats }
     POST { action:'save', name, steps, from_name, daily_cap }
                                  → upsert the single campaign
     POST { action:'import', recipients:[{email,name,company}] }
                                  → add prospects as jobs (deduped)
   Sending is done by the cron worker.
   ============================================================ */
import { requireUser, admin } from '../_lib/auth.js';
import { getProfile, hasActiveSubscription } from '../_lib/profile.js';
import { parseBody } from '../_lib/http.js';
import { importOutreachJobs } from '../_lib/automations.js';
import { sanitizeSteps } from '../_lib/sequence.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function getCampaign(userId) {
  const sb = admin();
  if (!sb) return null;
  const { data } = await sb.from('outreach_campaigns')
    .select('*').eq('user_id', userId).order('created_at', { ascending: true }).limit(1).maybeSingle();
  return data || null;
}

// Accept recipients as a structured array OR a pasted block of
// "email, name, company" lines. Returns clean, deduped recipients.
function normalizeRecipients(body) {
  let list = [];
  if (Array.isArray(body.recipients)) {
    list = body.recipients;
  } else if (typeof body.recipients_text === 'string') {
    list = body.recipients_text.split(/\r?\n/).map((line) => {
      const [email, name, company] = line.split(',').map((x) => (x || '').trim());
      return { email, name, company };
    });
  }
  const seen = new Set();
  const out = [];
  for (const r of list.slice(0, 1000)) {
    const email = (r.email || '').trim().toLowerCase();
    if (!EMAIL_RE.test(email) || seen.has(email)) continue;
    seen.add(email);
    out.push({
      email,
      name: r.name ? String(r.name).slice(0, 255) : null,
      company: r.company ? String(r.company).slice(0, 255) : null,
    });
  }
  return out;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const user = await requireUser(req, res);
  if (!user) return;

  const profile = await getProfile(user.id);
  if (!hasActiveSubscription(profile)) {
    return res.status(402).json({ error: 'needs_subscription', upgradeUrl: '/precios/' });
  }
  const sb = admin();
  if (!sb) return res.status(503).json({ error: 'db_not_configured' });

  if (req.method === 'GET') {
    const campaign = await getCampaign(user.id);
    const { data: jobs } = await sb.from('outreach_jobs')
      .select('id, recipient_email, recipient_name, company, step_index, status, next_send_at, created_at')
      .eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
    return res.status(200).json({ campaign, jobs: jobs || [] });
  }

  if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return res.status(405).json({ error: 'method' }); }

  const body = parseBody(req);
  const action = body.action;

  if (action === 'save') {
    const steps = sanitizeSteps(body.steps);
    if (!steps.length) return res.status(400).json({ error: 'no_steps' });
    let dailyCap = parseInt(body.daily_cap, 10);
    if (!Number.isFinite(dailyCap) || dailyCap < 1) dailyCap = 50;
    dailyCap = Math.min(dailyCap, 500);
    const patch = {
      user_id: user.id,
      name: String(body.name || 'Cold Outreach').slice(0, 255),
      steps,
      from_name: body.from_name ? String(body.from_name).slice(0, 255) : null,
      daily_cap: dailyCap,
      is_active: body.is_active !== false,
    };
    const existing = await getCampaign(user.id);
    let row;
    if (existing) {
      ({ data: row } = await sb.from('outreach_campaigns').update(patch).eq('id', existing.id).eq('user_id', user.id).select('*').single());
    } else {
      ({ data: row } = await sb.from('outreach_campaigns').insert(patch).select('*').single());
    }
    return res.status(200).json({ ok: true, campaign: row });
  }

  if (action === 'import') {
    const campaign = await getCampaign(user.id);
    if (!campaign) return res.status(400).json({ error: 'no_campaign' });
    const recipients = normalizeRecipients(body);
    if (!recipients.length) return res.status(400).json({ error: 'no_recipients' });
    const imported = await importOutreachJobs(user.id, campaign, recipients);
    return res.status(200).json({ ok: true, received: recipients.length, imported });
  }

  return res.status(400).json({ error: 'invalid_action' });
}
