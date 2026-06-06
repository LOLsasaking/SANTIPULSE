# SantiPulse

SantiPulse is the production site and admin platform for `santipulse.com`.
It sells and operates The Pulse System: a Spanish-first AI agency stack for
capturing leads, publishing social content, and managing ads from one panel.

## Pulse System

The active production modules are:

- `Recepcionista IA`: AI voice, WhatsApp, calendar booking, lead capture, and human SOS alerts.
- `Insights de Redes`: trend collection, content scoring, Knowledge Vault context, and post queue management.
- `Gestor de Ads`: simple post promotion, Meta/TikTok campaign visibility, ROI Pulse, optional Revealbot adapter, and alerts.

The 1% Edge features are now part of the dashboard:

- `Bóveda de Conocimiento`: upload PDFs, menus, and business notes so the AI has client-specific context.
- `ROI Pulse`: live spend/revenue/profit ticker from synced ad metrics.
- `SOS humano`: panic button that records and notifies a manual escalation.

Legacy demos such as Price Monitor and Lead Scraper are archived under
`backend-archive/` and are not part of the production API.

## Project Layout

- `src/pages/`: public Spanish-first page templates.
- `src/app/`: login and admin dashboard templates.
- `src/*.js`: browser controllers copied into `dist/`.
- `api/[...route].js`: the consolidated Vercel API adapter.
- `backend/handlers/`: route map and request hydration for the catch-all API.
- `backend/lib/`: shared server utilities for auth, data, products, providers, and HTTP.
- `backend/vault/` and `backend/lib/vault.js`: Knowledge Vault upload/list/delete and AI prompt context.
- `backend/`: active package handlers for integrations, modules, Stripe, auth, and cron.
- `backend/pulse/stripe-plans.js`: Stripe plan map using environment-backed price IDs.
- `supabase/`: setup SQL for leads, profiles, subscriptions, and Pulse module tables.
- `scripts/build.mjs`: static build, i18n injection, SEO/social tags, app config, and assets.
- `scripts/verify-pulse.mjs`: readiness verifier for routes, labels, SEO output, and legacy references.
- `santipulse/`: Obsidian handoff vault with route maps and deployment notes.

## Local Commands

```bash
npm install
npm run build
npm run verify:pulse
npm run preview
```

The preview server serves the generated `dist/` site and proxies API calls to
the local consolidated API handler.

## Required Production Environment

Set these in Vercel before selling or testing live payments:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_STARTER`
- `STRIPE_PRICE_PRO`
- `STRIPE_PRICE_AGENCY`
- `VAPI_API_KEY`
- `META_ACCESS_TOKEN`
- `CRON_SECRET`
- `VAULT_BUCKET`

Optional integration keys are documented in `.env.example`.
Revealbot requires `REVEALBOT_API_KEY`, `REVEALBOT_ACCOUNT_ID`, and real status/metrics/action URLs from your Revealbot account. If absent, Gestor de Ads keeps using the native Meta/TikTok fallback.

## Deployment Notes

- Vercel should build with `npm run build` and publish `dist/`.
- The API is intentionally consolidated at `api/[...route].js` so the serverless
  function count stays safely under Vercel Hobby limits.
- Stripe Checkout redirects successful payments to `/bienvenida/`.
- Public lead forms require GDPR consent before `/api/lead` accepts them.
- Social previews use `https://santipulse.com/santilogo.png` for Open Graph and Twitter image tags.

## Verification

Run the local checks before committing or deploying:

```bash
npm run build
npm run verify:pulse
```

Then verify the live site manually:

- `/admin` redirects to login, and authenticated users reach `/dashboard/`.
- `/api/admin/verify-connections` returns `401` without a bearer session.
- The dashboard Truth Layer shows Vapi, Meta, Stripe, Supabase, Revealbot, and Vault readiness when real keys/storage are valid.
- The dashboard shows Bóveda de Conocimiento, ROI Pulse, and SOS humano.
- Pricing buttons start Stripe Checkout for the selected plan.
- `/bienvenida/` and `/privacidad/` render with complete social metadata.
