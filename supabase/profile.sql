-- ============================================================
-- Loov — FAZ 7: profile expansion
--   · baby info (name / birthdate / gender) → homepage personalization
--   · preferred language, preset avatar, notification preferences
--   · "avatars" storage bucket for ADMIN-uploaded preset avatars
-- HOW TO RUN: Supabase Dashboard → SQL Editor → paste → Run.
-- Safe to re-run. Run AFTER schema.sql + features.sql.
-- ============================================================

-- profiles already has: id, name, phone, created_at (schema.sql)
alter table public.profiles add column if not exists baby_name          text;
alter table public.profiles add column if not exists baby_birthdate     date;
alter table public.profiles add column if not exists baby_gender        text;
alter table public.profiles add column if not exists language           text;
alter table public.profiles add column if not exists avatar_url         text;
alter table public.profiles add column if not exists notification_prefs jsonb default '{}'::jsonb;

alter table public.profiles drop constraint if exists profiles_baby_gender_check;
alter table public.profiles add constraint profiles_baby_gender_check
  check (baby_gender is null or baby_gender in ('boy', 'girl', 'na'));

alter table public.profiles drop constraint if exists profiles_language_check;
alter table public.profiles add constraint profiles_language_check
  check (language is null or language in ('en', 'ka', 'ru', 'tr'));

-- RLS: the own-row policies from schema.sql already cover the new columns —
-- customers read/write their own profile straight from the browser client.

-- ---------- avatars bucket (preset avatars, uploaded by the ADMIN only) ----------
-- Public read; NO public write policy — uploads go through the service role
-- via /api/admin/upload (kind=avatar). Customers only PICK one of these.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

-- ---------- preset avatar URL list (read by the account page picker) ----------
-- settings table exists after features.sql; guard anyway so this file
-- can run standalone.
create table if not exists public.settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz default now()
);
insert into public.settings (key, value)
values ('avatar_presets', '[]'::jsonb)
on conflict (key) do nothing;
