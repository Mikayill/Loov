-- ============================================================
-- Loov — admin panel schema (run AFTER schema.sql)
-- Supabase → SQL Editor → New query → paste → Run. Safe to re-run.
-- ============================================================

-- ---------- admins (who may access /admin) ----------
create table if not exists public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);
alter table public.admins enable row level security;
-- Readable by the admin themselves; writes are service-role only (no policy).
drop policy if exists "admins_select_self" on public.admins;
create policy "admins_select_self" on public.admins
  for select using (auth.uid() = user_id);

-- Handy boolean helper (used by RLS policies below).
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;

-- ---------- audit_log (who changed what) ----------
create table if not exists public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  actor_email text,
  action      text not null,          -- e.g. product.update, order.status
  entity      text,                   -- product | order | image
  entity_id   text,
  detail      jsonb,
  created_at  timestamptz default now()
);
alter table public.audit_log enable row level security;
drop policy if exists "audit_admin_read" on public.audit_log;
create policy "audit_admin_read" on public.audit_log
  for select using (public.is_admin());
-- Inserts are service-role only (from the admin API).

-- ---------- product images ----------
alter table public.products add column if not exists image_url text;

-- Let admins manage the catalog directly through RLS too (service role already
-- bypasses this; this makes future admin-token writes possible and is harmless).
drop policy if exists "products_admin_write" on public.products;
create policy "products_admin_write" on public.products
  for all using (public.is_admin()) with check (public.is_admin());

-- Admins can read every order (customers still only see their own).
drop policy if exists "orders_admin_read" on public.orders;
create policy "orders_admin_read" on public.orders
  for select using (public.is_admin());
drop policy if exists "orders_admin_update" on public.orders;
create policy "orders_admin_update" on public.orders
  for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "order_items_admin_read" on public.order_items;
create policy "order_items_admin_read" on public.order_items
  for select using (public.is_admin());

-- ---------- product-images storage bucket (public read) ----------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "product_images_public_read" on storage.objects;
create policy "product_images_public_read" on storage.objects
  for select using (bucket_id = 'product-images');
-- Uploads/deletes happen server-side with the service role.

-- ---------- seed the first admin (the store owner) ----------
insert into public.admins (user_id)
select id from auth.users where email = 'mikayilismayilovgeo@gmail.com'
on conflict (user_id) do nothing;
