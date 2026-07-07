-- ============================================================
-- Loov — atomic stock reservation (run AFTER schema.sql)
-- Supabase → SQL Editor → New query → paste → Run. Safe to re-run.
--
-- Solves the oversell race: if two shoppers buy the last unit at the same
-- moment, the per-row conditional UPDATE (stock >= qty) lets exactly ONE
-- succeed; the other's row isn't updated → we raise → their order is rejected.
-- Runs as one transaction, so a multi-item order is all-or-nothing.
--
-- NULL stock = "untracked / unlimited" (never blocks) — for products where
-- you don't want to manage a count.
-- ============================================================

create or replace function public.reserve_stock(p_items jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item    jsonb;
  v_id    text;
  v_qty   int;
  v_rows  int;
begin
  for item in select * from jsonb_array_elements(p_items) loop
    v_id  := item->>'id';
    v_qty := (item->>'qty')::int;
    if v_qty is null or v_qty <= 0 then
      raise exception 'BAD_QTY:%', v_id;
    end if;

    update public.products
       set stock = case when stock is null then null else stock - v_qty end
     where id = v_id
       and (stock is null or stock >= v_qty);

    get diagnostics v_rows = row_count;
    if v_rows = 0 then
      -- Either the product vanished or there isn't enough stock.
      raise exception 'INSUFFICIENT_STOCK:%', v_id;
    end if;
  end loop;
end;
$$;

-- Compensation: give stock back if the order fails to save after reserving.
create or replace function public.release_stock(p_items jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
begin
  for item in select * from jsonb_array_elements(p_items) loop
    update public.products
       set stock = case when stock is null then null else stock + (item->>'qty')::int end
     where id = item->>'id';
  end loop;
end;
$$;

-- Only the server (service role) may adjust stock — NEVER the browser.
-- Exposing these to anon/authenticated would let a user inflate stock
-- (release_stock) or drain a rival product's stock without ordering
-- (reserve_stock). The order API calls them with the service-role key.
revoke all on function public.reserve_stock(jsonb) from public, anon, authenticated;
revoke all on function public.release_stock(jsonb) from public, anon, authenticated;
