-- ============================================
-- SignDay demo feedback (anonymous "what would make this a yes?" capture)
-- Run this in Supabase SQL editor for project teamquykkznndcmknvpy
-- ============================================

-- One row per prospect who left an answer to "what would make this a yes?" on
-- the demo result page. Anonymous: no email, just a one-way IP hash so we can
-- spot the same person submitting twice. The whole purpose is to learn what's
-- blocking conversion when /admin shows demo runs but zero leads or signups.
create table if not exists public.demo_feedback (
  id uuid primary key default gen_random_uuid(),
  feedback text not null,
  school_name text,     -- which school they were demoing (context)
  source text,          -- utm_source (e.g. 'google', 'ig_boost') or 'direct'
  ip_hash text,         -- 16-char sha256 prefix; same value as demo_runs.ip_hash
  created_at timestamptz not null default now()
);

create index if not exists demo_feedback_created_idx
  on public.demo_feedback (created_at desc);

alter table public.demo_feedback enable row level security;
alter table public.demo_feedback force row level security;

-- Locked down by RLS; server uses the service_role key which bypasses it.
