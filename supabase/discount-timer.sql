-- Timed discounts: a discount with an end date stops applying (and stops
-- showing) once the date passes. NULL = untimed discount, current behavior.
-- Run once in the Supabase SQL editor.
alter table public.products
  add column if not exists discount_ends_at timestamptz;

comment on column public.products.discount_ends_at is
  'When the current discount_percent expires. NULL = no time limit.';
