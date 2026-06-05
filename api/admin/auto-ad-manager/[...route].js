import { requireUser } from '../../_lib/auth.js';
import { method, body, send, nowIso } from '../../_lib/adminHttp.js';
import { listRows } from '../../_lib/adminDb.js';

export default async function handler(req, res) {
  const { route } = req.query;
  const path = Array.isArray(route) ? route.join('/') : route;

  // Webhooks
  if (path === 'webhooks/meta-ads') return send(res, 200, { received: true, provider: 'meta-ads', ts: nowIso() });
  if (path === 'webhooks/tiktok-ads') return send(res, 200, { received: true, provider: 'tiktok-ads', ts: nowIso() });

  // Auth
  const user = await requireUser(req, res);
  if (!user) return;

  if (path === 'campaigns') {
    if (!method(req, res, ['GET'])) return;
    const { rows, error } = await listRows('admin_ad_campaigns', user.id, 'spend');
    if (error) return send(res, 500, { error: error.message });
    return send(res, 200, { campaigns: rows });
  }

  if (path === 'rules') {
    if (!method(req, res, ['GET'])) return;
    return send(res, 200, { rules: [], active: true });
  }

  if (path === 'recommendations') {
    if (!method(req, res, ['GET'])) return;
    return send(res, 200, { insights: 'Lower CPC by 10% on campaign A', ts: nowIso() });
  }

  if (path === 'integrations') {
    if (!method(req, res, ['GET'])) return;
    return send(res, 200, { ads_accounts: ['meta', 'tiktok'], status: 'ready' });
  }

  return send(res, 404, { error: 'route_not_found', path });
}
