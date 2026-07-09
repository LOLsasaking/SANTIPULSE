import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PUBLIC = join(ROOT, 'public');
const PORT = process.env.PORT || 5102;
const runs = [];
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); }
      catch { resolve({}); }
    });
  });
}

function json(res, body) {
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname === '/api/run' && req.method === 'POST') {
    const body = await readBody(req);
    const payload = String(body.payload || '').slice(0, 800);
    const urgent = /urgent|asap|today|alta|urgente|hoy/i.test(payload);
    const run = {
      id: `flow_${Date.now().toString(36)}`,
      status: urgent ? 'needs_attention' : 'processed',
      priority: urgent ? 'high' : 'normal',
      steps: [
        ['Receive payload', 'complete'],
        ['Classify request', 'complete'],
        [urgent ? 'Route high priority' : 'Route normal priority', 'complete'],
        ['Queue notification', 'queued']
      ],
      at: new Date().toISOString()
    };
    runs.unshift(run);
    return json(res, { ok: true, run, runs: runs.slice(0, 10) });
  }
  const path = join(PUBLIC, url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\/+/, ''));
  if (!path.startsWith(PUBLIC) || !existsSync(path)) { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream' });
  res.end(readFileSync(path));
}).listen(PORT, '127.0.0.1', () => console.log(`Automation Ops Platform running on http://localhost:${PORT}`));
