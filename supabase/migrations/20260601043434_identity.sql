-- profiles: 1:1 with auth.users (shared primary key). Replaces app-managed User.
-- Email + verification live in auth.users; password is fully owned by Supabase Auth.
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        user_role not null default 'CLIENT',
  first_name  text not null,
  last_name   text not null,
  phone       text,
  avatar_url  text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index profiles_role_idx on public.profiles(role);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function extensions.moddatetime(updated_at);

create table public.provider_profiles (
  id                         uuid primary key default gen_random_uuid(),
  user_id                    uuid not null unique references public.profiles(id) on delete cascade,
  slug                       text not null unique,
  bio                        text,
  business_name              text,
  address                    text,
  latitude                   double precision,
  longitude                  double precision,
  service_radius             double precision not null default 25,
  stripe_account_id          text,
  stripe_onboarding_complete boolean not null default false,
  is_verified                boolean not null default false,
  average_rating             double precision not null default 0,
  total_reviews              integer not null default 0,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);
create index provider_profiles_slug_idx on public.provider_profiles(slug);
create index provider_profiles_geo_idx on public.provider_profiles(latitude, longitude);

create trigger provider_profiles_set_updated_at
  before update on public.provider_profiles
  for each row execute function extensions.moddatetime(updated_at);
