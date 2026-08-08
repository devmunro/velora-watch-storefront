create or replace function private.reserve_inventory(
  p_user_id uuid,
  p_lines jsonb,
  p_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_reservation_id uuid;
  requested_count integer;
  locked_count integer := 0;
  requested_record record;
begin
  if jsonb_typeof(p_lines) <> 'array'
     or p_expires_at <= now()
     or p_expires_at > now() + interval '31 minutes' then
    raise exception 'invalid_reservation_request';
  end if;

  select count(*), count(distinct line.variant_id)
  into requested_count, locked_count
  from jsonb_to_recordset(p_lines) as line(variant_id uuid, quantity integer)
  where line.variant_id is not null
    and line.quantity between 1 and 5;

  if requested_count < 1
     or requested_count > 20
     or requested_count <> jsonb_array_length(p_lines)
     or requested_count <> locked_count then
    raise exception 'invalid_reservation_request';
  end if;

  locked_count := 0;

  insert into private.inventory_reservations (user_id, expires_at)
  values (p_user_id, p_expires_at)
  returning id into new_reservation_id;

  -- Every transaction locks stock in SKU order to avoid checkout deadlocks.
  for requested_record in
    select
      product.id as product_id,
      product.name as product_name,
      variant.id as variant_id,
      variant.name as variant_name,
      variant.sku,
      variant.price_amount,
      line.quantity,
      inventory.on_hand,
      inventory.reserved
    from jsonb_to_recordset(p_lines) as line(variant_id uuid, quantity integer)
    join public.product_variants as variant on variant.id = line.variant_id
    join public.products as product on product.id = variant.product_id
    join private.inventory as inventory on inventory.variant_id = variant.id
    where product.status = 'published' and variant.active
    order by variant.sku
    for update of inventory
  loop
    locked_count := locked_count + 1;

    if requested_record.on_hand - requested_record.reserved < requested_record.quantity then
      raise exception 'insufficient_stock';
    end if;

    insert into private.reservation_items (
      reservation_id,
      product_id,
      variant_id,
      product_name,
      variant_name,
      sku,
      unit_amount,
      quantity
    ) values (
      new_reservation_id,
      requested_record.product_id,
      requested_record.variant_id,
      requested_record.product_name,
      requested_record.variant_name,
      requested_record.sku,
      requested_record.price_amount,
      requested_record.quantity
    );

    update private.inventory
    set reserved = reserved + requested_record.quantity
    where variant_id = requested_record.variant_id;

    insert into private.inventory_movements (
      variant_id,
      reservation_id,
      actor_user_id,
      reason,
      delta_reserved,
      note
    ) values (
      requested_record.variant_id,
      new_reservation_id,
      p_user_id,
      'reservation',
      requested_record.quantity,
      'Checkout reservation created'
    );
  end loop;

  if locked_count <> requested_count then
    raise exception 'unavailable_variant';
  end if;

  return new_reservation_id;
end;
$$;

create or replace function private.attach_checkout_session(
  p_reservation_id uuid,
  p_user_id uuid,
  p_checkout_session_id text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  attached_id uuid;
begin
  if p_checkout_session_id !~ '^cs_' then
    return false;
  end if;

  update private.inventory_reservations
  set stripe_checkout_session_id = p_checkout_session_id
  where id = p_reservation_id
    and user_id = p_user_id
    and status = 'pending'
    and expires_at > now()
    and stripe_checkout_session_id is null
  returning id into attached_id;

  return attached_id is not null;
end;
$$;

create or replace function private.release_reservation(
  p_reservation_id uuid,
  p_event_id text,
  p_event_type text,
  p_release_status text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  reservation_record private.inventory_reservations%rowtype;
  item_record record;
  inserted_event_id text;
begin
  if p_release_status not in ('released', 'expired') then
    return false;
  end if;

  if p_event_id is not null then
    insert into private.stripe_events (
      stripe_event_id,
      event_type,
      stripe_checkout_session_id
    ) values (
      p_event_id,
      coalesce(p_event_type, 'unknown'),
      (select stripe_checkout_session_id from private.inventory_reservations where id = p_reservation_id)
    )
    on conflict (stripe_event_id) do nothing
    returning stripe_event_id into inserted_event_id;

    if inserted_event_id is null then
      return true;
    end if;
  end if;

  select * into reservation_record
  from private.inventory_reservations
  where id = p_reservation_id
  for update;

  if not found then
    return false;
  end if;

  if reservation_record.status <> 'pending' then
    return true;
  end if;

  for item_record in
    select variant_id, quantity, sku
    from private.reservation_items
    where reservation_id = p_reservation_id
    order by sku
  loop
    update private.inventory
    set reserved = reserved - item_record.quantity
    where variant_id = item_record.variant_id
      and reserved >= item_record.quantity;

    if not found then
      raise exception 'reservation_stock_mismatch';
    end if;

    insert into private.inventory_movements (
      variant_id,
      reservation_id,
      actor_user_id,
      reason,
      delta_reserved,
      note
    ) values (
      item_record.variant_id,
      p_reservation_id,
      reservation_record.user_id,
      'release',
      -item_record.quantity,
      case when p_release_status = 'expired'
        then 'Checkout reservation expired'
        else 'Checkout reservation released'
      end
    );
  end loop;

  update private.inventory_reservations
  set status = p_release_status
  where id = p_reservation_id and status = 'pending';

  return true;
end;
$$;

create or replace function private.finalize_reservation(
  p_reservation_id uuid,
  p_user_id uuid,
  p_checkout_session_id text,
  p_payment_intent_id text,
  p_customer_email text,
  p_shipping_address jsonb,
  p_receipt_url text,
  p_amount_total integer,
  p_currency text,
  p_event_id text,
  p_event_type text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  reservation_record private.inventory_reservations%rowtype;
  existing_order_id uuid;
  new_order_id uuid;
  expected_total integer;
  item_record record;
  inserted_event_id text;
begin
  if p_checkout_session_id !~ '^cs_'
     or p_currency <> 'gbp'
     or p_amount_total < 1
     or length(trim(p_customer_email)) < 3
     or jsonb_typeof(p_shipping_address) <> 'object' then
    raise exception 'invalid_checkout_confirmation';
  end if;

  if p_event_id is not null then
    insert into private.stripe_events (
      stripe_event_id,
      event_type,
      stripe_checkout_session_id
    ) values (
      p_event_id,
      coalesce(p_event_type, 'unknown'),
      p_checkout_session_id
    )
    on conflict (stripe_event_id) do nothing
    returning stripe_event_id into inserted_event_id;

    if inserted_event_id is null then
      select id into existing_order_id
      from public.orders
      where stripe_checkout_session_id = p_checkout_session_id;
      return existing_order_id;
    end if;
  end if;

  select id into existing_order_id
  from public.orders
  where stripe_checkout_session_id = p_checkout_session_id;

  if existing_order_id is not null then
    return existing_order_id;
  end if;

  select * into reservation_record
  from private.inventory_reservations
  where id = p_reservation_id
  for update;

  if not found
     or reservation_record.user_id <> p_user_id
     or reservation_record.stripe_checkout_session_id <> p_checkout_session_id
     or reservation_record.status <> 'pending' then
    raise exception 'reservation_not_finalizable';
  end if;

  select sum(unit_amount * quantity)::integer
  into expected_total
  from private.reservation_items
  where reservation_id = p_reservation_id;

  if expected_total is null or expected_total <> p_amount_total then
    raise exception 'checkout_total_mismatch';
  end if;

  insert into public.orders (
    user_id,
    stripe_checkout_session_id,
    stripe_payment_intent_id,
    status,
    currency,
    subtotal_amount,
    total_amount,
    customer_email,
    shipping_address,
    receipt_url
  ) values (
    p_user_id,
    p_checkout_session_id,
    nullif(p_payment_intent_id, ''),
    'paid',
    'gbp',
    expected_total,
    expected_total,
    trim(p_customer_email),
    p_shipping_address,
    nullif(p_receipt_url, '')
  )
  returning id into new_order_id;

  insert into public.order_items (
    order_id,
    product_id,
    variant_id,
    product_name,
    variant_name,
    sku,
    unit_amount,
    quantity
  )
  select
    new_order_id,
    product_id,
    variant_id,
    product_name,
    variant_name,
    sku,
    unit_amount,
    quantity
  from private.reservation_items
  where reservation_id = p_reservation_id;

  for item_record in
    select variant_id, quantity, sku
    from private.reservation_items
    where reservation_id = p_reservation_id
    order by sku
  loop
    update private.inventory
    set
      on_hand = on_hand - item_record.quantity,
      reserved = reserved - item_record.quantity
    where variant_id = item_record.variant_id
      and on_hand >= item_record.quantity
      and reserved >= item_record.quantity;

    if not found then
      raise exception 'reservation_stock_mismatch';
    end if;

    insert into private.inventory_movements (
      variant_id,
      reservation_id,
      order_id,
      actor_user_id,
      reason,
      delta_on_hand,
      delta_reserved,
      note
    ) values (
      item_record.variant_id,
      p_reservation_id,
      new_order_id,
      p_user_id,
      'sale',
      -item_record.quantity,
      -item_record.quantity,
      'Paid Stripe Checkout order'
    );
  end loop;

  update private.inventory_reservations
  set status = 'completed', completed_at = now()
  where id = p_reservation_id and status = 'pending';

  return new_order_id;
end;
$$;

create or replace function private.cleanup_orphaned_reservations()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  reservation_record record;
  released_count integer := 0;
begin
  for reservation_record in
    select id
    from private.inventory_reservations
    where status = 'pending'
      and stripe_checkout_session_id is null
      and expires_at <= now()
    order by expires_at
    for update skip locked
  loop
    if private.release_reservation(reservation_record.id, null, null, 'expired') then
      released_count := released_count + 1;
    end if;
  end loop;

  return released_count;
end;
$$;

revoke all on function private.reserve_inventory(uuid, jsonb, timestamptz) from public, anon, authenticated;
revoke all on function private.attach_checkout_session(uuid, uuid, text) from public, anon, authenticated;
revoke all on function private.release_reservation(uuid, text, text, text) from public, anon, authenticated;
revoke all on function private.finalize_reservation(uuid, uuid, text, text, text, jsonb, text, integer, text, text, text) from public, anon, authenticated;
revoke all on function private.cleanup_orphaned_reservations() from public, anon, authenticated;

grant execute on function private.reserve_inventory(uuid, jsonb, timestamptz) to service_role;
grant execute on function private.attach_checkout_session(uuid, uuid, text) to service_role;
grant execute on function private.release_reservation(uuid, text, text, text) to service_role;
grant execute on function private.finalize_reservation(uuid, uuid, text, text, text, jsonb, text, integer, text, text, text) to service_role;
grant execute on function private.cleanup_orphaned_reservations() to service_role;
