-- ============================================================
-- Loov — guest order tracking (run AFTER schema.sql)
-- Supabase → SQL Editor → New query → paste → Run. Safe to re-run.
--
-- WHY A FUNCTION? RLS (correctly) blocks anonymous SELECTs on orders.
-- This SECURITY DEFINER function is a controlled window through that
-- wall: it only answers when BOTH the order number AND the email match,
-- and it only returns non-sensitive fields (no address, no phone).
-- ============================================================

create or replace function public.track_order(p_order_number text, p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'order_number',    o.order_number,
    'status',          o.status,
    'created_at',      o.created_at,
    'shipping_method', o.shipping_method,
    'city',            o.city,
    'total',           o.total,
    'items', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'product_id',   i.product_id,
        'product_name', i.product_name,
        'price',        i.price,
        'quantity',     i.quantity,
        'color',        i.color,
        'size',         i.size
      )), '[]'::jsonb)
      from public.order_items i
      where i.order_id = o.id
    )
  )
  into result
  from public.orders o
  where upper(o.order_number) = upper(trim(p_order_number))
    and lower(o.email)        = lower(trim(p_email))
  limit 1;

  return result;  -- null when no match (number+email pair wrong)
end;
$$;

revoke all on function public.track_order(text, text) from public;
grant execute on function public.track_order(text, text) to anon, authenticated;
