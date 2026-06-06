# Pulse Route Map

## Active Vercel Function

- `api/[...route].js`

## Routed API Paths

- `/api/lead`
- `/api/receptionist/dashboard`
- `/api/receptionist/sos`
- `/api/receptionist/vapi-webhook`
- `/api/receptionist/whatsapp-webhook`
- `/api/insights/dashboard`
- `/api/insights/ingest`
- `/api/ads/dashboard`
- `/api/ads/roi-pulse`
- `/api/vault`
- `/api/admin/verify-connections`
- `/api/dashboard/me`
- `/api/dashboard/profile`
- `/api/dashboard/run`
- `/api/dashboard/runs`
- `/api/stripe/checkout`
- `/api/stripe/ad-checkout`
- `/api/stripe/portal`
- `/api/stripe/webhook`
- `/api/integrations/social/authorize`
- `/api/integrations/social/callback`
- `/api/integrations/ads/authorize`
- `/api/integrations/ads/callback`
- `/api/integrations/ads/tiktok-callback`
- `/api/integrations/calendar/authorize`
- `/api/integrations/calendar/callback`
- `/api/integrations/revealbot/status`
- `/api/cron/process`

## Handler Location

Route implementations live in `backend/`. Pulse-specific helpers live in `backend/pulse/`, `backend/lib/`, and the package folders.

The catch-all router uses exact route strings in `backend/handlers/router.js`; do not add separate files under `api/`.
