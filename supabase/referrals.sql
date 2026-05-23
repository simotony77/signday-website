-- ============================================
-- SignDay referrals
-- Run this in Supabase SQL editor for project teamquykkznndcmknvpy
-- ============================================

-- Each customer gets a shareable referral_code. When a new customer signs up
-- through someone's link, referred_by stores that code so we can attribute
-- the referral (and comp both families a free month).
alter table public.customers add column if not exists referral_code text;
alter table public.customers add column if not exists referred_by text;

create index if not exists customers_referral_code_idx
  on public.customers (referral_code);
create index if not exists customers_referred_by_idx
  on public.customers (referred_by);
