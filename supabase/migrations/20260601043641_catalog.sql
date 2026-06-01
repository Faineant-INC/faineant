create table public.services (
  id                  uuid primary key default gen_random_uuid(),
  provider_profile_id uuid not null references public.provider_profiles(id) on delete cascade,
  name                text not null,
  description         text,
  category            service_category not null,
  duration_minutes    integer not null,
  price_in_cents      integer not null,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index services_provider_idx on public.services(provider_profile_id);
create index services_category_idx on public.services(category);
create trigger services_set_updated_at before update on public.services
  for each row execute function extensions.moddatetime(updated_at);

create table public.availability (
  id                  uuid primary key default gen_random_uuid(),
  provider_profile_id uuid not null references public.provider_profiles(id) on delete cascade,
  day_of_week         integer not null check (day_of_week between 0 and 6),
  start_time          text not null,
  end_time            text not null,
  unique (provider_profile_id, day_of_week, start_time)
);
create index availability_provider_idx on public.availability(provider_profile_id);

create table public.availability_overrides (
  id                  uuid primary key default gen_random_uuid(),
  provider_profile_id uuid not null references public.provider_profiles(id) on delete cascade,
  date                date not null,
  is_blocked          boolean not null default true,
  start_time          text,
  end_time            text,
  reason              text,
  unique (provider_profile_id, date)
);
create index availability_overrides_provider_date_idx on public.availability_overrides(provider_profile_id, date);

create table public.portfolio_items (
  id                  uuid primary key default gen_random_uuid(),
  provider_profile_id uuid not null references public.provider_profiles(id) on delete cascade,
  image_url           text not null,
  caption             text,
  service_id          uuid references public.services(id) on delete set null,
  sort_order          integer not null default 0,
  created_at          timestamptz not null default now()
);
create index portfolio_items_provider_idx on public.portfolio_items(provider_profile_id);
