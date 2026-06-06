import cronProcess from '../cron/process.js';
import dashboardMe from '../dashboard/me.js';
import dashboardProfile from '../dashboard/profile.js';
import dashboardRun from '../dashboard/run.js';
import dashboardRuns from '../dashboard/runs.js';
import lead from '../lead.js';
import receptionistDashboard from '../receptionist/dashboard.js';
import receptionistVapiWebhook from '../receptionist/vapi-webhook.js';
import receptionistWhatsappWebhook from '../receptionist/whatsapp-webhook.js';
import insightsDashboard from '../insights/dashboard.js';
import insightsIngest from '../insights/ingest.js';
import adsDashboard from '../ads/dashboard.js';
import adsAuthorize from '../integrations/ads/authorize.js';
import adsCallback from '../integrations/ads/callback.js';
import adsTiktokCallback from '../integrations/ads/tiktok-callback.js';
import calendarAuthorize from '../integrations/calendar/authorize.js';
import calendarCallback from '../integrations/calendar/callback.js';
import socialAuthorize from '../integrations/social/authorize.js';
import socialCallback from '../integrations/social/callback.js';
import adminVerifyConnections from '../admin/verify-connections.js';
import stripeCheckout from '../stripe/checkout.js';
import stripeAdCheckout from '../stripe/ad-checkout.js';
import stripePortal from '../stripe/portal.js';
import stripeWebhook from '../stripe/webhook.js';

const ROUTES = new Map([
  ['lead', lead],
  ['receptionist/dashboard', receptionistDashboard],
  ['receptionist/vapi-webhook', receptionistVapiWebhook],
  ['receptionist/whatsapp-webhook', receptionistWhatsappWebhook],
  ['insights/dashboard', insightsDashboard],
  ['insights/ingest', insightsIngest],
  ['integrations/social/authorize', socialAuthorize],
  ['integrations/social/callback', socialCallback],
  ['ads/dashboard', adsDashboard],
  ['integrations/ads/authorize', adsAuthorize],
  ['integrations/ads/callback', adsCallback],
  ['integrations/ads/tiktok-callback', adsTiktokCallback],
  ['integrations/calendar/authorize', calendarAuthorize],
  ['integrations/calendar/callback', calendarCallback],
  ['admin/verify-connections', adminVerifyConnections],
  ['dashboard/me', dashboardMe],
  ['dashboard/profile', dashboardProfile],
  ['dashboard/run', dashboardRun],
  ['dashboard/runs', dashboardRuns],
  ['stripe/checkout', stripeCheckout],
  ['stripe/ad-checkout', stripeAdCheckout],
  ['stripe/portal', stripePortal],
  ['stripe/webhook', stripeWebhook],
  ['cron/process', cronProcess],
]);

export async function handlePulseRoute(req, res) {
  const origin = `https://${req.headers.host || 'santipulse.com'}`;
  const url = new URL(req.url || '/api', origin);
  const route = normalizeRoute(url.pathname);

  hydrateQuery(req, url);

  const routeHandler = ROUTES.get(route);
  if (!routeHandler) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(404).json({ error: 'not_found', route });
  }

  if (route !== 'stripe/webhook') await hydrateBody(req);
  return routeHandler(req, res);
}

function normalizeRoute(pathname) {
  return String(pathname || '')
    .replace(/^\/api\/?/, '')
    .replace(/^\/+|\/+$/g, '');
}

function hydrateQuery(req, url) {
  const query = {};
  for (const [key, value] of url.searchParams.entries()) query[key] = value;
  req.query = { ...query, ...(req.query || {}) };
}

async function hydrateBody(req) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return;
  if (req.body !== undefined) return;

  const raw = await readRaw(req);
  if (!raw.length) {
    req.body = {};
    return;
  }

  const contentType = String(req.headers['content-type'] || '').toLowerCase();
  const text = raw.toString('utf8');
  if (contentType.includes('application/json')) {
    try {
      req.body = JSON.parse(text);
      return;
    } catch {
      req.body = {};
      return;
    }
  }
  req.body = text;
}

function readRaw(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
