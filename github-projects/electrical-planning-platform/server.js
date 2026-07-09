import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PUBLIC = join(ROOT, 'public');
const PORT = process.env.PORT || 5104;
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
  if (url.pathname === '/api/plan' && req.method === 'POST') {
    const body = await readBody(req);
    const rooms = Math.max(1, Math.min(30, Number(body.rooms) || 5));
    const area = Math.max(10, Math.min(1600, Number(body.area) || 90));
    const loads = String(body.loads || '').toLowerCase();
    const circuits = [
      ['C1', 'Lighting zones', '10A'],
      ['C2', 'General sockets', '16A'],
      ['C3', 'Kitchen and appliances', '20A'],
      ...(loads.includes('ev') ? [['C4', 'EV charger reserve', 'technical review']] : []),
      ...(loads.includes('solar') ? [['C5', 'Solar/battery reserve', 'technical review']] : [])
    ];
    const materials = [`${Math.max(rooms, Math.ceil(area / 18))} lighting points estimated`, `${Math.max(2, Math.ceil(rooms / 2))} socket groups estimated`, 'Labeled distribution board', 'Conduit routes and junction boxes'];
    return json(res, { ok: true, rooms, area, circuits, materials });
  }
  const path = join(PUBLIC, url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\/+/, ''));
  if (!path.startsWith(PUBLIC) || !existsSync(path)) { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream' });
  res.end(readFileSync(path));
}).listen(PORT, '127.0.0.1', () => console.log(`Electrical Planning Platform running on http://localhost:${PORT}`));
