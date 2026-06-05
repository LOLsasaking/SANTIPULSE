import { requireUser } from '../../_lib/auth.js';
import { method, body, send, nowIso } from '../../_lib/adminHttp.js';
import { listRows } from '../../_lib/adminDb.js';

export default async function handler(req, res) {
  const { route } = req.query;
  const path = Array.isArray(route) ? route.join('/') : route;

  // Webhooks
  if (path === 'webhooks/meta') return send(res, 200, { received: true, provider: 'meta', ts: nowIso() });
  if (path === 'webhooks/tiktok') return send(res, 200, { received: true, provider: 'tiktok', ts: nowIso() });

  // Auth
  const user = await requireUser(req, res);
  if (!user) return;

  if (path === 'trends') {
    if (!method(req, res, ['GET'])) return;
    const { rows, error } = await listRows('admin_social_trends', user.id, 'score');
    if (error) return send(res, 500, { error: error.message });
    return send(res, 200, { trends: rows });
  }

  if (path === 'queue') {
    if (!method(req, res, ['GET'])) return;
    const { rows, error } = await listRows('admin_social_posts', user.id, 'scheduled_at');
    if (error) return send(res, 500, { error: error.message });
    return send(res, 200, { posts: rows });
  }

  if (path === 'integrations') {
    if (!method(req, res, ['GET'])) return;
    return send(res, 200, { accounts: ['instagram', 'tiktok'], status: 'connected' });
  }

  return send(res, 404, { error: 'route_not_found', path });
}
