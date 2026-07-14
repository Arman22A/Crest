-- Crest v28 cloud schema. Run through a controlled migration, not from the browser.
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_cron;
create extension if not exists pg_net;

create table if not exists public.progress_sync (
  sync_id text primary key,
  payload jsonb not null default '{}'::jsonb,
  revision bigint not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.progress_sync enable row level security;
revoke all on public.progress_sync from anon, authenticated;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  sync_id text not null references public.progress_sync(sync_id) on update cascade on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null,
  device_name text not null default 'Crest',
  timezone text not null default 'Europe/Moscow',
  morning_time time not null default '10:00',
  evening_time time not null default '16:00',
  enabled boolean not null default true,
  reminder_days jsonb not null default '{}'::jsonb,
  last_morning_sent_on date,
  last_evening_sent_on date,
  updated_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;

create table if not exists public.crest_server_secrets (
  name text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.crest_server_secrets enable row level security;
revoke all on public.crest_server_secrets from anon, authenticated;

-- VAPID and scheduler secrets are created directly in Supabase and are never
-- committed to this repository. The crest-api Edge Function is the only public
-- gateway for progress and notification subscriptions.
