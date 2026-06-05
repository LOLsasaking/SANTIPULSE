/* ============================================================
   POST /api/lead  â Santipulse contact-form backend (Vercel Serverless)
   ------------------------------------------------------------
   Security layers (all server-side â never trust the browser):
     1. Method guard
     2. Honeypot ("company" must be empty)
     3. Time-trap (submitted < 3s after load = bot)
     4. Strict validation + length caps + sanitisation
     5. Per-IP rate limiting (in-memory, best-effort)
     6. Supabase insert WITHOUT .select()  (RLS-safe)
     7. Resend email notification (failure never blocks the lead)

   Env vars (Vercel -> Settings -> Environment Variables):
     SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (required to save)
     RESEND_API_KEY, LEAD_NOTIFY_TO, LEAD_NOTIFY_FROM, IP_SALT  (optional)
   ============================================================ */
import { createClient } from '@supabase/supabase-js';

const RATE = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 5;

function rateLimited(ip) {
  const now = Date.now();
  const rec = RATE.get(ip);
  if (!rec || now - rec.first > WINDOW_MS) { RATE.set(ip, { count: 1, first: now }); return false; }
  rec.count += 1;
  return rec.count > MAX_PER_WINDOW;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONTROL_RE = /[\u0000-\u001F\u007F]/g;

function clean(str, max) {
  return String(str == null ? '' : str).replace(CONTROL_RE, ' ').trim().slice(0, max);
}
function getIp(req) {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.length) return xf.split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}
function hashIp(ip) {
  let h = 0;
  const s = (process.env.IP_SALT || 'santipulse') + ip;
  for (let i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; }
  return 'h' + (h >>> 0).toString(16);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ ok: false, error: 'method' }); }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};

  const ip = getIp(req);
  if (rateLimited(ip)) return res.status(429).json({ ok: false, error: 'rate' });

  // Honeypot
  if (clean(body.company, 100) !== '') return res.status(200).json({ ok: true });

  // Time-trap — SKEW-TOLERANT. loadedAt comes from the visitor's browser clock,
  // which is a DIFFERENT clock than this server's, so `elapsed` can legitimately be
  // negative or off by many seconds for real users. We only drop when we're confident
  // it's a bot: a small-but-positive elapsed (submitted suspiciously fast). Negative or
  // wildly-off values are treated as clock skew and allowed through.
  const loadedAt = Number(body.loadedAt);
  if (Number.isFinite(loadedAt)) {
    const elapsed = Date.now() - loadedAt;
    // Only reject the clear bot case: a real, positive, near-instant submit (0–1.5s).
    if (elapsed >= 0 && elapsed < 1500) {
      return res.status(200).json({ ok: true });
    }
  }

  // Validate + sanitise
  const name = clean(body.name, 100);
  const email = clean(body.email, 160).toLowerCase();
  const phone = clean(body.phone, 40);
  const business = clean(body.business, 120);
  const message = clean(body.message, 2000);
  const lang = clean(body.lang, 5) || 'es';

  // need[] -> comma-joined, each item capped & cleaned
  let need = '';
  if (Array.isArray(body.need)) {
    need = body.need.map((n) => clean(n, 60)).filter(Boolean).slice(0, 10).join(', ');
  } else {
    need = clean(body.need, 200);
  }

  // Require a name + valid email (message/phone/business optional, matching the form)
  if (name.length < 2 || !EMAIL_RE.test(email)) {
    return res.status(400).json({ ok: false, error: 'invalid' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('[lead] Missing Supabase env vars');
    return res.status(500).json({ ok: false, error: 'server' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

  const record = {
    name, email, phone, business, need, message, lang,
    source: 'santipulse.com',
    ip_hash: hashIp(ip),
    user_agent: clean(req.headers['user-agent'], 300),
  };

  const { error } = await supabase.from('leads').insert([record]);
  if (error) {
    console.error('[lead] Supabase insert failed:', error.message);
    return res.status(500).json({ ok: false, error: 'server' });
  }

  // Send both emails and AWAIT them. On Vercel serverless the function can be
  // frozen the moment we return the response, killing any in-flight fetch — which
  // is exactly why fire-and-forget email previously failed with "fetch failed".
  // We still never let an email error fail the request (the lead is already saved).
  await Promise.allSettled([
    notifyByEmail({ name, email, phone, business, need, message, lang })
      .catch((e) => console.error('[lead] owner notify failed:', (e && e.message) || e)),
    sendAutoReply({ name, email, lang })
      .catch((e) => console.error('[lead] auto-reply failed:', (e && e.message) || e)),
  ]);

  return res.status(200).json({ ok: true });
}

async function notifyByEmail({ name, email, phone, business, need, message, lang }) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.LEAD_NOTIFY_TO;
  const from = process.env.LEAD_NOTIFY_FROM || 'onboarding@resend.dev';
  if (!key || !to) return;

  const row = (label, val) => val ? `<p><b>${label}:</b> ${escapeHtml(val)}</p>` : '';
  const html =
    `<h2>Nuevo lead - Santipulse</h2>` +
    row('Nombre', name) +
    row('Email', email) +
    row('Telefono', phone) +
    row('Negocio', business) +
    row('Necesita', need) +
    row('Idioma', lang) +
    (message ? `<p><b>Mensaje:</b></p><p>${escapeHtml(message).replace(/\n/g, '<br/>')}</p>` : '');

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `Santipulse <${from}>`, to: [to], reply_to: email,
      subject: `Nuevo lead: ${name}`, html,
    }),
  });
  if (!resp.ok) { const t = await resp.text().catch(() => ''); throw new Error(`Resend ${resp.status}: ${t}`); }
}

// Auto-confirmation sent to the visitor who submitted the form, in their language.
const REPLY_COPY = {
  es: { subject: 'Gracias por tu mensaje - Santipulse', greet: 'Hola', body: 'Gracias por escribir. He recibido tu solicitud y te respondo en menos de 24 horas.', sign: 'Un saludo,<br/>Santi - Santipulse' },
  en: { subject: 'Thanks for your message - Santipulse', greet: 'Hi', body: 'Thanks for reaching out. I’ve received your request and will reply within 24 hours.', sign: 'Best,<br/>Santi - Santipulse' },
  fr: { subject: 'Merci pour votre message - Santipulse', greet: 'Bonjour', body: 'Merci de votre message. J’ai bien reçu votre demande et je vous réponds sous 24 heures.', sign: 'Cordialement,<br/>Santi - Santipulse' },
  de: { subject: 'Danke für deine Nachricht - Santipulse', greet: 'Hallo', body: 'Danke für deine Nachricht. Ich habe deine Anfrage erhalten und antworte innerhalb von 24 Stunden.', sign: 'Viele Grüße,<br/>Santi - Santipulse' },
  it: { subject: 'Grazie per il tuo messaggio - Santipulse', greet: 'Ciao', body: 'Grazie per averci scritto. Ho ricevuto la tua richiesta e ti rispondo entro 24 ore.', sign: 'Un saluto,<br/>Santi - Santipulse' },
};

async function sendAutoReply({ name, email, lang }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.LEAD_NOTIFY_FROM || 'onboarding@resend.dev';
  if (!key) return;

  const c = REPLY_COPY[lang] || REPLY_COPY.es;
  const firstName = escapeHtml(String(name).split(' ')[0] || '');
  const html =
    `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#111">` +
    `<p>${c.greet} ${firstName},</p>` +
    `<p>${c.body}</p>` +
    `<p style="margin-top:24px">${c.sign}</p>` +
    `</div>`;

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `Santipulse <${from}>`,
      to: [email],
      reply_to: process.env.LEAD_NOTIFY_TO || from,
      subject: c.subject,
      html,
    }),
  });
  if (!resp.ok) { const t = await resp.text().catch(() => ''); throw new Error(`Resend ${resp.status}: ${t}`); }
}
