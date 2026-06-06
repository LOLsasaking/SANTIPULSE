# Backend Archive

This directory preserves the legacy SantiPulse automation/demo platform exactly as removed from production. It is intentionally not referenced by the production build, serverless routing, dashboard shell, or public website navigation.

## Archived scope

The archive contains the old public demo endpoints, paid automation endpoints, cron worker, integration OAuth routes, dashboard UI scripts, legacy demo page, Supabase SQL schemas, and supporting service libraries for the former Price Monitor, Lead Scraper, Cart Recovery, Cold Outreach, and Social Scheduler system.

## Production isolation rule

Do not import files from this directory from production code. If a historical implementation is needed, copy the relevant file into a new package module, review it, and adapt it behind the admin routing layer.
