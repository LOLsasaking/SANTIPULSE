-- ============================================================
-- Santipulse — leads table + Row Level Security
-- Run once in: Supabase Dashboard -> SQL Editor -> New query -> Run
-- ============================================================

-- 1) Table -----------------------------------------------------
create table if not exists public.leads (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  phone       text,
  business    text,
  need        text,                       -- comma-joined checkboxes
  message     text,
  lang        text default 'es',
  source      text default 'santipulse.com',
  ip_hash     text,                       -- hashed IP (no raw PII)
  user_agent  text,
  status      text default 'new',         -- new / read / replied / archived
  created_at  timestamptz default now()
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);

-- 1b) If the table already existed from an earlier version, add the new
--     columns (safe to run repeatedly — does nothing if they already exist).
alter table public.leads add column if not exists phone    text;
alter table public.leads add column if not exists business text;
alter table public.leads add column if not exists need     text;
alter table public.leads alter column message drop not null;

-- 2) Row Level Security ---------------------------------------
-- RLS ON = nobody can read/write unless a policy allows it.
alter table public.leads enable row level security;

-- We add NO public policies. The website never talks to Supabase from the
-- browser — only the /api/lead serverless function does, using the SERVICE
-- ROLE key, which bypasses RLS. Result:
--   • Public can NEVER read leads (no select policy = locked).
--   • Public can NEVER insert directly (no anon insert policy).
--   • Only your server (service role) can write — strongest setup.
--
-- ⚠️ Never add a SELECT policy for the anon role — it would leak every lead.
--    Read leads via the Supabase Table Editor (dashboard = service role).

-- ============================================================
-- Verify after running:
--   select * from public.leads order by created_at desc;
-- ============================================================
