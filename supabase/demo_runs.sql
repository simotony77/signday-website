-- ============================================
-- SignDay demo usage tracking
-- Run this in Supabase SQL editor for project teamquykkznndcmknvpy
-- ============================================

-- One row per demo run (cached 12-school demo or live "any school" demo).
-- Lets the admin page show demo engagement and which schools prospects try.
create table if not exists public.demo_runs (
  id uuid primary key default gen_random_uuid(),
  kind text not null,         -- 'cached' | 'live'
  school text,                -- slug (cached) or typed school name (live)
  ip_hash text,               -- short sha256 of IP, for rough unique counting
  created_at timestamptz not null default now()
);

create index if not exists demo_runs_created_idx
  on public.demo_runs (created_at desc);

alter table public.demo_runs enable row level security;
alter table public.demo_runs force row level security;

-- Locked down by RLS; server uses the service_role key which bypasses it.
