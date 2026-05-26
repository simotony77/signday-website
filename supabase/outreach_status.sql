-- ============================================
-- SignDay outreach status (manual pipeline tracking)
-- Run this in Supabase SQL editor for project teamquykkznndcmknvpy
-- ============================================

-- One row per (customer email, school). The parent sets the status and the
-- date they last emailed the coach; the weekly digest derives "silence" and
-- surfaces re-engagement drafts from it. school_name is the join key.
create table if not exists public.outreach_status (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  email text not null,
  school_name text not null,
  roster_url text,
  -- not_contacted | sent | replied | visit | not_pursuing
  status text not null default 'not_contacted',
  last_contacted_at date,   -- when the athlete last emailed the coach
  last_reply_at date,       -- when the coach last replied (optional)
  notes text,               -- parent's own note
  agent_note text,          -- agent-detected event (e.g. coach change); never overwrites parent's note
  updated_at timestamptz not null default now()
);

-- Safe to re-run if the table already existed without this column.
alter table public.outreach_status add column if not exists agent_note text;

-- One status row per school per customer; upserts target this.
create unique index if not exists outreach_status_email_school_idx
  on public.outreach_status (email, school_name);
create index if not exists outreach_status_email_idx
  on public.outreach_status (email);

alter table public.outreach_status enable row level security;
alter table public.outreach_status force row level security;

-- Locked down by RLS; server uses the service_role key which bypasses it.
