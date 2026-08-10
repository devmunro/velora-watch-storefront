alter table public.site_settings
  add column if not exists default_social_image_path text;

create table public.homepage_sections (
  id uuid primary key default extensions.gen_random_uuid(),
  section_key text not null unique check (section_key in ('collections', 'standard', 'spotlight', 'journal')),
  eyebrow text not null,
  heading text not null,
  accent text,
  body text not null,
  media_path text,
  media_alt text,
  primary_label text,
  primary_href text check (primary_href is null or primary_href like '/%'),
  featured_product_id uuid references public.products(id) on delete set null,
  featured_collection_id uuid references public.collections(id) on delete set null,
  featured_journal_post_id uuid references public.journal_posts(id) on delete set null,
  position smallint not null default 0 check (position >= 0),
  visible boolean not null default true,
  status text not null default 'draft' check (status in ('draft', 'published')),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.journal_categories (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null unique,
  position smallint not null default 0 check (position >= 0),
  status text not null default 'published' check (status in ('draft', 'published')),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.journal_posts
  add column if not exists author_name text not null default 'Velora Editorial',
  add column if not exists category_id uuid references public.journal_categories(id) on delete set null,
  add column if not exists featured boolean not null default false,
  add column if not exists reading_minutes smallint not null default 1 check (reading_minutes between 1 and 120);

create table public.journal_post_products (
  journal_post_id uuid not null references public.journal_posts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  position smallint not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  primary key (journal_post_id, product_id)
);

create table private.staff_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  onboarding_version integer not null default 1 check (onboarding_version > 0),
  tour_completed_at timestamptz,
  tour_dismissed_at timestamptz,
  checklist_state jsonb not null default '{}'::jsonb check (jsonb_typeof(checklist_state) = 'object'),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index homepage_sections_status_position_idx on public.homepage_sections (status, visible, position);
create index journal_categories_status_position_idx on public.journal_categories (status, position);
create index journal_posts_category_status_idx on public.journal_posts (category_id, status, published_at desc);
create index journal_posts_featured_idx on public.journal_posts (featured, published_at desc) where featured;
create index journal_post_products_product_idx on public.journal_post_products (product_id);

create trigger homepage_sections_updated before update on public.homepage_sections
for each row execute function private.set_updated_at();
create trigger journal_categories_updated before update on public.journal_categories
for each row execute function private.set_updated_at();
create trigger staff_preferences_updated before update on private.staff_preferences
for each row execute function private.set_updated_at();

alter table public.homepage_sections enable row level security;
alter table public.journal_categories enable row level security;
alter table public.journal_post_products enable row level security;
alter table private.staff_preferences enable row level security;

create policy "published homepage sections are readable" on public.homepage_sections
for select to anon, authenticated using (status = 'published' and visible);
create policy "published journal categories are readable" on public.journal_categories
for select to anon, authenticated using (status = 'published');
create policy "published journal relationships are readable" on public.journal_post_products
for select to anon, authenticated using (
  exists (
    select 1 from public.journal_posts p
    where p.id = journal_post_id and p.status = 'published' and p.published_at <= now()
  )
);

revoke all on public.homepage_sections, public.journal_categories, public.journal_post_products from anon, authenticated;
grant select on public.homepage_sections, public.journal_categories, public.journal_post_products to anon, authenticated;
grant all on public.homepage_sections, public.journal_categories, public.journal_post_products to service_role;
revoke all on private.staff_preferences from public, anon, authenticated;
grant select, insert, update on private.staff_preferences to service_role;

insert into public.journal_categories (slug, name, position, status)
values
  ('design', 'Design', 0, 'published'),
  ('craftsmanship', 'Craftsmanship', 1, 'published'),
  ('watch-care', 'Watch Care', 2, 'published'),
  ('travel', 'Travel', 3, 'published'),
  ('buying-guides', 'Buying Guides', 4, 'published')
on conflict (slug) do update set name = excluded.name, position = excluded.position;

update public.journal_posts
set category_id = (select id from public.journal_categories where slug = 'design')
where category_id is null;

insert into public.homepage_sections (
  section_key, eyebrow, heading, accent, body, media_path, media_alt,
  primary_label, primary_href, featured_product_id, featured_journal_post_id,
  position, visible, status
)
values
  (
    'collections', 'Our collections', 'Find the perfect watch for your style.', null,
    'Explore Velora timepieces selected for distinct expressions of modern life.', null, null,
    'View all collections', '/collections', null, null, 0, true, 'published'
  ),
  (
    'standard', 'The Velora standard', 'Precision you can feel.', null,
    'Every Velora timepiece begins with proportion and purpose. From sapphire crystal to the final brushed surface, each detail is chosen to serve the watch for years to come.',
    '/images/aster.webp', 'Aster Automatic watch in silver steel', 'Discover our approach', '/about', null, null, 1, true, 'published'
  ),
  (
    'spotlight', 'An icon in black', 'Meridian', 'Chronograph.',
    'Defined by warm metallic details, deep contrast and timing controls made to be used.',
    '/images/meridian.webp', 'Meridian Chronograph on a black leather strap', 'View Meridian', '/watches/meridian-chronograph',
    (select id from public.products where slug = 'meridian-chronograph'), null, 2, true, 'published'
  ),
  (
    'journal', 'From the journal', 'Notes on time.', null,
    'Design, movements and the details that make a watch part of everyday life.', null, null,
    'Read the story', '/journal', null,
    (select id from public.journal_posts order by published_at desc nulls last limit 1), 3, true, 'published'
  )
on conflict (section_key) do nothing;

create or replace function private.create_product_with_variant(
  p_actor_user_id uuid,
  p_collection_id uuid,
  p_slug text,
  p_name text,
  p_short_description text,
  p_description text,
  p_specifications jsonb,
  p_primary_image_path text,
  p_primary_image_alt text,
  p_position integer,
  p_seo_title text,
  p_seo_description text,
  p_featured boolean,
  p_variant_name text,
  p_sku text,
  p_finish text,
  p_strap text,
  p_price_amount integer,
  p_initial_stock integer,
  p_low_stock_threshold integer
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product_id uuid;
  v_variant_id uuid;
begin
  if not exists (select 1 from private.staff_members where user_id = p_actor_user_id and active and role = 'owner') then
    raise exception 'Owner access required';
  end if;
  insert into public.products (collection_id, slug, name, short_description, description, specifications, primary_image_path, primary_image_alt, position, seo_title, seo_description, featured, status)
  values (p_collection_id, p_slug, p_name, p_short_description, p_description, p_specifications, p_primary_image_path, p_primary_image_alt, p_position, p_seo_title, p_seo_description, p_featured, 'draft')
  returning id into v_product_id;
  insert into public.product_variants (product_id, sku, name, finish, strap, price_amount, currency, active, position)
  values (v_product_id, p_sku, p_variant_name, p_finish, p_strap, p_price_amount, 'gbp', true, 0)
  returning id into v_variant_id;
  insert into private.inventory (variant_id, on_hand, reserved, low_stock_threshold)
  values (v_variant_id, p_initial_stock, 0, p_low_stock_threshold);
  if p_initial_stock > 0 then
    insert into private.inventory_movements (variant_id, actor_user_id, reason, delta_on_hand, note)
    values (v_variant_id, p_actor_user_id, 'initial', p_initial_stock, 'Initial stock recorded when product was created');
  end if;
  return v_product_id;
end;
$$;

create or replace function private.create_product_variant(
  p_actor_user_id uuid, p_product_id uuid, p_name text, p_sku text, p_finish text, p_strap text,
  p_price_amount integer, p_position integer, p_initial_stock integer, p_low_stock_threshold integer
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_variant_id uuid;
begin
  if not exists (select 1 from private.staff_members where user_id = p_actor_user_id and active and role = 'owner') then raise exception 'Owner access required'; end if;
  insert into public.product_variants (product_id, sku, name, finish, strap, price_amount, currency, active, position)
  values (p_product_id, p_sku, p_name, p_finish, p_strap, p_price_amount, 'gbp', true, p_position) returning id into v_variant_id;
  insert into private.inventory (variant_id, on_hand, reserved, low_stock_threshold) values (v_variant_id, p_initial_stock, 0, p_low_stock_threshold);
  if p_initial_stock > 0 then insert into private.inventory_movements (variant_id, actor_user_id, reason, delta_on_hand, note) values (v_variant_id, p_actor_user_id, 'initial', p_initial_stock, 'Initial stock recorded when variant was created'); end if;
  return v_variant_id;
end;
$$;

revoke all on function private.create_product_with_variant(uuid, uuid, text, text, text, text, jsonb, text, text, integer, text, text, boolean, text, text, text, text, integer, integer, integer) from public, anon, authenticated;
grant execute on function private.create_product_with_variant(uuid, uuid, text, text, text, text, jsonb, text, text, integer, text, text, boolean, text, text, text, text, integer, integer, integer) to service_role;
revoke all on function private.create_product_variant(uuid, uuid, text, text, text, text, integer, integer, integer, integer) from public, anon, authenticated;
grant execute on function private.create_product_variant(uuid, uuid, text, text, text, text, integer, integer, integer, integer) to service_role;
