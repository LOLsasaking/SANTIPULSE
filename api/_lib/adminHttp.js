export function send(res, status, payload) {
  res.status(status).json(payload);
}

export function method(req, res, allowed) {
  if (allowed.includes(req.method)) return true;
  res.setHeader('Allow', allowed.join(', '));
  send(res, 405, { error: 'method_not_allowed', allowed });
  return false;
}

export async function body(req) {
  if (!req.body) return {};
  if (typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body); } catch { return {}; }
}

export function configured(name) {
  return Boolean(process.env[name]);
}

export function integration(provider, env, purpose) {
  const keys = Array.isArray(env) ? env : [env];
  return { provider, required_env: keys, configured: keys.every((k) => configured(k)), purpose };
}

export function nowIso() {
  return new Date().toISOString();
}
