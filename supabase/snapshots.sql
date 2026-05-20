-- ============================================
-- SignDay agent state: school snapshots + digest log
-- Run this in Supabase SQL editor for project teamquykkznndcmknvpy
-- ============================================

-- One row per (customer, school) scrape. The agent stores a new snapshot
-- every weekly run and diffs the latest two to detect roster/coach changes.
create table if not exists public.school_snapshots (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers (id),
  email text not null,
  school_name text not null,
  roster_url text not null,
  snapshot jsonb not null,
  scraped_at timestamptz not null default now()
);

-- Fast lookup of the latest snapshot for a given customer + school.
create index if not exists school_snapshots_email_url_idx
  on public.school_snapshots (email, roster_url, scraped_at desc);

alter table public.school_snapshots enable row level security;
alter table public.school_snapshots force row level security;

-- One row per digest the agent sends. Lets Tony see what went out and when.
create table if not exists public.digests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers (id),
  email text not null,
  schools_tracked int not null default 0,
  triggers_count int not null default 0,
  drafts_count int not null default 0,
  is_baseline boolean not null default false,
  detail jsonb,
  sent_at timestamptz not null default now()
);

create index if not exists digests_email_idx
  on public.digests (email, sent_at desc);

alter table public.digests enable row level security;
alter table public.digests force row level security;

-- Both tables locked down by RLS. The agent uses the service_role key which
-- bypasses RLS, so no policies are needed for server-side access.
