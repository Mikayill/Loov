-- ─────────────────────────────────────────────────────────────────────────────
-- Product search/browse indexes (13 Jul 2026).
--
-- WHY: `products` had zero secondary indexes (only the PK + unique slug).
-- Every catalog query — browse, search, admin — did a full sequential scan.
-- This adds a trigram index for fast `ilike` name matching (across every
-- locale's name column) and a plain index on `category` for the /products
-- filter. Both are additive and safe to skip: /api/products/search's `ilike`
-- queries still work (just unindexed) if this hasn't been run yet, matching
-- the site's "migration optional, degrades gracefully" convention.
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists pg_trgm;

create index if not exists idx_products_name_trgm on public.products using gin (name gin_trgm_ops);
create index if not exists idx_products_category  on public.products (category);

-- name_ka/ru/tr only exist once supabase/product-i18n.sql has been run —
-- guard each so this file works regardless of run order (safe to re-run).
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='products' and column_name='name_ka') then
    execute 'create index if not exists idx_products_name_ka_trgm on public.products using gin (name_ka gin_trgm_ops)';
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='products' and column_name='name_ru') then
    execute 'create index if not exists idx_products_name_ru_trgm on public.products using gin (name_ru gin_trgm_ops)';
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='products' and column_name='name_tr') then
    execute 'create index if not exists idx_products_name_tr_trgm on public.products using gin (name_tr gin_trgm_ops)';
  end if;
end $$;
