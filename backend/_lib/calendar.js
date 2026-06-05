/* ============================================================
   Google Calendar booking integration (ESM)
   ------------------------------------------------------------
   Recepcionista IA's booking transport. The user connects a Google
   account (calendar scope); we store ONLY the refresh token on
   profiles (service_role). The agent / dashboard reads free slots and
   creates events on demand — access tokens are minted per call.

   Reuses the same Google OAuth client as gmail.js. Fully env-gated:
   without GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET, isConfigured()
   is false and booking endpoints respond 503.

   `googleapis` is imported lazily (optionalDependency).
   ============================================================ */
import { admin } from './auth.js';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
];

export function isConfigured() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function redirectUri() {
  const base = (process.env.SITE_URL || 'https://santipulse.com').replace(/\/$/, '');
  return `${base}/api/integrations/calendar/callback/`;
}

async function oauthClient() {
  if (!isConfigured()) return null;
  let google;
  try { ({ google } = await import('googleapis')); }
  catch { console.warn('[calendar] googleapis not installed — run: npm i googleapis'); return null; }
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri(),
  );
}

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

export async function exchangeCode(code) {
  const client = await oauthClient();
  if (!client) return null;
  const { tokens } = await client.getToken(code);
  if (!tokens || !tokens.refresh_token) throw new Error('no_refresh_token');
  return { refreshToken: tokens.refresh_token };
}

export async function saveConnection(userId, { refreshToken, calendarId = 'primary' }) {
  const sb = admin();
  if (!sb) return false;
  const { error } = await sb.from('profiles').update({
    gcal_refresh_token: refreshToken,
    gcal_calendar_id: calendarId,
    gcal_connected_at: new Date().toISOString(),
  }).eq('id', userId);
  if (error) { console.error('[calendar] saveConnection:', error.message); return false; }
  return true;
}

export async function disconnect(userId) {
  const sb = admin();
  if (!sb) return false;
  const { error } = await sb.from('profiles').update({
    gcal_refresh_token: null, gcal_calendar_id: null, gcal_connected_at: null,
  }).eq('id', userId);
  return !error;
}

export function isConnected(profile) {
  return !!(profile && profile.gcal_refresh_token);
}

async function calClient(profile) {
  const client = await oauthClient();
  if (!client || !profile?.gcal_refresh_token) return null;
  client.setCredentials({ refresh_token: profile.gcal_refresh_token });
  let google;
  try { ({ google } = await import('googleapis')); } catch { return null; }
  return google.calendar({ version: 'v3', auth: client });
}

/** Free/busy lookup → list of open slots within [from,to] given working hours.
    `config` carries booking_slot_minutes + booking_hours + booking_timezone.
    Returns array of { start, end } ISO pairs. */
export async function freeSlots(profile, config, { from, to }) {
  if (!isConfigured()) return { ok: false, error: 'integration_not_configured' };
  const cal = await calClient(profile);
  if (!cal) return { ok: false, error: 'calendar_not_connected' };
  const calendarId = profile.gcal_calendar_id || 'primary';
  try {
    const fb = await cal.freebusy.query({
      requestBody: { timeMin: from, timeMax: to, items: [{ id: calendarId }] },
    });
    const busy = fb?.data?.calendars?.[calendarId]?.busy || [];
    const slots = computeSlots({ from, to, busy, config });
    return { ok: true, slots };
  } catch (err) {
    console.error('[calendar] freeSlots:', err.message);
    return { ok: false, error: err.message };
  }
}

/** Create a confirmed event. Returns { ok, eventId }. */
export async function createEvent(profile, { title, startsAt, endsAt, description, attendeeEmail, timezone }) {
  if (!isConfigured()) return { ok: false, error: 'integration_not_configured' };
  const cal = await calClient(profile);
  if (!cal) return { ok: false, error: 'calendar_not_connected' };
  const calendarId = profile.gcal_calendar_id || 'primary';
  try {
    const res = await cal.events.insert({
      calendarId,
      requestBody: {
        summary: title || 'Cita',
        description: description || '',
        start: { dateTime: startsAt, timeZone: timezone || 'Europe/Madrid' },
        end: { dateTime: endsAt, timeZone: timezone || 'Europe/Madrid' },
        attendees: attendeeEmail ? [{ email: attendeeEmail }] : undefined,
      },
    });
    return { ok: true, eventId: res?.data?.id || null };
  } catch (err) {
    console.error('[calendar] createEvent:', err.message);
    return { ok: false, error: err.message };
  }
}

export async function cancelEvent(profile, eventId) {
  const cal = await calClient(profile);
  if (!cal || !eventId) return { ok: false, error: 'calendar_not_connected' };
  const calendarId = profile.gcal_calendar_id || 'primary';
  try {
    await cal.events.delete({ calendarId, eventId });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/* ── slot math ──────────────────────────────────────────────────────────────
   Walks each day in [from,to], intersects the configured working hours with the
   day, slices into slot-length blocks, and drops any block overlapping a busy
   interval. Kept simple/UTC-naive: working hours are interpreted in the config
   timezone offset only loosely — fine for a first booking pass; the heavy
   tz-correctness can move to a library later if needed. */
function computeSlots({ from, to, busy, config }) {
  const slotMin = config?.booking_slot_minutes || 30;
  const hoursByDay = config?.booking_hours || {};
  const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const start = new Date(from);
  const end = new Date(to);
  const busyRanges = busy.map((b) => [new Date(b.start).getTime(), new Date(b.end).getTime()]);
  const slots = [];

  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  while (cursor <= end) {
    const key = dayKeys[cursor.getUTCDay()];
    const window = hoursByDay[key];
    if (window && window.length === 2) {
      const [oh, om] = window[0].split(':').map(Number);
      const [ch, cm] = window[1].split(':').map(Number);
      let t = Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate(), oh, om);
      const close = Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate(), ch, cm);
      while (t + slotMin * 60000 <= close) {
        const s = t;
        const e = t + slotMin * 60000;
        if (s >= start.getTime() && !busyRanges.some(([bs, be]) => s < be && e > bs)) {
          slots.push({ start: new Date(s).toISOString(), end: new Date(e).toISOString() });
        }
        t = e;
      }
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return slots.slice(0, 50);
}

export const calendarScopes = SCOPES;
