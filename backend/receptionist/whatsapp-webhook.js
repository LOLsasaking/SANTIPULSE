/* ============================================================
   GET/POST /api/receptionist/whatsapp-webhook
   ------------------------------------------------------------
   Meta WhatsApp Cloud API webhook for the Recepcionista IA CRM.
     • GET  — Meta verification handshake (hub.challenge echo).
     • POST — inbound messages: store in the thread, upsert the lead,
              auto-reply, and raise a human SOS on escalation keywords.

   Public endpoint (Meta calls it). GET is gated by WHATSAPP_VERIFY_TOKEN;
   POST resolves the owning user from the WABA phone_number_id.
   ============================================================ */
import { getProfile } from '../_lib/profile.js';
import {
  isConfigured, verifyChallenge, parseInbound, ownerByPhoneId, sendText,
} from '../_lib/whatsapp.js';
import {
  upsertLead, insertMessage, raiseSos, shouldEscalate, getConfig,
} from '../_lib/receptionist.js';
import { parseBody } from '../_lib/http.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  // ── GET: Meta verification handshake ──
  if (req.method === 'GET') {
    const challenge = verifyChallenge(req.query || {});
    if (challenge !== null) { res.setHeader('Content-Type', 'text/plain'); return res.status(200).send(challenge); }
    return res.status(403).json({ error: 'verification_failed' });
  }

  if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return res.status(405).json({ error: 'method' }); }
  if (!isConfigured()) return res.status(503).json({ error: 'integration_not_configured' });

  const payload = parseBody(req);
  let inbound;
  try { inbound = parseInbound(payload); } catch { inbound = []; }
  if (!inbound.length) return res.status(200).json({ ok: true, ignored: 'no_messages' });

  for (const m of inbound) {
    try {
      const owner = await ownerByPhoneId(m.phoneId);
      if (!owner) continue; // not one of our connected numbers
      const { userId, profile, config } = owner;

      const lead = await upsertLead(userId, {
        name: m.contactName, phone: m.from, source: 'whatsapp',
      });
      await insertMessage(userId, {
        lead_id: lead?.id || null, channel: 'whatsapp', direction: 'inbound',
        provider_msg_id: m.providerMsgId, from_number: m.from, to_number: m.to,
        body: m.body, status: 'received',
      });

      // Escalate on keyword.
      const cfg = config || await getConfig(userId);
      if (shouldEscalate(m.body, cfg)) {
        const p = profile || await getProfile(userId);
        await raiseSos(userId, cfg, p, {
          leadId: lead?.id || null,
          reason: 'Mensaje de WhatsApp marcado como urgente',
          detail: m.body, channel: 'whatsapp',
        });
      }

      // Auto-reply (best-effort). Uses the user's own WA connection.
      if (cfg?.is_active !== false && profile?.whatsapp_token && cfg?.whatsapp_phone_id) {
        const reply = await buildReply(m, profile, cfg);
        if (reply) {
          const r = await sendText({ token: profile.whatsapp_token, phoneId: cfg.whatsapp_phone_id, to: m.from, body: reply });
          await insertMessage(userId, {
            lead_id: lead?.id || null, channel: 'whatsapp', direction: 'outbound',
            provider_msg_id: r.id || null, from_number: m.to, to_number: m.from,
            body: reply, status: r.ok ? 'sent' : 'failed',
          });
        }
      }
    } catch (err) {
      console.error('[whatsapp-webhook]', err.message);
    }
  }

  return res.status(200).json({ ok: true, processed: inbound.length });
}

/* Build the auto-reply. If OPENAI_API_KEY is present, generate a contextual
   answer; otherwise fall back to a friendly fixed acknowledgement so the CRM
   still responds without an LLM configured. */
async function buildReply(m, profile, config) {
  const business = profile?.business_name || 'el negocio';
  const fallback = `Hola${m.contactName ? ' ' + m.contactName.split(' ')[0] : ''}, gracias por escribir a ${business}. `
    + `Hemos recibido tu mensaje y te respondemos enseguida. ¿En qué podemos ayudarte?`;

  if (!process.env.OPENAI_API_KEY || !m.body) return fallback;
  try {
    const system = `Eres la recepcionista de WhatsApp de ${business}. Responde en español, breve y cálido. `
      + `Ayuda a calificar al cliente y, si quiere una cita, pide día y hora preferida. No inventes precios.`;
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: system }, { role: 'user', content: m.body }],
        max_tokens: 200, temperature: 0.6,
      }),
    });
    const json = await resp.json().catch(() => ({}));
    const text = json?.choices?.[0]?.message?.content?.trim();
    return text || fallback;
  } catch (err) {
    console.error('[whatsapp-webhook] buildReply:', err.message);
    return fallback;
  }
}
