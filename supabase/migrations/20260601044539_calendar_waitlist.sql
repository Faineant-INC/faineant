create table public.calendar_connections (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  provider      calendar_provider not null,
  access_token  text,
  refresh_token text,
  external_id   text,
  feed_url      text,
  sync_token    text,
  last_synced_at timestamptz,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, provider)
);
create index calendar_connections_user_idx on public.calendar_connections(user_id);
create trigger calendar_connections_set_updated_at before update on public.calendar_connections
  for each row execute function extensions.moddatetime(updated_at);

create table public.external_events (
  id                     uuid primary key default gen_random_uuid(),
  calendar_connection_id uuid not null references public.calendar_connections(id) on delete cascade,
  external_id            text not null,
  title                  text,
  start_time             timestamptz not null,
  end_time               timestamptz not null,
  is_all_day             boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (calendar_connection_id, external_id)
);
create index external_events_conn_start_idx on public.external_events(calendar_connection_id, start_time);
create trigger external_events_set_updated_at before update on public.external_events
  for each row execute function extensions.moddatetime(updated_at);

create table public.waitlist_entries (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique
             check (length(email) between 3 and 320)
             check (email = btrim(email))
             check (email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  source     text check (length(source) <= 100),
  referrer   text check (length(referrer) <= 2048),
  user_agent text check (length(user_agent) <= 1024),
  ip_hash    text check (length(ip_hash) <= 128),
  created_at timestamptz not null default now()
);
create index waitlist_entries_created_idx on public.waitlist_entries(created_at);
