/* ============================================================
   Gmail integration — Google OAuth + send (ESM)
   ------------------------------------------------------------
   The send transport for Cold Outreach and Cart Recovery: emails
   go out FROM the user's own connected Gmail account, so they land
   in inboxes (real sender, real reply-to) instead of a shared IP.

   Fully env-gated. If GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are
   absent, isConfigured() returns false and the API endpoints respond
   503 'integration_not_configured' instead of throwing — the rest of
   the site keeps working with no Google credentials set.

   `googleapis` is an optionalDependency, imported lazily (mirrors the
   stripe.js pattern) so a missing install never breaks module load.

   Tokens: we persist ONLY the long-lived refresh_token (on profiles,
   service_role only). Access tokens are minted on demand and never
   stored. See supabase/automation-2.sql §0.
   ============================================================ */
import { admin } from './auth.js';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/userinfo.email',
  'openid',
];

/** True if Google OAuth credentials are present. Gates every endpoint. */
export function isConfigured() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function redirectUri() {
  const base = (process.env.SITE_URL || 'https://santipulse.com').replace(/\/$/, '');
  return `${base}/api/integrations/gmail/callback/`;
}

/** Lazily build an OAuth2 client. Returns null if not configured / dep missing. */
async function oauthClient() {
  if (!isConfigured()) return null;
  let google;
  try { ({ google } = await import('googleapis')); }
  catch { console.warn('[gmail] googleapis not installed — run: npm i googleapis'); return null; }
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri(),
  );
}

/** Build the consent-screen URL the browser is redirected to. `state` is the
    CSRF nonce we stored in oauth_states. access_type=offline + prompt=consent
    guarantees a refresh_token on first connect. */
export async function buildAuthUrl(state) {
  const client = await oauthClient();
  if (!client) return null;
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    state,
    include_granted_scopes: true,
  });
}

/** Exchange the ?code= from the callback for tokens. Returns
    { refreshToken, scope, email } or null. */
export async function exchangeCode(code) {
  const client = await oauthClient();
  if (!client) return null;
  const { tokens } = await client.getToken(code);
  if (!tokens || !tokens.refresh_token) {
    // No refresh token means the user previously consented; force re-consent.
    throw new Error('no_refresh_token');
  }
  client.setCredentials(tokens);
  let email = null;
  try {
    const { google } = await import('googleapis');
    const oauth2 = google.oauth2({ version: 'v2', auth: client });
    const me = await oauth2.userinfo.get();
    email = me?.data?.email || null;
  } catch { /* email is best-effort */ }
  return { refreshToken: tokens.refresh_token, scope: tokens.scope || SCOPES.join(' '), email };
}

/** Persist the Gmail connection on the user's profile (service_role). */
export async function saveConnection(userId, { refreshToken, scope, email }) {
  const sb = admin();
  if (!sb) return false;
  const { error } = await sb.from('profiles').update({
    gmail_refresh_token: refreshToken,
    gmail_scope: scope,
    gmail_email: email,
    gmail_connected_at: new Date().toISOString(),
  }).eq('id', userId);
  if (error) { console.error('[gmail] saveConnection:', error.message); return false; }
  return true;
}

/** Disconnect: clear the stored refresh token. */
export async function disconnect(userId) {
  const sb = admin();
  if (!sb) return false;
  const { error } = await sb.from('profiles').update({
    gmail_refresh_token: null, gmail_scope: null, gmail_email: null, gmail_connected_at: null,
  }).eq('id', userId);
  return !error;
}

/** True if this user has a usable Gmail connection. */
export async function isConnected(profile) {
  return !!(profile && profile.gmail_refresh_token);
}

/* ── Sending ──────────────────────────────────────────────────────────────── */

// RFC 2822 message → base64url, the format the Gmail API expects.
function buildRaw({ from, to, subject, html, headers = {} }) {
  const enc = (s) => `=?UTF-8?B?${Buffer.from(String(s), 'utf8').toString('base64')}?=`;
  const lines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${enc(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
  ];
  for (const [k, v] of Object.entries(headers)) lines.push(`${k}: ${v}`);
  const body = Buffer.from(String(html), 'utf8').toString('base64');
  const msg = lines.join('\r\n') + '\r\n\r\n' + body;
  return Buffer.from(msg, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Send one email FROM the user's Gmail. `profile` must carry gmail_refresh_token.
    Returns { ok, id } or { ok:false, error }. Daily-cap enforcement lives in
    the worker; this is the raw transport. */
export async function sendAs(profile, { to, subject, html, fromName, headers }) {
  if (!isConfigured()) return { ok: false, error: 'integration_not_configured' };
  if (!profile || !profile.gmail_refresh_token) return { ok: false, error: 'gmail_not_connected' };
  const client = await oauthClient();
  if (!client) return { ok: false, error: 'integration_not_configured' };

  client.setCredentials({ refresh_token: profile.gmail_refresh_token });
  let google;
  try { ({ google } = await import('googleapis')); }
  catch { return { ok: false, error: 'integration_not_configured' }; }

  const senderEmail = profile.gmail_email || 'me';
  const from = fromName ? `${fromName} <${senderEmail}>` : senderEmail;
  const raw = buildRaw({ from, to, subject, html, headers });

  try {
    const gmail = google.gmail({ version: 'v1', auth: client });
    const res = await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
    return { ok: true, id: res?.data?.id || null };
  } catch (err) {
    const msg = err?.message || 'send_failed';
    console.error('[gmail] sendAs:', msg);
    return { ok: false, error: msg };
  }
}

export const gmailScopes = SCOPES;
