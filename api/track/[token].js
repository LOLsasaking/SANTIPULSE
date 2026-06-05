/* GET /api/track/<token>          → 1x1 transparent GIF (open pixel)
   GET /api/track/<token>?u=<url>  → 302 redirect to <url> (click tracking)
   Public (no auth): these URLs are embedded in sent emails. The token is an
   opaque, unguessable id from email_tracking. Unknown tokens still return a
   pixel / safe redirect so tracking failures never break the email. */
import { recordTrackingEvent } from '../_lib/automations.js';
import { isValidHttpUrl } from '../_lib/http.js';

// 1x1 transparent GIF
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  const token = String((req.query && req.query.token) || '').slice(0, 128);
  const clickUrl = req.query && req.query.u ? String(req.query.u) : null;

  if (clickUrl && isValidHttpUrl(clickUrl)) {
    if (token) { try { await recordTrackingEvent(token, 'click'); } catch {} }
    res.setHeader('Location', clickUrl);
    return res.status(302).end();
  }

  // open pixel
  if (token) { try { await recordTrackingEvent(token, 'open'); } catch {} }
  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Content-Length', String(PIXEL.length));
  return res.status(200).send(PIXEL);
}
