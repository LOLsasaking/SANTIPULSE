/* ============================================================
   Local dev server for Santipulse — serves dist/ statics AND runs /api/*.
   A reliable alternative to `vercel dev` (which wasn't loading env into the
   functions). Loads .env.local, dispatches /api/<path> to api/<path>.js with
   a Vercel-style (req,res) shim.

   Run:  node dev-server.mjs      → http://localhost:3000
   ============================================================ */
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, dirname, normalize } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createServer } from 'node:http';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const DIST = join(ROOT, 'dist');
const PORT = process.env.PORT || 3000;

// ---- Load .env.local (real values) so the API functions can reach Supabase ----
for (const f of ['.env.local', '.env.development.local']) {
  const p = join(ROOT, f);
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && m[2] !== '' && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
console.log('[dev] SUPABASE_URL:', process.env.SUPABASE_URL ? 'set' : 'MISSING');
console.log('[dev] SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'MISSING');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.webm': 'video/webm', '.mp4': 'video/mp4', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
};

const handlerCache = new Map();
async function getHandler(absPath) {
  if (!handlerCache.has(absPath)) {
    const mod = await import(pathToFileURL(absPath).href);
    handlerCache.set(absPath, mod.default);
  }
  return handlerCache.get(absPath);
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => resolve(raw));
    req.on('error', () => resolve(raw));
  });
}

// Resolve /api/foo or /api/foo/ → api/foo.js
function resolveApiFile(pathname) {
  const rel = pathname.replace(/^\/api\//, '').replace(/\/+$/, '');
  if (!rel || rel.includes('..')) return null;
  const file = normalize(join(ROOT, 'api', rel + '.js'));
  if (!file.startsWith(join(ROOT, 'api'))) return null;
  return existsSync(file) ? file : null;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = decodeURIComponent(url.pathname);

  // ---- API ----
  if (pathname.startsWith('/api/')) {
    const file = resolveApiFile(pathname);
    if (!file) { res.writeHead(404, { 'Content-Type': 'application/json' }); return res.end('{"error":"not_found"}'); }
    const raw = await readBody(req);
    req.body = raw;
    req.rawBody = raw;
    req.query = Object.fromEntries(url.searchParams);
    res.status = (c) => { res.statusCode = c; return res; };
    res.json = (o) => { if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); return res; };
    try {
      const handler = await getHandler(file);
      await handler(req, res);
      if (!res.writableEnded) res.end();
    } catch (e) {
      console.error('[dev][api]', pathname, e);
      if (!res.headersSent) { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end('{"error":"server"}'); }
    }
    return;
  }

  // ---- Static (clean URLs + trailing slash like Vercel) ----
  let rel = pathname;
  if (rel.endsWith('/')) rel += 'index.html';
  let filePath = normalize(join(DIST, rel));
  if (!filePath.startsWith(DIST)) { res.writeHead(403); return res.end('Forbidden'); }
  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    const alt = join(DIST, pathname, 'index.html');
    if (existsSync(alt)) filePath = alt;
    else if (existsSync(filePath + '.html')) filePath = filePath + '.html';
    else { res.writeHead(404); return res.end('404 Not Found'); }
  }
  const ext = extname(filePath).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  res.end(readFileSync(filePath));
});

server.listen(PORT, () => {
  console.log(`\n  ▲ Santipulse dev server (statics + /api)`);
  console.log(`  → http://localhost:${PORT}/\n`);
});
