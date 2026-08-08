create table private.auth_rate_limits (
  key_hash text primary key check (length(key_hash) = 64),
  attempts integer not null default 1 check (attempts > 0),
  window_started_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index auth_rate_limits_updated_at_idx on private.auth_rate_limits (updated_at);

alter table private.auth_rate_limits enable row level security;

create or replace function private.consume_auth_rate_limit(
  p_key_hash text,
  p_limit integer default 5,
  p_window_seconds integer default 600
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_limit private.auth_rate_limits%rowtype;
begin
  if length(p_key_hash) <> 64 or p_limit < 1 or p_window_seconds < 60 then
    return false;
  end if;

  select *
  into current_limit
  from private.auth_rate_limits
  where key_hash = p_key_hash
  for update;

  if not found then
    insert into private.auth_rate_limits (key_hash) values (p_key_hash);
    return true;
  end if;

  if current_limit.window_started_at <= now() - make_interval(secs => p_window_seconds) then
    update private.auth_rate_limits
    set attempts = 1, window_started_at = now(), updated_at = now()
    where key_hash = p_key_hash;
    return true;
  end if;

  if current_limit.attempts >= p_limit then
    return false;
  end if;

  update private.auth_rate_limits
  set attempts = attempts + 1, updated_at = now()
  where key_hash = p_key_hash;
  return true;
end;
$$;

create table private.account_deletion_requests (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_email text not null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'cancelled')),
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  notes text,
  check (
    (status = 'pending' and resolved_at is null)
    or (status <> 'pending' and resolved_at is not null)
  )
);

create unique index one_pending_account_deletion_per_user_idx
on private.account_deletion_requests (user_id)
where status = 'pending';

create index account_deletion_requests_status_requested_idx
on private.account_deletion_requests (status, requested_at desc);

alter table private.account_deletion_requests enable row level security;

revoke all on private.auth_rate_limits, private.account_deletion_requests from public, anon, authenticated;
grant select, insert, update, delete on private.auth_rate_limits to service_role;
grant select, insert, update on private.account_deletion_requests to service_role;
revoke all on function private.consume_auth_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function private.consume_auth_rate_limit(text, integer, integer) to service_role;

create or replace function private.create_customer_address(
  p_user_id uuid,
  p_label text,
  p_recipient_name text,
  p_line_1 text,
  p_line_2 text,
  p_city text,
  p_county text,
  p_postcode text,
  p_country_code text,
  p_is_default boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
  should_be_default boolean;
begin
  should_be_default := p_is_default or not exists (
    select 1 from public.addresses where user_id = p_user_id
  );

  if should_be_default then
    update public.addresses set is_default = false where user_id = p_user_id and is_default;
  end if;

  insert into public.addresses (
    user_id, label, recipient_name, line_1, line_2, city, county, postcode, country_code, is_default
  ) values (
    p_user_id, p_label, p_recipient_name, p_line_1, p_line_2, p_city, p_county, p_postcode, p_country_code, should_be_default
  ) returning id into new_id;

  return new_id;
end;
$$;

create or replace function private.update_customer_address(
  p_user_id uuid,
  p_address_id uuid,
  p_version integer,
  p_label text,
  p_recipient_name text,
  p_line_1 text,
  p_line_2 text,
  p_city text,
  p_county text,
  p_postcode text,
  p_country_code text,
  p_is_default boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_id uuid;
begin
  perform 1 from public.addresses
  where id = p_address_id and user_id = p_user_id and version = p_version
  for update;

  if not found then
    return false;
  end if;

  if p_is_default then
    update public.addresses
    set is_default = false
    where user_id = p_user_id and id <> p_address_id and is_default;
  end if;

  update public.addresses
  set
    label = p_label,
    recipient_name = p_recipient_name,
    line_1 = p_line_1,
    line_2 = p_line_2,
    city = p_city,
    county = p_county,
    postcode = p_postcode,
    country_code = p_country_code,
    is_default = p_is_default,
    version = version + 1
  where id = p_address_id and user_id = p_user_id and version = p_version
  returning id into updated_id;

  return updated_id is not null;
end;
$$;

create or replace function private.delete_customer_address(
  p_user_id uuid,
  p_address_id uuid,
  p_version integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  was_default boolean;
  deleted_id uuid;
begin
  select is_default into was_default
  from public.addresses
  where id = p_address_id and user_id = p_user_id and version = p_version
  for update;

  if not found then
    return false;
  end if;

  delete from public.addresses
  where id = p_address_id and user_id = p_user_id and version = p_version
  returning id into deleted_id;

  if deleted_id is not null and was_default then
    update public.addresses
    set is_default = true
    where id = (
      select id from public.addresses
      where user_id = p_user_id
      order by created_at
      limit 1
    );
  end if;

  return deleted_id is not null;
end;
$$;

revoke all on function private.create_customer_address(uuid, text, text, text, text, text, text, text, text, boolean) from public, anon, authenticated;
revoke all on function private.update_customer_address(uuid, uuid, integer, text, text, text, text, text, text, text, text, boolean) from public, anon, authenticated;
revoke all on function private.delete_customer_address(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function private.create_customer_address(uuid, text, text, text, text, text, text, text, text, boolean) to service_role;
grant execute on function private.update_customer_address(uuid, uuid, integer, text, text, text, text, text, text, text, text, boolean) to service_role;
grant execute on function private.delete_customer_address(uuid, uuid, integer) to service_role;
