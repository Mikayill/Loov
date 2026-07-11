-- ═══════════════════════════════════════════════════════════════
-- Per-locale product name/description — FAZ 8+
-- Run this in the Supabase SQL Editor. Safe to run more than once.
--
-- name/description columns stay the canonical (English) source of truth,
-- used everywhere in cart/order/search logic. These new columns are
-- DISPLAY ONLY: a locale-specific field left blank falls back to the
-- canonical name/description (same rule as size_prices' base-price fallback).
-- ═══════════════════════════════════════════════════════════════

alter table public.products add column if not exists name_ka text;
alter table public.products add column if not exists name_ru text;
alter table public.products add column if not exists name_tr text;
alter table public.products add column if not exists description_ka text;
alter table public.products add column if not exists description_ru text;
alter table public.products add column if not exists description_tr text;
