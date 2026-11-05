-- =====================================================================
-- Stories I Wore: security rules (Row Level Security)
-- Run this SECOND, after schema.sql.
-- "anon" = any visitor using the publishable key.
-- "authenticated" = the signed-in admin (public sign-ups are turned off,
-- so the admin is the only account that can ever be signed in).
-- =====================================================================

-- Turn on RLS for every table. With RLS on and no matching policy,
-- the database refuses the request.
alter table public.categories     enable row level security;
alter table public.products       enable row level security;
alter table public.product_photos enable row level security;
alter table public.orders         enable row level security;
alter table public.order_items    enable row level security;

-- Table permissions (RLS policies below then narrow these down row by row)
grant usage on schema public to anon, authenticated;
grant select on public.categories, public.products, public.product_photos to anon;
grant insert on public.orders, public.order_items to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- ---------- categories ----------
drop policy if exists "Public reads categories" on public.categories;
create policy "Public reads categories" on public.categories
  for select to anon using (true);

drop policy if exists "Admin manages categories" on public.categories;
create policy "Admin manages categories" on public.categories
  for all to authenticated using (true) with check (true);

-- ---------- products ----------
-- Customers can see items for sale, never sold ones
drop policy if exists "Public reads items for sale" on public.products;
create policy "Public reads items for sale" on public.products
  for select to anon using (status in ('available', 'reserved'));

drop policy if exists "Admin manages products" on public.products;
create policy "Admin manages products" on public.products
  for all to authenticated using (true) with check (true);

-- ---------- product_photos ----------
drop policy if exists "Public reads photos" on public.product_photos;
create policy "Public reads photos" on public.product_photos
  for select to anon using (true);

drop policy if exists "Admin manages photos" on public.product_photos;
create policy "Admin manages photos" on public.product_photos
  for all to authenticated using (true) with check (true);

-- ---------- orders ----------
-- Customers can place an order but never read orders back
drop policy if exists "Public creates new orders" on public.orders;
create policy "Public creates new orders" on public.orders
  for insert to anon with check (status = 'new');

drop policy if exists "Admin manages orders" on public.orders;
create policy "Admin manages orders" on public.orders
  for all to authenticated using (true) with check (true);

-- ---------- order_items ----------
-- An order line can only point at an item that is still available
drop policy if exists "Public adds lines for available items" on public.order_items;
create policy "Public adds lines for available items" on public.order_items
  for insert to anon
  with check (exists (
    select 1 from public.products p
    where p.id = product_id and p.status = 'available'));

drop policy if exists "Admin manages order lines" on public.order_items;
create policy "Admin manages order lines" on public.order_items
  for all to authenticated using (true) with check (true);

-- =====================================================================
-- Photo storage: a public bucket (anyone can VIEW photos),
-- 5 MB limit, JPEG / PNG / WebP only, and only the admin can change files.
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-photos', 'product-photos', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- (Deleting a file needs both SELECT and DELETE permission on it.)
drop policy if exists "Admin reads photo files" on storage.objects;
create policy "Admin reads photo files" on storage.objects
  for select to authenticated using (bucket_id = 'product-photos');

drop policy if exists "Admin uploads photos" on storage.objects;
create policy "Admin uploads photos" on storage.objects
  for insert to authenticated with check (bucket_id = 'product-photos');

drop policy if exists "Admin updates photos" on storage.objects;
create policy "Admin updates photos" on storage.objects
  for update to authenticated using (bucket_id = 'product-photos');

drop policy if exists "Admin deletes photos" on storage.objects;
create policy "Admin deletes photos" on storage.objects
  for delete to authenticated using (bucket_id = 'product-photos');
