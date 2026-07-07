-- ═══════════════════════════════════════════════════════════════
-- Materials & care — per-product editable "Materials & Care" tab
-- Run this in the Supabase SQL Editor. Safe to run more than once.
--
-- Empty/NULL columns fall back to the current default copy on the
-- product page, so nothing breaks for products you haven't edited.
-- ═══════════════════════════════════════════════════════════════

alter table public.products add column if not exists material          text;      -- e.g. '100% Organic Cotton', 'Muslin', 'Bamboo'
alter table public.products add column if not exists weight            text;      -- e.g. '180 GSM'
alter table public.products add column if not exists certification     text;      -- e.g. 'GOTS & OEKO-TEX'
alter table public.products add column if not exists origin            text;      -- e.g. 'Made in Georgia'
alter table public.products add column if not exists care_instructions text[];    -- one bullet per row
