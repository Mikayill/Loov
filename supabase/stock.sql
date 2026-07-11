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
--
-- FAZ 9 — per-variant aware: if an item carries color+size AND that exact
-- (size, color) has an explicit admin-set count in products.stock_by_variant
-- (see supabase/variant-stock.sql), that count is what's reserved/released.
-- A (size, color) pair NOT yet in stock_by_variant falls back to the flat
-- `stock` column — today's behavior, so nothing breaks until the admin fills
-- in real per-variant numbers.
-- ============================================================

create or replace function public.reserve_stock(p_items jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item     jsonb;
  v_id     text;
  v_qty    int;
  v_color  text;
  v_size   text;
  v_rows   int;
begin
  for item in select * from jsonb_array_elements(p_items) loop
    v_id    := item->>'id';
    v_qty   := (item->>'qty')::int;
    v_color := item->>'color';
    v_size  := item->>'size';
    if v_qty is null or v_qty <= 0 then
      raise exception 'BAD_QTY:%', v_id;
    end if;

    v_rows := 0;

    if v_color is not null and v_size is not null then
      update public.products
         set stock_by_variant = jsonb_set(
               stock_by_variant, array[v_size, v_color],
               to_jsonb((stock_by_variant->v_size->>v_color)::int - v_qty)
             )
       where id = v_id
         and stock_by_variant ? v_size
         and (stock_by_variant->v_size) ? v_color
         and (stock_by_variant->v_size->>v_color)::int >= v_qty;
      get diagnostics v_rows = row_count;

      if v_rows = 0 and exists (
        select 1 from public.products
         where id = v_id and stock_by_variant ? v_size and (stock_by_variant->v_size) ? v_color
      ) then
        -- A variant entry exists for this exact (size, color) but doesn't
        -- have enough stock — reject now, do NOT fall through to flat stock.
        raise exception 'INSUFFICIENT_STOCK:%:%:%', v_id, v_size, v_color;
      end if;
    end if;

    if v_rows > 0 then
      continue; -- variant path succeeded — don't also touch flat stock
    end if;

    -- Flat/legacy path: no per-variant entry for this (size, color) yet.
    update public.products
       set stock = case when stock is null then null else stock - v_qty end
     where id = v_id
       and (stock is null or stock >= v_qty);

    get diagnostics v_rows = row_count;
    if v_rows = 0 then
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
  item    jsonb;
  v_id    text;
  v_qty   int;
  v_color text;
  v_size  text;
  v_rows  int;
begin
  for item in select * from jsonb_array_elements(p_items) loop
    v_id    := item->>'id';
    v_qty   := (item->>'qty')::int;
    v_color := item->>'color';
    v_size  := item->>'size';

    v_rows := 0;
    if v_color is not null and v_size is not null then
      update public.products
         set stock_by_variant = jsonb_set(
               stock_by_variant, array[v_size, v_color],
               to_jsonb(coalesce((stock_by_variant->v_size->>v_color)::int, 0) + v_qty)
             )
       where id = v_id
         and stock_by_variant ? v_size
         and (stock_by_variant->v_size) ? v_color;
      get diagnostics v_rows = row_count;
    end if;

    if v_rows > 0 then
      continue;
    end if;

    update public.products
       set stock = case when stock is null then null else stock + v_qty end
     where id = v_id;
  end loop;
end;
$$;

-- Only the server (service role) may adjust stock — NEVER the browser.
-- Exposing these to anon/authenticated would let a user inflate stock
-- (release_stock) or drain a rival product's stock without ordering
-- (reserve_stock). The order API calls them with the service-role key.
revoke all on function public.reserve_stock(jsonb) from public, anon, authenticated;
revoke all on function public.release_stock(jsonb) from public, anon, authenticated;
