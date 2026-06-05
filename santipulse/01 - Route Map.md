# Pulse Route Map

## Active Vercel Function

- `api/[...route].js`

## Routed API Paths

- `/api/lead`
- `/api/dashboard/me`
- `/api/dashboard/profile`
- `/api/dashboard/run`
- `/api/dashboard/runs`
- `/api/stripe/checkout`
- `/api/stripe/portal`
- `/api/stripe/webhook`
- `/api/automations/cart-recovery`
- `/api/automations/outreach`
- `/api/automations/social`
- `/api/integrations/status`
- `/api/integrations/disconnect`
- `/api/integrations/gmail/authorize`
- `/api/integrations/gmail/callback`
- `/api/integrations/shopify/authorize`
- `/api/integrations/shopify/callback`
- `/api/integrations/social/authorize`
- `/api/integrations/social/callback`
- `/api/cron/process`
- `/api/track/:token`

## Handler Location

Route implementations live in `backend/`. Pulse-specific helpers live in `backend/pulse/`.
