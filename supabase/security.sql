-- ============================================
-- SignDay security: rate limiting
-- Run this in Supabase SQL editor for project teamquykkznndcmknvpy
-- ============================================

-- One row per request to a rate-limited endpoint. We count rows in a sliding
-- window per (bucket) and reject when over the limit. bucket = "endpoint:ip".
create table if not exists public.rate_limits (
  id uuid primary key default gen_random_uuid(),
  bucket text not null,
  created_at timestamptz not null default now()
);

create index if not exists rate_limits_bucket_created_idx
  on public.rate_limits (bucket, created_at desc);

alter table public.rate_limits enable row level security;
alter table public.rate_limits force row level security;

-- Locked down by RLS; the server uses the service_role key which bypasses it.
-- Old rows are pruned opportunistically by the app, but you can also clear
-- them periodically:  delete from public.rate_limits where created_at < now() - interval '1 day';
