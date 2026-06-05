# Deployment 🚀

The templates are Next.js apps already wired for **Vercel** (`.vercel/` config present). See [[Tech Stack Reality]].

## Deploy a template

1. Push the template repo to GitHub.
2. Vercel.com → Import the repo → Deploy.
3. Add environment variables in Vercel (the same ones from [[Supabase Setup]]).
4. Connect the client's custom domain in Vercel → Domains.

```
# Local dev
npm install
npm run dev        # http://localhost:3000

# Production build check
npm run build
```

## Single-app architecture (important)

Because booking lives **inside** the template (App Router route, not a subdomain), you deploy **one app per client**. No separate booking app, no subdomain juggling. This is simpler than the old plan assumed — see [[Tech Stack Reality]].

## Per-client checklist

- [ ] Clone the right template (barber / nail / etc.)
- [ ] Swap branding: logo, colors, business name, services, hours
- [ ] Choose booking mode: Booksy link or custom Supabase ([[Booking Options - Booksy vs Custom]])
- [ ] If custom: create Supabase project + run the table SQL ([[Supabase Setup]])
- [ ] If payments: add Stripe keys
- [ ] Set up Resend for confirmation emails
- [ ] Deploy to Vercel + connect domain
- [ ] Test the full booking flow (use Playwright — already installed)
