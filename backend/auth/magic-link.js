/* ============================================================
   POST /api/auth/magic-link — branded, localized sign-in email.
   ------------------------------------------------------------
   Supabase's hosted email templates can't evaluate per-language
   conditionals, so we generate the link server-side and send the
   email ourselves through Resend (mascot + button, es/en/fr/de/it).
   Body: { email, lang }
   ============================================================ */
import { createClient } from '@supabase/supabase-js';
import { parseBody, rateLimited, getIp } from '../lib/http.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LANG_RE = /^(es|en|fr|de|it)$/;

const COPY = {
  es: { subject: '¡Bienvenido! Tu enlace de acceso · SantiPulse', hi: '¡Bienvenido! 👋', body: 'Soy <strong>Pulse</strong>. Aquí tienes tu enlace de acceso — caduca en breve y solo puede usarse una vez.', btn: 'Iniciar sesión', alt: 'Si el botón no funciona, copia este enlace:', foot: 'Recibes este email porque alguien pidió acceso con esta dirección en santipulse.com. Si no fuiste tú, ignóralo.' },
  en: { subject: 'Welcome! Your sign-in link · SantiPulse', hi: 'Welcome! 👋', body: "I'm <strong>Pulse</strong>. Here is your sign-in link — it expires shortly and can only be used once.", btn: 'Sign in', alt: "If the button doesn't work, copy this link:", foot: "You received this email because someone requested access with this address at santipulse.com. If it wasn't you, you can ignore it." },
  fr: { subject: 'Bienvenue ! Ton lien de connexion · SantiPulse', hi: 'Bienvenue ! 👋', body: 'Je suis <strong>Pulse</strong>. Voici ton lien de connexion — il expire bientôt et ne peut être utilisé qu\'une seule fois.', btn: 'Se connecter', alt: 'Si le bouton ne fonctionne pas, copie ce lien :', foot: 'Tu reçois cet email car un accès a été demandé avec cette adresse sur santipulse.com. Si ce n\'était pas toi, ignore-le.' },
  de: { subject: 'Willkommen! Dein Anmeldelink · SantiPulse', hi: 'Willkommen! 👋', body: 'Ich bin <strong>Pulse</strong>. Hier ist dein Anmeldelink — er läuft bald ab und kann nur einmal verwendet werden.', btn: 'Anmelden', alt: 'Wenn der Button nicht funktioniert, kopiere diesen Link:', foot: 'Du erhältst diese E-Mail, weil mit dieser Adresse Zugang auf santipulse.com angefragt wurde. Falls du das nicht warst, ignoriere sie.' },
  it: { subject: 'Benvenuto! Il tuo link di accesso · SantiPulse', hi: 'Benvenuto! 👋', body: 'Sono <strong>Pulse</strong>. Ecco il tuo link di accesso — scade a breve e può essere usato una sola volta.', btn: 'Accedi', alt: 'Se il pulsante non funziona, copia questo link:', foot: 'Ricevi questa email perché è stato richiesto l\'accesso con questo indirizzo su santipulse.com. Se non sei stato tu, ignorala.' },
};

function emailHtml(c, link) {
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f7;padding:36px 12px;"><tr><td align="center">
  <table width="480" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;width:100%;background-color:#ffffff;border-radius:20px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
    <tr><td style="background-color:#0a0a0c;padding:22px 32px;" align="center"><span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">SantiPulse<span style="color:#E23B4E;">.</span></span></td></tr>
    <tr><td align="center" style="padding:34px 32px 0;"><img src="https://santipulse.com/mascot-icon.png" width="150" alt="Pulse" style="display:block;width:150px;height:auto;"/></td></tr>
    <tr><td align="center" style="padding:22px 36px 0;">
      <h1 style="margin:0;font-size:26px;line-height:1.2;color:#0a0a0c;">${c.hi}</h1>
      <p style="margin:14px 0 0;font-size:15px;line-height:1.6;color:#52525b;">${c.body}</p>
    </td></tr>
    <tr><td align="center" style="padding:28px 36px 8px;"><a href="${link}" style="display:inline-block;background-color:#E23B4E;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:15px 44px;border-radius:9999px;">${c.btn}</a></td></tr>
    <tr><td align="center" style="padding:14px 36px 34px;"><p style="margin:0;font-size:12px;line-height:1.6;color:#a1a1aa;">${c.alt}<br/><a href="${link}" style="color:#E23B4E;word-break:break-all;">${link}</a></p></td></tr>
    <tr><td align="center" style="background-color:#f8f8fa;padding:18px 32px;"><p style="margin:0;font-size:11px;color:#a1a1aa;">${c.foot}<br/><br/>© 2026 SantiPulse</p></td></tr>
  </table></td></tr></table>`;
}

let _admin = null;
function admin() {
  if (_admin) return _admin;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _admin = createClient(url, key, { auth: { persistSession: false } });
  return _admin;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method' });
  }
  if (rateLimited(getIp(req))) return res.status(429).json({ error: 'rate_limited' });

  const body = parseBody(req);
  const email = String(body.email || '').trim().toLowerCase();
  const lang = LANG_RE.test(body.lang) ? body.lang : 'es';
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'invalid_email' });

  const sb = admin();
  const resendKey = process.env.RESEND_API_KEY;
  if (!sb || !resendKey) return res.status(503).json({ error: 'not_configured' });

  const siteUrl = (process.env.SITE_URL || 'https://santipulse.com').replace(/\/+$/, '');
  const redirectTo = `${siteUrl}/dashboard/`;

  // Generate the sign-in link (create the user first if they're new).
  let linkRes = await sb.auth.admin.generateLink({ type: 'magiclink', email, options: { redirectTo } });
  if (linkRes.error && /not.*found|does not exist/i.test(linkRes.error.message || '')) {
    const created = await sb.auth.admin.createUser({ email, email_confirm: true, user_metadata: { lang } });
    if (created.error) return res.status(500).json({ error: 'user_create_failed' });
    linkRes = await sb.auth.admin.generateLink({ type: 'magiclink', email, options: { redirectTo } });
  }
  if (linkRes.error || !linkRes.data) {
    console.error('[auth/magic-link] generateLink:', linkRes.error && linkRes.error.message);
    return res.status(500).json({ error: 'link_failed' });
  }
  const link = (linkRes.data.properties && linkRes.data.properties.action_link) || linkRes.data.action_link;
  if (!link) return res.status(500).json({ error: 'link_failed' });

  // Keep the user's language current for future emails.
  const userId = linkRes.data.user && linkRes.data.user.id;
  if (userId) sb.auth.admin.updateUserById(userId, { user_metadata: { lang } }).catch(() => {});

  const c = COPY[lang] || COPY.es;
  // Always show "SantiPulse" as the sender display name, keeping whatever
  // verified address LEAD_NOTIFY_FROM provides (e.g. leads@santipulse.com).
  const fromAddr = (process.env.LEAD_NOTIFY_FROM || 'leads@santipulse.com')
    .replace(/^.*</, '').replace(/>.*$/, '').trim();
  const from = `SantiPulse <${fromAddr}>`;
  const sent = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [email], subject: c.subject, html: emailHtml(c, link) }),
  });
  if (!sent.ok) {
    const t = await sent.text().catch(() => '');
    console.error('[auth/magic-link] resend:', sent.status, t.slice(0, 200));
    return res.status(502).json({ error: 'send_failed' });
  }
  return res.status(200).json({ ok: true });
}
