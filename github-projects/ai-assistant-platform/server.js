import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PUBLIC = join(ROOT, 'public');
const PORT = process.env.PORT || 5101;
const runs = [];

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

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

function json(res, body, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

function classify(message) {
  if (/quote|price|cost|presupuesto|precio/i.test(message)) return 'quote_request';
  if (/appointment|book|schedule|cita|reserv/i.test(message)) return 'booking';
  if (/document|need|require|requisito|neces/i.test(message)) return 'requirements';
  return 'general_question';
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/api/message' && req.method === 'POST') {
    const body = await readBody(req);
    const message = String(body.message || '').slice(0, 600);
    const business = process.env.BUSINESS_NAME || body.business || 'Client Business';
    const knowledge = process.env.BUSINESS_KNOWLEDGE || body.knowledge || 'Business services, contact details and booking information.';
    const intent = classify(message);
    const score = Math.min(98, 48 + (intent === 'quote_request' ? 24 : 0) + (intent === 'booking' ? 20 : 0) + Math.min(18, message.length / 22));
    const reply = `I am the ${business} assistant. I classified this as ${intent}. I can collect name, email, phone, service, preferred date and notes for a human handoff.`;
    const run = { id: `run_${Date.now().toString(36)}`, intent, score: Math.round(score), message, reply, at: new Date().toISOString() };
    runs.unshift(run);
    return json(res, { ok: true, business, knowledgeChars: knowledge.length, run, runs: runs.slice(0, 8) });
  }

  let file = url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\/+/, '');
  const path = join(PUBLIC, file);
  if (!path.startsWith(PUBLIC) || !existsSync(path)) {
    res.writeHead(404);
    return res.end('Not found');
  }
  res.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream' });
  res.end(readFileSync(path));
}).listen(PORT, '127.0.0.1', () => {
  console.log(`AI Assistant Platform running on http://localhost:${PORT}`);
});
