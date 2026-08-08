create table private.media_uploads (
  id uuid primary key default extensions.gen_random_uuid(),
  staff_user_id uuid not null references auth.users(id) on delete restrict,
  product_id uuid references public.products(id) on delete set null,
  staging_path text not null unique,
  original_filename text not null,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  size_bytes integer not null check (size_bytes between 1 and 10485760),
  alt_text text not null check (length(trim(alt_text)) > 0),
  status text not null default 'pending_upload' check (status in ('pending_upload', 'staged', 'published', 'rejected')),
  catalogue_path text unique,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index media_uploads_status_created_idx on private.media_uploads (status, created_at desc);
create index media_uploads_product_idx on private.media_uploads (product_id, created_at desc) where product_id is not null;

alter table private.media_uploads enable row level security;
create trigger media_uploads_updated before update on private.media_uploads
for each row execute function private.set_updated_at();

revoke all on private.media_uploads from public, anon, authenticated;
grant select, insert, update on private.media_uploads to service_role;

alter table public.product_variants add column stripe_product_id text unique;

create table public.navigation_items (
  id uuid primary key default extensions.gen_random_uuid(),
  label text not null check (length(trim(label)) between 2 and 40),
  href text not null check (href like '/%' and href not like '//%'),
  position smallint not null default 0 check (position >= 0),
  status text not null default 'draft' check (status in ('draft', 'published')),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (href)
);

create index navigation_items_status_position_idx on public.navigation_items (status, position);
alter table public.navigation_items enable row level security;
create trigger navigation_items_updated before update on public.navigation_items
for each row execute function private.set_updated_at();
create policy "published navigation items are readable" on public.navigation_items
for select to anon, authenticated using (status = 'published');
revoke all on public.navigation_items from anon, authenticated;
grant select on public.navigation_items to anon, authenticated;
grant all on public.navigation_items to service_role;

grant select, insert, update on private.staff_members to service_role;
grant select, insert, update on private.inventory to service_role;
grant select, insert, update, delete on private.inventory_reservations, private.reservation_items to service_role;
grant select, insert on private.inventory_movements, private.stripe_events, private.audit_logs to service_role;
grant usage, select on all sequences in schema private to service_role;

create or replace function private.adjust_inventory(
  p_actor_user_id uuid,
  p_actor_role text,
  p_variant_id uuid,
  p_delta integer,
  p_low_stock_threshold integer,
  p_note text,
  p_version integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_inventory private.inventory%rowtype;
begin
  if p_actor_role not in ('owner', 'fulfilment')
     or p_delta = 0
     or abs(p_delta) > 1000
     or p_low_stock_threshold < 0
     or p_low_stock_threshold > 1000
     or length(trim(p_note)) < 3 then
    return false;
  end if;

  select * into current_inventory
  from private.inventory
  where variant_id = p_variant_id and version = p_version
  for update;

  if not found
     or current_inventory.on_hand + p_delta < 0
     or current_inventory.on_hand + p_delta < current_inventory.reserved then
    return false;
  end if;

  update private.inventory
  set
    on_hand = on_hand + p_delta,
    low_stock_threshold = p_low_stock_threshold,
    version = version + 1
  where variant_id = p_variant_id and version = p_version;

  insert into private.inventory_movements (
    variant_id, actor_user_id, reason, delta_on_hand, note
  ) values (
    p_variant_id,
    p_actor_user_id,
    case when p_delta > 0 then 'restock' else 'adjustment' end,
    p_delta,
    p_note
  );

  insert into private.audit_logs (
    actor_user_id, actor_role, action, entity_type, entity_id, metadata
  ) values (
    p_actor_user_id,
    p_actor_role,
    'inventory.adjusted',
    'product_variant',
    p_variant_id::text,
    jsonb_build_object('delta', p_delta, 'low_stock_threshold', p_low_stock_threshold)
  );

  return true;
end;
$$;

revoke all on function private.adjust_inventory(uuid, text, uuid, integer, integer, text, integer) from public, anon, authenticated;
grant execute on function private.adjust_inventory(uuid, text, uuid, integer, integer, text, integer) to service_role;
