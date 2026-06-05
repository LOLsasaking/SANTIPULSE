import { body, method, send, nowIso } from '../../../_lib/adminHttp.js';
import { insertRow } from '../../../_lib/adminDb.js';

export default async function handler(req, res) {
  if (!method(req, res, ['GET', 'POST'])) return;
  if (req.method === 'GET') return send(res, 200, { ok: true, message: 'Webhook endpoint is installed. Configure provider verification before production writes.' });
  const payload = await body(req);
  const { row, error } = await insertRow('admin_webhook_events', {
    owner_id: payload.owner_id || null,
    source: req.url,
    event_type: payload.type || payload.event || 'provider_event',
    payload,
    received_at: nowIso()
  });
  if (error) return send(res, 500, { error: error.message });
  send(res, 202, { accepted: true, event: row });
}
