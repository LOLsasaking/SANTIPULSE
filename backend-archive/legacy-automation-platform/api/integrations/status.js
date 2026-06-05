/* GET /api/integrations/status
   Auth required. Returns which integrations are CONFIGURED (creds present on
   the server) and which the user has CONNECTED. The dashboard uses this to
   show Connect buttons vs. connected state — never exposing any token. */
import { requireUser } from '../_lib/auth.js';
import { getProfile } from '../_lib/profile.js';
import * as gmail from '../_lib/gmail.js';
import * as shopify from '../_lib/shopify.js';
import * as social from '../_lib/socialMedia.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'method' }); }

  const user = await requireUser(req, res);
  if (!user) return;

  const profile = await getProfile(user.id);
  const [shopConn, socialAccounts] = await Promise.all([
    shopify.getConnection(user.id),
    social.listAccounts(user.id),
  ]);

  return res.status(200).json({
    gmail: {
      configured: gmail.isConfigured(),
      connected: await gmail.isConnected(profile),
      email: profile?.gmail_email || null,
    },
    shopify: {
      configured: shopify.isConfigured(),
      connected: !!shopConn,
      shop: shopConn?.shop_domain || null,
    },
    social: {
      configured: social.isConfigured(),
      connected: socialAccounts.length > 0,
      accounts: socialAccounts.map((a) => ({ id: a.id, provider: a.provider, username: a.username })),
    },
  });
}
