/* ============================================================
   /api/automations/social  — manage the Social Scheduler automation
   ------------------------------------------------------------
   Auth + active subscription required.
     GET                              → { accounts[], posts[] }
     POST { action:'schedule', account_id, caption, media_url, scheduled_for }
                                      → create a scheduled post
     POST { action:'cancel', id }     → cancel a scheduled post
   Publishing is done by the cron worker.
   ============================================================ */
import { requireUser, admin } from '../_lib/auth.js';
import { getProfile, hasActiveSubscription } from '../_lib/profile.js';
import { parseBody, isValidHttpUrl } from '../_lib/http.js';
import { listAccounts } from '../_lib/socialMedia.js';

const MAX_CAPTION = 2200; // IG caption limit

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
    const accounts = await listAccounts(user.id);
    const { data: posts } = await sb.from('scheduled_posts')
      .select('id, account_id, caption, media_url, scheduled_for, status, external_post_id, last_error, created_at')
      .eq('user_id', user.id).order('scheduled_for', { ascending: false }).limit(50);
    return res.status(200).json({ accounts, posts: posts || [] });
  }

  if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return res.status(405).json({ error: 'method' }); }

  const body = parseBody(req);
  const action = body.action;

  if (action === 'schedule') {
    const accountId = body.account_id;
    if (!accountId) return res.status(400).json({ error: 'no_account' });
    // Verify the account belongs to this user (defense in depth; RLS also scopes).
    const { data: account } = await sb.from('social_accounts')
      .select('id, provider').eq('id', accountId).eq('user_id', user.id).eq('status', 'active').maybeSingle();
    if (!account) return res.status(400).json({ error: 'invalid_account' });

    const caption = body.caption ? String(body.caption).slice(0, MAX_CAPTION) : '';
    const mediaUrl = body.media_url ? String(body.media_url).trim() : null;
    if (mediaUrl && !isValidHttpUrl(mediaUrl)) return res.status(400).json({ error: 'invalid_media_url' });
    if (account.provider === 'instagram' && !mediaUrl) return res.status(400).json({ error: 'instagram_requires_media' });
    if (!caption && !mediaUrl) return res.status(400).json({ error: 'empty_post' });

    const when = new Date(body.scheduled_for);
    if (isNaN(when.getTime())) return res.status(400).json({ error: 'invalid_date' });
    if (when.getTime() < Date.now() - 60 * 1000) return res.status(400).json({ error: 'date_in_past' });

    const { data: row, error } = await sb.from('scheduled_posts').insert({
      user_id: user.id, account_id: accountId, caption, media_url: mediaUrl,
      scheduled_for: when.toISOString(), status: 'scheduled',
    }).select('*').single();
    if (error) { console.error('[social] schedule:', error.message); return res.status(500).json({ error: 'save_failed' }); }
    return res.status(200).json({ ok: true, post: row });
  }

  if (action === 'cancel') {
    if (!body.id) return res.status(400).json({ error: 'no_id' });
    const { data, error } = await sb.from('scheduled_posts')
      .update({ status: 'canceled' })
      .eq('id', body.id).eq('user_id', user.id).eq('status', 'scheduled')
      .select('id').maybeSingle();
    if (error) return res.status(500).json({ error: 'cancel_failed' });
    return res.status(200).json({ ok: !!data });
  }

  return res.status(400).json({ error: 'invalid_action' });
}
