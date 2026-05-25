-- ============================================
-- SignDay demo lead capture
-- Run this in Supabase SQL editor for project teamquykkznndcmknvpy
-- ============================================

-- One row per prospect who asks the demo to email them their draft. These are
-- warm leads (they ran the demo AND opted in) for the founder to follow up on.
create table if not exists public.demo_leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  first_name text,           -- athlete first name from the demo form
  school_name text,          -- the school they demoed
  source text,               -- utm_source (e.g. 'google') or 'direct'
  created_at timestamptz not null default now()
);

create index if not exists demo_leads_created_idx
  on public.demo_leads (created_at desc);

alter table public.demo_leads enable row level security;
alter table public.demo_leads force row level security;

-- Locked down by RLS; server uses the service_role key which bypasses it.
