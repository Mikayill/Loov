-- ═══════════════════════════════════════════════════════════════
-- Per-variant (size × color) stock — FAZ 9
-- Run this in the Supabase SQL Editor. Safe to run more than once.
--
-- stock_by_variant: { "0-3 Months": { "White": 4, "Sage": 2 }, "3-6 Months": { "White": 10 } }
--   A (size, color) pair missing from the map means the admin hasn't set a
--   per-variant count yet — reservation falls back to the flat `stock`
--   column (today's behavior), so nothing breaks until the admin fills it in.
--   Same fallback convention as size_prices' base-price fallback.
-- ═══════════════════════════════════════════════════════════════

alter table public.products add column if not exists stock_by_variant jsonb default '{}'::jsonb;
