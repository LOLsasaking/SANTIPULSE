/* ============================================================
   Vapi voice integration (ESM)
   ------------------------------------------------------------
   Recepcionista IA's voice transport. Vapi orchestrates the call,
   the LLM, and TTS; we drive it with a server API key and receive
   call lifecycle + transcript events on a webhook.

   Fully env-gated: without VAPI_API_KEY, isConfigured() is false
   and endpoints respond 503. Plain fetch — no SDK dependency.

   Server key lives in env (never the browser). Per-user assistant +
   phone number ids live in receptionist_config.
   ============================================================ */

const API = 'https://api.vapi.ai';

export function isConfigured() {
  return !!process.env.VAPI_API_KEY;
}

function headers() {
  return {
    Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

async function vapiFetch(path, { method = 'GET', body } = {}) {
  const resp = await fetch(`${API}${path}`, {
    method,
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const msg = json?.message || json?.error || `vapi ${resp.status}`;
    throw new Error(Array.isArray(msg) ? msg.join('; ') : String(msg));
  }
  return json;
}

/** Verify the webhook secret Vapi includes on server-message requests.
    Vapi sends the configured server.secret as `x-vapi-secret`. Fail-closed
    if VAPI_WEBHOOK_SECRET is set; if unset, accept (dev) but warn once. */
let _warnedSecret = false;
export function verifyWebhook(req) {
  const expected = process.env.VAPI_WEBHOOK_SECRET;
  if (!expected) {
    if (!_warnedSecret) {
      console.warn('[vapi] VAPI_WEBHOOK_SECRET unset — webhook auth disabled.');
      _warnedSecret = true;
    }
    return true;
  }
  const got = req.headers['x-vapi-secret'] || req.headers['X-Vapi-Secret'] || '';
  return String(got) === expected;
}

/** Map a simple client-facing voice choice to a provider voice id. */
function voiceFor(voice, language = 'es') {
  const es = String(language).startsWith('es');
  const v = String(voice || 'femenina').toLowerCase();
  if (v.includes('masc') || v === 'male') {
    return { provider: 'azure', voiceId: es ? 'es-ES-AlvaroNeural' : 'en-US-GuyNeural' };
  }
  return { provider: 'azure', voiceId: es ? 'es-ES-ElviraNeural' : 'en-US-JennyNeural' };
}

/** Create/update an assistant for a user. Returns the assistant id.
    `opts`: { name, greeting, systemPrompt, voice, language }. */
export async function upsertAssistant({ assistantId, name, greeting, systemPrompt, voice, language = 'es' } = {}) {
  if (!isConfigured()) return null;
  const body = {
    name: name || 'Recepcionista IA',
    firstMessage: greeting || 'Hola, gracias por llamar. ¿En qué puedo ayudarte?',
    model: {
      provider: 'openai',
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt || defaultSystemPrompt(name) }],
    },
    voice: voiceFor(voice, language),
    transcriber: { provider: 'deepgram', language: language.slice(0, 2) },
    serverMessages: ['end-of-call-report', 'status-update', 'transcript'],
  };
  if (process.env.SITE_URL) {
    body.server = {
      url: `${process.env.SITE_URL.replace(/\/$/, '')}/api/receptionist/vapi-webhook/`,
    };
    if (process.env.VAPI_WEBHOOK_SECRET) body.server.secret = process.env.VAPI_WEBHOOK_SECRET;
  }
  const out = assistantId
    ? await vapiFetch(`/assistant/${assistantId}`, { method: 'PATCH', body })
    : await vapiFetch('/assistant', { method: 'POST', body });
  return out.id;
}

/** Buy a Vapi-provided phone number and attach an assistant for inbound calls.
    Returns { id, number } or null. One per client — the white-label "their own
    receptionist line". Vapi free/managed numbers are US-only today. */
export async function buyPhoneNumber({ assistantId, label } = {}) {
  if (!isConfigured()) return null;
  const body = { provider: 'vapi', name: (label || 'SantiPulse client').slice(0, 40) };
  if (assistantId) body.assistantId = assistantId;
  if (process.env.SITE_URL) {
    body.server = { url: `${process.env.SITE_URL.replace(/\/$/, '')}/api/receptionist/vapi-webhook/` };
    if (process.env.VAPI_WEBHOOK_SECRET) body.server.secret = process.env.VAPI_WEBHOOK_SECRET;
  }
  try {
    const out = await vapiFetch('/phone-number', { method: 'POST', body });
    return { id: out.id, number: out.number || out.phoneNumber || null };
  } catch (err) {
    console.error('[vapi] buyPhoneNumber:', err.message);
    return null;
  }
}

/** Point an existing Vapi number at an assistant (idempotent). */
export async function attachAssistant({ phoneNumberId, assistantId }) {
  if (!isConfigured() || !phoneNumberId || !assistantId) return false;
  try {
    await vapiFetch(`/phone-number/${phoneNumberId}`, { method: 'PATCH', body: { assistantId } });
    return true;
  } catch (err) {
    console.error('[vapi] attachAssistant:', err.message);
    return false;
  }
}

/** Place an outbound call from a connected number to a lead. */
export async function placeOutboundCall({ assistantId, phoneNumberId, toNumber }) {
  if (!isConfigured()) return { ok: false, error: 'integration_not_configured' };
  if (!assistantId || !phoneNumberId || !toNumber) return { ok: false, error: 'missing_params' };
  try {
    const out = await vapiFetch('/call', {
      method: 'POST',
      body: {
        assistantId,
        phoneNumberId,
        customer: { number: toNumber },
      },
    });
    return { ok: true, id: out.id, status: out.status };
  } catch (err) {
    console.error('[vapi] placeOutboundCall:', err.message);
    return { ok: false, error: err.message };
  }
}

function defaultSystemPrompt(business) {
  const name = business || 'el negocio';
  return [
    `Eres la recepcionista de IA de ${name}. Hablas español de forma cálida y profesional.`,
    'Tu trabajo: responder llamadas, calificar al cliente (nombre, motivo, urgencia),',
    'y cuando quieran una cita, ofrecer horarios disponibles y confirmar la reserva.',
    'Si el cliente está muy molesto, pide hablar con una persona, o menciona una emergencia,',
    'di que vas a avisar a una persona del equipo de inmediato y marca la conversación como urgente.',
    'Sé breve. No inventes precios ni promesas que no puedas confirmar.',
  ].join(' ');
}

/* ── Normalizers for webhook payloads ─────────────────────────────────────── */

/** Pull the call summary fields from an end-of-call-report message. */
export function parseEndOfCall(message) {
  const call = message.call || {};
  const artifact = message.artifact || {};
  return {
    providerCallId: call.id || message.call?.id || null,
    direction: call.type === 'outboundPhoneCall' ? 'outbound' : 'inbound',
    fromNumber: call.customer?.number || message.customer?.number || null,
    toNumber: call.phoneNumber?.number || null,
    durationSeconds: message.durationSeconds ? Math.round(message.durationSeconds) : null,
    recordingUrl: artifact.recordingUrl || message.recordingUrl || null,
    transcript: artifact.transcript || message.transcript || null,
    summary: message.summary || message.analysis?.summary || null,
    endedReason: message.endedReason || null,
    startedAt: call.startedAt || null,
    endedAt: call.endedAt || message.endedAt || null,
    structuredData: message.analysis?.structuredData || null,
  };
}
