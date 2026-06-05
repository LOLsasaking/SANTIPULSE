/* ============================================================
   Recepcionista IA — data layer + SOS escalation (ESM, service_role)
   ------------------------------------------------------------
   CRM helpers shared by the dashboard endpoints and the Vapi /
   WhatsApp webhooks: config, leads (upsert by phone), calls,
   messages, bookings, and the human-SOS alert path.

   All writes use admin() (service_role); every query is scoped by
   user_id in code. Mirrors backend/_lib/automations.js conventions.
   ============================================================ */
import { admin } from './auth.js';
import { sendText as waSendText } from './whatsapp.js';

/* ── Config ─────────────────────────────────────────────────────────────── */
export async function getConfig(userId) {
  const sb = admin();
  if (!sb) return null;
  const { data } = await sb.from('receptionist_config').select('*').eq('user_id', userId).maybeSingle();
  return data || null;
}

const CONFIG_FIELDS = [
  'is_active', 'vapi_assistant_id', 'vapi_phone_number_id', 'phone_number', 'greeting',
  'whatsapp_phone_id', 'whatsapp_display', 'booking_enabled', 'booking_provider',
  'booking_timezone', 'booking_slot_minutes', 'booking_hours',
  'sos_enabled', 'sos_email', 'sos_whatsapp', 'sos_keywords',
];

export async function saveConfig(userId, body) {
  const sb = admin();
  if (!sb) return null;
  const patch = { user_id: userId };
  for (const k of CONFIG_FIELDS) if (body[k] !== undefined) patch[k] = body[k];
  const { data, error } = await sb.from('receptionist_config')
    .upsert(patch, { onConflict: 'user_id' }).select('*').single();
  if (error) { console.error('[receptionist] saveConfig:', error.message); return null; }
  return data;
}

/* ── Leads (CRM) ────────────────────────────────────────────────────────── */
/** Upsert a lead by (user, phone). Returns the lead row. */
export async function upsertLead(userId, { name, phone, email, source = 'voice', intent, profileData }) {
  const sb = admin();
  if (!sb) return null;
  const now = new Date().toISOString();
  // Find existing by phone first (upsert with partial unique index isn't directly
  // expressible via supabase-js onConflict for a WHERE-filtered index, so do it by hand).
  let existing = null;
  if (phone) {
    const { data } = await sb.from('receptionist_leads')
      .select('*').eq('user_id', userId).eq('phone', phone).maybeSingle();
    existing = data || null;
  }
  if (existing) {
    const patch = { last_contact_at: now };
    if (name && !existing.name) patch.name = name;
    if (email && !existing.email) patch.email = email;
    if (intent) patch.intent = intent;
    if (profileData) patch.profile_data = { ...(existing.profile_data || {}), ...profileData };
    const { data } = await sb.from('receptionist_leads')
      .update(patch).eq('id', existing.id).select('*').single();
    return data || existing;
  }
  const { data, error } = await sb.from('receptionist_leads').insert({
    user_id: userId, name: name || null, phone: phone || null, email: email || null,
    source, intent: intent || null, profile_data: profileData || null,
    status: 'new', last_contact_at: now,
  }).select('*').single();
  if (error) { console.error('[receptionist] upsertLead:', error.message); return null; }
  return data;
}

export async function listLeads(userId, limit = 100) {
  const sb = admin();
  if (!sb) return [];
  const { data } = await sb.from('receptionist_leads')
    .select('*').eq('user_id', userId).order('last_contact_at', { ascending: false }).limit(limit);
  return data || [];
}

/* ── Calls ──────────────────────────────────────────────────────────────── */
/** Upsert a call by (provider, provider_call_id). */
export async function upsertCall(userId, call) {
  const sb = admin();
  if (!sb) return null;
  const row = { user_id: userId, ...call };
  const { data, error } = await sb.from('receptionist_calls')
    .upsert(row, { onConflict: 'provider,provider_call_id', ignoreDuplicates: false })
    .select('*').maybeSingle();
  if (error) {
    // Fallback for rows without provider_call_id (no conflict target): plain insert.
    const { data: ins } = await sb.from('receptionist_calls').insert(row).select('*').maybeSingle();
    return ins || null;
  }
  return data;
}

export async function listCalls(userId, limit = 50) {
  const sb = admin();
  if (!sb) return [];
  const { data } = await sb.from('receptionist_calls')
    .select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(limit);
  return data || [];
}

/* ── Messages (WhatsApp thread) ─────────────────────────────────────────── */
export async function insertMessage(userId, msg) {
  const sb = admin();
  if (!sb) return null;
  const { data, error } = await sb.from('receptionist_messages')
    .insert({ user_id: userId, ...msg }).select('*').maybeSingle();
  if (error && !/duplicate key/i.test(error.message)) {
    console.error('[receptionist] insertMessage:', error.message);
  }
  return data || null;
}

export async function listMessages(userId, leadId, limit = 100) {
  const sb = admin();
  if (!sb) return [];
  let q = sb.from('receptionist_messages').select('*').eq('user_id', userId);
  if (leadId) q = q.eq('lead_id', leadId);
  const { data } = await q.order('created_at', { ascending: false }).limit(limit);
  return data || [];
}

/* ── Bookings ───────────────────────────────────────────────────────────── */
export async function insertBooking(userId, booking) {
  const sb = admin();
  if (!sb) return null;
  const { data, error } = await sb.from('receptionist_bookings')
    .insert({ user_id: userId, ...booking }).select('*').single();
  if (error) { console.error('[receptionist] insertBooking:', error.message); return null; }
  return data;
}

export async function listBookings(userId, limit = 100) {
  const sb = admin();
  if (!sb) return [];
  const { data } = await sb.from('receptionist_bookings')
    .select('*').eq('user_id', userId).order('starts_at', { ascending: true }).limit(limit);
  return data || [];
}

/* ── Human SOS ──────────────────────────────────────────────────────────── */
/** Decide if a transcript/message warrants escalation, given config keywords. */
export function shouldEscalate(text, config) {
  if (!config?.sos_enabled || !text) return false;
  const keywords = config.sos_keywords || [];
  const low = String(text).toLowerCase();
  return keywords.some((k) => low.includes(String(k).toLowerCase()));
}

/** Fire a human-SOS alert: log it + notify via email and/or WhatsApp.
    `ctx`: { leadId, callId, reason, detail, channel }. Returns the alert row. */
export async function raiseSos(userId, config, profile, ctx = {}) {
  const sb = admin();
  if (!sb) return null;
  const channels = [];

  // 1) Email via Resend (best-effort)
  if (config?.sos_email && process.env.RESEND_API_KEY) {
    try {
      await sendSosEmail(config.sos_email, profile, ctx);
      channels.push('email');
    } catch (e) { console.error('[receptionist] sos email:', e.message); }
  }
  // 2) WhatsApp to a human (best-effort) — uses the user's own WA connection
  if (config?.sos_whatsapp && profile?.whatsapp_token && config.whatsapp_phone_id) {
    try {
      const body = `🚨 SOS Recepcionista IA\nMotivo: ${ctx.reason || 'escalación'}\n${ctx.detail || ''}`.slice(0, 900);
      const r = await waSendText({ token: profile.whatsapp_token, phoneId: config.whatsapp_phone_id, to: config.sos_whatsapp, body });
      if (r.ok) channels.push('whatsapp');
    } catch (e) { console.error('[receptionist] sos whatsapp:', e.message); }
  }

  const { data } = await sb.from('receptionist_sos_alerts').insert({
    user_id: userId, lead_id: ctx.leadId || null, call_id: ctx.callId || null,
    reason: (ctx.reason || 'escalación').slice(0, 255), detail: ctx.detail || null,
    channel: ctx.channel || null, notified_via: channels.join(',') || null,
  }).select('*').maybeSingle();
  return data || null;
}

export async function listSos(userId, limit = 50) {
  const sb = admin();
  if (!sb) return [];
  const { data } = await sb.from('receptionist_sos_alerts')
    .select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(limit);
  return data || [];
}

async function sendSosEmail(to, profile, ctx) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.LEAD_NOTIFY_FROM || 'onboarding@resend.dev';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const html = `<h2>🚨 SOS — Recepcionista IA</h2>` +
    `<p><b>Negocio:</b> ${esc(profile?.business_name || '')}</p>` +
    `<p><b>Canal:</b> ${esc(ctx.channel || '')}</p>` +
    `<p><b>Motivo:</b> ${esc(ctx.reason || 'escalación')}</p>` +
    (ctx.detail ? `<p><b>Detalle:</b><br/>${esc(ctx.detail).replace(/\n/g, '<br/>')}</p>` : '') +
    `<p>Una persona del equipo debe responder lo antes posible.</p>`;
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: `Santipulse <${from}>`, to: [to], subject: 'SOS — Recepcionista IA necesita un humano', html }),
  });
  if (!resp.ok) { const t = await resp.text().catch(() => ''); throw new Error(`Resend ${resp.status}: ${t}`); }
}
