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
- Confirm `Boveda` can save a note/menu. It works through the private `knowledge-vault` Storage manifest even before the SQL table is applied.
- Confirm `SOS humano` records an alert.
- Confirm `ROI Pulse` loads from synced campaign metrics.
- Confirm OAuth connect buttons open provider consent URLs. The app prefers the
  `oauth_states` table, but can use signed fallback states if that table is not
  migrated yet.
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
- Optional OAuth fallback hardening: `OAUTH_STATE_SECRET`. If unset, the server
  uses `SUPABASE_SERVICE_ROLE_KEY` to sign fallback OAuth states.

## Current Live Blocker

- `knowledge-vault` bucket is required. `knowledge_vault_items` is recommended but not a blocker because the API falls back to a private Storage manifest.
- `oauth_states` is recommended but not a blocker because OAuth connect flows
  fall back to short-lived signed state tokens.
- `META_ACCESS_TOKEN` must exist in Vercel Production for the Meta badge in `/api/admin/verify-connections` to turn green.
- Revealbot should stay red/error until real private API URLs are configured.
