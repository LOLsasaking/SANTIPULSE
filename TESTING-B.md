# 🧪 Testing the REAL santipulse.com (this folder) — End-to-End

This is **`F:\Santi Pulse\Brain Website`** — the actual 3-panel santipulse.com,
on **Supabase Auth** (managed magic-link), Stripe, and **inline** automation runs.

> **Architecture facts that differ from the other "Brain Website" folder:**
> - **No worker.** `/api/dashboard/run` runs the automation **synchronously** and
>   returns the result. There is nothing to "queue" or "pick up" — ignore any
>   guide that says "the worker picks it up."
> - **Supabase Auth**, not a custom JWT. Login = a real Supabase magic link.
> - **`_serve.js` serves static files only.** To exercise `/api` locally you must
>   use **`vercel dev`** (the static server can't run the endpoints).

---

## Step 0 — Disk + prerequisites
- Ensure C: has free space (builds/`vercel dev`/Playwright write to it).
- `vercel` CLI is installed. Confirm: `vercel --version`.

## Step 1 — Environment (`.env.local`)
`.env.local` already exists in this folder, pre-filled with your Supabase/Stripe/
Resend values. **You only need to add one thing:**

- **`SUPABASE_ANON_KEY`** — Supabase → Settings → API → **anon public** key.
  (This is public/safe; the build bakes it into `/login` and `/dashboard`.)

> ⚠️ `STRIPE_SECRET_KEY` here is **`sk_live_`** — real money. Steps 3–6 below
> (signup, set URLs, run, quotas) never touch Stripe and are safe. Only **Step 4
> (checkout)** can create a real charge — see the warning there.

## Step 2 — Supabase setup (one-time, in the dashboard)
1. **SQL Editor** → run `supabase/setup.sql` (leads) and `supabase/automation.sql`
   (profiles, automation_jobs, demo_trials, stripe_events). Both idempotent.
2. **Authentication → Providers → Email**: ensure Email / magic link is enabled.
3. **Authentication → URL Configuration**:
   - Site URL: `https://santipulse.com`
   - Redirect URLs: add `http://localhost:3000/dashboard/` (for local testing).

## Step 3 — Run locally with the API
```bash
npm install
npx playwright install chromium     # for the scraper demos / runs
vercel dev                          # serves the site AND /api on http://localhost:3000
```
The first `vercel dev` may ask to link the project — accept (it's the `santipulse`
project). It reads `.env.local` automatically.

Open **http://localhost:3000/** and sanity-check:
- ✅ 3-panel home loads (Quiero una web / Ver demos / Sobre nosotros)
- ✅ `/precios/` shows the 3 plans (€49/€149/€399)

## Step 4 — Sign in (Supabase magic link)
1. Go to **http://localhost:3000/login/**, enter your email, submit.
2. Supabase emails a magic link (real email — check inbox/spam). Click it.
3. You land on **`/dashboard/`**, logged in (badge shows `none` — no plan yet).

> If the email doesn't arrive: Supabase's built-in sender is rate-limited and
> sometimes slow. You can also grab the link from Supabase → Authentication →
> Logs, or wire Resend SMTP (SETUP.md step 2).

## Step 5 — Buy a plan  ⚠️ LIVE STRIPE
On `/precios/` (or the dashboard plan cards), click **Pro**.

> **⚠️ Your Stripe key is LIVE.** A real card here = a real €149 charge. To test
> checkout safely, either:
> - **(a)** temporarily switch `.env.local` to your Stripe **test** keys
>   (`sk_test_…` + test price IDs + a test `whsec_…`), then use card
>   `4242 4242 4242 4242`; **or**
> - **(b)** skip real checkout and set your subscription manually in Supabase
>   (Table editor → `profiles` → set your row's `subscription_status` = `active`,
>   `plan` = `pro`). This unblocks Steps 6–7 without any charge.

**Local webhook (needed for checkout to update your plan):** Stripe can't reach
localhost. In a second terminal:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```
Use the `whsec_…` it prints as `STRIPE_WEBHOOK_SECRET` in `.env.local`, restart
`vercel dev`. After a successful checkout the webhook sets your `profiles.plan`.

## Step 6 — Set your automation inputs
On the dashboard, in **Perfil de negocio**:
- **URLs de competidores** — paste 1+ product URLs (one per line) for price monitoring.
- **URL objetivo de leads** — a directory/listing URL for lead scraping.
- **Tu precio actual / Precio mínimo** — for repricing suggestions.
Click **Guardar perfil**.

## Step 7 — Run an automation (the new paid path)
In **Ejecutar automatización**, click **Monitor de precios**.

Expected, depending on state:
| Your state | Result |
|---|---|
| No active subscription | "Necesitas una suscripción activa" + link to /precios (402) |
| Active sub, no URLs saved | "Añade URLs de competidores… y guarda" (400) |
| Active sub + URLs saved | Runs inline → "✓ Ejecución completada (n/limit este mes)" |
| Over monthly quota | "Has alcanzado tu límite mensual (used/limit)" (402) |

Then check **Historial de ejecuciones** — the run appears with status
`completed`/`failed` and **Demo = no** (it's a real paid run, `is_demo:false`).

**To verify quota gates** without 50 real runs: in Supabase, insert dummy
`automation_jobs` rows for your `user_id` with `is_demo=false` and a recent
`created_at` until you hit the plan cap, then click Run → expect the 402 quota block.

---

## ✅ Success criteria
- ✅ Magic-link login lands you on the dashboard.
- ✅ `/precios/` checkout (test mode) or manual `profiles` edit gives you an active plan.
- ✅ With URLs saved + active plan, **Monitor de precios** runs and shows a result.
- ✅ The run appears in history as a non-demo (`Demo = no`) job.
- ✅ Without a subscription → blocked with the /precios upsell.
- ✅ Over the monthly cap → blocked with the quota message.
- ✅ No genuine errors in the browser console (expected 401/402/400 from the
  gates are *intended* signals, not bugs).

## 🐛 Troubleshooting
| Symptom | Fix |
|---|---|
| `/api/...` returns 404 locally | You ran `_serve.js`/`npm run serve` (static only). Use **`vercel dev`**. |
| Login redirects back / no session | `SUPABASE_ANON_KEY` missing in `.env.local`, or localhost not in Supabase Redirect URLs. |
| Magic-link email never arrives | Supabase sender rate-limited — grab the link from Auth → Logs, or set Resend SMTP. |
| Checkout "price not configured" | `STRIPE_PRICE_*` must be `price_…` IDs (not `prod_…`), matching the key's mode. |
| Plan stays `none` after paying | The **webhook** sets it — run `stripe listen --forward-to localhost:3000/api/stripe/webhook`. |
| Run says "no active subscription" but you paid | Webhook didn't fire (see above), or check `profiles.subscription_status`. |
| ~~"worker not picking up jobs"~~ | N/A — this site has **no worker**; runs are inline. |
