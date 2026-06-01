create table public.bookings (
  id                       uuid primary key default gen_random_uuid(),
  client_id                uuid not null references public.profiles(id),
  service_id               uuid not null references public.services(id),
  provider_profile_id      uuid not null references public.provider_profiles(id),
  status                   booking_status not null default 'PENDING',
  start_time               timestamptz not null,
  end_time                 timestamptz not null,
  total_price_in_cents     integer not null,
  notes                    text,
  location                 text,
  latitude                 double precision,
  longitude                double precision,
  stripe_payment_intent_id text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint bookings_no_overlap exclude using gist (
    provider_profile_id with =,
    tstzrange(start_time, end_time) with &&
  ) where (status in ('PENDING','CONFIRMED','IN_PROGRESS'))
);
create index bookings_client_idx on public.bookings(client_id);
create index bookings_provider_idx on public.bookings(provider_profile_id);
create index bookings_status_idx on public.bookings(status);
create index bookings_start_idx on public.bookings(start_time);
create trigger bookings_set_updated_at before update on public.bookings
  for each row execute function extensions.moddatetime(updated_at);
