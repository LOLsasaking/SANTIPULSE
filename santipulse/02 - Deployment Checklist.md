# Deployment Checklist

- Build static site: `npm run build`
- Verify Pulse structure: `npm run verify:pulse`
- Confirm only one active API file exists: `api/[...route].js`
- Confirm the dashboard shows:
  - Recepcionista IA
  - Insights de Redes
  - Gestor de Ads
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
- Optional email vars: `RESEND_API_KEY`, `LEAD_NOTIFY_TO`, `LEAD_NOTIFY_FROM`
