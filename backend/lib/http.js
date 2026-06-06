/* ============================================================
   Shared serverless helpers for the demo endpoints (ESM)
   ------------------------------------------------------------
   Mirrors the security patterns already used in api/lead.js:
   IP extraction, hashed fingerprint, body parsing, and a
   best-effort in-memory per-IP rate limiter.
   ============================================================ */
import crypto from 'node:crypto';

// Best-effort in-memory rate limit (per warm instance). Scrapes are heavy, so
// keep this tight: a few runs per minute per IP.
const RATE = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 4;

export function rateLimited(ip) {
  const now = Date.now();
  const rec = RATE.get(ip);
  if (!rec || now - rec.first > WINDOW_MS) { RATE.set(ip, { count: 1, first: now }); return false; }
  rec.count += 1;
  return rec.count > MAX_PER_WINDOW;
}

export function getIp(req) {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.length) return xf.split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

/** Stable hashed fingerprint for the one-time trial gate (IP + UA, salted). */
export function getFingerprint(req) {
  const ip = getIp(req);
  const ua = req.headers['user-agent'] || 'unknown';
  const salt = process.env.IP_SALT || 'santipulse';
  return crypto.createHash('sha256').update(`${salt}:${ip}:${ua}`).digest('hex').slice(0, 64);
}

/** Vercel usually parses JSON bodies, but be defensive (string or undefined). */
export function parseBody(req) {
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  return body || {};
}

const HTTP_URL_RE = /^https?:\/\/[^\s]+$/i;
export function isValidHttpUrl(value) {
  if (typeof value !== 'string' || !HTTP_URL_RE.test(value.trim())) return false;
  try {
    const u = new URL(value.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export const UPGRADE_URL =
  (process.env.SITE_URL ? process.env.SITE_URL.replace(/\/$/, '') : 'https://santipulse.com') + '/contratar/';

export function trialBlocked(res, automationType) {
  return res.status(403).json({
    success: false,
    trialUsed: true,
    error: `Your free demo for "${automationType.replace(/_/g, ' ')}" has already been used. Get in touch to run unlimited automations.`,
    upgradeUrl: UPGRADE_URL,
  });
}
