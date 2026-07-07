-- ============================================================
-- Loov — feature upgrade (settings, product extras, reviews)
-- Run AFTER schema.sql + admin.sql. Supabase → SQL Editor → Run.
-- Safe to re-run (idempotent).
-- ============================================================

-- ------------------------------------------------------------
-- 1) SETTINGS  (store-wide, editable from /admin/settings)
--    key/value store; storefront needs public read.
-- ------------------------------------------------------------
create table if not exists public.settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz default now()
);
alter table public.settings enable row level security;

-- Everyone can read settings (shipping threshold, points rate, new-badge days
-- are all needed on the storefront). Writes are service-role only.
drop policy if exists "settings_public_read" on public.settings;
create policy "settings_public_read" on public.settings
  for select using (true);

-- Seed defaults (only inserts missing keys — never overwrites your edits).
insert into public.settings (key, value) values
  ('points_per_gel',          '2'::jsonb),
  ('free_shipping_threshold', '100'::jsonb),
  ('new_badge_days',          '30'::jsonb)
on conflict (key) do nothing;

-- ------------------------------------------------------------
-- 2) PRODUCTS — new columns
-- ------------------------------------------------------------
-- Percentage discount, 0 = none. Effective price = price*(1-pct/100).
alter table public.products add column if not exists discount_percent int default 0;
-- Multiple photos (gallery). image_url stays as the primary/thumbnail.
alter table public.products add column if not exists image_urls text[] default '{}';
-- Season: 'all' | 'summer' | 'winter'  (drives filtering + seasonal ordering).
alter table public.products add column if not exists season text default 'all';
-- Which colors are available per size, e.g. {"0-3 Months":["White","Sage"]}.
-- A size missing from the map ⇒ all product colors available.
alter table public.products add column if not exists size_colors jsonb default '{}'::jsonb;
-- Editable "highlights" bullet list shown on the product Description tab.
alter table public.products add column if not exists features text[] default '{}';

-- Keep discount sane at the DB level too.
alter table public.products drop constraint if exists products_discount_range;
alter table public.products add constraint products_discount_range
  check (discount_percent is null or (discount_percent >= 0 and discount_percent <= 90));

-- ------------------------------------------------------------
-- 3) REVIEWS — real, purchase-gated customer reviews
--    A review may only be created (server-side, service role) when the user
--    has a DELIVERED order containing the product. One review per user/product.
-- ------------------------------------------------------------
create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  product_id  text not null references public.products(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete set null,
  order_id    uuid references public.orders(id) on delete set null,
  rating      int  not null check (rating between 1 and 5),
  body        text not null,
  show_name   boolean default true,     -- shopper chose to show their name
  author_name text,                     -- snapshot of the name at review time
  status      text default 'published', -- published | hidden (admin can hide)
  created_at  timestamptz default now(),
  unique (product_id, user_id)
);
alter table public.reviews enable row level security;

-- Anyone can read published reviews.
drop policy if exists "reviews_public_read" on public.reviews;
create policy "reviews_public_read" on public.reviews
  for select using (status = 'published');

-- A signed-in user can read their own review regardless of status.
drop policy if exists "reviews_select_own" on public.reviews;
create policy "reviews_select_own" on public.reviews
  for select using (auth.uid() = user_id);

-- Admins can read/hide/delete any review.
drop policy if exists "reviews_admin_all" on public.reviews;
create policy "reviews_admin_all" on public.reviews
  for all using (public.is_admin()) with check (public.is_admin());

-- NOTE: inserts happen server-side with the service role AFTER the API
-- verifies a delivered order, so there is intentionally no public insert policy.

-- Eligibility helper: has this user received (delivered) this product?
-- SECURITY DEFINER so it can see orders/order_items regardless of the caller.
create or replace function public.has_delivered_product(p_user uuid, p_product text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.orders o
    join public.order_items oi on oi.order_id = o.id
    where o.user_id = p_user
      and o.status = 'delivered'
      and oi.product_id = p_product
  );
$$;

-- Handy index for product review listings.
create index if not exists reviews_product_idx on public.reviews (product_id, created_at desc);
