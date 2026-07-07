-- ═══════════════════════════════════════════════════════════════
-- Returns — FAZ 6: real return/refund flow (14-day withdrawal right,
-- Georgian Law on the Protection of Consumer Rights 2022).
-- Run in the Supabase SQL Editor AFTER schema.sql + admin.sql.
-- Safe to run more than once (idempotent).
-- ═══════════════════════════════════════════════════════════════

-- The 14-day return window counts from the delivery date. Stamped by the
-- admin API when an order is marked "delivered" (falls back to created_at
-- for orders delivered before this column existed).
alter table public.orders add column if not exists delivered_at timestamptz;

create table if not exists public.returns (
  id             uuid primary key default gen_random_uuid(),
  return_number  text unique not null,               -- RTN-XXXXXXX (customer-facing)
  order_id       uuid not null references public.orders(id) on delete cascade,
  order_number   text not null,
  user_id        uuid references auth.users(id) on delete set null,
  email          text not null,
  locale         text default 'en',
  -- requested → approved → received → refunded | rejected (any pre-refund stage)
  -- cancelled = customer withdrew the request while it was still "requested".
  status         text not null default 'requested',
  -- [{"product_id":"…","product_name":"…","quantity":1,"price":24,"color":"Sage","size":"0-3 Months"}]
  items          jsonb not null default '[]',
  reason         text not null,                      -- wrong_size|damaged|not_as_described|wrong_item|changed_mind|other
  description    text,
  photos         text[] default '{}',
  iban           text not null,                      -- refund goes out by bank transfer
  refund_amount  numeric not null default 0,         -- computed SERVER-SIDE, never trusted from the client
  admin_note     text,                               -- rejection reason / internal note
  created_at     timestamptz default now(),
  updated_at     timestamptz default now(),
  resolved_at    timestamptz
);

-- One ACTIVE return per order; a new request may be opened after a
-- rejection or cancellation.
create unique index if not exists returns_one_active_per_order
  on public.returns(order_id)
  where status in ('requested','approved','received');

create index if not exists returns_user_idx on public.returns(user_id);

alter table public.returns enable row level security;

-- Customers read their own returns; admins read everything.
-- ALL writes go through the server API (service role) — no public write path.
drop policy if exists "returns_select_own" on public.returns;
create policy "returns_select_own" on public.returns
  for select using (auth.uid() = user_id);

drop policy if exists "returns_admin_read" on public.returns;
create policy "returns_admin_read" on public.returns
  for select using (public.is_admin());

-- ── return-photos bucket (public read; paths contain unguessable UUIDs) ──
insert into storage.buckets (id, name, public)
values ('return-photos', 'return-photos', true)
on conflict (id) do nothing;

drop policy if exists "return_photos_public_read" on storage.objects;
create policy "return_photos_public_read" on storage.objects
  for select using (bucket_id = 'return-photos');
-- Uploads happen server-side with the service role (auth-gated API).
