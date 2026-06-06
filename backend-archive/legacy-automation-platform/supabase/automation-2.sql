-- ═══════════════════════════════════════════════════════════════════════════
-- Santipulse — Automation SaaS schema, PART 2
-- The 3 client automations: Cold Outreach · Cart Recovery · Social Scheduler
-- Run ONCE in the Supabase SQL Editor for project mhgvevpshoebskqumrex,
-- AFTER automation.sql (this references profiles / auth.users from part 1).
-- ───────────────────────────────────────────────────────────────────────────
-- Additive only. Safe to re-run (IF NOT EXISTS / OR REPLACE / ADD COLUMN IF
-- NOT EXISTS throughout). Conventions match automation.sql:
--   • UUID PKs (gen_random_uuid)   • TIMESTAMPTZ everywhere
--   • FKs target auth.users(id) / profiles(id)
--   • RLS ON; server writes via service_role (bypasses RLS).
--   • OAuth tokens / secrets live in rows with NO public read policy.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 0. OAuth provider tokens on profiles ──────────────────────────────────────
-- Gmail (Google OAuth) is the send transport for Outreach + Cart Recovery.
-- We store ONLY the refresh token (long-lived); access tokens are minted on
-- demand by the worker and never persisted. NO RLS read policy exists on
-- profiles for these columns — they are written/read with service_role only.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gmail_email             VARCHAR(320);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gmail_refresh_token     TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gmail_scope             TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gmail_connected_at      TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gmail_daily_sent        INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gmail_daily_sent_date   DATE;

-- ── 1. OAuth state (CSRF nonce for the authorize → callback round-trip) ────────
-- Short-lived. The authorize endpoint inserts a row; the callback verifies and
-- deletes it. Bound to the user so a leaked state can't be replayed for another.
CREATE TABLE IF NOT EXISTS oauth_states (
  state       VARCHAR(128) PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider    VARCHAR(32)  NOT NULL,   -- 'gmail' | 'shopify' | 'meta'
  redirect_to VARCHAR(256),            -- where to bounce the user after success
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_oauth_states_user ON oauth_states(user_id);

-- ── 2. Shopify connections (cart source for Cart Recovery) ────────────────────
CREATE TABLE IF NOT EXISTS shopify_connections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_domain   VARCHAR(255) NOT NULL,   -- e.g. my-store.myshopify.com
  access_token  TEXT         NOT NULL,   -- Shopify Admin API token (service_role only)
  scope         TEXT,
  status        VARCHAR(32)  NOT NULL DEFAULT 'active', -- 'active' | 'revoked'
  connected_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_shopify_user_shop
  ON shopify_connections(user_id, shop_domain);

-- ── 3. Cart Recovery ──────────────────────────────────────────────────────────
-- A campaign = the user's recovery settings (the email sequence + timing).
CREATE TABLE IF NOT EXISTS cart_recovery_campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL DEFAULT 'Cart Recovery',
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  -- The sequence: array of { delay_minutes, subject, body } steps (JSONB).
  steps           JSONB        NOT NULL DEFAULT '[]'::jsonb,
  from_name       VARCHAR(255),
  discount_code   VARCHAR(64),            -- optional incentive included in body
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cart_campaigns_user ON cart_recovery_campaigns(user_id);

-- A job = one abandoned cart being worked through the sequence.
CREATE TABLE IF NOT EXISTS cart_recovery_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     UUID NOT NULL REFERENCES cart_recovery_campaigns(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cart_token      VARCHAR(255) NOT NULL,  -- Shopify checkout/cart id (dedupe key)
  customer_email  VARCHAR(320) NOT NULL,
  customer_name   VARCHAR(255),
  cart_value      DECIMAL(10,2),
  currency        VARCHAR(8),
  recovery_url    TEXT,                    -- deep link back to the checkout
  step_index      INT          NOT NULL DEFAULT 0,  -- next step to send
  status          VARCHAR(32)  NOT NULL DEFAULT 'pending',
    -- 'pending' | 'sending' | 'completed' | 'recovered' | 'failed' | 'stopped'
  next_send_at    TIMESTAMPTZ,             -- when the worker should send step_index
  last_error      TEXT,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
-- One job per (user, cart) so re-imported carts don't double-send.
CREATE UNIQUE INDEX IF NOT EXISTS uq_cart_jobs_user_cart
  ON cart_recovery_jobs(user_id, cart_token);
-- The worker's hot query: due jobs ready to send.
CREATE INDEX IF NOT EXISTS idx_cart_jobs_due
  ON cart_recovery_jobs(status, next_send_at);

-- ── 4. Social Scheduler ───────────────────────────────────────────────────────
-- Connected social account (Meta Graph: Facebook Page + linked IG business acct).
CREATE TABLE IF NOT EXISTS social_accounts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider         VARCHAR(32)  NOT NULL,  -- 'facebook' | 'instagram'
  external_id      VARCHAR(128) NOT NULL,  -- page id / ig business account id
  username         VARCHAR(255),           -- handle / page name for display
  access_token     TEXT         NOT NULL,  -- long-lived page token (service_role only)
  token_expires_at TIMESTAMPTZ,
  status           VARCHAR(32)  NOT NULL DEFAULT 'active', -- 'active' | 'revoked'
  connected_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_social_user_provider_ext
  ON social_accounts(user_id, provider, external_id);

-- A scheduled post targets ONE connected account at ONE time.
CREATE TABLE IF NOT EXISTS scheduled_posts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id      UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  caption         TEXT,
  media_url       TEXT,                    -- public image/video URL (IG requires media)
  scheduled_for   TIMESTAMPTZ  NOT NULL,
  status          VARCHAR(32)  NOT NULL DEFAULT 'scheduled',
    -- 'scheduled' | 'publishing' | 'published' | 'failed' | 'canceled'
  external_post_id VARCHAR(128),           -- id returned by the platform on publish
  last_error      TEXT,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_posts_user ON scheduled_posts(user_id);
-- The worker's hot query: due posts ready to publish.
CREATE INDEX IF NOT EXISTS idx_posts_due
  ON scheduled_posts(status, scheduled_for);

-- Append-only log of publish attempts (audit / debugging).
CREATE TABLE IF NOT EXISTS post_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID REFERENCES scheduled_posts(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status      VARCHAR(32)  NOT NULL,   -- 'published' | 'failed'
  detail      TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_post_logs_post ON post_logs(post_id);

-- ── 5. Cold Outreach ──────────────────────────────────────────────────────────
-- A campaign = subject/body template + sending cadence; recipients are the jobs.
CREATE TABLE IF NOT EXISTS outreach_campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL DEFAULT 'Cold Outreach',
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  from_name       VARCHAR(255),
  -- Sequence of follow-ups: array of { delay_minutes, subject, body } (JSONB).
  -- Bodies support {{name}} / {{company}} merge tags filled per-recipient.
  steps           JSONB        NOT NULL DEFAULT '[]'::jsonb,
  daily_cap       INT          NOT NULL DEFAULT 50,  -- max sends/day for this campaign
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_outreach_campaigns_user ON outreach_campaigns(user_id);

-- A job = one prospect being worked through the campaign sequence.
CREATE TABLE IF NOT EXISTS outreach_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     UUID NOT NULL REFERENCES outreach_campaigns(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_email VARCHAR(320) NOT NULL,
  recipient_name  VARCHAR(255),
  company         VARCHAR(255),
  merge_data      JSONB,                   -- extra merge fields
  step_index      INT          NOT NULL DEFAULT 0,
  status          VARCHAR(32)  NOT NULL DEFAULT 'pending',
    -- 'pending' | 'sending' | 'completed' | 'replied' | 'bounced' | 'failed' | 'stopped'
  next_send_at    TIMESTAMPTZ,
  last_error      TEXT,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
-- One job per (campaign, recipient) so imports don't duplicate prospects.
CREATE UNIQUE INDEX IF NOT EXISTS uq_outreach_jobs_campaign_recipient
  ON outreach_jobs(campaign_id, recipient_email);
CREATE INDEX IF NOT EXISTS idx_outreach_jobs_due
  ON outreach_jobs(status, next_send_at);

-- ── 6. Email tracking (shared by Outreach + Cart Recovery) ────────────────────
-- One row per sent message. token drives the open pixel + click redirect.
CREATE TABLE IF NOT EXISTS email_tracking (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  source        VARCHAR(32)  NOT NULL,   -- 'outreach' | 'cart'
  job_id        UUID         NOT NULL,   -- outreach_jobs.id or cart_recovery_jobs.id
  step_index    INT,
  recipient     VARCHAR(320),
  token         VARCHAR(128) NOT NULL UNIQUE,  -- opaque id in pixel/link URLs
  provider_id   VARCHAR(255),            -- Gmail message id
  sent_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  opened_at     TIMESTAMPTZ,
  clicked_at    TIMESTAMPTZ,
  open_count    INT          NOT NULL DEFAULT 0,
  click_count   INT          NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_email_tracking_job  ON email_tracking(source, job_id);
CREATE INDEX IF NOT EXISTS idx_email_tracking_user ON email_tracking(user_id);

-- ── updated_at triggers (reuse public.touch_updated_at from automation.sql) ────
DROP TRIGGER IF EXISTS cart_campaigns_updated_at ON cart_recovery_campaigns;
CREATE TRIGGER cart_campaigns_updated_at BEFORE UPDATE ON cart_recovery_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS cart_jobs_updated_at ON cart_recovery_jobs;
CREATE TRIGGER cart_jobs_updated_at BEFORE UPDATE ON cart_recovery_jobs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS posts_updated_at ON scheduled_posts;
CREATE TRIGGER posts_updated_at BEFORE UPDATE ON scheduled_posts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS outreach_campaigns_updated_at ON outreach_campaigns;
CREATE TRIGGER outreach_campaigns_updated_at BEFORE UPDATE ON outreach_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS outreach_jobs_updated_at ON outreach_jobs;
CREATE TRIGGER outreach_jobs_updated_at BEFORE UPDATE ON outreach_jobs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ── Row Level Security ─────────────────────────────────────────────────────────
-- Server writes everything with service_role (bypasses RLS). We grant ONLY
-- self-SELECT on the rows the dashboard reads back. Token-bearing tables
-- (shopify_connections, social_accounts, oauth_states, email_tracking) get NO
-- public policy → fully locked (service_role only).
ALTER TABLE oauth_states            ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_connections     ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_recovery_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_recovery_jobs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_accounts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_posts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_logs               ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_campaigns      ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_jobs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_tracking          ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cart campaigns read own" ON cart_recovery_campaigns;
CREATE POLICY "cart campaigns read own" ON cart_recovery_campaigns
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "cart jobs read own" ON cart_recovery_jobs;
CREATE POLICY "cart jobs read own" ON cart_recovery_jobs
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "posts read own" ON scheduled_posts;
CREATE POLICY "posts read own" ON scheduled_posts
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "post logs read own" ON post_logs;
CREATE POLICY "post logs read own" ON post_logs
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "outreach campaigns read own" ON outreach_campaigns;
CREATE POLICY "outreach campaigns read own" ON outreach_campaigns
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "outreach jobs read own" ON outreach_jobs;
CREATE POLICY "outreach jobs read own" ON outreach_jobs
  FOR SELECT USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- End part 2.
-- ═══════════════════════════════════════════════════════════════════════════
