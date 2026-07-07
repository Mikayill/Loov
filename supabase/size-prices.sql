-- ═══════════════════════════════════════════════════════════════
-- Size-based pricing + fabric — FAZ 3
-- Run this in the Supabase SQL Editor. Safe to run more than once.
--
--  size_prices: {"0-3 Months": 24, "6-12 Months": 28}
--    A size missing from the map uses the product's base price.
--    The discount_percent still applies ON TOP of the size price.
--  fabric: normalized fabric slug for the storefront filter
--    (cotton | muslin | bamboo | terry | fleece | wool | other)
-- ═══════════════════════════════════════════════════════════════

alter table public.products add column if not exists size_prices jsonb;
alter table public.products add column if not exists fabric      text;
