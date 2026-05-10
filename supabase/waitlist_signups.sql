-- ============================================
-- SignDay waitlist signups table
-- Created May 10, 2026
-- Run this in the Supabase SQL editor for project teamquykkznndcmknvpy
-- ============================================

create table if not exists public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text,
  user_agent text,
  ip text,
  created_at timestamptz not null default now()
);

create index if not exists waitlist_signups_created_at_idx
  on public.waitlist_signups (created_at desc);

-- Lock the table down. The Next.js API route uses the service role key,
-- which bypasses RLS, so we just deny everything by default.
alter table public.waitlist_signups enable row level security;
alter table public.waitlist_signups force row level security;

-- No policies means: only the service role (used server-side) can read/write.
-- Anon and authenticated roles get nothing. That's intentional.
