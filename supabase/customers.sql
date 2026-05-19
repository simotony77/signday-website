-- ============================================
-- SignDay customers + onboarding tables
-- Run this in Supabase SQL editor for project teamquykkznndcmknvpy
-- ============================================

-- Customers: one row per Stripe subscription
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  stripe_customer_id text not null unique,
  stripe_subscription_id text unique,
  subscription_status text,
  onboarded_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists customers_email_idx on public.customers (email);
create index if not exists customers_stripe_customer_id_idx
  on public.customers (stripe_customer_id);

alter table public.customers enable row level security;
alter table public.customers force row level security;

-- Onboarding submissions: one row per onboarding form submit
create table if not exists public.onboarding_submissions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers (id),
  email text not null,
  athlete jsonb not null,
  schools jsonb not null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists onboarding_submissions_customer_idx
  on public.onboarding_submissions (customer_id);

alter table public.onboarding_submissions enable row level security;
alter table public.onboarding_submissions force row level security;

-- Both tables locked down by RLS. Server uses service_role key which bypasses.
