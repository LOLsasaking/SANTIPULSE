import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const failures = [];

function fail(message) {
  failures.push(message);
}

function assertFile(path) {
  if (!existsSync(join(ROOT, path))) fail(`missing ${path}`);
}

function walk(dir, out = []) {
  const abs = join(ROOT, dir);
  if (!existsSync(abs)) return out;
  for (const entry of readdirSync(abs)) {
    const full = join(abs, entry);
    const rel = relative(ROOT, full).replace(/\\/g, '/');
    if (/(^|\/)(node_modules|dist|\.git)(\/|$)/.test(rel)) continue;
    if (statSync(full).isDirectory()) walk(rel, out);
    else out.push(rel);
  }
  return out;
}

assertFile('api/[...route].js');
assertFile('README.md');
assertFile('backend/handlers/router.js');
assertFile('backend/lib/auth.js');
assertFile('backend/lib/db.js');
assertFile('backend/pulse/modules.js');
assertFile('backend/pulse/stripe-plans.js');
assertFile('backend/dashboard/run.js');
assertFile('backend/stripe/ad-checkout.js');
assertFile('backend-archive/api/demo/price-monitor.js');
assertFile('backend-archive/api/demo/lead-scraper.js');
assertFile('src/pages/bienvenida.html');
assertFile('src/pages/privacidad.html');
assertFile('.github/workflows/heavy-scraping.yml');
assertFile('santipulse/03 - Usage Limit Handoff.md');

const apiFiles = walk('api').filter((file) => file.endsWith('.js'));
if (apiFiles.length !== 1 || apiFiles[0] !== 'api/[...route].js') {
  fail(`api function count expected 1 catch-all, found: ${apiFiles.join(', ')}`);
}

const apiHandler = readFileSync(join(ROOT, 'api/[...route].js'), 'utf8');
if (!apiHandler.includes("backend/handlers/router.js")) {
  fail('api catch-all must delegate to backend/handlers/router.js');
}
if (apiHandler.includes('new Map([') || apiHandler.includes('hydrateBody(')) {
  fail('api catch-all should stay a thin Vercel adapter, not own the route map/body parsing');
}
if (existsSync(join(ROOT, 'backend/_lib'))) {
  fail('backend/_lib should be backend/lib in the production architecture');
}

const activeFiles = [
  ...walk('api'),
  ...walk('backend'),
  ...walk('src'),
  ...walk('scripts'),
  'vercel.json',
  'package.json',
].filter((file) => existsSync(join(ROOT, file)) && file !== 'scripts/verify-pulse.mjs');

const legacyPattern = /price_monitor|lead_scraper|price monitor|lead scraper|Monitor de precios|Captador de leads|Captacion de leads|Captación de leads|Price Monitor|Lead Scraper|\/api\/demo/i;
for (const file of activeFiles) {
  const text = readFileSync(join(ROOT, file), 'utf8');
  if (legacyPattern.test(text)) fail(`legacy reference in ${file}`);
}

const labels = ['Recepcionista IA', 'Insights de Redes', 'Gestor de Ads'];
const haystack = activeFiles.map((file) => readFileSync(join(ROOT, file), 'utf8')).join('\n');
for (const label of labels) {
  if (!haystack.includes(label)) fail(`missing label ${label}`);
}

const vercel = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8'));
const hasAdminRedirect = (vercel.redirects || []).some((r) => r.source === '/admin' && r.destination === '/login/');
if (!hasAdminRedirect) fail('missing /admin -> /login/ redirect');

for (const alias of ['recepcionista', 'social', 'ads']) {
  if (!haystack.includes(alias)) fail(`missing PRICING_LOGIC.js plan alias ${alias}`);
}

const distPages = [
  'dist/index.html',
  'dist/servicios/index.html',
  'dist/contratar/index.html',
  'dist/demos/index.html',
  'dist/nosotros/index.html',
  'dist/precios/index.html',
  'dist/bienvenida/index.html',
  'dist/privacidad/index.html',
];
for (const page of distPages) {
  const abs = join(ROOT, page);
  if (!existsSync(abs)) continue;
  const html = readFileSync(abs, 'utf8');
  if (/\{\{[^}]+\}\}/.test(html)) fail(`unresolved template token in ${page}`);
  if (!/property="og:image"\s+content="https:\/\/santipulse\.com\/santilogo\.png"/.test(html)) fail(`missing og:image in ${page}`);
  if (!/name="twitter:image"\s+content="https:\/\/santipulse\.com\/santilogo\.png"/.test(html)) fail(`missing twitter:image in ${page}`);
  if (!/name="twitter:card"\s+content="summary_large_image"/.test(html)) fail(`twitter card is not summary_large_image in ${page}`);
}

// ── Environment readiness (warning-only) ──────────────────────────────
// Missing keys do NOT fail the build (the static site builds fine without
// secrets, and Vercel injects them at runtime), but we surface exactly what
// is unset so a deploy is never silently "broken". The live Truth Layer is
// /api/admin/verify-connections, which proves each key actually works.
const ENV_GROUPS = {
  core: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY'],
  payments: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
  receptionist: ['VAPI_API_KEY'],
  social: ['META_APP_ID', 'META_APP_SECRET', 'META_ACCESS_TOKEN'],
};
const missingEnv = [];
for (const [group, keys] of Object.entries(ENV_GROUPS)) {
  for (const key of keys) if (!process.env[key]) missingEnv.push(`${group}/${key}`);
}
if (missingEnv.length) {
  console.warn('\nEnv readiness — unset keys (set these in Vercel before going live):');
  for (const key of missingEnv) console.warn(`  ○ ${key}`);
} else {
  console.log('\nEnv readiness — all required keys present.');
}

if (failures.length) {
  console.error('\nPulse verification failed:');
  for (const item of failures) console.error(`- ${item}`);
  process.exit(1);
}

console.log('\nPulse verification passed.');
