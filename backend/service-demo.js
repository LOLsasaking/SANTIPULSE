/* ============================================================
   POST /api/service-demo
   ------------------------------------------------------------
   Portfolio product-demo backend for the public service section.
   These demos are intentionally dependency-free and safe to run without
   private API keys. They behave like small apps: a frontend sends config,
   the backend returns status, records, logs, metrics, and exportable files.
   ============================================================ */
import crypto from 'node:crypto';
import { getIp, parseBody } from './lib/http.js';

const STORE = globalThis.__santipulseServiceDemoStore || new Map();
globalThis.__santipulseServiceDemoStore = STORE;

const TOOLS = new Set(['ai', 'automation', 'brand', 'electrical']);
const BRAND_TEMPLATES = [
  { id: 'executive-saas', name: 'Executive SaaS', mood: 'premium, technical, high trust', image: '/clone-assets/websites/dashboard-panel.jpg' },
  { id: 'local-service', name: 'Local Service', mood: 'approachable, clean, direct', image: '/clone-assets/work/barberia-el-estimado.jpg' },
  { id: 'luxury-collection', name: 'Luxury Collection', mood: 'dark, editorial, luxury', image: '/clone-assets/work/sol-morena.jpg' },
  { id: 'mobility-imports', name: 'Mobility Imports', mood: 'bold, automotive, conversion focused', image: '/clone-assets/work/vals-basl.jpg' },
];

function clean(value, max = 600) {
  return String(value == null ? '' : value)
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .trim()
    .slice(0, max);
}

function hash(value) {
  return crypto.createHash('sha1').update(String(value)).digest('hex').slice(0, 12);
}

function slug(value) {
  return clean(value, 90).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'santiago-demo';
}

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function normalizeConfig(input) {
  const source = input && typeof input === 'object' ? input : {};
  const out = {};
  for (const [key, value] of Object.entries(source)) out[key] = clean(value, 1200);
  return out;
}

function artifactBundle(title, files) {
  return {
    title,
    generatedAt: new Date().toISOString(),
    files,
  };
}

function file(path, content) {
  return { path, content };
}

function responseBase(tool, action, config, lang, req) {
  const fingerprint = hash(`${getIp(req)}:${req.headers['user-agent'] || ''}`);
  const sessionId = `${tool}_${hash(JSON.stringify(config))}`;
  const runId = `${sessionId}_${Date.now().toString(36)}`;
  return {
    tool,
    action,
    lang,
    sessionId,
    runId,
    mode: 'demo-backend',
    backend: {
      endpoint: '/api/service-demo',
      runtime: 'Vercel Serverless / local Node preview',
      storage: 'demo memory',
      fingerprint,
    },
  };
}

function remember(sessionId, run) {
  const list = STORE.get(sessionId) || [];
  list.unshift(run);
  STORE.set(sessionId, list.slice(0, 6));
  return STORE.get(sessionId);
}

function buildAi({ action, config, input, lang, req }) {
  const base = responseBase('ai', action, config, lang, req);
  const business = clean(config.business, 80) || 'Client Business';
  const industry = clean(config.industry, 100) || 'service business';
  const tone = clean(config.tone, 40) || 'professional';
  const goal = clean(config.goal, 40) || 'qualify leads';
  const knowledge = clean(config.question, 1400) || 'Services, business hours, contact details, documents needed, prices, and booking flow.';
  const userMessage = clean(input?.message || input?.query || '', 500) || (lang === 'es'
    ? 'Que necesito para pedir presupuesto?'
    : 'What do I need to request a quote?');
  const lower = userMessage.toLowerCase();
  const intent = /price|quote|budget|presupuesto|precio|cost/i.test(lower)
    ? 'quote_request'
    : /book|appointment|cita|schedule|reserv/i.test(lower)
      ? 'booking'
      : /document|paper|doc|requisito|need|neces/i.test(lower)
        ? 'requirements'
        : 'general_question';
  const leadScore = Math.min(98, 52 + (intent === 'quote_request' ? 22 : 0) + (intent === 'booking' ? 18 : 0) + (knowledge.length > 120 ? 8 : 0));
  const reply = lang === 'es'
    ? `Soy el asistente de ${business}. Segun tu mensaje, lo clasifico como "${intent}". Puedo pedir nombre, email, telefono, servicio, fecha ideal y detalles para que Santiago lo revise.`
    : `I am the ${business} assistant. I classified this as "${intent}". I can collect name, email, phone, service, ideal date and details so Santiago can review it.`;
  const questions = lang === 'es'
    ? [`Que servicio necesitas de ${business}?`, 'Cual es tu fecha ideal?', 'Quieres que Santiago te contacte?']
    : [`What service do you need from ${business}?`, 'What is your ideal date?', 'Should Santiago contact you?'];
  const records = [
    { type: 'lead', id: `lead_${hash(userMessage)}`, status: leadScore >= 75 ? 'hot' : 'warm', score: leadScore, intent },
    { type: 'message', role: 'visitor', text: userMessage },
    { type: 'message', role: 'assistant', text: reply },
    { type: 'knowledge_base', source: industry, chars: knowledge.length },
  ];
  const logs = [
    'Received visitor message',
    `Detected intent: ${intent}`,
    `Matched business knowledge for ${industry}`,
    `Calculated lead score: ${leadScore}`,
    'Prepared handoff fields for contact form and CRM',
  ];
  const metrics = [
    { label: 'Lead score', value: `${leadScore}%` },
    { label: 'Intent', value: intent.replace(/_/g, ' ') },
    { label: 'Questions', value: String(questions.length) },
    { label: 'Backend', value: 'online' },
  ];
  const widget = `export function AssistantWidget(){\n  return <div className="assistant-widget">\n    <strong>${business} Assistant</strong>\n    <p>${reply}</p>\n  </div>;\n}\n`;
  const api = `export default async function handler(req,res){\n  const body = req.body || {};\n  return res.json({ reply: ${JSON.stringify(reply)}, nextFields: ['name','email','phone','service','date'] });\n}\n`;
  const readme = `# ${business} AI Assistant\n\nA production-style assistant for ${industry}.\n\n## Backend\nPOST /api/assistant/message classifies intent, scores leads, and prepares CRM handoff.\n\n## Frontend\nAssistantWidget renders suggested questions and a visitor chat surface.\n\n## Current demo run\n- Intent: ${intent}\n- Lead score: ${leadScore}%\n- Tone: ${tone}\n- Goal: ${goal}\n`;
  const bundle = artifactBundle(`${business} AI Assistant App`, [
    file('README.md', readme),
    file('frontend/AssistantWidget.jsx', widget),
    file('api/assistant/message.js', api),
    file('data/knowledge-base.json', JSON.stringify({ business, industry, tone, goal, knowledge, questions }, null, 2)),
  ]);
  const runs = remember(base.sessionId, { runId: base.runId, at: new Date().toISOString(), intent, leadScore });
  return { ...base, title: `${business} AI Assistant`, reply, metrics, records, logs, questions, bundle, runs };
}

function buildAutomation({ action, config, input, lang, req }) {
  const base = responseBase('automation', action, config, lang, req);
  const name = clean(config.workflowName, 90) || 'Client Request Workflow';
  const trigger = clean(config.trigger, 40) || 'form';
  const mainAction = clean(config.action, 50) || 'organize';
  const destination = clean(config.destination, 50) || 'dashboard';
  const rules = clean(config.rules, 1400) || 'Collect request details, detect urgency, assign priority and notify the business.';
  const payload = clean(input?.payload || input?.message || '', 700) || 'New website request: landing page, budget 900, urgent, needs call this week.';
  const urgent = /urgent|today|asap|alta|urgente|hoy/i.test(`${rules} ${payload}`);
  const steps = [
    { id: 'trigger', name: `Receive ${trigger}`, status: 'complete' },
    { id: 'classify', name: `Apply rule: ${mainAction}`, status: 'complete' },
    { id: 'priority', name: urgent ? 'Mark high priority' : 'Mark normal priority', status: 'complete' },
    { id: 'deliver', name: `Send to ${destination}`, status: 'queued' },
  ];
  const records = [
    { type: 'workflow_run', id: base.runId, status: urgent ? 'needs_attention' : 'processed' },
    { type: 'task', title: 'Review client request', priority: urgent ? 'high' : 'normal' },
    { type: 'notification', channel: destination, status: 'queued' },
    { type: 'payload', value: payload },
  ];
  const logs = [
    'Webhook payload accepted',
    `Trigger matched: ${trigger}`,
    `Rules evaluated: ${urgent ? 'urgent route' : 'standard route'}`,
    `Generated task and destination handoff for ${destination}`,
  ];
  const metrics = [
    { label: 'Run status', value: urgent ? 'attention' : 'processed' },
    { label: 'Steps', value: `${steps.length}/4` },
    { label: 'Priority', value: urgent ? 'high' : 'normal' },
    { label: 'Backend', value: 'online' },
  ];
  const workflowJson = { name, trigger, action: mainAction, destination, rules, steps };
  const dashboard = `export function WorkflowDashboard(){\n  const steps = ${JSON.stringify(steps, null, 2)};\n  return <section>{steps.map(step => <p key={step.id}>{step.name}: {step.status}</p>)}</section>;\n}\n`;
  const api = `export default async function handler(req,res){\n  const payload = req.body || {};\n  return res.json({ ok: true, workflow: ${JSON.stringify(name)}, status: ${JSON.stringify(urgent ? 'needs_attention' : 'processed')} });\n}\n`;
  const readme = `# ${name}\n\nBackend-backed automation demo.\n\n## Flow\n${steps.map((step) => `- ${step.name}: ${step.status}`).join('\n')}\n\n## Rules\n${rules}\n`;
  const bundle = artifactBundle(`${name} Automation App`, [
    file('README.md', readme),
    file('frontend/WorkflowDashboard.jsx', dashboard),
    file('api/workflow/run.js', api),
    file('automation/workflow.json', JSON.stringify(workflowJson, null, 2)),
  ]);
  const runs = remember(base.sessionId, { runId: base.runId, at: new Date().toISOString(), status: urgent ? 'attention' : 'processed' });
  return { ...base, title: name, metrics, records, logs, steps, bundle, runs };
}

function mix(hex, amount) {
  const cleanHex = clean(hex, 7).replace('#', '') || '0b3d91';
  const full = cleanHex.length === 3 ? cleanHex.split('').map((c) => c + c).join('') : cleanHex.padEnd(6, '0').slice(0, 6);
  const num = parseInt(full, 16);
  const target = amount < 0 ? 0 : 255;
  const ratio = Math.abs(amount);
  const r = Math.round(((num >> 16) & 255) * (1 - ratio) + target * ratio);
  const g = Math.round(((num >> 8) & 255) * (1 - ratio) + target * ratio);
  const b = Math.round((num & 255) * (1 - ratio) + target * ratio);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function initials(name) {
  return clean(name, 80).split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'SP';
}

function svgDataUrl(svg) {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

function brandSvg({ color, mark, variant }) {
  const ink = mix(color, -0.55);
  const soft = mix(color, 0.36);
  if (variant === 'signal') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640"><rect width="640" height="640" rx="136" fill="${ink}"/><path d="M152 382 C210 238 304 186 468 162" fill="none" stroke="${soft}" stroke-width="34" stroke-linecap="round"/><path d="M184 452 C254 310 358 264 486 254" fill="none" stroke="#fff" stroke-width="26" stroke-linecap="round" opacity=".88"/><circle cx="190" cy="448" r="24" fill="${color}"/><text x="320" y="346" text-anchor="middle" dominant-baseline="middle" font-family="Inter,Arial,sans-serif" font-size="142" font-weight="900" fill="#fff">${mark}</text></svg>`;
  }
  if (variant === 'grid') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640"><rect width="640" height="640" rx="120" fill="${color}"/><g opacity=".25" stroke="#fff" stroke-width="2">${Array.from({ length: 8 }, (_, i) => `<path d="M${132 + i * 54} 120V520"/><path d="M120 ${132 + i * 54}H520"/>`).join('')}</g><rect x="164" y="164" width="312" height="312" rx="72" fill="${ink}" opacity=".78"/><path d="M206 386 320 202 434 386" fill="none" stroke="#fff" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/><text x="320" y="418" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="86" font-weight="900" fill="#fff">${mark}</text></svg>`;
  }
  if (variant === 'crest') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640"><rect width="640" height="640" rx="132" fill="#f8fbff"/><path d="M320 92 482 154v138c0 126-66 210-162 256-96-46-162-130-162-256V154l162-62Z" fill="${ink}"/><path d="M320 142 438 188v105c0 89-45 154-118 195-73-41-118-106-118-195V188l118-46Z" fill="${color}"/><path d="M244 344c54-116 97-116 152 0" fill="none" stroke="#fff" stroke-width="28" stroke-linecap="round"/><text x="320" y="292" text-anchor="middle" dominant-baseline="middle" font-family="Inter,Arial,sans-serif" font-size="112" font-weight="900" fill="#fff">${mark}</text></svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640"><rect width="640" height="640" rx="128" fill="${color}"/><circle cx="320" cy="320" r="208" fill="none" stroke="#fff" stroke-width="22" opacity=".28"/><path d="M156 434 C246 250 394 250 484 434" fill="none" stroke="#fff" stroke-width="26" stroke-linecap="round" opacity=".52"/><text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-family="Inter,Arial,sans-serif" font-size="168" font-weight="900" fill="#fff">${mark}</text></svg>`;
}

function buildLocalBrandConcepts({ color, mark }) {
  return [
    { id: 'arc', name: 'Arc mark', image: svgDataUrl(brandSvg({ color, mark, variant: 'arc' })) },
    { id: 'signal', name: 'Signal mark', image: svgDataUrl(brandSvg({ color, mark, variant: 'signal' })) },
    { id: 'grid', name: 'Grid system', image: svgDataUrl(brandSvg({ color, mark, variant: 'grid' })) },
    { id: 'crest', name: 'Trust crest', image: svgDataUrl(brandSvg({ color, mark, variant: 'crest' })) },
  ];
}

function dataUrlToBlob(dataUrl) {
  const match = String(dataUrl || '').match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/i);
  if (!match) return null;
  const mime = match[1].replace('image/jpg', 'image/jpeg');
  const buffer = Buffer.from(match[2], 'base64');
  return new Blob([buffer], { type: mime });
}

async function callOpenAIImageGeneration({ key, model, prompt }) {
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      prompt,
      size: '1024x1024',
      n: 1,
    }),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`OpenAI image ${response.status}: ${text.slice(0, 160)}`);
  }
  const data = await response.json();
  const image = data?.data?.[0];
  if (image?.b64_json) return `data:image/png;base64,${image.b64_json}`;
  return image?.url || null;
}

async function callOpenAIImageEdit({ key, model, prompt, logoDataUrl }) {
  const blob = dataUrlToBlob(logoDataUrl);
  if (!blob) return null;
  const form = new FormData();
  form.append('model', model);
  form.append('prompt', prompt);
  form.append('size', '1024x1024');
  form.append('image', blob, 'uploaded-logo.png');
  const response = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`OpenAI image edit ${response.status}: ${text.slice(0, 160)}`);
  }
  const data = await response.json();
  const image = data?.data?.[0];
  if (image?.b64_json) return `data:image/png;base64,${image.b64_json}`;
  return image?.url || null;
}

async function generateBrandImage({ brand, sector, style, color, tagline, template, logoDataUrl, logoName }) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1.5';
  const templateMood = template?.mood ? `Reference mood: ${template.mood}.` : '';
  const uploadNote = logoName ? `The client uploaded an existing logo named ${logoName}; preserve useful brand recognition while improving it.` : '';
  const prompt = [
    `Create a professional logo redesign concept for "${brand}".`,
    `Business sector: ${sector}.`,
    `Style direction: ${style}.`,
    `Brand promise: ${tagline}.`,
    `Use a refined dark-blue palette based on ${color}.`,
    templateMood,
    uploadNote,
    'Output a clean vector-like logo concept on a simple background.',
    'Avoid clutter, generic AI symbols, fake mockups, stock-photo scenes, and unreadable text.',
    'If text appears, use only the brand name or initials.'
  ].filter(Boolean).join(' ');

  if (logoDataUrl) {
    try {
      const edited = await callOpenAIImageEdit({ key, model, prompt, logoDataUrl });
      if (edited) return { mode: 'openai-image-edit', image: edited };
    } catch (error) {
      const generated = await callOpenAIImageGeneration({ key, model, prompt: `${prompt} Image edit failed, create a fresh logo concept inspired by the uploaded brand instead. Error context: ${error.message.slice(0, 80)}` });
      if (generated) return { mode: 'openai-image-generation', image: generated };
      throw error;
    }
  }

  const generated = await callOpenAIImageGeneration({ key, model, prompt });
  if (generated) return { mode: 'openai-image-generation', image: generated };
  return null;
}

async function buildBrand({ action, config, input, lang, req }) {
  const base = responseBase('brand', action, config, lang, req);
  const brand = clean(config.brandName, 80) || 'Santi Pulse';
  const sector = clean(config.sector, 120) || 'digital services';
  const style = clean(config.style, 50) || 'clean';
  const color = /^#[0-9a-f]{6}$/i.test(config.color || '') ? config.color : '#0b3d91';
  const tagline = clean(config.tagline || input?.message, 300) || 'Professional services people remember.';
  const template = BRAND_TEMPLATES.find((item) => item.id === config.template) || BRAND_TEMPLATES[0];
  const mark = initials(brand);
  const palette = [color, mix(color, -0.55), mix(color, 0.35), '#f8fbff'];
  const concepts = buildLocalBrandConcepts({ color, mark });
  const svg = Buffer.from(concepts[0].image.split(',')[1] || '', 'base64').toString('utf8') || brandSvg({ color, mark, variant: 'arc' });
  let imageMode = 'local-generative-engine';
  let image = concepts[0].image;
  let imageError = '';
  if (action === 'generate-image' || action === 'export') {
    try {
      const generated = await generateBrandImage({
        brand,
        sector,
        style,
        color,
        tagline,
        template,
        logoDataUrl: input?.logoDataUrl,
        logoName: input?.logoName,
      });
      if (generated?.image) {
        image = generated.image;
        imageMode = generated.mode;
      }
    } catch (error) {
      imageError = error.message;
      imageMode = 'fallback-svg';
    }
  }
  const records = [
    { type: 'brand', name: brand, sector, style },
    { type: 'logo', format: imageMode.startsWith('openai') ? 'ai image' : 'local generated svg', mark },
    { type: 'palette', colors: palette.join(', ') },
    { type: 'template', name: template.name, mood: template.mood },
    { type: 'usage', rule: 'Use primary color for CTAs and key UI states' },
  ];
  const logs = [
    imageMode.startsWith('openai') ? 'Generated AI logo concept through backend' : 'Generated local logo concept set without API key',
    imageError ? `AI image fallback reason: ${imageError}` : 'Image pipeline completed',
    'Built accessible color palette',
    'Created CSS tokens',
    'Packaged assets for repo handoff',
  ];
  const metrics = [
    { label: 'Assets', value: '6 files' },
    { label: 'Colors', value: String(palette.length) },
    { label: 'Logo', value: imageMode.startsWith('openai') ? 'AI' : 'Local' },
    { label: 'Backend', value: 'online' },
  ];
  const css = `:root{\n  --brand-primary:${palette[0]};\n  --brand-ink:${palette[1]};\n  --brand-soft:${palette[2]};\n  --brand-paper:${palette[3]};\n}\n.button-primary{background:var(--brand-primary);color:#fff;border-radius:999px;padding:12px 18px;font-weight:800;}\n`;
  const readme = `# ${brand} Brand System\n\n## Direction\n${style} identity for ${sector}.\n\n## Promise\n${tagline}\n\n## Palette\n${palette.map((item) => `- ${item}`).join('\n')}\n`;
  const bundle = artifactBundle(`${brand} Brand App`, [
    file('README.md', readme),
    file('frontend/BrandPortal.jsx', `export const brand = ${JSON.stringify({ brand, tagline, palette, imageMode, template }, null, 2)};\n`),
    file('api/brand/generate.js', `export default async function handler(req,res){\n  // Keep OPENAI_API_KEY on the server. Never expose it in frontend code.\n  return res.json(${JSON.stringify({ brand, palette, mark, imageMode, template }, null, 2)});\n}\n`),
    file('brand/logo.svg', svg),
    file('brand/generated-logo-data-url.txt', image),
    file('brand/concepts.json', JSON.stringify(concepts, null, 2)),
    file('brand/tokens.css', css),
    file('brand/brand-kit.json', JSON.stringify({ brand, sector, style, tagline, mark, palette, imageMode, template, concepts }, null, 2)),
  ]);
  const runs = remember(base.sessionId, { runId: base.runId, at: new Date().toISOString(), assets: bundle.files.length });
  return { ...base, title: `${brand} Brand System`, metrics, records, logs, palette, svg, image, imageMode, concepts, templates: BRAND_TEMPLATES, selectedTemplate: template, bundle, runs };
}

function buildElectrical({ action, config, input, lang, req }) {
  const base = responseBase('electrical', action, config, lang, req);
  const projectType = clean(config.projectType, 40) || 'residential';
  const rooms = clampNumber(config.rooms, 1, 30, 5);
  const area = clampNumber(config.area, 10, 1600, 90);
  const phase = clean(config.phase, 20) || 'single';
  const loads = Array.isArray(input?.loads) ? input.loads.map((item) => clean(item, 40)).filter(Boolean) : [];
  const brief = clean(config.brief || input?.message, 1200);
  const circuits = [
    { id: 'C1', name: 'Lighting zones', protection: '10A' },
    { id: 'C2', name: 'General sockets', protection: '16A' },
    { id: 'C3', name: 'Kitchen and appliances', protection: '20A' },
    ...(loads.includes('ev') || /ev|charger|wallbox|cargador/i.test(brief) ? [{ id: 'C4', name: 'EV reserve', protection: 'dedicated review' }] : []),
    ...(loads.includes('solar') || /solar|battery|bateria/i.test(brief) ? [{ id: 'C5', name: 'Solar reserve', protection: 'dedicated review' }] : []),
  ];
  const materials = [
    `${Math.max(rooms, Math.ceil(area / 18))} lighting points estimated`,
    `${Math.max(2, Math.ceil(rooms / 2))} socket groups estimated`,
    'Labeled distribution board and spare ways',
    'Cable routes, conduit, junction boxes, and inspection points',
  ];
  const records = [
    { type: 'project', projectType, rooms, area, phase },
    { type: 'circuits', count: circuits.length },
    { type: 'materials', count: materials.length },
    { type: 'safety', status: 'requires qualified electrician review' },
  ];
  const logs = [
    'Read project configuration',
    'Separated lighting, sockets and dedicated loads',
    'Built review package for site visit',
    'Flagged final sizing and code compliance for professional review',
  ];
  const metrics = [
    { label: 'Circuits', value: String(circuits.length) },
    { label: 'Zones', value: String(rooms) },
    { label: 'Area', value: `${area} m2` },
    { label: 'Backend', value: 'online' },
  ];
  const readme = `# Electrical Planning Demo\n\nConcept package for a ${projectType} project.\n\n## Important\nThis is a planning aid only. Final installation, sizing, protections and code compliance must be reviewed by a qualified electrician.\n\n## Circuits\n${circuits.map((item) => `- ${item.id}: ${item.name} (${item.protection})`).join('\n')}\n\n## Materials\n${materials.map((item) => `- ${item}`).join('\n')}\n`;
  const bundle = artifactBundle('Electrical Planning App', [
    file('README.md', readme),
    file('frontend/ElectricalPlanner.jsx', `export const circuits = ${JSON.stringify(circuits, null, 2)};\n`),
    file('api/electrical/plan.js', `export default async function handler(req,res){ return res.json(${JSON.stringify({ circuits, materials }, null, 2)}); }\n`),
    file('data/materials.json', JSON.stringify({ materials, circuits, records }, null, 2)),
  ]);
  const runs = remember(base.sessionId, { runId: base.runId, at: new Date().toISOString(), circuits: circuits.length });
  return { ...base, title: 'Electrical Planning App', metrics, records, logs, circuits, materials, bundle, runs };
}

const BUILDERS = {
  ai: buildAi,
  automation: buildAutomation,
  brand: buildBrand,
  electrical: buildElectrical,
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      service: 'service-demo',
      tools: Array.from(TOOLS),
      actions: ['run', 'message', 'export'],
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'method' });
  }

  const body = parseBody(req);
  const tool = clean(body.tool, 30);
  if (!TOOLS.has(tool)) return res.status(400).json({ ok: false, error: 'unknown_tool' });

  const action = clean(body.action, 30) || 'run';
  const config = normalizeConfig(body.config);
  const input = body.input && typeof body.input === 'object' ? body.input : {};
  const lang = clean(body.lang, 5) || 'en';
  const result = await BUILDERS[tool]({ action, config, input, lang, req });

  return res.status(200).json({ ok: true, ...result });
}
