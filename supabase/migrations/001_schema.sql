-- Rio Car Wash — core schema, RLS, and helpers

create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- Profiles (linked to auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text unique not null,
  full_name text not null default '',
  role text not null default 'customer' check (role in ('admin', 'worker', 'customer')),
  worker_id text unique,
  points_balance integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists profiles_phone_idx on public.profiles(phone);

-- ---------------------------------------------------------------------------
-- Services
-- ---------------------------------------------------------------------------
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title_ky text not null,
  title_ru text not null,
  title_en text not null,
  description_ky text default '',
  description_ru text default '',
  description_en text default '',
  price numeric(12,2) not null default 0,
  points_reward integer not null default 10,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Transactions
-- ---------------------------------------------------------------------------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id),
  worker_id uuid not null references public.profiles(id),
  service_id uuid not null references public.services(id),
  amount numeric(12,2) not null default 0,
  payment_method text not null check (payment_method in ('cash', 'card', 'transfer', 'points')),
  points_added integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists transactions_created_at_idx on public.transactions(created_at desc);
create index if not exists transactions_worker_idx on public.transactions(worker_id);
create index if not exists transactions_customer_idx on public.transactions(customer_id);

-- ---------------------------------------------------------------------------
-- Promotions (realtime broadcast)
-- ---------------------------------------------------------------------------
create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  title_ky text not null default '',
  title_ru text not null default '',
  title_en text not null default '',
  description_ky text default '',
  description_ru text default '',
  description_en text default '',
  image_url text,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Loyalty settings
-- ---------------------------------------------------------------------------
create table if not exists public.loyalty_settings (
  id int primary key default 1 check (id = 1),
  reward_threshold integer not null default 100,
  updated_at timestamptz not null default now()
);

insert into public.loyalty_settings (id, reward_threshold)
values (1, 100)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Media gallery
-- ---------------------------------------------------------------------------
create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('photo', 'video')),
  url text not null,
  caption text default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Reviews
-- ---------------------------------------------------------------------------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  author_name text not null,
  body_ky text default '',
  body_ru text default '',
  body_en text default '',
  rating integer not null default 5 check (rating between 1 and 5),
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Seed services
-- ---------------------------------------------------------------------------
insert into public.services (slug, title_ky, title_ru, title_en, description_ky, description_ru, description_en, price, points_reward, sort_order)
values
  ('interior-polish', 'Салонду жылмалоо белекке', 'Полировка салона в подарок', 'Interior Polish (Gift)', 'Салонду жылмалоо бонус катары', 'Полировка салона в подарок', 'Complimentary interior polish', 0, 5, 1),
  ('presale', 'Сатууга даярдоо', 'Предпродажная подготовка', 'Pre-sale Preparation', 'Автоунааны сатууга даярдоо', 'Полная предпродажная подготовка', 'Full pre-sale detailing', 3500, 35, 2),
  ('detailing', 'Химчистка', 'Химчистка', 'Dry Cleaning / Detailing', 'Салонду терең тазалоо', 'Химчистка салона', 'Deep interior dry cleaning', 2500, 25, 3),
  ('engine', 'Кыймылдаткычты жуу', 'Промывка двигателя', 'Engine Wash', 'Моторду коопсуз жуу', 'Промывка двигателя', 'Safe engine bay wash', 1200, 12, 4),
  ('soundproof', 'Ызы-чуу изоляциясы', 'Шумоизоляция', 'Soundproofing', 'Салонду үнсүздөтүү', 'Шумоизоляция салона', 'Cabin soundproofing', 8000, 80, 5),
  ('carpet', 'Килем жуу', 'Стирка ковров', 'Carpet Washing', 'Килемдерди жуу жана кургатуу', 'Стирка и сушка ковров', 'Carpet wash and dry', 400, 8, 6)
on conflict (slug) do nothing;

insert into public.reviews (author_name, body_ky, body_ru, body_en, rating)
values
  ('Айбек Т.', 'Rio мыкты иштейт, машина жылтылдап калды.', 'Rio отлично моет, машина блестит.', 'Rio does an excellent job — the car shines.', 5),
  ('Мария К.', 'Килемдерди тез жана таза жуушту.', 'Ковры отстирали быстро и чисто.', 'Carpets came back fast and spotless.', 5),
  ('Nurlan', 'Химчистка салонду жаңыртты.', 'Химчистка обновила салон.', 'Detailing made the interior feel new.', 5)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Award points on insert
-- ---------------------------------------------------------------------------
create or replace function public.apply_transaction_points()
returns trigger
language plpgsql
security definer
as $$
begin
  update public.profiles
    set points_balance = points_balance + new.points_added
    where id = new.customer_id;
  return new;
end;
$$;

drop trigger if exists trg_apply_points on public.transactions;
create trigger trg_apply_points
after insert on public.transactions
for each row execute function public.apply_transaction_points();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.services enable row level security;
alter table public.transactions enable row level security;
alter table public.promotions enable row level security;
alter table public.loyalty_settings enable row level security;
alter table public.media enable row level security;
alter table public.reviews enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

create or replace function public.is_staff()
returns boolean language sql stable as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'worker')
  );
$$;

-- profiles
create policy "own profile read" on public.profiles for select
  using (auth.uid() = id or public.is_staff());
create policy "own profile update" on public.profiles for update
  using (auth.uid() = id or public.is_admin());
create policy "admin insert profiles" on public.profiles for insert
  with check (public.is_admin() or auth.uid() = id);

-- services
create policy "services public read" on public.services for select using (true);
create policy "services admin write" on public.services for all using (public.is_admin()) with check (public.is_admin());

-- promotions
create policy "promos public read active" on public.promotions for select
  using (is_active or public.is_staff());
create policy "promos admin write" on public.promotions for all using (public.is_admin()) with check (public.is_admin());

-- transactions
create policy "tx customer own" on public.transactions for select
  using (customer_id = auth.uid() or public.is_staff());
create policy "tx worker insert" on public.transactions for insert
  with check (public.is_staff());

-- loyalty
create policy "loyalty read" on public.loyalty_settings for select using (true);
create policy "loyalty admin" on public.loyalty_settings for all using (public.is_admin()) with check (public.is_admin());

-- media & reviews
create policy "media public" on public.media for select using (true);
create policy "media admin" on public.media for all using (public.is_admin()) with check (public.is_admin());
create policy "reviews public" on public.reviews for select using (is_published or public.is_admin());
create policy "reviews admin" on public.reviews for all using (public.is_admin()) with check (public.is_admin());

-- Realtime
alter publication supabase_realtime add table public.promotions;
alter publication supabase_realtime add table public.profiles;
