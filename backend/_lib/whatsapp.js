/* ============================================================
   WhatsApp Cloud API integration (Meta) — ESM
   ------------------------------------------------------------
   Recepcionista IA's chat transport. Uses Meta's WhatsApp Business
   Cloud API directly (cheapest reliable option: free service
   conversations tier, no per-message middleman markup).

   Per-user creds live on profiles: whatsapp_token + the phone
   number id in receptionist_config.whatsapp_phone_id. App-level
   webhook verify token + a global system token (optional) live in env.

   Fully env-gated for inbound webhook verification. Outbound sends
   use the per-user token, so a user with a connected number can send
   even if no global token is set.
   ============================================================ */
import { admin } from './auth.js';

const GRAPH = 'https://graph.facebook.com/v21.0';

/** Inbound webhook is "configured" once a verify token exists. */
export function isConfigured() {
  return !!process.env.WHATSAPP_VERIFY_TOKEN;
}

/** Meta webhook GET handshake. Returns the challenge string to echo, or null. */
export function verifyChallenge(query) {
  const mode = query['hub.mode'];
  const token = query['hub.verify_token'];
  const challenge = query['hub.challenge'];
  if (mode === 'subscribe' && token && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return challenge || '';
  }
  return null;
}

/** Send a free-form text message. `token` is the user's whatsapp_token,
    `phoneId` is their WABA phone_number_id. Returns { ok, id }. */
export async function sendText({ token, phoneId, to, body }) {
  if (!token || !phoneId) return { ok: false, error: 'whatsapp_not_connected' };
  if (!to || !body) return { ok: false, error: 'missing_params' };
  try {
    const resp = await fetch(`${GRAPH}/${phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { preview_url: false, body: String(body).slice(0, 4096) },
      }),
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const msg = json?.error?.message || `whatsapp ${resp.status}`;
      return { ok: false, error: msg };
    }
    return { ok: true, id: json.messages?.[0]?.id || null };
  } catch (err) {
    console.error('[whatsapp] sendText:', err.message);
    return { ok: false, error: err.message };
  }
}

/** Send a pre-approved template (needed to open a conversation > 24h window). */
export async function sendTemplate({ token, phoneId, to, template, language = 'es', components = [] }) {
  if (!token || !phoneId) return { ok: false, error: 'whatsapp_not_connected' };
  try {
    const resp = await fetch(`${GRAPH}/${phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: { name: template, language: { code: language }, components },
      }),
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) return { ok: false, error: json?.error?.message || `whatsapp ${resp.status}` };
    return { ok: true, id: json.messages?.[0]?.id || null };
  } catch (err) {
    console.error('[whatsapp] sendTemplate:', err.message);
    return { ok: false, error: err.message };
  }
}

/** Extract inbound messages from a Meta webhook payload.
    Returns an array of { providerMsgId, from, to, body, mediaUrl, phoneId, contactName }. */
export function parseInbound(payload) {
  const out = [];
  const entries = payload?.entry || [];
  for (const entry of entries) {
    for (const change of entry.changes || []) {
      const value = change.value || {};
      const phoneId = value.metadata?.phone_number_id || null;
      const display = value.metadata?.display_phone_number || null;
      const contacts = {};
      for (const c of value.contacts || []) contacts[c.wa_id] = c.profile?.name || null;
      for (const m of value.messages || []) {
        out.push({
          providerMsgId: m.id || null,
          from: m.from || null,
          to: display,
          phoneId,
          contactName: contacts[m.from] || null,
          body: m.text?.body || m.button?.text || m.interactive?.list_reply?.title
            || m.interactive?.button_reply?.title || null,
          mediaUrl: null, // media requires a follow-up media fetch; not stored inline
          type: m.type || 'text',
          timestamp: m.timestamp ? new Date(Number(m.timestamp) * 1000).toISOString() : null,
        });
      }
    }
  }
  return out;
}

/** Look up the owning user for an inbound message by its WABA phone_number_id.
    Matches receptionist_config.whatsapp_phone_id. Returns { userId, profile, config } or null. */
export async function ownerByPhoneId(phoneId) {
  const sb = admin();
  if (!sb || !phoneId) return null;
  const { data: config } = await sb.from('receptionist_config')
    .select('*').eq('whatsapp_phone_id', phoneId).maybeSingle();
  if (!config) return null;
  const { data: profile } = await sb.from('profiles')
    .select('id, whatsapp_token, business_name').eq('id', config.user_id).maybeSingle();
  return { userId: config.user_id, profile: profile || null, config };
}
