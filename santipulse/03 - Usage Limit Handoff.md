# Usage Limit Handoff

If Codex hits a usage limit, resume from this project only:

`F:\Santi Pulse\Brain Website`

## What Was Implemented

- Consolidated Vercel API into `api/[...route].js`.
- Kept `api/[...route].js` as a thin Vercel adapter.
- Moved the route map/request hydration into `backend/handlers/router.js`.
- Moved shared server utilities into `backend/lib/`.
- Kept Pulse business modules under `backend/pulse/` plus the package folders
  for receptionist, insights, ads, dashboard, integrations, and Stripe.
- Archived Price Monitor and Lead Scraper into `backend-archive/`.
- Added Pulse modules:
  - Recepcionista IA
  - Insights de Redes
  - Gestor de Ads
- Added Stripe plan helper at `backend/pulse/stripe-plans.js`.
- Redirected Stripe success to `/bienvenida/`.
- Public `/precios/` buttons open Stripe Checkout even if the visitor is not
  logged in. Logged-in dashboard checkout still attaches `user_id`; public
  checkout lands on `/bienvenida/` and tells the buyer to use the same email.
- Added `/bienvenida/` and `/privacidad/`.
- Added GDPR checkbox and server-side consent enforcement.
- Added homepage voice widget placeholder.
- Added GitHub Actions workflow for external heavy jobs.
- Simplified the dashboard UX:
  - Overview says `Automatizar ahora`.
  - `Recepcionista IA` validates phone, WhatsApp phone ID, and SOS email before
    it can save or activate.
  - OAuth connect buttons show a visible error/timeout instead of spinning.
  - `Gestor de Ads` is now "choose post, choose budget/days, pay and launch".
- Added one-off Stripe ad checkout at `backend/stripe/ad-checkout.js`.
- Stripe webhook records paid ad launches as `Gestor de Ads` history jobs.
- `/api/dashboard/run` now awaits real module actions where safely possible:
  - `Recepcionista IA` provisions/updates the Vapi assistant when config is valid.
  - `Insights de Redes` queues a post from the top stored trend when available.
  - `Gestor de Ads` prepares the simple paid launch path.
- Added the Next Architecture Pass:
  - `backend/lib/vault.js` and `/api/vault` for Boveda uploads, notes, summaries, list and delete.
  - `backend/receptionist/sos.js` and `/api/receptionist/sos` for the Human SOS panic button.
  - `backend/ads/roi-pulse.js` and `/api/ads/roi-pulse` for spend/revenue/ROAS/profit ticker.
  - `backend/lib/revealbot.js` plus `/api/integrations/revealbot/status` as an env-gated Revealbot adapter.
  - `backend/admin/verify-connections.js` now checks Vapi, Meta, Stripe, Supabase, Revealbot and Vault readiness.
  - Vapi assistant provisioning receives Knowledge Vault context through `getVaultContext`.
  - Insights captions include Knowledge Vault context when available.
  - Dashboard now shows Boveda de Conocimiento, ROI Pulse, Vapi-ready voice controls and SOS humano.
  - Vault now has a table-first, Storage-manifest fallback. If `knowledge_vault_items` is missing, metadata lives in `knowledge-vault/_manifests/<user>.json`.

## Resume Commands

```powershell
Set-Location "F:\Santi Pulse\Brain Website"
npm run build
npm run verify:pulse
node -e "import('./api/[...route].js').then(()=>console.log('api import ok'))"
git status --short
```

## New Manual Checks

- `knowledge-vault` bucket was created and upload/delete was verified from local service-role checks.
- Log in, open `Boveda`, upload a note or menu, and confirm it appears in the list. This should work even before `knowledge_vault_items` is applied because of the Storage manifest fallback.
- Activate/provision `Recepcionista IA` again so the assistant receives Vault context.
- Press `SOS humano` and confirm a `receptionist_sos_alerts` row is created.
- Open Ads and confirm `ROI Pulse` loads from synced campaigns.
- Revealbot should stay red/error until real `REVEALBOT_STATUS_URL` / metrics/action endpoints are provided.

## Current Live Status

- Last verified production deployment was `Ready`.
- `santipulse.com/admin` redirects to `/login/`.
- `/api/admin/verify-connections` returns `401 Unauthorized` without a session.
- Vercel Production has `VAPI_API_KEY`, `META_ACCESS_TOKEN`,
  `STRIPE_SECRET_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` present.
- `META_ACCESS_TOKEN` was validated against Graph API before deployment.
- Latest deployed commit: `70adb3c fix: simplify pulse dashboard actions`.
- Remaining user-session check: log into `/admin`, open `Integraciones`, click
  `Verificar Conexiones`, and confirm Vapi, Meta, Stripe, and Supabase badges.
- Remaining OAuth checks: click Google Calendar, Instagram/Facebook, and Meta
  Ads from the logged-in dashboard and confirm they redirect to the provider
  consent screen instead of staying in a loading state.

## Security Note

The Meta app secret and access token were pasted into chat during setup. Rotate
both in Meta after confirming the dashboard badge, then update Vercel Production
with the fresh values.

## Do Not Do

- Do not use `F:\Brain Website`.
- Do not re-add `/api/demo/price-monitor` or `/api/demo/lead-scraper`.
- Do not overwrite the three-panel homepage design.
