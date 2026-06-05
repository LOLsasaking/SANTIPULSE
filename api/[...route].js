import cartRecovery from '../backend/automations/cart-recovery.js';
import outreach from '../backend/automations/outreach.js';
import socialAutomation from '../backend/automations/social.js';
import cronProcess from '../backend/cron/process.js';
import dashboardMe from '../backend/dashboard/me.js';
import dashboardProfile from '../backend/dashboard/profile.js';
import dashboardRun from '../backend/dashboard/run.js';
import dashboardRuns from '../backend/dashboard/runs.js';
import disconnect from '../backend/integrations/disconnect.js';
import gmailAuthorize from '../backend/integrations/gmail/authorize.js';
import gmailCallback from '../backend/integrations/gmail/callback.js';
import shopifyAuthorize from '../backend/integrations/shopify/authorize.js';
import shopifyCallback from '../backend/integrations/shopify/callback.js';
import socialAuthorize from '../backend/integrations/social/authorize.js';
import socialCallback from '../backend/integrations/social/callback.js';
import integrationStatus from '../backend/integrations/status.js';
import lead from '../backend/lead.js';
import stripeCheckout from '../backend/stripe/checkout.js';
import stripePortal from '../backend/stripe/portal.js';
import stripeWebhook from '../backend/stripe/webhook.js';
import track from '../backend/track/[token].js';

export const config = { api: { bodyParser: false } };

const ROUTES = new Map([
  ['lead', lead],
  ['dashboard/me', dashboardMe],
  ['dashboard/profile', dashboardProfile],
  ['dashboard/run', dashboardRun],
  ['dashboard/runs', dashboardRuns],
  ['stripe/checkout', stripeCheckout],
  ['stripe/portal', stripePortal],
  ['stripe/webhook', stripeWebhook],
  ['automations/cart-recovery', cartRecovery],
  ['automations/outreach', outreach],
  ['automations/social', socialAutomation],
  ['integrations/disconnect', disconnect],
  ['integrations/gmail/authorize', gmailAuthorize],
  ['integrations/gmail/callback', gmailCallback],
  ['integrations/shopify/authorize', shopifyAuthorize],
  ['integrations/shopify/callback', shopifyCallback],
  ['integrations/social/authorize', socialAuthorize],
  ['integrations/social/callback', socialCallback],
  ['integrations/status', integrationStatus],
  ['cron/process', cronProcess],
]);

export default async function handler(req, res) {
  const origin = `https://${req.headers.host || 'santipulse.com'}`;
  const url = new URL(req.url || '/api', origin);
  const route = normalizeRoute(url.pathname);

  hydrateQuery(req, url);

  if (route.startsWith('track/')) {
    req.query.token = route.slice('track/'.length).split('/')[0] || '';
    return track(req, res);
  }

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
