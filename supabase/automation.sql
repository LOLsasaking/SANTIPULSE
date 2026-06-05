-- ═══════════════════════════════════════════════════════════════════════════
-- Santipulse — Automation SaaS schema (demos + auth profiles + billing)
-- Run ONCE in the Supabase SQL Editor for project mhgvevpshoebskqumrex.
-- ───────────────────────────────────────────────────────────────────────────
-- Additive only — does NOT touch the existing `leads` table.
-- Uses Supabase Auth: there is NO custom users table. User identity lives in
-- auth.users (managed by Supabase). The tables below reference auth.users(id).
-- Safe to re-run (IF NOT EXISTS / OR REPLACE throughout).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Demo Trial Usage ───────────────────────────────────────────────────────
-- One free run per automation type per visitor. Anonymous visitors are
-- fingerprinted (hashed IP+UA); logged-in users are keyed by user_id.
CREATE TABLE IF NOT EXISTS demo_trials (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  fingerprint     VARCHAR(128),
  automation_type VARCHAR(64)  NOT NULL,  -- 'price_monitor' | 'lead_scraper'
  used_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
-- Partial unique indexes: one trial per (user, type) AND one per (fingerprint, type).
CREATE UNIQUE INDEX IF NOT EXISTS uq_demo_trials_user
  ON demo_trials (user_id, automation_type) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_demo_trials_fp
  ON demo_trials (fingerprint, automation_type) WHERE fingerprint IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_demo_trials_fingerprint ON demo_trials(fingerprint);

-- ── 2. Automation Jobs ─────────────────────────────────────────────────────────
-- Every run (demo or paid) recorded here for history + debugging.
CREATE TABLE IF NOT EXISTS automation_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  automation_type VARCHAR(64)  NOT NULL,
  is_demo         BOOLEAN      NOT NULL DEFAULT TRUE,
  status          VARCHAR(32)  NOT NULL DEFAULT 'queued',
    -- 'queued' | 'running' | 'completed' | 'failed'
  fingerprint     VARCHAR(128),
  input_params    JSONB,
  result          JSONB,
  error_message   TEXT,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_automation_jobs_user        ON automation_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_automation_jobs_status      ON automation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_automation_jobs_fingerprint ON automation_jobs(fingerprint);

-- ── 3. Profiles ────────────────────────────────────────────────────────────────
-- 1:1 with auth.users. Business details + cached subscription state for fast reads.
CREATE TABLE IF NOT EXISTS profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email               VARCHAR(320),
  -- business profile
  business_name       VARCHAR(255),
  website_url         VARCHAR(512),
  industry            VARCHAR(128),
  target_market       TEXT,
  sender_name         VARCHAR(255),
  -- automation settings
  my_current_price    DECIMAL(10,2),
  floor_price         DECIMAL(10,2),
  competitor_urls     JSONB,
  lead_target_urls    JSONB,
  max_leads_per_run   INT DEFAULT 10,
  -- billing (cached from Stripe via webhook)
  stripe_customer_id  VARCHAR(64) UNIQUE,
  subscription_id     VARCHAR(64) UNIQUE,
  subscription_status VARCHAR(32) DEFAULT 'none',
    -- 'none' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid'
  plan                VARCHAR(32) DEFAULT 'none',  -- 'none'|'starter'|'pro'|'agency'
  plan_expires_at     TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 4. Stripe Events (idempotency) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stripe_events (
  stripe_event_id  VARCHAR(128) PRIMARY KEY,
  event_type       VARCHAR(128) NOT NULL,
  processed_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  payload          JSONB
);

-- ── Auto-create a profile row when a new auth user signs up ────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Keep profiles.updated_at current ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ── Row Level Security ─────────────────────────────────────────────────────────
-- The server writes everything with the service_role key (bypasses RLS).
-- demo_trials / automation_jobs / stripe_events: no public policies → locked down.
ALTER TABLE demo_trials      ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_jobs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;

-- profiles: a logged-in user may READ their own row (handy if you ever query
-- from the browser with the anon key). All writes still go through the server.
DROP POLICY IF EXISTS "profiles read own" ON profiles;
CREATE POLICY "profiles read own" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- automation_jobs: a logged-in user may READ their own runs.
DROP POLICY IF EXISTS "jobs read own" ON automation_jobs;
CREATE POLICY "jobs read own" ON automation_jobs
  FOR SELECT USING (auth.uid() = user_id);
