-- Secure authentication and atomic loyalty transactions
-- Run after 001_schema.sql.

-- Keep role checks outside profile RLS to avoid recursive policy evaluation.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'worker')
  );
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.is_staff() from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_staff() to authenticated;

-- One canonical representation makes phone login and manual customer lookup reliable.
create or replace function public.normalize_phone(value text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when regexp_replace(coalesce(value, ''), '[^0-9]', '', 'g') = '' then ''
    when regexp_replace(value, '[^0-9]', '', 'g') like '0%' then
      '996' || substring(regexp_replace(value, '[^0-9]', '', 'g') from 2)
    else regexp_replace(value, '[^0-9]', '', 'g')
  end;
$$;

-- Customer profiles are created by the database, including when email confirmation
-- is enabled and the client does not yet have a session.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_phone text;
begin
  normalized_phone := public.normalize_phone(new.raw_user_meta_data ->> 'phone');

  -- Staff accounts are provisioned by an administrator, not through public signup.
  insert into public.profiles (id, phone, full_name, role)
  values (
    new.id,
    coalesce(nullif(normalized_phone, ''), 'auth-' || new.id::text),
    trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')),
    'customer'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Existing rows are normalized only where doing so cannot create duplicates.
update public.profiles p
set phone = public.normalize_phone(p.phone)
where public.normalize_phone(p.phone) <> ''
  and p.phone <> public.normalize_phone(p.phone)
  and not exists (
    select 1 from public.profiles other
    where other.id <> p.id
      and public.normalize_phone(other.phone) = public.normalize_phone(p.phone)
  );

alter table public.profiles
  drop constraint if exists profiles_points_nonnegative;
alter table public.profiles
  add constraint profiles_points_nonnegative check (points_balance >= 0);

-- Customers may edit their display name, but never their role, phone, or points.
-- RLS controls rows; column grants control which fields can be submitted.
revoke update on table public.profiles from authenticated;
grant update (full_name) on table public.profiles to authenticated;

drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Harden the points trigger's search path as it runs with elevated privileges.
create or replace function public.apply_transaction_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set points_balance = points_balance + new.points_added
  where id = new.customer_id;
  return new;
end;
$$;

-- Direct inserts allowed clients to choose their own price and points. All writes now
-- pass through process_loyalty_transaction, which derives values from trusted tables.
drop policy if exists "tx worker insert" on public.transactions;

create or replace function public.process_loyalty_transaction(
  customer_reference text,
  service_slug text,
  payment text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  staff public.profiles%rowtype;
  customer public.profiles%rowtype;
  selected_service public.services%rowtype;
  loyalty public.loyalty_settings%rowtype;
  reference text;
  transaction_id uuid;
  awarded_points integer;
  charged_amount numeric(12,2);
begin
  select * into staff from public.profiles where id = auth.uid();
  if staff.id is null or staff.role not in ('admin', 'worker') then
    raise exception 'STAFF_ACCESS_REQUIRED' using errcode = '42501';
  end if;

  reference := trim(coalesce(customer_reference, ''));
  reference := regexp_replace(reference, '^rio-customer:v1:', '', 'i');

  if reference ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    select * into customer from public.profiles
      where id = reference::uuid and role = 'customer'
      for update;
  else
    select * into customer from public.profiles
      where phone = public.normalize_phone(reference) and role = 'customer'
      for update;
  end if;

  if customer.id is null then
    raise exception 'CUSTOMER_NOT_FOUND' using errcode = 'P0002';
  end if;

  select * into selected_service from public.services
    where slug = service_slug and is_active = true;
  if selected_service.id is null then
    raise exception 'SERVICE_NOT_FOUND' using errcode = 'P0002';
  end if;

  if payment not in ('cash', 'card', 'transfer', 'points') then
    raise exception 'INVALID_PAYMENT_METHOD' using errcode = '22023';
  end if;

  select * into loyalty from public.loyalty_settings where id = 1;
  awarded_points := case when payment = 'points' then 0 else selected_service.points_reward end;
  charged_amount := case when payment = 'points' then 0 else selected_service.price end;

  if payment = 'points' then
    if customer.points_balance < loyalty.reward_threshold then
      raise exception 'INSUFFICIENT_POINTS' using errcode = '22003';
    end if;
    update public.profiles
      set points_balance = points_balance - loyalty.reward_threshold
      where id = customer.id;
  end if;

  insert into public.transactions (
    customer_id, worker_id, service_id, amount, payment_method, points_added
  ) values (
    customer.id, staff.id, selected_service.id, charged_amount, payment, awarded_points
  ) returning id into transaction_id;

  select * into customer from public.profiles where id = customer.id;

  return jsonb_build_object(
    'transaction_id', transaction_id,
    'customer_id', customer.id,
    'customer_name', customer.full_name,
    'points_balance', customer.points_balance,
    'points_added', awarded_points,
    'amount', charged_amount,
    'payment_method', payment,
    'service', selected_service.slug
  );
end;
$$;

revoke all on function public.process_loyalty_transaction(text, text, text) from public;
grant execute on function public.process_loyalty_transaction(text, text, text) to authenticated;
