-- ============================================================
-- Saved addresses (account address book + checkout selection)
-- Supabase → SQL Editor → New query → paste → Run.
-- Safe to re-run.
-- ============================================================

create table if not exists public.addresses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  label       text not null default 'Home' check (label in ('Home','Work','Other')),
  first_name  text not null,
  last_name   text not null default '',
  street      text not null,
  region      text not null default '',
  district    text not null default '',
  city        text not null default '',
  zip         text not null default '',
  phone       text not null default '',
  is_default  boolean not null default false,
  created_at  timestamptz default now()
);

-- One default address per user (partial unique index).
create unique index if not exists addresses_one_default_per_user
  on public.addresses(user_id)
  where is_default;

alter table public.addresses enable row level security;

-- Own-row CRUD — customers manage only their own address book.
drop policy if exists "addresses_select_own" on public.addresses;
create policy "addresses_select_own" on public.addresses
  for select using (auth.uid() = user_id);

drop policy if exists "addresses_insert_own" on public.addresses;
create policy "addresses_insert_own" on public.addresses
  for insert with check (auth.uid() = user_id);

drop policy if exists "addresses_update_own" on public.addresses;
create policy "addresses_update_own" on public.addresses
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "addresses_delete_own" on public.addresses;
create policy "addresses_delete_own" on public.addresses
  for delete using (auth.uid() = user_id);
