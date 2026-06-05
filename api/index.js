import cronProcess from '../backend/cron/process.js';
import dashboardMe from '../backend/dashboard/me.js';
import dashboardProfile from '../backend/dashboard/profile.js';
import dashboardRun from '../backend/dashboard/run.js';
import dashboardRuns from '../backend/dashboard/runs.js';
import lead from '../backend/lead.js';
import receptionistDashboard from '../backend/receptionist/dashboard.js';
import receptionistVapiWebhook from '../backend/receptionist/vapi-webhook.js';
import receptionistWhatsappWebhook from '../backend/receptionist/whatsapp-webhook.js';
import insightsDashboard from '../backend/insights/dashboard.js';
import insightsIngest from '../backend/insights/ingest.js';
import adsDashboard from '../backend/ads/dashboard.js';
import adsAuthorize from '../backend/integrations/ads/authorize.js';
import adsCallback from '../backend/integrations/ads/callback.js';
import adsTiktokCallback from '../backend/integrations/ads/tiktok-callback.js';
import calendarAuthorize from '../backend/integrations/calendar/authorize.js';
import calendarCallback from '../backend/integrations/calendar/callback.js';
// Meta (Facebook/Instagram) OAuth — kept because Insights de Redes publishes
// through the user's connected social account (social_accounts + Graph API).
import socialAuthorize from '../backend/integrations/social/authorize.js';
import socialCallback from '../backend/integrations/social/callback.js';
import stripeCheckout from '../backend/stripe/checkout.js';
import stripePortal from '../backend/stripe/portal.js';
import stripeWebhook from '../backend/stripe/webhook.js';

export const config = { api: { bodyParser: false } };

const ROUTES = new Map([
  ['lead', lead],
  // Recepcionista IA
  ['receptionist/dashboard', receptionistDashboard],
  ['receptionist/vapi-webhook', receptionistVapiWebhook],
  ['receptionist/whatsapp-webhook', receptionistWhatsappWebhook],
  // Insights de Redes
  ['insights/dashboard', insightsDashboard],
  ['insights/ingest', insightsIngest],
  ['integrations/social/authorize', socialAuthorize],
  ['integrations/social/callback', socialCallback],
  // Gestor de Ads
  ['ads/dashboard', adsDashboard],
  ['integrations/ads/authorize', adsAuthorize],
  ['integrations/ads/callback', adsCallback],
  ['integrations/ads/tiktok-callback', adsTiktokCallback],
  // Recepcionista IA — calendar booking
  ['integrations/calendar/authorize', calendarAuthorize],
  ['integrations/calendar/callback', calendarCallback],
  // Account / billing / dashboard
  ['dashboard/me', dashboardMe],
  ['dashboard/profile', dashboardProfile],
  ['dashboard/run', dashboardRun],
  ['dashboard/runs', dashboardRuns],
  ['stripe/checkout', stripeCheckout],
  ['stripe/portal', stripePortal],
  ['stripe/webhook', stripeWebhook],
  // Background worker
  ['cron/process', cronProcess],
]);

export default async function handler(req, res) {
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
