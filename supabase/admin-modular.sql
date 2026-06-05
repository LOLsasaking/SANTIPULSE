-- SantiPulse modular admin backend schema
-- Apply this after validating Supabase project ownership and before enabling live integrations.

create extension if not exists pgcrypto;

create table if not exists public.admin_receptionist_leads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  name text not null,
  phone text,
  email text,
  stage text not null default 'new',
  source text not null default 'manual',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_crm_conversation_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  lead_id uuid references public.admin_receptionist_leads(id) on delete set null,
  channel text not null,
  contact text,
  summary text,
  transcript text,
  human_sos boolean not null default false,
  provider_event_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_calendar_bookings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  lead_id uuid references public.admin_receptionist_leads(id) on delete set null,
  provider text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  status text not null default 'requested',
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_human_sos_alerts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  severity text not null default 'normal',
  message text not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.admin_social_trends (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  platform text not null,
  topic text not null,
  style text,
  score numeric not null default 0,
  metrics jsonb not null default '{}'::jsonb,
  recommendation text,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_social_post_queue (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  platform text not null,
  caption text not null,
  media_url text,
  scheduled_for timestamptz,
  status text not null default 'queued',
  provider_post_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  platform text not null,
  provider_campaign_id text,
  name text not null,
  status text not null default 'draft',
  daily_budget numeric not null default 0,
  performance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_ad_optimization_rules (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  name text not null,
  metric text not null,
  operator text not null,
  threshold numeric not null,
  action text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_ad_recommendations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  campaign_id uuid references public.admin_ad_campaigns(id) on delete set null,
  campaign_name text,
  recommendation text not null,
  confidence numeric not null default 0.5,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.admin_webhook_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  source text not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now()
);

create index if not exists idx_admin_receptionist_leads_owner_updated on public.admin_receptionist_leads(owner_id, updated_at desc);
create index if not exists idx_admin_crm_logs_owner_created on public.admin_crm_conversation_logs(owner_id, created_at desc);
create index if not exists idx_admin_social_trends_owner_created on public.admin_social_trends(owner_id, created_at desc);
create index if not exists idx_admin_social_queue_owner_scheduled on public.admin_social_post_queue(owner_id, scheduled_for desc);
create index if not exists idx_admin_ad_campaigns_owner_updated on public.admin_ad_campaigns(owner_id, updated_at desc);
create index if not exists idx_admin_webhook_events_received on public.admin_webhook_events(received_at desc);

alter table public.admin_receptionist_leads enable row level security;
alter table public.admin_crm_conversation_logs enable row level security;
alter table public.admin_calendar_bookings enable row level security;
alter table public.admin_human_sos_alerts enable row level security;
alter table public.admin_social_trends enable row level security;
alter table public.admin_social_post_queue enable row level security;
alter table public.admin_ad_campaigns enable row level security;
alter table public.admin_ad_optimization_rules enable row level security;
alter table public.admin_ad_recommendations enable row level security;
alter table public.admin_webhook_events enable row level security;

-- Serverless admin endpoints use SUPABASE_SERVICE_ROLE_KEY. Keep browser access locked down
-- until a narrower operator role policy is intentionally added.
