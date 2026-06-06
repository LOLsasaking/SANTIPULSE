# Santipulse Automation SaaS — Setup Runbook

Everything in code is built and locally tested. These are the steps **only you can do**
(they need your Supabase / Stripe accounts and secrets). Do them in order.

---

## 1. Run the database schema (Supabase)

1. Open your project: https://supabase.com/dashboard/project/mhgvevpshoebskqumrex
2. **SQL Editor → New query** → paste the entire contents of [`supabase/automation.sql`](supabase/automation.sql) → **Run**.
3. It creates: `demo_trials`, `automation_jobs`, `profiles`, `stripe_events`, a trigger that
   auto-creates a `profiles` row on signup, and RLS. It does **not** touch your `leads` table.
   Safe to re-run.

## 2. Turn on Supabase Auth (magic link)

1. **Authentication → Providers → Email** → make sure **Email** is enabled and
   **"Confirm email" / magic link** is on. (Email/OTP is on by default.)
2. **Authentication → URL Configuration**:
   - **Site URL**: `https://santipulse.com`
   - **Redirect URLs**: add `https://santipulse.com/dashboard/` and (for local testing)
     `http://localhost:4599/dashboard/`.
3. Supabase's built-in email sender is rate-limited. For production volume, set up a custom
   SMTP sender under **Authentication → Emails → SMTP** (you can reuse Resend).

## 3. Create the Stripe products

1. https://dashboard.stripe.com/products → create **Starter**, **Pro**, **Agency**.
2. Each gets a **recurring monthly price**: €49 / €149 / €399 (or your currency).
3. Copy each **Price ID** (`price_...`) → you'll paste them into env vars (step 5).

## 4. Add the Stripe webhook

1. **Developers → Webhooks → Add endpoint**.
2. URL: `https://santipulse.com/api/stripe/webhook`
3. Events: `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`, `invoice.payment_failed`.
4. Copy the **Signing secret** (`whsec_...`) → env var `STRIPE_WEBHOOK_SECRET`.

## 5. Environment variables

Copy `.env.example` → `.env.local` (local) and add the **same keys** in
**Vercel → Settings → Environment Variables** (production). New keys this feature needs:

| Key | Where to get it | Public? |
|---|---|---|
| `SUPABASE_ANON_KEY` | Supabase → Settings → API → anon public | yes (baked into pages) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role | **no — secret** |
| `STRIPE_SECRET_KEY` | Stripe → API keys | **no — secret** |
| `STRIPE_WEBHOOK_SECRET` | step 4 | **no — secret** |
| `STRIPE_PRICE_STARTER/_PRO/_AGENCY` | step 3 | env only |

> `SUPABASE_ANON_KEY` is read at **build time** and injected into `/login` and `/dashboard`.
> After adding/changing it in Vercel you must **redeploy** for it to take effect.

## 6. Local testing

```bash
npm install
npx playwright install chromium      # for the scraper demos
npm run build                        # injects public config, builds dist/
```
The bundled `_serve.js` only serves static files — it does **not** run `/api`. To exercise
the API locally use `vercel dev`, or test handlers directly (as done during the build).

## 7. Deploy notes (already handled in code)

- **Playwright on Vercel**: auto-switches to `@sparticuz/chromium` + `playwright-core` when
  `process.env.VERCEL` is set (see `api/_lib/browser.js`). No manual edit needed.
- **CSP**: `vercel.json` already allows `*.supabase.co`, `js.stripe.com`, `api.stripe.com`.
- **Webhook raw body**: `api/stripe/webhook.js` disables the body parser (required for
  signature verification).

---

## ⚠️ Before this goes public

- **Scraping ToS / IP risk.** The price-monitor and lead-scraper hit live third-party sites
  (Amazon, Yelp, etc.) from your Vercel IP. That can violate their Terms and get the IP
  blocked. Consider limiting demos to sites you control, adding a proxy, or gating behind
  signup. This is a business/legal decision, not a code one.
- **Trial gating** for anonymous demo users is IP+UA fingerprinting (best-effort, not
  foolproof). Logged-in users are gated by `user_id`.
- The dashboard "Run Automation" for **paid** (non-demo) unlimited runs is **not wired yet** —
  the demos and billing are. That's the next layer when you want it.

## What's NOT built yet (deliberately deferred)
- Abandoned-cart recovery + cold-outreach email sequences (Gmail OAuth) from the original package.
- A pricing page (the dashboard's "Ver planes" currently goes straight to Stripe checkout for `pro`).
- Per-plan usage limits / quotas.
