create table public.reviews (
  id                  uuid primary key default gen_random_uuid(),
  booking_id          uuid not null unique references public.bookings(id),
  client_id           uuid not null references public.profiles(id),
  provider_profile_id uuid not null references public.provider_profiles(id),
  rating              integer not null check (rating between 1 and 5),
  text                text,
  photos              text[] not null default '{}',
  created_at          timestamptz not null default now()
);
create index reviews_provider_idx on public.reviews(provider_profile_id);
create index reviews_client_idx on public.reviews(client_id);

create table public.conversations (
  id              uuid primary key default gen_random_uuid(),
  participant_a_id uuid not null references public.profiles(id),
  participant_b_id uuid not null references public.profiles(id),
  last_message_at timestamptz,
  created_at      timestamptz not null default now(),
  unique (participant_a_id, participant_b_id)
);
create index conversations_a_idx on public.conversations(participant_a_id);
create index conversations_b_idx on public.conversations(participant_b_id);

create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id),
  text            text not null,
  image_url       text,
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);
create index messages_conversation_idx on public.messages(conversation_id, created_at);
create index messages_sender_idx on public.messages(sender_id);

create table public.posts (
  id             uuid primary key default gen_random_uuid(),
  author_id      uuid not null references public.profiles(id),
  title          text not null,
  body           text not null,
  category       post_category not null default 'GENERAL',
  image_url      text,
  likes_count    integer not null default 0,
  comments_count integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index posts_author_idx on public.posts(author_id);
create index posts_category_idx on public.posts(category);
create index posts_created_idx on public.posts(created_at);
create trigger posts_set_updated_at before update on public.posts
  for each row execute function extensions.moddatetime(updated_at);

create table public.comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  author_id  uuid not null references public.profiles(id),
  body       text not null,
  created_at timestamptz not null default now()
);
create index comments_post_idx on public.comments(post_id, created_at);
