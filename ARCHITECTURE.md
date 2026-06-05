# SantiPulse Modular Admin Architecture

This repository now separates the public SantiPulse marketing site from the private automation control plane. The public frontend remains a lightweight static website, while automation logic, CRM records, webhook receivers, database-backed records, and operational dashboards live under the authenticated admin surface.

## Production separation model

| Layer | Production responsibility | File locations |
| --- | --- | --- |
| Public website | Marketing pages, contact capture, pricing, and lightweight public assets only. It must not expose interactive demo automations or automation backend logic. | `src/pages/*`, `src/*.js`, `api/lead.js` |
| Admin dashboard | Authenticated operator UI with three independent package views. It is suitable for `/admin/` today and can be mapped to `admin.santipulse.com` through hosting rewrites later. | `src/app/admin.html`, `src/admin-dashboard.js`, `src/admin-dashboard.css` |
| Admin API | Authenticated route handlers, integration placeholders, webhook receivers, scheduling queues, CRM records, social publishing queues, ad optimization records, and logs. | `api/admin/**`, `api/_lib/admin*.js` |
| Data model | Modular Supabase/Firebase-ready tables, with clear ownership by package and no dependency on the legacy automation schemas. | `supabase/admin-modular.sql` |
| Legacy archive | Preserved old demos, old automation APIs, old dashboard UI, cron worker, integrations, and old schemas. It is intentionally not imported or built. | `backend-archive/**` |

## The three required packages

| Package | Dashboard route/view | Backend namespace | Core ownership |
| --- | --- | --- | --- |
| Package 1 — Receptionist & Leads Leadership Hub | `/admin/#receptionist-leads` | `/api/admin/receptionist-leads/*` | AI voice assistant provider status, WhatsApp CRM streams, lead profiles, calendar scheduling sync, CRM logs, and Human SOS alerts. |
| Package 2 — Social Media Insights & Auto-Poster | `/admin/#social-insights-autoposter` | `/api/admin/social-insights-autoposter/*` | Trend analytics records, Instagram/TikTok content recommendations, official publishing queue, post status tracking, and social API readiness. |
| Package 3 — Auto-Ad Manager | `/admin/#auto-ad-manager` | `/api/admin/auto-ad-manager/*` | Ad account readiness, campaign control records, optimization rules, budget adjustment recommendations, and performance logs. |

The dashboard intentionally treats the packages as **independent modules**. Each view has its own status panels, data tables, primary actions, API endpoints, and integration readiness state. Shared concerns such as authentication, JSON parsing, database access, CORS-safe responses, and operational logging are centralized in helper modules only.

## New file structure map

```text
api/
  _lib/
    auth.js                         # Existing Supabase auth guard, reused by admin endpoints
    adminDb.js                      # Admin database helper with safe fallback mode
    adminHttp.js                    # Shared JSON/body/method helpers
  admin/
    me.js                           # Dashboard bootstrap endpoint
    receptionist-leads/
      leads.js                      # Lead profile CRUD foundation
      conversations.js              # WhatsApp/voice CRM conversation log foundation
      scheduling.js                 # Calendar slot and booking foundation
      integrations.js               # Vapi/Bland/WhatsApp/Calendar readiness
      human-sos.js                  # Human escalation alert logging foundation
      webhooks/
        vapi.js                     # Voice assistant webhook receiver
        bland.js                    # Bland AI webhook receiver
        whatsapp.js                 # WhatsApp webhook receiver
    social-insights-autoposter/
      trends.js                     # Trend analytics and recommendation records
      queue.js                      # Official API publishing queue foundation
      integrations.js               # Meta/TikTok readiness
      webhooks/
        meta.js                     # Meta callback receiver foundation
        tiktok.js                   # TikTok callback receiver foundation
    auto-ad-manager/
      campaigns.js                  # Campaign registry and status foundation
      rules.js                      # Optimization rule registry
      recommendations.js            # Budget/action recommendation records
      integrations.js               # Meta/TikTok ads readiness
      webhooks/
        meta-ads.js                 # Meta Ads callback receiver foundation
        tiktok-ads.js               # TikTok Ads callback receiver foundation
src/
  app/
    admin.html                      # New authenticated admin dashboard shell
  admin-dashboard.css               # Admin-only UI styles
  admin-dashboard.js                # Admin-only tab/module controller
supabase/
  admin-modular.sql                 # New clean database schema
scripts/
  check-admin-env.mjs               # Local setup/readiness helper
backend-archive/
  legacy-automation-platform/**     # Preserved removed production automations and demos
```

## Deployment intent

The admin dashboard is currently built to `/admin/`. A future `admin.santipulse.com` deployment can point the subdomain at the same static output while rewriting the subdomain root to `/admin/`. All admin API namespaces remain under `/api/admin/**`, keeping webhook paths stable for third-party providers.
