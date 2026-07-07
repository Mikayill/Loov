-- ============================================================
-- Loov — database schema (Phase 2)
-- HOW TO RUN: Supabase Dashboard → SQL Editor → New query →
--             paste this whole file → Run.
-- Safe to re-run (uses "if not exists" / "drop ... if exists").
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- profiles (1 row per auth user) ----------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text,
  phone      text,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- auto-create a profile whenever someone signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- products (public catalog) ----------
create table if not exists public.products (
  id          text primary key,
  slug        text unique not null,
  name        text not null,
  description text,
  price       numeric not null,
  category    text not null,
  colors      text[] default '{}',
  sizes       text[] default '{}',
  emoji       text,
  card_color  text,
  is_new      boolean default false,
  stock       int default 100,
  created_at  timestamptz default now()
);
alter table public.products enable row level security;

drop policy if exists "products_public_read" on public.products;
create policy "products_public_read" on public.products
  for select using (true);

-- ---------- addresses (per user) ----------
create table if not exists public.addresses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade,
  label      text,
  first_name text,
  last_name  text,
  street     text,
  region     text,
  district   text,
  city       text,
  zip        text,
  phone      text,
  is_default boolean default false,
  created_at timestamptz default now()
);
alter table public.addresses enable row level security;

drop policy if exists "addresses_owner_all" on public.addresses;
create policy "addresses_owner_all" on public.addresses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- orders (guest OR logged-in) ----------
create table if not exists public.orders (
  id              uuid primary key default gen_random_uuid(),
  order_number    text unique not null,
  user_id         uuid references auth.users(id) on delete set null,
  status          text not null default 'pending',
  first_name      text,
  last_name       text,
  email           text,
  phone           text,
  street          text,
  region          text,
  district        text,
  city            text,
  zip             text,
  notes           text,
  shipping_method text,
  gift_wrap       boolean default false,
  gift_message    text,
  locale          text default 'en',
  subtotal        numeric not null default 0,
  shipping        numeric not null default 0,
  total           numeric not null default 0,
  created_at      timestamptz default now()
);
alter table public.orders enable row level security;

-- guests and users may place an order
drop policy if exists "orders_insert_any" on public.orders;
create policy "orders_insert_any" on public.orders
  for insert with check (true);

-- a logged-in user can read their own orders
-- (guest order lookup by order_number is done server-side with the service role)
drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own" on public.orders
  for select using (auth.uid() = user_id);

-- ---------- order_items ----------
create table if not exists public.order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid references public.orders(id) on delete cascade,
  product_id   text,
  product_name text,
  price        numeric not null,
  quantity     int not null default 1,
  color        text,
  size         text
);
alter table public.order_items enable row level security;

drop policy if exists "order_items_insert_any" on public.order_items;
create policy "order_items_insert_any" on public.order_items
  for insert with check (true);

drop policy if exists "order_items_select_own" on public.order_items;
create policy "order_items_select_own" on public.order_items
  for select using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );
