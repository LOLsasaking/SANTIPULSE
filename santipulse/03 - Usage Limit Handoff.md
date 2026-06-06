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
- Added `/bienvenida/` and `/privacidad/`.
- Added GDPR checkbox and server-side consent enforcement.
- Added homepage voice widget placeholder.
- Added GitHub Actions workflow for external heavy jobs.

## Resume Commands

```powershell
Set-Location "F:\Santi Pulse\Brain Website"
npm run build
npm run verify:pulse
node -e "import('./api/[...route].js').then(()=>console.log('api import ok'))"
git status --short
```

## Current Live Status

- Last verified production deployment was `Ready`.
- `santipulse.com/admin` redirects to `/login/`.
- `/api/admin/verify-connections` returns `401 Unauthorized` without a session.
- Vercel Production has `VAPI_API_KEY`, `META_ACCESS_TOKEN`,
  `STRIPE_SECRET_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` present.
- `META_ACCESS_TOKEN` was validated against Graph API before deployment.
- Remaining user-session check: log into `/admin`, open `Integraciones`, click
  `Verificar Conexiones`, and confirm Vapi, Meta, Stripe, and Supabase badges.

## Security Note

The Meta app secret and access token were pasted into chat during setup. Rotate
both in Meta after confirming the dashboard badge, then update Vercel Production
with the fresh values.

## Do Not Do

- Do not use `F:\Brain Website`.
- Do not re-add `/api/demo/price-monitor` or `/api/demo/lead-scraper`.
- Do not overwrite the three-panel homepage design.
