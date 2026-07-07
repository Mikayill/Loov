-- ============================================================
-- Loov — FAZ 10: admin unread badges + review replies
-- Supabase → SQL Editor → New query → paste → Run. Safe to re-run.
-- ============================================================

-- ---------- admins: per-section "last seen" timestamps ----------
-- Drives the unread-count badges in the admin sidebar (Orders/Returns/Reviews).
-- Null = never visited that section -> everything counts as unread.
alter table public.admins add column if not exists last_seen_orders_at timestamptz;
alter table public.admins add column if not exists last_seen_returns_at timestamptz;
alter table public.admins add column if not exists last_seen_reviews_at timestamptz;

-- Admin can update their own last-seen timestamps (read already covered by
-- "admins_select_self" in admin.sql).
drop policy if exists "admins_update_self" on public.admins;
create policy "admins_update_self" on public.admins
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- reviews: admin reply ----------
alter table public.reviews add column if not exists admin_reply text;
alter table public.reviews add column if not exists admin_reply_at timestamptz;
