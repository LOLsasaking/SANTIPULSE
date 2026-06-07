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
assertFile('backend/lib/vault.js');
assertFile('backend/lib/revealbot.js');
assertFile('backend/pulse/modules.js');
assertFile('backend/pulse/stripe-plans.js');
assertFile('backend/dashboard/run.js');
assertFile('backend/dashboard/service-status.js');
assertFile('backend/vault/dashboard.js');
assertFile('backend/receptionist/sos.js');
assertFile('backend/ads/roi-pulse.js');
assertFile('backend/integrations/revealbot/status.js');
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

const pulseModulesJs = readFileSync(join(ROOT, 'src/pulse-modules.js'), 'utf8');
const dashboardHtml = readFileSync(join(ROOT, 'src/app/dashboard.html'), 'utf8');
const loginHtml = readFileSync(join(ROOT, 'src/app/login.html'), 'utf8');
const authJs = readFileSync(join(ROOT, 'src/auth.js'), 'utf8');
const loginJs = readFileSync(join(ROOT, 'src/login.js'), 'utf8');
const dashboardJs = readFileSync(join(ROOT, 'src/dashboard.js'), 'utf8');
const dashboardNavJs = readFileSync(join(ROOT, 'src/dashboard-nav.js'), 'utf8');
const receptionistApi = readFileSync(join(ROOT, 'backend/receptionist/dashboard.js'), 'utf8');
const routerJs = readFileSync(join(ROOT, 'backend/handlers/router.js'), 'utf8');
const verifyConnectionsApi = readFileSync(join(ROOT, 'backend/admin/verify-connections.js'), 'utf8');
const backendAuthJs = readFileSync(join(ROOT, 'backend/lib/auth.js'), 'utf8');
const dashboardMeApi = readFileSync(join(ROOT, 'backend/dashboard/me.js'), 'utf8');
const dashboardServiceStatusApi = readFileSync(join(ROOT, 'backend/dashboard/service-status.js'), 'utf8');
const automationsApi = readFileSync(join(ROOT, 'backend/lib/automations.js'), 'utf8');
const adCheckoutApi = readFileSync(join(ROOT, 'backend/stripe/ad-checkout.js'), 'utf8');
const pulseModulesApi = readFileSync(join(ROOT, 'backend/pulse/modules.js'), 'utf8');
const dashboardRunApi = readFileSync(join(ROOT, 'backend/dashboard/run.js'), 'utf8');
const stripeCheckoutApi = readFileSync(join(ROOT, 'backend/stripe/checkout.js'), 'utf8');
const stripeWebhookApi = readFileSync(join(ROOT, 'backend/stripe/webhook.js'), 'utf8');
const pricingJs = readFileSync(join(ROOT, 'src/precios.js'), 'utf8');
const homeHtml = readFileSync(join(ROOT, 'src/pages/home.html'), 'utf8');
const animJs = readFileSync(join(ROOT, 'src/anim.js'), 'utf8');
const spanishI18n = readFileSync(join(ROOT, 'src/i18n/es.json'), 'utf8');

if (!dashboardHtml.includes('Automatizar ahora')) fail('dashboard must use easy automation copy');
if (!dashboardHtml.includes('data-admin-only') || !dashboardHtml.includes('Ingredients')) {
  fail('dashboard must include an admin-only Ingredients section');
}
if (!dashboardHtml.includes('serviceStatusGrid') || !dashboardHtml.includes('supportSosBtn')) {
  fail('dashboard must include simplified client service status and support/SOS areas');
}
if (!dashboardJs.includes('isAdmin') || !dashboardJs.includes('data-admin-only') || !dashboardJs.includes('/api/dashboard/service-status')) {
  fail('dashboard JS must gate Ingredients by isAdmin and load client service status');
}
if (!dashboardMeApi.includes('isAdmin') || !dashboardMeApi.includes('isAdminUser')) {
  fail('/api/dashboard/me must return the email-based isAdmin flag');
}
if (!backendAuthJs.includes('ADMIN_EMAIL') || !backendAuthJs.includes('requireAdmin') || !backendAuthJs.includes('403')) {
  fail('backend auth must expose email-based requireAdmin with 403 for non-admin users');
}
if (!verifyConnectionsApi.includes('requireAdmin')) {
  fail('/api/admin/verify-connections must enforce admin-only access');
}
if (!routerJs.includes("'dashboard/service-status'")) {
  fail('router missing dashboard/service-status');
}
if (!dashboardServiceStatusApi.includes('active') || !dashboardServiceStatusApi.includes('pending') || !dashboardServiceStatusApi.includes('locked')) {
  fail('/api/dashboard/service-status must return client-safe service states');
}
if (!dashboardNavJs.includes('403') || !dashboardNavJs.includes('solo está disponible')) {
  fail('dashboard nav must handle admin-only 403 responses in Spanish');
}
if (!homeHtml.includes('anim.js')) {
  fail('homepage must load the shared animation layer (anim.js)');
}
if (!animJs.includes('registerPlugin') || !animJs.includes('ScrollTrigger') || !animJs.includes('IntersectionObserver')) {
  fail('anim.js must use GSAP/ScrollTrigger with an IntersectionObserver fallback');
}
const motionPages = ['home', 'precios', 'contratar', 'demos', 'servicios', 'nosotros'];
for (const page of motionPages) {
  const html = readFileSync(join(ROOT, `src/pages/${page}.html`), 'utf8');
  if (!html.includes('gsap.min.js') || !html.includes('ScrollTrigger.min.js') || !html.includes('anim.js')) {
    fail(`${page}.html missing GSAP/ScrollTrigger/anim.js motion scripts`);
  }
  if (!html.includes('data-split')) fail(`${page}.html missing split headline hook`);
}
for (const required of ['Bóveda de Conocimiento', 'ROI Pulse', 'SOS humano']) {
  if (!dashboardHtml.includes(required) && !pulseModulesJs.includes(required)) fail(`dashboard missing ${required}`);
}
for (const route of ["'vault'", "'receptionist/sos'", "'ads/roi-pulse'", "'integrations/revealbot/status'"]) {
  if (!routerJs.includes(route)) fail(`router missing ${route}`);
}
for (const key of ['revealbot', 'vaultReadiness', 'pingRevealbot']) {
  if (!verifyConnectionsApi.includes(key)) fail(`verify-connections missing ${key}`);
}
if (!pulseModulesJs.includes('/api/stripe/ad-checkout')) fail('ads panel must use one-off ad checkout');
if (!pulseModulesJs.includes('Pagar y lanzar anuncio')) fail('ads panel must present a simple pay-and-launch CTA');
if (pulseModulesJs.includes('adRuleForm') || pulseModulesJs.includes('Nombre de la regla')) {
  fail('ads panel should not expose the rule-builder-first workflow');
}
if (!pulseModulesJs.includes('validateReceptionist') || !receptionistApi.includes('missing_required_config')) {
  fail('Recepcionista IA must validate required config before save/activation');
}
if (!pulseModulesJs.includes('tardando demasiado') || !pulseModulesJs.includes('12000')) {
  fail('OAuth connect buttons need visible timeout/error handling');
}
if (!automationsApi.includes('createSignedOAuthState') || !automationsApi.includes('tableMissing(error)')) {
  fail('OAuth state helper must fall back to signed state when oauth_states is not migrated');
}
if (!adCheckoutApi.includes("mode: 'payment'") || !adCheckoutApi.includes("kind: 'ad_launch'")) {
  fail('ad checkout must be a one-off payment tagged as ad_launch');
}
if (!pulseModulesApi.includes('export async function runPulseModule')) {
  fail('Pulse run modules must be async so Execute can trigger real provider/data actions');
}
if (!pulseModulesApi.includes('upsertAssistant') || !pulseModulesApi.includes('queuePost')) {
  fail('Pulse Execute must provision voice and queue social posts where possible');
}
if (!pulseModulesApi.includes('getVaultContext') || !receptionistApi.includes('getVaultContext')) {
  fail('Knowledge Vault context must feed Recepcionista IA and Pulse Execute');
}
if (!dashboardRunApi.includes('await runPulseModule')) {
  fail('/api/dashboard/run must await real Pulse module actions');
}
if (!stripeCheckoutApi.includes('getUser') || stripeCheckoutApi.includes('requireUser')) {
  fail('public pricing checkout must not require a logged-in dashboard session');
}
if (!stripeCheckoutApi.includes('public_checkout') || !stripeCheckoutApi.includes('/precios/?payment=cancelled')) {
  fail('public pricing checkout must use public onboarding/cancel URLs');
}
if (!stripeCheckoutApi.includes('resolveCheckoutPrice') || !stripeCheckoutApi.includes("startsWith('prod_')")) {
  fail('Stripe checkout must resolve product IDs to active price IDs for safer Vercel env setup');
}
if (!stripeWebhookApi.includes('normalizePlanKey') || !stripeWebhookApi.includes('subscription.metadata?.plan')) {
  fail('Stripe webhook must use checkout/subscription metadata to map plans');
}
if (!pricingJs.includes("fetch('/api/stripe/checkout'") || pricingJs.includes('loginHref(')) {
  fail('/precios/ buttons must open Stripe publicly instead of forcing login first');
}
if (!spanishI18n.includes('mismo email')) {
  fail('/bienvenida/ must explain same-email onboarding after public Stripe checkout');
}
if (!authJs.includes('finishAuthCallback') || !authJs.includes('exchangeCodeForSession') || !authJs.includes('replaceState')) {
  fail('auth helper must explicitly finish Supabase magic-link callbacks and clean callback URLs');
}
if (!authJs.includes('hasAuthCallback') || !authJs.includes('waitForSession')) {
  fail('auth helper must detect callback URLs and wait for session persistence');
}
if (authJs.includes("'/admin/'") || authJs.includes('"/admin/"') || loginJs.includes("'/admin/'") || loginJs.includes('"/admin/"')) {
  fail('login/auth success redirects must go to /dashboard/, not legacy /admin/');
}
if (!loginJs.includes('Accediendo') || !loginJs.includes('finishAuthCallback')) {
  fail('/login/ must show an accessing state and finish magic-link callbacks');
}
if (!dashboardJs.includes('finishAuthCallback') || !dashboardJs.includes('dashboard_auth_gate')) {
  fail('/dashboard/ auth gate must wait for callback processing before redirecting to /login/');
}
if (!loginHtml.includes('loginStatus')) {
  fail('/login/ must include a visible status node for callback/auth errors');
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
