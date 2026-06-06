/* ============================================================
   GET/POST/DELETE /api/vault
   ------------------------------------------------------------
   Auth-gated Knowledge Vault for PDFs, menus, and business notes.
   ============================================================ */
import { requireUser } from '../lib/auth.js';
import { getProfile, hasActiveSubscription } from '../lib/profile.js';
import { parseBody } from '../lib/http.js';
import { deleteVaultItem, listVaultItems, saveVaultItem } from '../lib/vault.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const user = await requireUser(req, res);
  if (!user) return;

  if (req.method === 'GET') {
    const items = await listVaultItems(user.id);
    return res.status(200).json({ ok: true, items });
  }

  const profile = await getProfile(user.id);
  if (!hasActiveSubscription(profile)) {
    return res.status(402).json({ error: 'needs_subscription', upgradeUrl: '/precios/' });
  }

  if (req.method === 'POST') {
    const body = parseBody(req);
    const out = await saveVaultItem(user.id, body);
    if (!out.ok) return res.status(out.error === 'file_too_large' ? 413 : 400).json(out);
    return res.status(200).json(out);
  }

  if (req.method === 'DELETE') {
    const body = parseBody(req);
    if (!body.id) return res.status(400).json({ error: 'missing_id' });
    const ok = await deleteVaultItem(user.id, body.id);
    return res.status(ok ? 200 : 404).json({ ok });
  }

  res.setHeader('Allow', 'GET, POST, DELETE');
  return res.status(405).json({ error: 'method' });
}
