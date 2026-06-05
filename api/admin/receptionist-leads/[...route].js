import { requireUser } from '../../_lib/auth.js';
import { method, body, send, nowIso } from '../../_lib/adminHttp.js';
import { listRows, insertRow, updateRow, deleteRow } from '../../_lib/adminDb.js';

export default async function handler(req, res) {
  const { route } = req.query;
  const path = Array.isArray(route) ? route.join('/') : route;

  // Handle Webhooks (Public)
  if (path === 'webhooks/vapi') return send(res, 200, { received: true, provider: 'vapi', ts: nowIso() });
  if (path === 'webhooks/bland') return send(res, 200, { received: true, provider: 'bland', ts: nowIso() });
  if (path === 'webhooks/whatsapp') return send(res, 200, { received: true, provider: 'whatsapp', ts: nowIso() });

  // Handle Admin Routes (Auth Required)
  const user = await requireUser(req, res);
  if (!user) return;

  if (path === 'leads') {
    if (!method(req, res, ['GET', 'POST'])) return;
    if (req.method === 'GET') {
      const { rows, error } = await listRows('admin_receptionist_leads', user.id, 'updated_at');
      if (error) return send(res, 500, { error: error.message });
      return send(res, 200, { leads: rows });
    }
    const input = await body(req);
    const { row, error } = await insertRow('admin_receptionist_leads', {
      owner_id: user.id,
      name: input.name || 'New Lead',
      phone: input.phone || null,
      email: input.email || null,
      stage: input.stage || 'new',
      source: input.source || 'manual',
      notes: input.notes || null,
      created_at: nowIso(),
      updated_at: nowIso()
    });
    if (error) return send(res, 500, { error: error.message });
    return send(res, 201, { lead: row });
  }

  if (path === 'conversations') {
    if (!method(req, res, ['GET'])) return;
    const { rows, error } = await listRows('admin_receptionist_conversations', user.id, 'created_at');
    if (error) return send(res, 500, { error: error.message });
    return send(res, 200, { conversations: rows });
  }

  if (path === 'integrations') {
    if (!method(req, res, ['GET'])) return;
    const { rows, error } = await listRows('admin_receptionist_config', user.id);
    if (error) return send(res, 500, { error: error.message });
    return send(res, 200, { integrations: rows[0] || {} });
  }

  if (path === 'scheduling') {
    if (!method(req, res, ['GET'])) return;
    return send(res, 200, { slots: [], provider: 'calendly', ts: nowIso() });
  }

  if (path === 'human-sos') {
    if (!method(req, res, ['POST'])) return;
    return send(res, 200, { alerted: true, ts: nowIso() });
  }

  return send(res, 404, { error: 'route_not_found', path });
}
