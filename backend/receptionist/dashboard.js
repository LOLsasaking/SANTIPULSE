/* ============================================================
   GET/POST /api/receptionist/dashboard
   ------------------------------------------------------------
   Auth-gated dashboard API for Recepcionista IA.
     GET  → { config, leads, calls, messages, bookings, sos, status }
     POST → save config, or trigger an outbound call.
            body.action: 'save_config' | 'call' | 'provision_assistant'

   Status block tells the frontend which providers are configured so it
   can show Connect / Activate states (never exposes a token).
   ============================================================ */
import { requireUser } from '../_lib/auth.js';
import { getProfile, hasActiveSubscription } from '../_lib/profile.js';
import { parseBody } from '../_lib/http.js';
import * as vapi from '../_lib/vapi.js';
import * as wa from '../_lib/whatsapp.js';
import * as cal from '../_lib/calendar.js';
import {
  getConfig, saveConfig, listLeads, listCalls, listMessages, listBookings, listSos,
} from '../_lib/receptionist.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const user = await requireUser(req, res);
  if (!user) return;

  const profile = await getProfile(user.id);

  if (req.method === 'GET') {
    const [config, leads, calls, messages, bookings, sos] = await Promise.all([
      getConfig(user.id), listLeads(user.id), listCalls(user.id),
      listMessages(user.id), listBookings(user.id), listSos(user.id),
    ]);
    return res.status(200).json({
      config: config || null,
      leads, calls, messages, bookings, sos,
      status: {
        voice: { configured: vapi.isConfigured(), connected: !!config?.vapi_assistant_id },
        whatsapp: { configured: wa.isConfigured(), connected: !!config?.whatsapp_phone_id },
        calendar: { configured: cal.isConfigured(), connected: cal.isConnected(profile) },
      },
    });
  }

  if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return res.status(405).json({ error: 'method' }); }
  if (!hasActiveSubscription(profile)) return res.status(402).json({ error: 'needs_subscription', upgradeUrl: '/precios/' });

  const body = parseBody(req);
  const action = body.action || 'save_config';

  if (action === 'save_config') {
    const saved = await saveConfig(user.id, body);
    if (!saved) return res.status(500).json({ error: 'save_failed' });
    return res.status(200).json({ ok: true, config: saved });
  }

  if (action === 'provision_assistant') {
    if (!vapi.isConfigured()) return res.status(503).json({ error: 'integration_not_configured' });
    const config = await getConfig(user.id);
    try {
      const assistantId = await vapi.upsertAssistant({
        assistantId: config?.vapi_assistant_id || null,
        name: profile?.business_name || 'Recepcionista IA',
        greeting: config?.greeting || body.greeting,
        language: 'es',
      });
      if (!assistantId) return res.status(503).json({ error: 'provision_failed' });
      const saved = await saveConfig(user.id, { vapi_assistant_id: assistantId });
      return res.status(200).json({ ok: true, assistantId, config: saved });
    } catch (err) {
      console.error('[receptionist/dashboard] provision:', err.message);
      return res.status(500).json({ error: 'provision_failed', detail: err.message });
    }
  }

  if (action === 'call') {
    if (!vapi.isConfigured()) return res.status(503).json({ error: 'integration_not_configured' });
    const config = await getConfig(user.id);
    if (!config?.vapi_assistant_id || !config?.vapi_phone_number_id) {
      return res.status(400).json({ error: 'voice_not_connected' });
    }
    const to = String(body.to || '').trim();
    if (!/^\+?[0-9]{6,16}$/.test(to)) return res.status(400).json({ error: 'invalid_number' });
    const r = await vapi.placeOutboundCall({
      assistantId: config.vapi_assistant_id,
      phoneNumberId: config.vapi_phone_number_id,
      toNumber: to.startsWith('+') ? to : `+${to}`,
    });
    if (!r.ok) return res.status(502).json({ error: r.error });
    return res.status(200).json({ ok: true, callId: r.id, status: r.status });
  }

  return res.status(400).json({ error: 'unknown_action' });
}
