begin;

select plan(32);

select has_function('private', 'reserve_inventory', 'inventory reservation function exists');
select has_function('private', 'attach_checkout_session', 'checkout attachment function exists');
select has_function('private', 'release_reservation', 'reservation release function exists');
select has_function('private', 'finalize_reservation', 'order finalisation function exists');
select has_function('private', 'cleanup_orphaned_reservations', 'orphan cleanup function exists');

select table_privs_are(
  'private', 'inventory', 'anon', array[]::text[],
  'anonymous visitors have no direct inventory privileges'
);
select table_privs_are(
  'private', 'inventory', 'authenticated', array[]::text[],
  'customers have no direct inventory privileges'
);
select table_privs_are(
  'public', 'products', 'anon', array['SELECT'],
  'anonymous visitors can only select products'
);
select table_privs_are(
  'public', 'orders', 'authenticated', array['SELECT'],
  'customers can only select orders'
);
select table_privs_are(
  'public', 'profiles', 'authenticated', array['INSERT', 'SELECT', 'UPDATE'],
  'customers receive the intended profile privileges'
);
select table_privs_are(
  'public', 'addresses', 'authenticated', array['DELETE', 'INSERT', 'SELECT', 'UPDATE'],
  'customers receive the intended address privileges'
);

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '90000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'reservation-one@example.test',
    '',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '90000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'reservation-two@example.test',
    '',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

insert into public.addresses (
  user_id, label, recipient_name, line_1, city, postcode, country_code
)
values
  ('90000000-0000-4000-8000-000000000001', 'Home', 'Customer One', '1 Test Street', 'London', 'SW1A 1AA', 'GB'),
  ('90000000-0000-4000-8000-000000000002', 'Home', 'Customer Two', '2 Test Street', 'London', 'SW1A 2AA', 'GB');

insert into public.orders (
  user_id,
  stripe_checkout_session_id,
  status,
  currency,
  subtotal_amount,
  total_amount,
  customer_email,
  shipping_address
)
values
  (
    '90000000-0000-4000-8000-000000000001',
    'cs_test_rls_customer_one_1234567890',
    'paid',
    'gbp',
    0,
    0,
    'reservation-one@example.test',
    '{}'
  ),
  (
    '90000000-0000-4000-8000-000000000002',
    'cs_test_rls_customer_two_1234567890',
    'paid',
    'gbp',
    0,
    0,
    'reservation-two@example.test',
    '{}'
  );

insert into public.products (
  collection_id,
  slug,
  name,
  short_description,
  description,
  primary_image_path,
  primary_image_alt,
  status
)
values (
  '20000000-0000-4000-8000-000000000001',
  'unpublished-test-piece',
  'Unpublished test piece',
  'A database test product.',
  'This row verifies that public catalogue policies exclude draft products.',
  '/images/meridian.webp',
  'Test watch',
  'draft'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000001', true);
select is(
  (select count(*) from public.profiles),
  1::bigint,
  'a customer sees only their own profile'
);
select is(
  (select count(*) from public.addresses),
  1::bigint,
  'a customer sees only their own addresses'
);
select is(
  (select count(*) from public.orders),
  1::bigint,
  'a customer sees only their own orders'
);
reset role;

set local role anon;
select is(
  (select count(*) from public.products where slug = 'unpublished-test-piece'),
  0::bigint,
  'anonymous catalogue queries exclude draft products'
);
select is(
  (select count(*) from public.products where slug = 'meridian-chronograph'),
  1::bigint,
  'anonymous catalogue queries include published products'
);
reset role;

select table_privs_are(
  'private', 'staff_members', 'authenticated', array[]::text[],
  'customers cannot read or grant protected staff roles'
);

create temporary table test_context (
  key text primary key,
  id uuid not null
);

update private.inventory
set on_hand = 1, reserved = 0
where variant_id = '40000000-0000-4000-8000-000000000001';

insert into test_context (key, id)
select
  'sale_reservation',
  private.reserve_inventory(
    '90000000-0000-4000-8000-000000000001',
    '[{"variant_id":"40000000-0000-4000-8000-000000000001","quantity":1}]',
    now() + interval '30 minutes'
  );

select is(
  (select reserved from private.inventory where variant_id = '40000000-0000-4000-8000-000000000001'),
  1,
  'reserving the last unit increments reserved stock'
);

select throws_ok(
  $$
    select private.reserve_inventory(
      '90000000-0000-4000-8000-000000000002',
      '[{"variant_id":"40000000-0000-4000-8000-000000000001","quantity":1}]',
      now() + interval '30 minutes'
    )
  $$,
  'P0001',
  'insufficient_stock',
  'a concurrent customer cannot reserve the final unit twice'
);

select ok(
  private.attach_checkout_session(
    (select id from test_context where key = 'sale_reservation'),
    '90000000-0000-4000-8000-000000000001',
    'cs_test_velora_sale_1234567890'
  ),
  'a pending reservation accepts its Checkout Session once'
);

insert into test_context (key, id)
select
  'sale_order',
  private.finalize_reservation(
    (select id from test_context where key = 'sale_reservation'),
    '90000000-0000-4000-8000-000000000001',
    'cs_test_velora_sale_1234567890',
    'pi_test_velora_sale_1234567890',
    'reservation-one@example.test',
    '{"name":"Velora Customer","line1":"1 Test Street","city":"London","postal_code":"SW1A 1AA","country":"GB"}',
    'https://pay.stripe.com/receipts/test',
    49500,
    'gbp',
    null,
    null
  );

select is(
  (select on_hand from private.inventory where variant_id = '40000000-0000-4000-8000-000000000001'),
  0,
  'finalisation subtracts sold units from on-hand stock'
);
select is(
  (select reserved from private.inventory where variant_id = '40000000-0000-4000-8000-000000000001'),
  0,
  'finalisation clears reserved stock'
);
select is(
  (select unit_amount from public.order_items where order_id = (select id from test_context where key = 'sale_order')),
  49500,
  'the order item preserves its reservation price snapshot'
);
select is(
  private.finalize_reservation(
    (select id from test_context where key = 'sale_reservation'),
    '90000000-0000-4000-8000-000000000001',
    'cs_test_velora_sale_1234567890',
    'pi_test_velora_sale_1234567890',
    'reservation-one@example.test',
    '{"name":"Velora Customer"}',
    'https://pay.stripe.com/receipts/test',
    49500,
    'gbp',
    null,
    null
  ),
  (select id from test_context where key = 'sale_order'),
  'repeating finalisation returns the original order'
);

insert into test_context (key, id)
select 'event_finalization_one', private.finalize_reservation(
  (select id from test_context where key = 'sale_reservation'),
  '90000000-0000-4000-8000-000000000001',
  'cs_test_velora_sale_1234567890',
  'pi_test_velora_sale_1234567890',
  'reservation-one@example.test',
  '{"name":"Velora Customer"}',
  'https://pay.stripe.com/receipts/test',
  49500,
  'gbp',
  'evt_test_velora_sale_1234567890',
  'checkout.session.completed'
);
insert into test_context (key, id)
select 'event_finalization_two', private.finalize_reservation(
  (select id from test_context where key = 'sale_reservation'),
  '90000000-0000-4000-8000-000000000001',
  'cs_test_velora_sale_1234567890',
  'pi_test_velora_sale_1234567890',
  'reservation-one@example.test',
  '{"name":"Velora Customer"}',
  'https://pay.stripe.com/receipts/test',
  49500,
  'gbp',
  'evt_test_velora_sale_1234567890',
  'checkout.session.completed'
);

select is(
  (select count(*)::integer from private.stripe_events where stripe_event_id = 'evt_test_velora_sale_1234567890'),
  1,
  'duplicate webhook event identifiers are recorded once'
);

update private.inventory
set on_hand = 2, reserved = 0
where variant_id = '40000000-0000-4000-8000-000000000002';

insert into test_context (key, id)
select
  'release_reservation',
  private.reserve_inventory(
    '90000000-0000-4000-8000-000000000001',
    '[{"variant_id":"40000000-0000-4000-8000-000000000002","quantity":2}]',
    now() + interval '30 minutes'
  );

select ok(
  private.release_reservation(
    (select id from test_context where key = 'release_reservation'), null, null, 'released'
  ),
  'a pending reservation can be released'
);
select ok(
  private.release_reservation(
    (select id from test_context where key = 'release_reservation'), null, null, 'released'
  ),
  'releasing an already released reservation is idempotent'
);
select is(
  (select reserved from private.inventory where variant_id = '40000000-0000-4000-8000-000000000002'),
  0,
  'release restores available stock'
);
select is(
  (
    select count(*)::integer
    from private.inventory_movements
    where reservation_id = (select id from test_context where key = 'release_reservation')
      and reason = 'release'
  ),
  1,
  'idempotent release writes one release movement'
);

update private.inventory
set on_hand = 1, reserved = 0
where variant_id = '40000000-0000-4000-8000-000000000003';

insert into test_context (key, id)
select
  'orphan_reservation',
  private.reserve_inventory(
    '90000000-0000-4000-8000-000000000001',
    '[{"variant_id":"40000000-0000-4000-8000-000000000003","quantity":1}]',
    now() + interval '30 minutes'
  );

update private.inventory_reservations
set expires_at = now() - interval '1 minute'
where id = (select id from test_context where key = 'orphan_reservation');

select is(private.cleanup_orphaned_reservations(), 1, 'cleanup releases one expired orphan');
select is(
  (
    select status
    from private.inventory_reservations
    where id = (select id from test_context where key = 'orphan_reservation')
  ),
  'expired',
  'cleanup records the orphan as expired'
);
select table_privs_are(
  'private', 'inventory_movements', 'authenticated', array[]::text[],
  'customers cannot mutate the append-only movement ledger'
);

select * from finish();
rollback;
