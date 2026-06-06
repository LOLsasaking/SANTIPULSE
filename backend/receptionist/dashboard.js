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
import { requireUser } from '../lib/auth.js';
import { getProfile, hasActiveSubscription } from '../lib/profile.js';
import { parseBody } from '../lib/http.js';
import * as vapi from '../lib/vapi.js';
import * as wa from '../lib/whatsapp.js';
import * as cal from '../lib/calendar.js';
import { getVaultContext } from '../lib/vault.js';
import {
  getConfig, saveConfig, listLeads, listCalls, listMessages, listBookings, listSos,
} from '../lib/receptionist.js';

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
    const validation = validateReceptionistConfig(body);
    if (!validation.ok) {
      return res.status(400).json({
        error: 'missing_required_config',
        fields: validation.fields,
        message: validation.message,
      });
    }
    const saved = await saveConfig(user.id, body);
    if (!saved) return res.status(500).json({ error: 'save_failed' });
    return res.status(200).json({ ok: true, config: saved });
  }

  if (action === 'provision_assistant') {
    if (!vapi.isConfigured()) return res.status(503).json({ error: 'integration_not_configured' });
    const config = await getConfig(user.id);
    const vaultContext = await getVaultContext(user.id);
    const validation = validateReceptionistConfig({ ...config, ...body });
    if (!validation.ok) {
      return res.status(400).json({
        error: 'missing_required_config',
        fields: validation.fields,
        message: validation.message,
      });
    }
    try {
      const assistantId = await vapi.upsertAssistant({
        assistantId: config?.vapi_assistant_id || null,
        name: profile?.business_name || 'Recepcionista IA',
        greeting: config?.greeting || body.greeting,
        systemPrompt: buildReceptionistPrompt(profile, config, vaultContext),
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

function buildReceptionistPrompt(profile = {}, config = {}, vaultContext = '') {
  const business = profile?.business_name || 'el negocio';
  const industry = profile?.industry || 'servicios locales';
  const target = profile?.target_market || 'clientes potenciales';
  const greeting = config?.greeting || `Hola, gracias por llamar a ${business}.`;
  return [
    `Eres la Recepcionista IA de ${business}. Hablas espanol claro, calido y profesional.`,
    `Sector: ${industry}. Cliente ideal: ${target}.`,
    `Saludo preferido: ${greeting}`,
    'Objetivo: responder llamadas, captar nombre/telefono/motivo, detectar urgencia y ayudar a reservar.',
    'Si el cliente pide una persona, esta molesto o hay confusion, avisa que activaras SOS humano.',
    'No inventes precios, disponibilidad ni politicas. Si algo no esta en el contexto, pide confirmacion.',
    vaultContext ? `Boveda de Conocimiento del negocio:\n${vaultContext}` : '',
  ].filter(Boolean).join('\n');
}

function validateReceptionistConfig(body = {}) {
  const fields = [];
  const phone = String(body.phone_number || '').trim();
  const whatsappPhoneId = String(body.whatsapp_phone_id || '').trim();
  const sosEmail = String(body.sos_email || '').trim();

  if (!/^\+[1-9][0-9]{7,15}$/.test(phone)) fields.push('phone_number');
  if (!whatsappPhoneId) fields.push('whatsapp_phone_id');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sosEmail)) fields.push('sos_email');

  return {
    ok: fields.length === 0,
    fields,
    message: fields.length
      ? 'Completa el telefono, el numero de WhatsApp y el email SOS antes de guardar.'
      : 'ok',
  };
}
