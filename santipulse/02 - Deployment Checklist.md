# Deployment Checklist

- Build static site: `npm run build`
- Verify Pulse structure: `npm run verify:pulse`
- Confirm only one active API file exists: `api/[...route].js`
- Confirm the dashboard shows:
  - Recepcionista IA
  - Insights de Redes
  - Gestor de Ads
  - Boveda de Conocimiento
  - ROI Pulse
  - SOS humano
- Confirm `/api/admin/verify-connections` includes Vapi, Meta, Stripe, Supabase, Revealbot and Vault.
- Confirm `Boveda` can save a note/menu after `supabase/pulse-modules.sql` is applied.
- Confirm `SOS humano` records an alert.
- Confirm `ROI Pulse` loads from synced campaign metrics.
- Confirm `/demos/` keeps the Webs Reales grid and shows the three video placeholders.
- Confirm `/contratar/` requires the privacy checkbox.
- Confirm `/bienvenida/` and `/privacidad/` build.
- Confirm Git identity:
  - `user.name=LOLsasaking`
  - `user.email=LOLsasaking@users.noreply.github.com`

## Vercel Environment Variables

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_STARTER`
- `STRIPE_PRICE_PRO`
- `STRIPE_PRICE_AGENCY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VAPI_API_KEY`
- `META_ACCESS_TOKEN`
- `CRON_SECRET`
- `VAULT_BUCKET`
- Optional email vars: `RESEND_API_KEY`, `LEAD_NOTIFY_TO`, `LEAD_NOTIFY_FROM`
- Optional Revealbot vars: `REVEALBOT_API_KEY`, `REVEALBOT_ACCOUNT_ID`, `REVEALBOT_STATUS_URL`, `REVEALBOT_METRICS_URL`, `REVEALBOT_ACTION_URL`

## Current Live Blocker

- Run the updated `supabase/pulse-modules.sql` so the Knowledge Vault table and bucket exist.
- `META_ACCESS_TOKEN` must exist in Vercel Production for the Meta badge in `/api/admin/verify-connections` to turn green.
- Revealbot should stay red/error until real private API URLs are configured.
