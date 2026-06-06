/* ============================================================
   Revealbot adapter (env-gated)
   ------------------------------------------------------------
   Revealbot is optional. Without a real status/action URL from their
   private API/docs, the dashboard keeps using Meta/TikTok directly.
   ============================================================ */

const TIMEOUT_MS = 8000;

export function revealbotConfigured() {
  return !!(process.env.REVEALBOT_API_KEY && process.env.REVEALBOT_ACCOUNT_ID);
}

export async function pingRevealbot() {
  if (!revealbotConfigured()) {
    return { status: 'missing', message: 'Falta REVEALBOT_API_KEY / REVEALBOT_ACCOUNT_ID' };
  }
  const statusUrl = process.env.REVEALBOT_STATUS_URL;
  if (!statusUrl) {
    return {
      status: 'error',
      message: 'Revealbot configurado, falta REVEALBOT_STATUS_URL para handshake real',
    };
  }
  const r = await revealbotFetch(statusUrl);
  return r.ok
    ? { status: 'connected', message: 'Revealbot activo' }
    : { status: 'error', message: r.message || `Error ${r.status || 'red'}` };
}

export async function getRevealbotSummary() {
  if (!revealbotConfigured() || !process.env.REVEALBOT_METRICS_URL) return null;
  const r = await revealbotFetch(process.env.REVEALBOT_METRICS_URL);
  if (!r.ok) return null;
  return r.json || null;
}

export async function sendRevealbotBudgetAction(payload = {}) {
  if (!revealbotConfigured() || !process.env.REVEALBOT_ACTION_URL) {
    return { ok: false, error: 'revealbot_not_configured' };
  }
  const r = await revealbotFetch(process.env.REVEALBOT_ACTION_URL, {
    method: 'POST',
    body: JSON.stringify({
      account_id: process.env.REVEALBOT_ACCOUNT_ID,
      ...payload,
    }),
  });
  return r.ok ? { ok: true, data: r.json } : { ok: false, error: r.message || `revealbot_${r.status}` };
}

async function revealbotFetch(url, opts = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const resp = await fetch(url, {
      ...opts,
      signal: ctrl.signal,
      headers: {
        Authorization: `Bearer ${process.env.REVEALBOT_API_KEY}`,
        'Content-Type': 'application/json',
        ...(opts.headers || {}),
      },
    });
    const json = await resp.json().catch(() => null);
    return {
      ok: resp.ok,
      status: resp.status,
      json,
      message: json?.message || json?.error || null,
    };
  } catch (err) {
    return { ok: false, status: 0, json: null, message: String(err && err.message || err) };
  } finally {
    clearTimeout(timer);
  }
}
