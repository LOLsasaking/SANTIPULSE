/* POST /api/integrations/disconnect  { provider, accountId? }
   Auth required. Revokes a connection. provider ∈ gmail|shopify|social.
   For social, an optional accountId revokes a single account; otherwise all. */
import { requireUser } from '../_lib/auth.js';
import { parseBody } from '../_lib/http.js';
import * as gmail from '../_lib/gmail.js';
import * as shopify from '../_lib/shopify.js';
import * as social from '../_lib/socialMedia.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'method' }); }

  const user = await requireUser(req, res);
  if (!user) return;

  const { provider, accountId } = parseBody(req);
  let ok = false;
  if (provider === 'gmail') ok = await gmail.disconnect(user.id);
  else if (provider === 'shopify') ok = await shopify.disconnect(user.id);
  else if (provider === 'social') ok = await social.disconnect(user.id, accountId || null);
  else return res.status(400).json({ error: 'invalid_provider' });

  return res.status(ok ? 200 : 500).json({ ok });
}
