-- ============================================================
-- Promo codes — admin-managed (run AFTER schema.sql + admin.sql)
-- Supabase → SQL Editor → New query → paste → Run.
-- Safe to re-run.
-- ============================================================

create table if not exists public.promo_codes (
  id           uuid primary key default gen_random_uuid(),
  code         text unique not null,                 -- stored UPPERCASE
  type         text not null check (type in ('percent','shipping')),
  value        numeric not null default 0 check (value >= 0 and value <= 90),
  expires_at   timestamptz,                          -- null = never expires
  usage_limit  int check (usage_limit is null or usage_limit > 0), -- null = unlimited (total)
  times_used   int not null default 0,
  active       boolean not null default true,
  created_at   timestamptz default now()
);

alter table public.promo_codes enable row level security;

-- NO public read: customers must not be able to enumerate valid codes.
-- Validation happens server-side (service role bypasses RLS).
-- Admins can read the list in the panel:
drop policy if exists "promos_select_admin" on public.promo_codes;
create policy "promos_select_admin" on public.promo_codes
  for select using (public.is_admin());

-- Writes are service-role only (no insert/update/delete policy on purpose).

-- Seed: the code promised on the site ("10% off your first order").
insert into public.promo_codes (code, type, value)
  values ('LOOV10', 'percent', 10)
  on conflict (code) do nothing;
