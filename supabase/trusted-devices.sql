-- ============================================================
-- Trusted devices — "remember this browser" for the mandatory
-- email-OTP step after password sign-in (see AuthContext.tsx).
-- Supabase → SQL Editor → New query → paste → Run. Safe to re-run.
--
-- The browser only ever holds a random opaque token (cookie
-- `loov-trusted-device`); the real trust record lives here so it can
-- expire and be revoked. Own-row RLS — a device can only be trusted/
-- checked/revoked by the account it belongs to.
-- ============================================================

create table if not exists public.trusted_devices (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  token_hash    text not null,
  created_at    timestamptz default now(),
  expires_at    timestamptz not null,
  last_seen_at  timestamptz default now()
);

create index if not exists trusted_devices_user_id_idx on public.trusted_devices(user_id);
create unique index if not exists trusted_devices_token_hash_idx on public.trusted_devices(token_hash);

alter table public.trusted_devices enable row level security;

drop policy if exists "trusted_devices_select_own" on public.trusted_devices;
create policy "trusted_devices_select_own" on public.trusted_devices
  for select using (auth.uid() = user_id);

drop policy if exists "trusted_devices_insert_own" on public.trusted_devices;
create policy "trusted_devices_insert_own" on public.trusted_devices
  for insert with check (auth.uid() = user_id);

drop policy if exists "trusted_devices_delete_own" on public.trusted_devices;
create policy "trusted_devices_delete_own" on public.trusted_devices
  for delete using (auth.uid() = user_id);
