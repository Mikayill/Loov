-- Product video (Temu-style): one optional video per product, played inside
-- the PDP gallery behind a poster frame the admin picks from the photo
-- gallery. Run once in the Supabase SQL editor.
alter table public.products
  add column if not exists video_url text;

alter table public.products
  add column if not exists video_poster_url text;

comment on column public.products.video_url is
  'Public URL of the product video in the product-images bucket (videos/{id}/...). NULL = no video.';
comment on column public.products.video_poster_url is
  'Gallery photo shown as the video poster/cover. NULL = first gallery photo.';

-- Refresh PostgREST's schema cache so the API sees the new columns immediately.
notify pgrst, 'reload schema';
