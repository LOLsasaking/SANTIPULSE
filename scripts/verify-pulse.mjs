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

assertFile('api/index.js');
assertFile('backend/pulse/modules.js');
assertFile('backend/pulse/stripe-plans.js');
assertFile('backend/dashboard/run.js');
assertFile('backend-archive/api/demo/price-monitor.js');
assertFile('backend-archive/api/demo/lead-scraper.js');
assertFile('src/pages/bienvenida.html');
assertFile('src/pages/privacidad.html');
assertFile('.github/workflows/heavy-scraping.yml');
assertFile('santipulse/03 - Usage Limit Handoff.md');

const apiFiles = walk('api').filter((file) => file.endsWith('.js'));
if (apiFiles.length !== 1 || apiFiles[0] !== 'api/index.js') {
  fail(`api function count expected 1 catch-all, found: ${apiFiles.join(', ')}`);
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
