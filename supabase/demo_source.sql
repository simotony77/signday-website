-- ============================================
-- SignDay: attribute demo runs to a source (utm_source)
-- Run this in Supabase SQL editor for project teamquykkznndcmknvpy
-- ============================================

-- Stores where a demo run came from: "google" (ad), "direct" (organic), etc.
alter table public.demo_runs add column if not exists source text;
