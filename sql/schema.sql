-- =====================================================================
-- Stories I Wore: database tables
-- Run this FIRST in Supabase: SQL Editor -> New query -> paste -> Run.
-- Matches the Data model section of the Technical Specification.
-- =====================================================================

-- 1. Categories (Dresses, Tops, ...)
create table if not exists public.categories (
  id          bigint generated always as identity primary key,
  name        text not null unique check (char_length(name) between 1 and 40),
  created_at  timestamptz not null default now()
);

-- 2. Products: one row per clothing item
create table if not exists public.products (
  id            bigint generated always as identity primary key,
  category_id   bigint not null references public.categories (id),
  title         text not null check (char_length(title) between 1 and 120),
  size          text not null check (char_length(size) between 1 and 30),
  measurements  text check (char_length(measurements) <= 200),
  condition     text not null check (condition in ('New with tags', 'Like new', 'Good', 'Fair')),
  price         numeric(8, 2) not null check (price > 0),
  description   text check (char_length(description) <= 2000),
  origin        text check (char_length(origin) <= 120),   -- optional "Where it's from" line
  status        text not null default 'available'
                check (status in ('available', 'reserved', 'sold')),
  created_at    timestamptz not null default now()
);

-- 3. Product photos: 1 to 6 per item; sort_order 1 = main photo
create table if not exists public.product_photos (
  id          bigint generated always as identity primary key,
  product_id  bigint not null references public.products (id) on delete cascade,
  photo_url   text not null,
  sort_order  int not null default 1 check (sort_order between 1 and 100),
  created_at  timestamptz not null default now()
);

-- 4. Orders (used by checkout in Iteration II; created now so the design is complete)
create table if not exists public.orders (
  id                  uuid primary key,              -- made in the browser with crypto.randomUUID()
  customer_name       text not null check (char_length(customer_name) between 1 and 100),
  email               text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  phone               text not null check (char_length(phone) between 7 and 30),
  pickup_or_delivery  text not null check (pickup_or_delivery in ('pickup', 'delivery')),
  address             text check (char_length(address) <= 300),
  note                text check (char_length(note) <= 500),
  status              text not null default 'new'
                      check (status in ('new', 'confirmed', 'completed', 'cancelled')),
  created_at          timestamptz not null default now()
);

-- 5. Order items: which products are in each order
create table if not exists public.order_items (
  id          bigint generated always as identity primary key,
  order_id    uuid not null references public.orders (id) on delete cascade,
  product_id  bigint not null references public.products (id) on delete restrict,
  price       numeric(8, 2) not null,               -- copied from products by the trigger below
  created_at  timestamptz not null default now()
);

-- Security: never trust a price sent from the browser.
-- This trigger copies the real price from products into every new order line.
create or replace function public.set_order_item_price()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select p.price into new.price from public.products p where p.id = new.product_id;
  return new;
end;
$$;

drop trigger if exists order_items_set_price on public.order_items;
create trigger order_items_set_price
  before insert on public.order_items
  for each row execute function public.set_order_item_price();

-- Starting categories (edit the names if you like)
insert into public.categories (name) values
  ('Dresses'), ('Tops'), ('Bottoms'), ('Outerwear'), ('Accessories')
on conflict (name) do nothing;
