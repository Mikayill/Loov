-- ============================================================
-- Back-in-stock waitlist ("notify me when it's available").
-- Supabase → SQL Editor → New query → paste → Run. Safe to re-run.
--
-- A shopper on an out-of-stock product leaves their email; when the admin
-- restocks it, the order/admin API emails everyone waiting and marks the row
-- notified. Writes go through the server (service role) only — no public
-- policies — so it can't be spammed directly. If this migration isn't run,
-- the "notify me" box on the product page fails gracefully.
-- ============================================================

create table if not exists public.stock_notifications (
  id          uuid primary key default gen_random_uuid(),
  product_id  text not null,
  email       text not null,
  locale      text not null default 'en',
  created_at  timestamptz default now(),
  notified_at timestamptz
);

-- One live (un-notified) request per product+email.
create unique index if not exists stock_notifications_pending_uniq
  on public.stock_notifications(product_id, lower(email))
  where notified_at is null;

create index if not exists stock_notifications_product_idx
  on public.stock_notifications(product_id) where notified_at is null;

alter table public.stock_notifications enable row level security;
-- No policies on purpose: only the service-role server can read/write.
