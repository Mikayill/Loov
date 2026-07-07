-- ============================================================
-- Loov — bundle pricing + promo code columns (run AFTER schema.sql)
-- Supabase → SQL Editor → New query → paste → Run. Safe to re-run.
--
-- Lets /api/orders record the REAL discount it computed server-side:
--   - promo_code / promo_discount on orders — which cart promo code (if any)
--     was applied and how many ₾ it took off.
--   - bundle_slug / bundle_name on order_items — which bundle (if any) an
--     item line came from, so admin order detail can show "part of {set}".
-- Until this migration runs, /api/orders gracefully drops these fields
-- (see the /promo_/ and /bundle_/ retry checks) — orders never fail because
-- of a missing column.
-- ============================================================

alter table public.orders add column if not exists promo_code text;
alter table public.orders add column if not exists promo_discount numeric not null default 0;

alter table public.order_items add column if not exists bundle_slug text;
alter table public.order_items add column if not exists bundle_name text;
