/* ============================================================
   POST /api/receptionist/sos
   ------------------------------------------------------------
   Manual Human SOS / Panic Button for the dashboard.
   ============================================================ */
import { requireUser } from '../lib/auth.js';
import { getProfile, hasActiveSubscription } from '../lib/profile.js';
import { parseBody } from '../lib/http.js';
import { getConfig, raiseSos } from '../lib/receptionist.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const user = await requireUser(req, res);
  if (!user) return;
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method' });
  }

  const profile = await getProfile(user.id);
  if (!hasActiveSubscription(profile)) {
    return res.status(402).json({ error: 'needs_subscription', upgradeUrl: '/precios/' });
  }

  const body = parseBody(req);
  const config = await getConfig(user.id);
  const sosConfig = {
    ...(config || {}),
    sos_enabled: true,
    sos_email: config?.sos_email || process.env.LEAD_NOTIFY_TO || body.sos_email || null,
  };
  if (!sosConfig.sos_email) {
    return res.status(400).json({ error: 'missing_sos_email', message: 'Configura un email SOS antes de usar el boton humano.' });
  }

  const alert = await raiseSos(user.id, sosConfig, profile, {
    reason: body.reason || 'panic_button',
    detail: body.detail || 'Boton SOS humano pulsado desde el dashboard.',
    channel: 'dashboard',
  });
  if (!alert) return res.status(500).json({ error: 'sos_failed' });
  return res.status(200).json({ ok: true, alert });
}
