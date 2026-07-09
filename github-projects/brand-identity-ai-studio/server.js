import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PUBLIC = join(ROOT, 'public');
const PORT = process.env.PORT || 5103;
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

function json(res, body, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

function initials(name) {
  return String(name || 'SP').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'SP';
}

function svgData({ name, color }) {
  const mark = initials(name);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><rect width="1024" height="1024" rx="220" fill="${color}"/><circle cx="512" cy="512" r="310" fill="none" stroke="#fff" stroke-width="34" opacity=".28"/><text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-family="Inter,Arial,sans-serif" font-size="260" font-weight="900" fill="#fff">${mark}</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

function conceptSet({ name, color }) {
  const mark = initials(name);
  const dark = '#061226';
  const soft = '#b9d8ff';
  const svgs = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><rect width="1024" height="1024" rx="220" fill="${color}"/><path d="M246 682 C388 394 636 394 778 682" fill="none" stroke="#fff" stroke-width="54" stroke-linecap="round" opacity=".62"/><text x="512" y="538" text-anchor="middle" dominant-baseline="middle" font-family="Inter,Arial,sans-serif" font-size="260" font-weight="900" fill="#fff">${mark}</text></svg>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><rect width="1024" height="1024" rx="220" fill="${dark}"/><path d="M246 628 C360 342 520 262 784 230" fill="none" stroke="${soft}" stroke-width="58" stroke-linecap="round"/><path d="M296 742 C408 506 582 438 798 426" fill="none" stroke="#fff" stroke-width="44" stroke-linecap="round"/><text x="512" y="540" text-anchor="middle" dominant-baseline="middle" font-family="Inter,Arial,sans-serif" font-size="230" font-weight="900" fill="#fff">${mark}</text></svg>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><rect width="1024" height="1024" rx="220" fill="#f8fbff"/><path d="M512 122 764 218v218c0 212-118 354-252 426-134-72-252-214-252-426V218l252-96Z" fill="${color}"/><text x="512" y="520" text-anchor="middle" dominant-baseline="middle" font-family="Inter,Arial,sans-serif" font-size="260" font-weight="900" fill="#fff">${mark}</text></svg>`
  ];
  return svgs.map((svg, index) => ({ name: ['Arc mark', 'Signal mark', 'Trust crest'][index], image: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}` }));
}

function dataUrlToBlob(dataUrl) {
  const match = String(dataUrl || '').match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/i);
  if (!match) return null;
  const mime = match[1].replace('image/jpg', 'image/jpeg');
  return new Blob([Buffer.from(match[2], 'base64')], { type: mime });
}

async function generateWithOpenAI({ name, sector, direction, color }) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1.5';
  const prompt = `Redesign a professional logo concept for "${name}", a ${sector} brand. Style: ${direction}. Use a premium dark-blue identity around ${color}. Clean vector-like mark, transparent or simple background, no mockup, no fake text except the brand initials if useful.`;
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt, size: '1024x1024', n: 1 })
  });
  if (!response.ok) throw new Error(`OpenAI image ${response.status}: ${await response.text()}`);
  const data = await response.json();
  const item = data.data && data.data[0];
  if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`;
  return item?.url || null;
}

async function editWithOpenAI({ name, sector, direction, color, logoDataUrl }) {
  const key = process.env.OPENAI_API_KEY;
  const blob = dataUrlToBlob(logoDataUrl);
  if (!key || !blob) return null;
  const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1.5';
  const prompt = `Redesign this uploaded logo for "${name}", a ${sector} brand. Keep useful recognition but make it premium, clean, modern and usable for app/web branding. Direction: ${direction}. Palette based on ${color}.`;
  const form = new FormData();
  form.append('model', model);
  form.append('prompt', prompt);
  form.append('size', '1024x1024');
  form.append('image', blob, 'uploaded-logo.png');
  const response = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: form
  });
  if (!response.ok) throw new Error(`OpenAI edit ${response.status}: ${await response.text()}`);
  const data = await response.json();
  const item = data.data && data.data[0];
  if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`;
  return item?.url || null;
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname === '/api/generate-brand' && req.method === 'POST') {
    const body = await readBody(req);
    const config = {
      name: String(body.name || 'Santi Pulse').slice(0, 80),
      sector: String(body.sector || 'digital services').slice(0, 120),
      direction: String(body.direction || 'premium, technical, trustworthy').slice(0, 300),
      color: /^#[0-9a-f]{6}$/i.test(body.color || '') ? body.color : '#0b3d91',
      logoDataUrl: String(body.logoDataUrl || '')
    };
    let image = null;
    let mode = 'fallback-svg';
    try {
      image = await editWithOpenAI(config);
      if (image) mode = 'openai-image-edit';
      if (!image) {
        image = await generateWithOpenAI(config);
        if (image) mode = 'openai-image-generation';
      }
    } catch (error) {
      mode = `fallback-svg (${error.message.slice(0, 80)})`;
    }
    if (!image) image = svgData(config);
    const concepts = conceptSet(config);
    return json(res, {
      ok: true,
      mode,
      image,
      kit: {
        ...config,
        palette: [config.color, '#061226', '#b9d8ff', '#f8fbff'],
        files: ['logo.png/svg', 'brand-kit.json', 'tokens.css']
      },
      concepts
    });
  }
  const path = join(PUBLIC, url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\/+/, ''));
  if (!path.startsWith(PUBLIC) || !existsSync(path)) { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream' });
  res.end(readFileSync(path));
}).listen(PORT, '127.0.0.1', () => console.log(`Brand Identity AI Studio running on http://localhost:${PORT}`));
