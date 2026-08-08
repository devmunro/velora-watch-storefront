create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  new.version = old.version + 1;
  return new;
end;
$$;

create table public.site_settings (
  id uuid primary key default extensions.gen_random_uuid(),
  singleton_key text not null default 'primary' unique check (singleton_key = 'primary'),
  brand_name text not null default 'Velora',
  announcement text not null,
  free_shipping_threshold integer not null default 10000 check (free_shipping_threshold >= 0),
  contact_email text,
  default_seo_title text not null,
  default_seo_description text not null,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.hero_slides (
  id uuid primary key default extensions.gen_random_uuid(),
  eyebrow text not null,
  title text not null,
  accent text not null,
  body text not null,
  primary_label text not null,
  primary_href text not null check (primary_href like '/%'),
  secondary_label text,
  secondary_href text check (secondary_href is null or secondary_href like '/%'),
  media_path text not null,
  media_alt text not null,
  position smallint not null default 0 check (position >= 0),
  status text not null default 'draft' check (status in ('draft', 'published')),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.benefits (
  id uuid primary key default extensions.gen_random_uuid(),
  icon text not null check (icon in ('shield', 'delivery', 'returns', 'quality')),
  title text not null,
  body text not null,
  position smallint not null default 0 check (position >= 0),
  status text not null default 'draft' check (status in ('draft', 'published')),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.collections (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null,
  eyebrow text not null,
  description text not null,
  image_path text not null,
  image_alt text not null,
  position smallint not null default 0 check (position >= 0),
  status text not null default 'draft' check (status in ('draft', 'published')),
  seo_title text,
  seo_description text,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default extensions.gen_random_uuid(),
  collection_id uuid references public.collections(id) on delete set null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null,
  short_description text not null,
  description text not null,
  specifications jsonb not null default '{}'::jsonb check (jsonb_typeof(specifications) = 'object'),
  primary_image_path text not null,
  primary_image_alt text not null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  featured boolean not null default false,
  position smallint not null default 0 check (position >= 0),
  seo_title text,
  seo_description text,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_variants (
  id uuid primary key default extensions.gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text not null unique check (sku ~ '^[A-Z0-9-]+$'),
  name text not null,
  finish text not null,
  strap text not null,
  price_amount integer not null check (price_amount > 0),
  currency text not null default 'gbp' check (currency = 'gbp'),
  stripe_price_id text unique,
  active boolean not null default true,
  position smallint not null default 0 check (position >= 0),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_media (
  id uuid primary key default extensions.gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete cascade,
  storage_path text not null,
  alt_text text not null check (length(trim(alt_text)) > 0),
  position smallint not null default 0 check (position >= 0),
  status text not null default 'draft' check (status in ('draft', 'published')),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, storage_path)
);

create table public.journal_posts (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null,
  excerpt text not null,
  body text not null,
  image_path text not null,
  image_alt text not null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  seo_title text,
  seo_description text,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status = 'draft' or published_at is not null)
);

create table public.policy_pages (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null,
  body text not null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  phone text,
  stripe_customer_id text unique,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.addresses (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Home',
  recipient_name text not null,
  line_1 text not null,
  line_2 text,
  city text not null,
  county text,
  postcode text not null,
  country_code text not null default 'GB' check (country_code ~ '^[A-Z]{2}$'),
  is_default boolean not null default false,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  stripe_checkout_session_id text not null unique,
  stripe_payment_intent_id text unique,
  status text not null default 'paid' check (status in ('paid', 'processing', 'shipped', 'cancelled', 'refunded')),
  currency text not null default 'gbp' check (currency = 'gbp'),
  subtotal_amount integer not null check (subtotal_amount >= 0),
  discount_amount integer not null default 0 check (discount_amount >= 0),
  shipping_amount integer not null default 0 check (shipping_amount >= 0),
  tax_amount integer not null default 0 check (tax_amount >= 0),
  total_amount integer not null check (total_amount >= 0),
  customer_email text not null,
  shipping_address jsonb not null default '{}'::jsonb check (jsonb_typeof(shipping_address) = 'object'),
  receipt_url text,
  tracking_number text,
  tracking_url text,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default extensions.gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  product_name text not null,
  variant_name text not null,
  sku text not null,
  unit_amount integer not null check (unit_amount > 0),
  quantity smallint not null check (quantity between 1 and 5),
  line_total integer generated always as (unit_amount * quantity) stored,
  created_at timestamptz not null default now()
);

create table private.staff_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'editor', 'fulfilment')),
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0)
);

create table private.inventory (
  variant_id uuid primary key references public.product_variants(id) on delete cascade,
  on_hand integer not null default 0 check (on_hand >= 0),
  reserved integer not null default 0 check (reserved >= 0),
  low_stock_threshold integer not null default 3 check (low_stock_threshold >= 0),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0),
  check (reserved <= on_hand)
);

create table private.inventory_reservations (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_checkout_session_id text unique,
  status text not null default 'pending' check (status in ('pending', 'completed', 'released', 'expired')),
  expires_at timestamptz not null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0),
  check ((status = 'completed' and completed_at is not null) or status <> 'completed')
);

create table private.reservation_items (
  id uuid primary key default extensions.gen_random_uuid(),
  reservation_id uuid not null references private.inventory_reservations(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  product_name text not null,
  variant_name text not null,
  sku text not null,
  unit_amount integer not null check (unit_amount > 0),
  quantity smallint not null check (quantity between 1 and 5),
  unique (reservation_id, variant_id)
);

create table private.inventory_movements (
  id bigint generated always as identity primary key,
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  reservation_id uuid references private.inventory_reservations(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  reason text not null check (reason in ('initial', 'adjustment', 'reservation', 'release', 'sale', 'cancellation', 'restock')),
  delta_on_hand integer not null default 0,
  delta_reserved integer not null default 0,
  note text,
  created_at timestamptz not null default now(),
  check (delta_on_hand <> 0 or delta_reserved <> 0)
);

create table private.stripe_events (
  stripe_event_id text primary key,
  event_type text not null,
  stripe_checkout_session_id text,
  processed_at timestamptz not null default now()
);

create table private.audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_role text check (actor_role in ('owner', 'editor', 'fulfilment', 'system')),
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index products_collection_status_idx on public.products (collection_id, status, position);
create index product_variants_product_active_idx on public.product_variants (product_id, active, position);
create index product_media_product_status_idx on public.product_media (product_id, status, position);
create index journal_posts_status_published_idx on public.journal_posts (status, published_at desc);
create index addresses_user_id_idx on public.addresses (user_id);
create unique index addresses_one_default_idx on public.addresses (user_id) where is_default;
create index orders_user_created_idx on public.orders (user_id, created_at desc);
create index order_items_order_id_idx on public.order_items (order_id);
create index staff_members_role_active_idx on private.staff_members (role, active);
create index reservations_user_status_idx on private.inventory_reservations (user_id, status, created_at desc);
create index reservations_expiry_idx on private.inventory_reservations (status, expires_at) where status = 'pending';
create index reservation_items_reservation_idx on private.reservation_items (reservation_id);
create index reservation_items_variant_idx on private.reservation_items (variant_id);
create index movements_variant_created_idx on private.inventory_movements (variant_id, created_at desc);
create index movements_reservation_idx on private.inventory_movements (reservation_id) where reservation_id is not null;
create index movements_order_idx on private.inventory_movements (order_id) where order_id is not null;
create index audit_actor_created_idx on private.audit_logs (actor_user_id, created_at desc);
create index stripe_events_session_idx on private.stripe_events (stripe_checkout_session_id) where stripe_checkout_session_id is not null;

create trigger site_settings_updated before update on public.site_settings for each row execute function private.set_updated_at();
create trigger hero_slides_updated before update on public.hero_slides for each row execute function private.set_updated_at();
create trigger benefits_updated before update on public.benefits for each row execute function private.set_updated_at();
create trigger collections_updated before update on public.collections for each row execute function private.set_updated_at();
create trigger products_updated before update on public.products for each row execute function private.set_updated_at();
create trigger product_variants_updated before update on public.product_variants for each row execute function private.set_updated_at();
create trigger product_media_updated before update on public.product_media for each row execute function private.set_updated_at();
create trigger journal_posts_updated before update on public.journal_posts for each row execute function private.set_updated_at();
create trigger policy_pages_updated before update on public.policy_pages for each row execute function private.set_updated_at();
create trigger profiles_updated before update on public.profiles for each row execute function private.set_updated_at();
create trigger addresses_updated before update on public.addresses for each row execute function private.set_updated_at();
create trigger orders_updated before update on public.orders for each row execute function private.set_updated_at();
create trigger staff_members_updated before update on private.staff_members for each row execute function private.set_updated_at();
create trigger inventory_updated before update on private.inventory for each row execute function private.set_updated_at();
create trigger reservations_updated before update on private.inventory_reservations for each row execute function private.set_updated_at();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke execute on function private.handle_new_user() from public, anon, authenticated;

create trigger create_customer_profile
after insert on auth.users
for each row execute function private.handle_new_user();

alter table public.site_settings enable row level security;
alter table public.hero_slides enable row level security;
alter table public.benefits enable row level security;
alter table public.collections enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_media enable row level security;
alter table public.journal_posts enable row level security;
alter table public.policy_pages enable row level security;
alter table public.profiles enable row level security;
alter table public.addresses enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table private.staff_members enable row level security;
alter table private.inventory enable row level security;
alter table private.inventory_reservations enable row level security;
alter table private.reservation_items enable row level security;
alter table private.inventory_movements enable row level security;
alter table private.stripe_events enable row level security;
alter table private.audit_logs enable row level security;

create policy "published site settings are readable" on public.site_settings for select to anon, authenticated using (true);
create policy "published hero slides are readable" on public.hero_slides for select to anon, authenticated using (status = 'published');
create policy "published benefits are readable" on public.benefits for select to anon, authenticated using (status = 'published');
create policy "published collections are readable" on public.collections for select to anon, authenticated using (status = 'published');
create policy "published products are readable" on public.products for select to anon, authenticated using (status = 'published');
create policy "active variants of published products are readable" on public.product_variants for select to anon, authenticated
using (
  active and exists (
    select 1 from public.products p where p.id = product_id and p.status = 'published'
  )
);
create policy "published product media are readable" on public.product_media for select to anon, authenticated
using (
  status = 'published' and exists (
    select 1 from public.products p where p.id = product_id and p.status = 'published'
  )
);
create policy "published journal posts are readable" on public.journal_posts for select to anon, authenticated
using (status = 'published' and published_at <= now());
create policy "published policies are readable" on public.policy_pages for select to anon, authenticated using (status = 'published');

create policy "customers can read their profile" on public.profiles for select to authenticated
using ((select auth.uid()) = user_id);
create policy "customers can create their profile" on public.profiles for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy "customers can update their profile" on public.profiles for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "customers can read their addresses" on public.addresses for select to authenticated
using ((select auth.uid()) = user_id);
create policy "customers can create their addresses" on public.addresses for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy "customers can update their addresses" on public.addresses for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy "customers can delete their addresses" on public.addresses for delete to authenticated
using ((select auth.uid()) = user_id);

create policy "customers can read their orders" on public.orders for select to authenticated
using ((select auth.uid()) = user_id);
create policy "customers can read their order items" on public.order_items for select to authenticated
using (
  exists (
    select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid())
  )
);

revoke all on all tables in schema public from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on public.site_settings, public.hero_slides, public.benefits, public.collections, public.products, public.product_variants, public.product_media, public.journal_posts, public.policy_pages to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.addresses to authenticated;
grant select on public.orders, public.order_items to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('cms-staging', 'cms-staging', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('catalogue', 'catalogue', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

revoke all on all functions in schema private from public, anon, authenticated;
grant execute on all functions in schema private to service_role;
