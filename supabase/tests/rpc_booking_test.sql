begin;
select plan(6);

insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  ('44444444-0000-0000-0000-0000000000c1','vc@example.com', now(), '{"role":"CLIENT","first_name":"Val","last_name":"Id"}'),
  ('44444444-0000-0000-0000-0000000000e3','vp@example.com', now(), '{"role":"PROVIDER","first_name":"Prov","last_name":"Ider"}');
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  ('44444444-0000-0000-0000-0000000000c2','uc@example.com', null, '{"role":"CLIENT","first_name":"Un","last_name":"Verified"}');

insert into public.services (id, provider_profile_id, name, category, duration_minutes, price_in_cents, is_active)
  select '55555555-0000-0000-0000-0000000000f1',
         (select id from public.provider_profiles where user_id='44444444-0000-0000-0000-0000000000e3'),
         'Cut','HAIRCUT',60,5000,true;

set local role authenticated;
set local request.jwt.claims = '{"sub":"44444444-0000-0000-0000-0000000000c1","role":"authenticated"}';
select lives_ok(
  $$select public.create_booking('55555555-0000-0000-0000-0000000000f1','2026-08-01T14:00:00Z')$$,
  'verified client can create a booking');
select is(
  (select count(*)::int from public.bookings where client_id='44444444-0000-0000-0000-0000000000c1'),
  1, 'booking row created for the client');
select throws_ok(
  $$select public.create_booking('55555555-0000-0000-0000-0000000000f1','2026-08-01T14:30:00Z')$$,
  'P0001', 'This time slot is no longer available',
  'overlapping booking rejected with friendly error');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"44444444-0000-0000-0000-0000000000c2","role":"authenticated"}';
select throws_ok(
  $$select public.create_booking('55555555-0000-0000-0000-0000000000f1','2026-08-02T14:00:00Z')$$,
  '42501', 'Email not verified',
  'unverified client cannot book');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"44444444-0000-0000-0000-0000000000c1","role":"authenticated"}';
select throws_ok(
  $$select public.update_booking_status(
      (select id from public.bookings where client_id='44444444-0000-0000-0000-0000000000c1' limit 1),
      'CONFIRMED')$$,
  '42501', 'Only the provider can perform this action',
  'client cannot CONFIRM a booking (provider-only action)');
reset role;

-- An anonymous caller must not be able to cancel arbitrary bookings.
set local role anon;
set local request.jwt.claims = '';
select throws_ok(
  $$select public.update_booking_status(
      (select id from public.bookings where client_id='44444444-0000-0000-0000-0000000000c1' limit 1),
      'CANCELLED')$$,
  '28000', 'Not authenticated',
  'anon cannot cancel a booking');
reset role;

select * from finish();
rollback;
