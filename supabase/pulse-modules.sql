-- ═══════════════════════════════════════════════════════════════════════════
-- Santipulse — Pulse Modules schema (REAL integrations)
-- The 3 production Pulse modules:
--   • Recepcionista IA  — Vapi voice + Meta WhatsApp CRM + calendar + human SOS
--   • Insights de Redes — social trend collection + post queue (official APIs)
--   • Gestor de Ads     — Meta/TikTok ad accounts + rule engine + alerts
--
-- Run ONCE in the Supabase SQL Editor for project mhgvevpshoebskqumrex,
-- AFTER automation.sql (references profiles / auth.users) and pulse-system.sql.
-- ───────────────────────────────────────────────────────────────────────────
-- Additive only. Safe to re-run (IF NOT EXISTS / OR REPLACE / ADD COLUMN IF
-- NOT EXISTS throughout). Conventions match automation.sql/automation-2.sql:
--   • UUID PKs (gen_random_uuid)   • TIMESTAMPTZ everywhere
--   • FKs target auth.users(id) / profiles(id)
--   • RLS ON; server writes via service_role (bypasses RLS).
--   • Token/secret-bearing tables get NO public read policy (service_role only).
--   • Self-SELECT policies on rows the dashboard reads back.
-- ═══════════════════════════════════════════════════════════════════════════

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ MODULE 1 — RECEPCIONISTA IA                                                ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

-- ── 1.1 Receptionist config (per user) ─────────────────────────────────────────
-- One row per user. Holds the connected Vapi assistant + phone number, the
-- WhatsApp Business phone number id, calendar settings, and the human-SOS target.
CREATE TABLE IF NOT EXISTS receptionist_config (
  user_id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active            BOOLEAN      NOT NULL DEFAULT TRUE,
  -- Voice (Vapi)
  vapi_assistant_id    VARCHAR(128),          -- the Vapi assistant that answers
  vapi_phone_number_id VARCHAR(128),          -- the Vapi-provisioned number id
  phone_number         VARCHAR(32),           -- E.164 display number
  greeting             TEXT,                  -- first line the agent says
  -- WhatsApp (Meta Cloud API) — phone number id only; the token lives on profiles
  whatsapp_phone_id    VARCHAR(64),           -- WABA phone_number_id
  whatsapp_display     VARCHAR(32),           -- E.164 display number
  -- Calendar booking
  booking_enabled      BOOLEAN      NOT NULL DEFAULT FALSE,
  booking_provider     VARCHAR(32)  DEFAULT 'google',  -- 'google' | 'cal'
  booking_timezone     VARCHAR(64)  DEFAULT 'Europe/Madrid',
  booking_slot_minutes INT          NOT NULL DEFAULT 30,
  booking_hours        JSONB        DEFAULT '{"mon":["09:00","18:00"],"tue":["09:00","18:00"],"wed":["09:00","18:00"],"thu":["09:00","18:00"],"fri":["09:00","18:00"]}'::jsonb,
  -- Human SOS — where to alert when the agent escalates
  sos_enabled          BOOLEAN      NOT NULL DEFAULT TRUE,
  sos_email            VARCHAR(320),
  sos_whatsapp         VARCHAR(32),           -- E.164 to ping a human
  sos_keywords         JSONB        DEFAULT '["urgente","emergencia","hablar con una persona","humano","queja","reclamo"]'::jsonb,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── 1.2 Leads / contacts (the CRM core) ────────────────────────────────────────
-- A unified contact record across voice + WhatsApp. Deduped per user by channel id
-- (phone number). Distinct from the public website `leads` table.
CREATE TABLE IF NOT EXISTS receptionist_leads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          VARCHAR(255),
  phone         VARCHAR(32),                  -- E.164, primary dedupe key
  email         VARCHAR(320),
  source        VARCHAR(32) NOT NULL DEFAULT 'voice', -- 'voice' | 'whatsapp' | 'form'
  status        VARCHAR(32) NOT NULL DEFAULT 'new',
    -- 'new' | 'qualified' | 'booked' | 'won' | 'lost' | 'spam'
  score         INT,                          -- qualification score 0-100
  intent        VARCHAR(64),                  -- e.g. 'booking','quote','support'
  notes         TEXT,
  profile_data  JSONB,                        -- arbitrary captured fields
  last_contact_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_recept_leads_user_phone
  ON receptionist_leads(user_id, phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_recept_leads_user ON receptionist_leads(user_id);
CREATE INDEX IF NOT EXISTS idx_recept_leads_status ON receptionist_leads(status);

-- ── 1.3 Calls (voice transcripts) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS receptionist_calls (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id         UUID REFERENCES receptionist_leads(id) ON DELETE SET NULL,
  provider        VARCHAR(32) NOT NULL DEFAULT 'vapi',
  provider_call_id VARCHAR(128),              -- Vapi call id (dedupe)
  direction       VARCHAR(16) NOT NULL DEFAULT 'inbound', -- 'inbound' | 'outbound'
  from_number     VARCHAR(32),
  to_number       VARCHAR(32),
  status          VARCHAR(32) NOT NULL DEFAULT 'in_progress',
    -- 'queued' | 'ringing' | 'in_progress' | 'completed' | 'failed' | 'no_answer'
  duration_seconds INT,
  recording_url   TEXT,
  transcript      TEXT,                       -- full transcript text
  summary         TEXT,                       -- model-generated summary
  ended_reason    VARCHAR(64),
  escalated       BOOLEAN NOT NULL DEFAULT FALSE,
  started_at      TIMESTAMPTZ,
  ended_at        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_recept_calls_provider_id
  ON receptionist_calls(provider, provider_call_id) WHERE provider_call_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_recept_calls_user ON receptionist_calls(user_id);
CREATE INDEX IF NOT EXISTS idx_recept_calls_lead ON receptionist_calls(lead_id);

-- ── 1.4 Messages (WhatsApp CRM thread) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS receptionist_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id       UUID REFERENCES receptionist_leads(id) ON DELETE SET NULL,
  channel       VARCHAR(16) NOT NULL DEFAULT 'whatsapp',
  direction     VARCHAR(16) NOT NULL DEFAULT 'inbound', -- 'inbound' | 'outbound'
  provider_msg_id VARCHAR(128),               -- WA message id (dedupe)
  from_number   VARCHAR(32),
  to_number     VARCHAR(32),
  body          TEXT,
  media_url     TEXT,
  status        VARCHAR(32) DEFAULT 'received', -- 'received'|'sent'|'delivered'|'read'|'failed'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_recept_msgs_provider_id
  ON receptionist_messages(provider_msg_id) WHERE provider_msg_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_recept_msgs_user ON receptionist_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_recept_msgs_lead ON receptionist_messages(lead_id);

-- ── 1.5 Bookings (calendar appointments) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS receptionist_bookings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id       UUID REFERENCES receptionist_leads(id) ON DELETE SET NULL,
  title         VARCHAR(255),
  starts_at     TIMESTAMPTZ NOT NULL,
  ends_at       TIMESTAMPTZ NOT NULL,
  status        VARCHAR(32) NOT NULL DEFAULT 'confirmed',
    -- 'confirmed' | 'canceled' | 'completed' | 'no_show'
  provider      VARCHAR(32) DEFAULT 'google',
  external_event_id VARCHAR(255),             -- google calendar event id
  customer_name VARCHAR(255),
  customer_phone VARCHAR(32),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_recept_bookings_user ON receptionist_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_recept_bookings_slot ON receptionist_bookings(user_id, starts_at);

-- ── 1.6 SOS alerts (human escalation log) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS receptionist_sos_alerts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id     UUID REFERENCES receptionist_leads(id) ON DELETE SET NULL,
  call_id     UUID REFERENCES receptionist_calls(id) ON DELETE SET NULL,
  reason      VARCHAR(255),                   -- why escalated
  detail      TEXT,
  channel     VARCHAR(16),                    -- 'voice' | 'whatsapp'
  notified_via VARCHAR(64),                   -- 'email','whatsapp' (comma-joined)
  acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_recept_sos_user ON receptionist_sos_alerts(user_id);

-- ── 1.7 WhatsApp provider creds on profiles (Meta Cloud API) ───────────────────
-- Service-role only (NO public read policy on profiles for these columns).
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS whatsapp_token            TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS whatsapp_business_id      VARCHAR(64);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS whatsapp_connected_at     TIMESTAMPTZ;
-- Google Calendar (OAuth) refresh token for booking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gcal_refresh_token        TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gcal_calendar_id          VARCHAR(255);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gcal_connected_at         TIMESTAMPTZ;
-- Vapi assistant binding (per-user assistant) lives in receptionist_config.

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ MODULE 2 — INSIGHTS DE REDES                                               ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

-- ── 2.1 Insights config ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS insights_config (
  user_id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active      BOOLEAN     NOT NULL DEFAULT TRUE,
  niche          VARCHAR(128),               -- the business niche to track
  region         VARCHAR(64),                -- geo focus
  competitors    JSONB       DEFAULT '[]'::jsonb,  -- handles/urls to watch
  hashtags       JSONB       DEFAULT '[]'::jsonb,  -- seed hashtags to track
  platforms      JSONB       DEFAULT '["instagram","tiktok"]'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2.2 Trend insights (collected by the heavy job) ────────────────────────────
-- Each row = one detected trending format/style with a scored viral probability.
CREATE TABLE IF NOT EXISTS trend_insights (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  platform        VARCHAR(32) NOT NULL,       -- 'instagram' | 'tiktok'
  niche           VARCHAR(128),
  style           VARCHAR(255) NOT NULL,      -- the trending format/style label
  description     TEXT,
  example_url     TEXT,
  hashtags        JSONB,                      -- associated hashtags
  metrics         JSONB,                      -- raw collected metrics (views/likes/growth)
  viral_score     INT,                        -- 0-100 computed probability
  momentum        VARCHAR(16),                -- 'rising' | 'peak' | 'fading'
  collected_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source          VARCHAR(32) DEFAULT 'official_api', -- provenance
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_trend_insights_user ON trend_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_trend_insights_score
  ON trend_insights(user_id, viral_score DESC);
CREATE INDEX IF NOT EXISTS idx_trend_insights_platform ON trend_insights(platform);

-- ── 2.3 Insights post queue (publish via official APIs) ────────────────────────
-- Mirrors scheduled_posts but is owned by the Insights module and may carry a
-- trend reference. Published through social_accounts (reuses Meta Graph publish).
CREATE TABLE IF NOT EXISTS insights_post_queue (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id      UUID REFERENCES social_accounts(id) ON DELETE SET NULL,
  trend_id        UUID REFERENCES trend_insights(id) ON DELETE SET NULL,
  platform        VARCHAR(32),                -- target platform
  caption         TEXT,
  media_url       TEXT,
  scheduled_for   TIMESTAMPTZ NOT NULL,
  status          VARCHAR(32) NOT NULL DEFAULT 'scheduled',
    -- 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed' | 'canceled'
  external_post_id VARCHAR(128),
  last_error      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_insights_queue_user ON insights_post_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_insights_queue_due
  ON insights_post_queue(status, scheduled_for);

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ MODULE 3 — GESTOR DE ADS                                                   ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

-- ── 3.1 Ad accounts (Meta / TikTok connections) ────────────────────────────────
CREATE TABLE IF NOT EXISTS ad_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider        VARCHAR(32) NOT NULL,       -- 'meta' | 'tiktok'
  external_id     VARCHAR(128) NOT NULL,      -- act_<id> / advertiser_id
  name            VARCHAR(255),
  currency        VARCHAR(8),
  access_token    TEXT        NOT NULL,       -- service_role only
  token_expires_at TIMESTAMPTZ,
  status          VARCHAR(32) NOT NULL DEFAULT 'active', -- 'active' | 'revoked'
  connected_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ad_accounts_user_provider_ext
  ON ad_accounts(user_id, provider, external_id);
CREATE INDEX IF NOT EXISTS idx_ad_accounts_user ON ad_accounts(user_id);

-- ── 3.2 Campaigns (synced metrics snapshot) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS ad_campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id      UUID NOT NULL REFERENCES ad_accounts(id) ON DELETE CASCADE,
  provider        VARCHAR(32) NOT NULL,
  external_id     VARCHAR(128) NOT NULL,      -- campaign id at the provider
  name            VARCHAR(255),
  objective       VARCHAR(64),
  status          VARCHAR(32),                -- provider status (ACTIVE/PAUSED/...)
  daily_budget    DECIMAL(12,2),
  lifetime_budget DECIMAL(12,2),
  currency        VARCHAR(8),
  -- last-synced performance window metrics
  spend           DECIMAL(12,2),
  impressions     BIGINT,
  clicks          BIGINT,
  conversions     DECIMAL(12,2),
  revenue         DECIMAL(12,2),
  cpc             DECIMAL(12,4),              -- cost per click
  ctr             DECIMAL(8,4),               -- click-through rate %
  roas            DECIMAL(10,4),              -- return on ad spend
  metrics_window  VARCHAR(16) DEFAULT 'last_7d',
  synced_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ad_campaigns_account_ext
  ON ad_campaigns(account_id, external_id);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_user ON ad_campaigns(user_id);

-- ── 3.3 Rules (the optimization rule engine) ───────────────────────────────────
-- A rule = condition on a metric → action. Evaluated by the cron worker against
-- each campaign's latest synced metrics.
CREATE TABLE IF NOT EXISTS ad_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id      UUID REFERENCES ad_accounts(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  metric          VARCHAR(32) NOT NULL,       -- 'cpc' | 'roas' | 'ctr' | 'spend'
  operator        VARCHAR(8)  NOT NULL,       -- '>' | '<' | '>=' | '<='
  threshold       DECIMAL(12,4) NOT NULL,
  action          VARCHAR(32) NOT NULL,       -- 'pause' | 'alert' | 'scale_budget' | 'lower_budget'
  action_value    DECIMAL(12,4),             -- e.g. % to scale budget by
  min_spend       DECIMAL(12,2) DEFAULT 0,    -- only fire after this much spend (avoid noise)
  cooldown_hours  INT DEFAULT 24,             -- don't re-fire within this window
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ad_rules_user ON ad_rules(user_id);

-- ── 3.4 Alerts / rule-fire log ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ad_alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rule_id         UUID REFERENCES ad_rules(id) ON DELETE SET NULL,
  campaign_id     UUID REFERENCES ad_campaigns(id) ON DELETE SET NULL,
  severity        VARCHAR(16) NOT NULL DEFAULT 'info', -- 'info' | 'warning' | 'critical'
  metric          VARCHAR(32),
  metric_value    DECIMAL(12,4),
  threshold       DECIMAL(12,4),
  action_taken    VARCHAR(64),                -- 'paused','suggested_scale','alert_only','none'
  message         TEXT,
  acknowledged    BOOLEAN NOT NULL DEFAULT FALSE,
  notified        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ad_alerts_user ON ad_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_alerts_rule ON ad_alerts(rule_id);

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ updated_at triggers (reuse public.touch_updated_at from automation.sql)    ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝
DROP TRIGGER IF EXISTS receptionist_config_updated_at ON receptionist_config;
CREATE TRIGGER receptionist_config_updated_at BEFORE UPDATE ON receptionist_config
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS receptionist_leads_updated_at ON receptionist_leads;
CREATE TRIGGER receptionist_leads_updated_at BEFORE UPDATE ON receptionist_leads
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS receptionist_bookings_updated_at ON receptionist_bookings;
CREATE TRIGGER receptionist_bookings_updated_at BEFORE UPDATE ON receptionist_bookings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS insights_config_updated_at ON insights_config;
CREATE TRIGGER insights_config_updated_at BEFORE UPDATE ON insights_config
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS insights_post_queue_updated_at ON insights_post_queue;
CREATE TRIGGER insights_post_queue_updated_at BEFORE UPDATE ON insights_post_queue
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS ad_campaigns_updated_at ON ad_campaigns;
CREATE TRIGGER ad_campaigns_updated_at BEFORE UPDATE ON ad_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS ad_rules_updated_at ON ad_rules;
CREATE TRIGGER ad_rules_updated_at BEFORE UPDATE ON ad_rules
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║ Row Level Security                                                         ║
-- ║ Server writes everything via service_role (bypasses RLS). We grant ONLY    ║
-- ║ self-SELECT on rows the dashboard reads back. Token-bearing tables         ║
-- ║ (ad_accounts) get NO public policy → fully locked (service_role only).     ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝
ALTER TABLE receptionist_config     ENABLE ROW LEVEL SECURITY;
ALTER TABLE receptionist_leads      ENABLE ROW LEVEL SECURITY;
ALTER TABLE receptionist_calls      ENABLE ROW LEVEL SECURITY;
ALTER TABLE receptionist_messages   ENABLE ROW LEVEL SECURITY;
ALTER TABLE receptionist_bookings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE receptionist_sos_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights_config         ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_insights          ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights_post_queue     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_accounts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_campaigns            ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_rules                ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_alerts               ENABLE ROW LEVEL SECURITY;

-- Recepcionista IA — self-SELECT
DROP POLICY IF EXISTS "recept config read own" ON receptionist_config;
CREATE POLICY "recept config read own" ON receptionist_config
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "recept leads read own" ON receptionist_leads;
CREATE POLICY "recept leads read own" ON receptionist_leads
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "recept calls read own" ON receptionist_calls;
CREATE POLICY "recept calls read own" ON receptionist_calls
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "recept messages read own" ON receptionist_messages;
CREATE POLICY "recept messages read own" ON receptionist_messages
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "recept bookings read own" ON receptionist_bookings;
CREATE POLICY "recept bookings read own" ON receptionist_bookings
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "recept sos read own" ON receptionist_sos_alerts;
CREATE POLICY "recept sos read own" ON receptionist_sos_alerts
  FOR SELECT USING (auth.uid() = user_id);

-- Insights de Redes — self-SELECT
DROP POLICY IF EXISTS "insights config read own" ON insights_config;
CREATE POLICY "insights config read own" ON insights_config
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "trend insights read own" ON trend_insights;
CREATE POLICY "trend insights read own" ON trend_insights
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insights queue read own" ON insights_post_queue;
CREATE POLICY "insights queue read own" ON insights_post_queue
  FOR SELECT USING (auth.uid() = user_id);

-- Gestor de Ads — self-SELECT (NOT ad_accounts: token-bearing, locked)
DROP POLICY IF EXISTS "ad campaigns read own" ON ad_campaigns;
CREATE POLICY "ad campaigns read own" ON ad_campaigns
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "ad rules read own" ON ad_rules;
CREATE POLICY "ad rules read own" ON ad_rules
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "ad alerts read own" ON ad_alerts;
CREATE POLICY "ad alerts read own" ON ad_alerts
  FOR SELECT USING (auth.uid() = user_id);

-- Knowledge Vault - private context used by Recepcionista IA and Insights
CREATE TABLE IF NOT EXISTS knowledge_vault_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  kind          VARCHAR(16) NOT NULL DEFAULT 'note',
  file_name     TEXT,
  mime_type     TEXT,
  storage_path  TEXT,
  content_text  TEXT,
  summary       TEXT,
  source        VARCHAR(32) NOT NULL DEFAULT 'dashboard',
  status        VARCHAR(32) NOT NULL DEFAULT 'ready',
  error_message TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vault_user ON knowledge_vault_items(user_id);
CREATE INDEX IF NOT EXISTS idx_vault_created ON knowledge_vault_items(user_id, created_at DESC);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'knowledge-vault',
  'knowledge-vault',
  false,
  5242880,
  ARRAY['application/pdf','text/plain','text/markdown','text/csv','application/json','image/png','image/jpeg','image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP TRIGGER IF EXISTS knowledge_vault_updated_at ON knowledge_vault_items;
CREATE TRIGGER knowledge_vault_updated_at BEFORE UPDATE ON knowledge_vault_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE knowledge_vault_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vault read own" ON knowledge_vault_items;
CREATE POLICY "vault read own" ON knowledge_vault_items
  FOR SELECT USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- End Pulse Modules schema.
-- ═══════════════════════════════════════════════════════════════════════════
