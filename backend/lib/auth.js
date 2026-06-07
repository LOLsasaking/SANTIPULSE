/* ============================================================
   Server-side auth guard (Supabase Auth) — ESM
   ------------------------------------------------------------
   Serverless functions call requireUser(req) to verify the
   Bearer access token sent by the browser (SantiAuth.apiFetch).
   Returns the authenticated user, or null if missing/invalid.

   Uses the SERVICE ROLE client so getUser(token) validates the
   JWT against Supabase without exposing the anon key here.
   ============================================================ */
import { createClient } from '@supabase/supabase-js';

export const ADMIN_EMAIL = 'santiagogoncalves07@gmail.com';

let _admin = null;
export function admin() {
  if (_admin) return _admin;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return _admin;
}

function bearer(req) {
  const h = req.headers['authorization'] || req.headers['Authorization'] || '';
  const m = /^Bearer\s+(.+)$/i.exec(String(h));
  return m ? m[1].trim() : null;
}

/** Verify the request's token. Returns the Supabase user or null. */
export async function getUser(req) {
  const token = bearer(req);
  const sb = admin();
  if (!token || !sb) return null;
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data || !data.user) return null;
  return data.user;
}

/** Guard helper: responds 401 and returns null if unauthenticated. */
export async function requireUser(req, res) {
  const user = await getUser(req);
  if (!user) { res.status(401).json({ error: 'unauthorized' }); return null; }
  return user;
}

export function isAdminUser(user) {
  return String(user?.email || '').trim().toLowerCase() === ADMIN_EMAIL;
}

/** Guard helper: responds 401/403 and returns null unless the user is the owner admin. */
export async function requireAdmin(req, res) {
  const user = await requireUser(req, res);
  if (!user) return null;
  if (!isAdminUser(user)) { res.status(403).json({ error: 'forbidden' }); return null; }
  return user;
}
