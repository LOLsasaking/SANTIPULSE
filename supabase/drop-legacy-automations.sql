-- ═══════════════════════════════════════════════════════════════════════════
-- Santipulse — DROP legacy automation tables (Cold Outreach · Cart Recovery ·
-- old Social Scheduler · Gmail/Shopify integrations)
-- ───────────────────────────────────────────────────────────────────────────
-- DESTRUCTIVE. Run ONLY if you are sure you want the old automations gone.
-- Removes tables that the retired Cold Outreach / Cart Recovery / Social
-- Scheduler features used. The 3 Pulse modules do NOT use these.
--
-- KEPT on purpose (still used by Insights de Redes publishing + OAuth):
--   • social_accounts   — connected Meta accounts Insights publishes through
--   • post_logs         — publish audit log (Insights + quota counting)
--   • oauth_states      — CSRF nonce for social/calendar/ads OAuth round-trips
--   • profiles          — gmail_* columns left in place (harmless, unused)
--
-- Run in: Supabase SQL Editor → project mhgvevpshoebskqumrex.
-- ═══════════════════════════════════════════════════════════════════════════

DROP TABLE IF EXISTS email_tracking          CASCADE;
DROP TABLE IF EXISTS outreach_jobs           CASCADE;
DROP TABLE IF EXISTS outreach_campaigns      CASCADE;
DROP TABLE IF EXISTS cart_recovery_jobs      CASCADE;
DROP TABLE IF EXISTS cart_recovery_campaigns CASCADE;
DROP TABLE IF EXISTS scheduled_posts         CASCADE;
DROP TABLE IF EXISTS shopify_connections     CASCADE;

-- Optional: legacy tables from an even earlier iteration (only drop if you
-- confirm they hold nothing you need — they were all 0 rows at last check).
-- DROP TABLE IF EXISTS automation_runs CASCADE;
-- DROP TABLE IF EXISTS shopify_stores  CASCADE;
-- DROP TABLE IF EXISTS auth_tokens     CASCADE;
-- DROP TABLE IF EXISTS users           CASCADE;

-- Optional: remove now-unused Gmail OAuth columns from profiles.
-- ALTER TABLE profiles
--   DROP COLUMN IF EXISTS gmail_email,
--   DROP COLUMN IF EXISTS gmail_refresh_token,
--   DROP COLUMN IF EXISTS gmail_scope,
--   DROP COLUMN IF EXISTS gmail_connected_at,
--   DROP COLUMN IF EXISTS gmail_daily_sent,
--   DROP COLUMN IF EXISTS gmail_daily_sent_date;
