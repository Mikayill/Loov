-- ─────────────────────────────────────────────────────────────────────────────
-- Atomic points redemption (12 Jul 2026).
--
-- WHY: /api/orders used to check the balance, then write the "redeem" ledger
-- row a few hundred ms later — two simultaneous checkouts from the same
-- account could both pass the check and spend the same points twice.
-- This function locks the user's ledger, re-checks and claims in ONE
-- transaction, so double-spending is impossible.
--
-- The code falls back to the old check-then-write behaviour until this file
-- is run (race stays theoretical at current scale) — nothing breaks.
--
-- SECURITY: service-role only (EXECUTE revoked from anon/authenticated).
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.claim_redeem_points(p_user uuid, p_points int)
returns uuid  -- ledger row id, or NULL when the balance is insufficient
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance int;
  v_id uuid;
begin
  if p_points <= 0 then
    return null;
  end if;
  -- Serialize redemptions per user for the duration of this transaction.
  perform pg_advisory_xact_lock(hashtext('loov-loyalty-' || p_user::text));
  select coalesce(sum(delta), 0) into v_balance
    from loyalty_transactions where user_id = p_user;
  if v_balance < p_points then
    return null;
  end if;
  -- order_id is attached by the API right after the order row is created
  -- (the column is nullable + ON DELETE SET NULL, so this is safe).
  insert into loyalty_transactions (user_id, order_id, delta, reason)
  values (p_user, null, -p_points, 'redeem')
  returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function public.claim_redeem_points(uuid, int) from public, anon, authenticated;
