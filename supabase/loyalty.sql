-- ============================================================
-- Loov Rewards — loyalty program (run AFTER schema.sql)
-- Supabase → SQL Editor → New query → paste → Run.
-- Safe to re-run.
-- ============================================================

-- Orders remember how many points were redeemed and the discount applied.
alter table public.orders add column if not exists points_redeemed int     not null default 0;
alter table public.orders add column if not exists points_discount numeric not null default 0;

-- ---------- loyalty_transactions (append-only points ledger) ----------
-- Balance is always derived: sum(delta). Positive = earned, negative = spent.
-- Used once Supabase Auth is live; until then the wallet lives client-side.
create table if not exists public.loyalty_transactions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  order_id     uuid references public.orders(id) on delete set null,
  delta        int not null,
  reason       text not null default 'order',  -- order | redeem | bonus
  created_at   timestamptz default now()
);
alter table public.loyalty_transactions enable row level security;

-- Users can read their own points history.
drop policy if exists "loyalty_select_own" on public.loyalty_transactions;
create policy "loyalty_select_own" on public.loyalty_transactions
  for select using (auth.uid() = user_id);

-- Writes happen ONLY server-side (service role bypasses RLS) so nobody can
-- gift themselves points — no insert/update/delete policy on purpose.
