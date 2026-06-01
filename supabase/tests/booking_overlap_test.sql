begin;
select plan(3);

-- Seed identity + catalog
insert into auth.users (id, email)
  values ('11111111-1111-1111-1111-111111111111', 'tester@example.com');
insert into public.profiles (id, role, first_name, last_name)
  values ('11111111-1111-1111-1111-111111111111', 'PROVIDER', 'Tess', 'Ter');
insert into public.provider_profiles (id, user_id, slug)
  values ('22222222-2222-2222-2222-222222222222',
          '11111111-1111-1111-1111-111111111111', 'tess-ter');
insert into public.services (id, provider_profile_id, name, category, duration_minutes, price_in_cents)
  values ('33333333-3333-3333-3333-333333333333',
          '22222222-2222-2222-2222-222222222222', 'Cut', 'HAIRCUT', 60, 5000);

-- First booking: 14:00-15:00
insert into public.bookings (client_id, service_id, provider_profile_id, status, start_time, end_time, total_price_in_cents)
  values ('11111111-1111-1111-1111-111111111111',
          '33333333-3333-3333-3333-333333333333',
          '22222222-2222-2222-2222-222222222222',
          'CONFIRMED', '2026-06-01T14:00:00Z', '2026-06-01T15:00:00Z', 5000);

-- 1) Overlapping active booking (14:30-15:30) must be rejected.
select throws_ok(
  $$insert into public.bookings (client_id, service_id, provider_profile_id, status, start_time, end_time, total_price_in_cents)
     values ('11111111-1111-1111-1111-111111111111',
             '33333333-3333-3333-3333-333333333333',
             '22222222-2222-2222-2222-222222222222',
             'PENDING', '2026-06-01T14:30:00Z', '2026-06-01T15:30:00Z', 5000)$$,
  '23P01',
  NULL,
  'overlapping active booking is rejected by exclusion constraint'
);

-- 2) Non-overlapping booking (15:00-16:00) is allowed.
select lives_ok(
  $$insert into public.bookings (client_id, service_id, provider_profile_id, status, start_time, end_time, total_price_in_cents)
     values ('11111111-1111-1111-1111-111111111111',
             '33333333-3333-3333-3333-333333333333',
             '22222222-2222-2222-2222-222222222222',
             'PENDING', '2026-06-01T15:00:00Z', '2026-06-01T16:00:00Z', 5000)$$,
  'adjacent non-overlapping booking is allowed'
);

-- 3) A CANCELLED booking does not block an overlapping slot.
insert into public.bookings (client_id, service_id, provider_profile_id, status, start_time, end_time, total_price_in_cents)
  values ('11111111-1111-1111-1111-111111111111',
          '33333333-3333-3333-3333-333333333333',
          '22222222-2222-2222-2222-222222222222',
          'CANCELLED', '2026-06-01T18:00:00Z', '2026-06-01T19:00:00Z', 5000);
select lives_ok(
  $$insert into public.bookings (client_id, service_id, provider_profile_id, status, start_time, end_time, total_price_in_cents)
     values ('11111111-1111-1111-1111-111111111111',
             '33333333-3333-3333-3333-333333333333',
             '22222222-2222-2222-2222-222222222222',
             'CONFIRMED', '2026-06-01T18:00:00Z', '2026-06-01T19:00:00Z', 5000)$$,
  'cancelled booking does not block the same slot'
);

select * from finish();
rollback;
