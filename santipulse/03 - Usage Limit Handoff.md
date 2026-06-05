# Usage Limit Handoff

If Codex hits a usage limit, resume from this project only:

`F:\Santi Pulse\Brain Website`

## What Was Implemented

- Consolidated Vercel API into `api/[...route].js`.
- Moved active server code into `backend/`.
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
git status --short
```

## Do Not Do

- Do not use `F:\Brain Website`.
- Do not re-add `/api/demo/price-monitor` or `/api/demo/lead-scraper`.
- Do not overwrite the three-panel homepage design.
