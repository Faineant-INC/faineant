create table public.payments (
  id                       uuid primary key default gen_random_uuid(),
  booking_id               uuid not null unique references public.bookings(id),
  stripe_payment_intent_id text not null unique,
  stripe_event_id          text unique,
  amount_in_cents          integer not null,
  platform_fee_in_cents    integer not null,
  provider_payout_in_cents integer not null,
  refunded_amount_in_cents integer not null default 0,
  status                   payment_status not null default 'PENDING',
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create index payments_intent_idx on public.payments(stripe_payment_intent_id);
create trigger payments_set_updated_at before update on public.payments
  for each row execute function extensions.moddatetime(updated_at);

create table public.refunds (
  id                   uuid primary key default gen_random_uuid(),
  payment_id           uuid not null references public.payments(id),
  stripe_refund_id     text not null unique,
  amount_in_cents      integer not null,
  reason               text,
  initiated_by_user_id uuid not null references public.profiles(id),
  created_at           timestamptz not null default now()
);
create index refunds_payment_idx on public.refunds(payment_id);
