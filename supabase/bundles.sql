-- ═══════════════════════════════════════════════════════════════
-- Bundles — FAZ 4: sets move from static code into the DB so the
-- admin panel can edit everything (name, description, "Why This
-- Bundle?" bullets, items, prices).
-- Run in the Supabase SQL Editor. Safe to run more than once.
-- ═══════════════════════════════════════════════════════════════

-- Photo support (added after the first version — safe on re-run):
-- run this file again if you created the table before this line existed.

create table if not exists public.bundles (
  slug           text primary key,
  name           text not null,
  subtitle       text,
  tagline        text,
  emoji          text default '🎁',
  card_color     text default '#EDE5D8',
  description    text,
  features       text[] default '{}',
  -- [{"slug":"organic-cotton-bodysuit","label":"Organic Cotton Bodysuit","quantity":2}]
  items          jsonb not null default '[]',
  original_price numeric not null default 0,
  bundle_price   numeric not null default 0,
  is_new         boolean default false,
  active         boolean default true,
  sort           int default 0,
  created_at     timestamptz default now()
);

alter table public.bundles add column if not exists image_url text;

alter table public.bundles enable row level security;

drop policy if exists "bundles_public_read" on public.bundles;
create policy "bundles_public_read" on public.bundles
  for select using (true);
-- Writes happen ONLY through the admin API (service role) — no public policy.

-- ── Seed: the 4 existing static bundles (idempotent — won't overwrite edits) ──
insert into public.bundles (slug, name, subtitle, tagline, emoji, card_color, description, features, items, original_price, bundle_price, is_new, sort)
values
  (
    'yeni-dogan-paketi', 'Yeni Doğan Paketi', 'Newborn Starter Bundle',
    'Everything your newborn needs from day one', '🌿', '#C8DDD8',
    'A carefully curated starter set for your newborn''s first weeks. Two ultra-soft organic bodysuits, a bamboo hooded towel for gentle bath times, and a cloud-print blanket for cozy naps — bundled together at a special price.',
    array['OEKO-TEX certified organic materials','Perfect first-time parent gift','Save 35₾ vs buying separately','Beautiful gift-ready packaging'],
    '[{"slug":"organic-cotton-bodysuit","label":"Organic Cotton Bodysuit","quantity":2},{"slug":"bamboo-hooded-towel","label":"Bamboo Hooded Towel"},{"slug":"cloud-print-blanket","label":"Cloud Print Blanket"}]'::jsonb,
    134, 99, true, 1
  ),
  (
    'bebek-cikis-seti', 'Bebek Çıkış Seti', 'Hospital Exit Bundle',
    'Make your first day home picture-perfect', '🏠', '#EDE5D8',
    'The ultimate coming-home bundle. The 5-piece hospital exit set has a matching outfit and hat, plus our soft bamboo towel and a muslin swaddle that you''ll reach for every single day.',
    array['Complete 5-piece coming-home outfit','Soft muslin swaddle included','Save 30₾ vs buying separately','Gift box packaging available'],
    '[{"slug":"hospital-exit-set","label":"Hospital Exit Set (5-piece)"},{"slug":"bamboo-hooded-towel","label":"Bamboo Hooded Towel"},{"slug":"muslin-swaddle-blanket","label":"Muslin Swaddle Blanket"}]'::jsonb,
    159, 129, false, 2
  ),
  (
    'komple-hediye-paketi', 'Komple Hediye Paketi', 'Complete Gift Bundle',
    'The ultimate baby shower gift — 4 best-loved items', '🎁', '#E8D8EC',
    'Four of our most-loved products bundled together for the ultimate baby shower gift. A matching bodysuit set, adorable bear ear romper, bamboo towel, and a tiny bunny backpack for when they''re on the go.',
    array['4 products, huge savings','Perfect baby shower gift','Save 37₾ vs buying separately','Includes free gift wrapping'],
    '[{"slug":"long-sleeve-bodysuit-set","label":"Long Sleeve Bodysuit Set"},{"slug":"bear-ear-romper","label":"Bear Ear Romper"},{"slug":"bamboo-hooded-towel","label":"Bamboo Hooded Towel"},{"slug":"mini-bunny-backpack","label":"Mini Bunny Backpack"}]'::jsonb,
    196, 159, false, 3
  ),
  (
    'uyku-seti', 'Rahat Uyku Seti', 'Sleep Comfort Bundle',
    'Safe, cozy sleep — every night', '🌙', '#D4C4E4',
    'Everything you need for safe, peaceful sleep. Our organic sleep sack keeps baby at the right temperature all night, paired with buttery-soft bamboo pyjamas and a breathable muslin swaddle.',
    array['TOG-rated safe sleep sack','Anti-pill bamboo pyjamas','Save 25₾ vs buying separately','Paediatrician-recommended materials'],
    '[{"slug":"organic-sleep-sack","label":"Organic Sleep Sack"},{"slug":"bamboo-pajama-set","label":"Bamboo Pajama Set"},{"slug":"muslin-swaddle-blanket","label":"Muslin Swaddle Blanket"}]'::jsonb,
    130, 105, true, 4
  )
on conflict (slug) do nothing;
