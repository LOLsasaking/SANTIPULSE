/* ============================================================
   Local preview server — mimics the Vercel runtime.
   • Serves dist/ with clean URLs (/contratar/ -> /contratar/index.html)
   • Routes POST /api/lead to the real handler in api/lead.js
   • No Supabase env -> DEMO mode (validates + simulates, no DB write)
   Run:  npm run preview   (build then serve)   |   npm run serve
   ============================================================ */
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, resolve, dirname, normalize } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DIST = join(ROOT, 'dist');
const PORT = process.env.PORT || 4599;

// Load .env.local if present (tiny parser, no deps)
const envFile = join(ROOT, '.env.local');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.webm': 'video/webm', '.mp4': 'video/mp4',
  '.webp': 'image/webp', '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8', '.ico': 'image/x-icon',
};

let leadHandler = null;
async function getLeadHandler() {
  if (!leadHandler) {
    const mod = await import(pathToFileURL(join(ROOT, 'api', 'lead.js')).href);
    leadHandler = mod.default;
  }
  return leadHandler;
}
function send(res, status, body, headers = {}) { res.writeHead(status, headers); res.end(body); }

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = decodeURIComponent(url.pathname);

  if (pathname === '/api/lead') {
    if (req.method !== 'POST') return send(res, 405, 'Method Not Allowed');

    // DEMO mode: no Supabase configured -> simulate
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      let raw = '';
      req.on('data', (c) => (raw += c));
      req.on('end', () => {
        try {
          const b = JSON.parse(raw || '{}');
          if ((b.company || '').trim() !== '') return send(res, 200, JSON.stringify({ ok: true }), { 'Content-Type': 'application/json' });
          const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((b.email || '').trim());
          if (!b.name || b.name.trim().length < 2 || !emailOk) {
            return send(res, 400, JSON.stringify({ ok: false, error: 'invalid' }), { 'Content-Type': 'application/json' });
          }
          console.log('  [DEMO] lead (not saved):', { name: b.name, email: b.email, need: b.need });
          send(res, 200, JSON.stringify({ ok: true, demo: true }), { 'Content-Type': 'application/json' });
        } catch {
          send(res, 400, JSON.stringify({ ok: false, error: 'invalid' }), { 'Content-Type': 'application/json' });
        }
      });
      return;
    }

    // LIVE mode: env configured -> call the real handler
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', async () => {
      req.body = raw;
      res.status = (code) => { res.statusCode = code; return res; };
      res.json = (obj) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(obj)); return res; };
      try { const h = await getLeadHandler(); await h(req, res); }
      catch (e) { console.error(e); if (!res.headersSent) send(res, 500, JSON.stringify({ ok: false, error: 'server' }), { 'Content-Type': 'application/json' }); }
    });
    return;
  }

  // Static files (clean URLs)
  let rel = pathname;
  if (rel.endsWith('/')) rel += 'index.html';
  let filePath = normalize(join(DIST, rel));
  if (!filePath.startsWith(DIST)) return send(res, 403, 'Forbidden');

  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    const alt = join(DIST, pathname, 'index.html');
    if (existsSync(alt)) filePath = alt;
    else return send(res, 404, '404 Not Found');
  }
  const ext = extname(filePath).toLowerCase();
  try { send(res, 200, readFileSync(filePath), { 'Content-Type': MIME[ext] || 'application/octet-stream' }); }
  catch { send(res, 500, 'Server error'); }
});

server.listen(PORT, () => {
  const mode = process.env.SUPABASE_URL ? 'LIVE Supabase' : 'DEMO (no DB writes)';
  console.log(`\n  ▲ Santipulse preview`);
  console.log(`  → http://localhost:${PORT}/            (ES home)`);
  console.log(`  → /en/  /fr/  /de/  /it/   ·   /contratar/  /demos/  /nosotros/`);
  console.log(`  Form backend: ${mode}\n`);
});
