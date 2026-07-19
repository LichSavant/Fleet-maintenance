alter table public.vehicles
add column if not exists image_url text;

comment on column public.vehicles.image_url is
  'Optional public URL or local asset path for the vehicle image. When null, the frontend generates a stable assignment-based illustration.';
