-- ============================================================
-- Cross-device cart & wishlist for signed-in users.
-- Supabase → SQL Editor → New query → paste → Run. Safe to re-run.
--
-- One row per user holding the whole cart/wishlist as jsonb (the same shape
-- the client already keeps in localStorage). Guests keep using localStorage;
-- signed-in users read/write these so their cart follows the account across
-- devices. Own-row RLS — a user only ever touches their own row. If this
-- migration isn't run, the client silently falls back to localStorage.
-- ============================================================

create table if not exists public.user_carts (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  items      jsonb not null default '[]'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists public.user_wishlists (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  items      jsonb not null default '[]'::jsonb,
  updated_at timestamptz default now()
);

alter table public.user_carts     enable row level security;
alter table public.user_wishlists enable row level security;

-- Own-row full CRUD for each table.
do $$
declare
  tbl text;
begin
  foreach tbl in array array['user_carts', 'user_wishlists'] loop
    execute format('drop policy if exists "%1$s_select_own" on public.%1$s', tbl);
    execute format('create policy "%1$s_select_own" on public.%1$s for select using (auth.uid() = user_id)', tbl);
    execute format('drop policy if exists "%1$s_insert_own" on public.%1$s', tbl);
    execute format('create policy "%1$s_insert_own" on public.%1$s for insert with check (auth.uid() = user_id)', tbl);
    execute format('drop policy if exists "%1$s_update_own" on public.%1$s', tbl);
    execute format('create policy "%1$s_update_own" on public.%1$s for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', tbl);
    execute format('drop policy if exists "%1$s_delete_own" on public.%1$s', tbl);
    execute format('create policy "%1$s_delete_own" on public.%1$s for delete using (auth.uid() = user_id)', tbl);
  end loop;
end $$;
