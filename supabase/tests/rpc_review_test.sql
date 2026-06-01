begin;
select plan(5);

insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  ('77777777-0000-0000-0000-0000000000c1','rc@example.com', now(), '{"role":"CLIENT","first_name":"Rev","last_name":"Client"}'),
  ('77777777-0000-0000-0000-0000000000e3','rp@example.com', now(), '{"role":"PROVIDER","first_name":"Rev","last_name":"Prov"}');

insert into public.services (id, provider_profile_id, name, category, duration_minutes, price_in_cents, is_active)
  select '88888888-0000-0000-0000-0000000000f1',
         (select id from public.provider_profiles where user_id='77777777-0000-0000-0000-0000000000e3'),
         'Cut','HAIRCUT',60,5000,true;

insert into public.bookings (id, client_id, service_id, provider_profile_id, status, start_time, end_time, total_price_in_cents)
  select '99999999-0000-0000-0000-0000000000b1',
         '77777777-0000-0000-0000-0000000000c1',
         '88888888-0000-0000-0000-0000000000f1',
         (select id from public.provider_profiles where user_id='77777777-0000-0000-0000-0000000000e3'),
         'COMPLETED','2026-05-01T14:00:00Z','2026-05-01T15:00:00Z',5000;

set local role authenticated;
set local request.jwt.claims = '{"sub":"77777777-0000-0000-0000-0000000000c1","role":"authenticated"}';
select lives_ok(
  $$select public.create_review('99999999-0000-0000-0000-0000000000b1', 5, 'Great')$$,
  'client can review their completed booking');
select throws_ok(
  $$select public.create_review('99999999-0000-0000-0000-0000000000b1', 4, 'again')$$,
  'P0001', 'This booking has already been reviewed',
  'cannot review the same booking twice');
reset role;

select is(
  (select total_reviews from public.provider_profiles where user_id='77777777-0000-0000-0000-0000000000e3'),
  1, 'provider total_reviews incremented');
select is(
  (select average_rating from public.provider_profiles where user_id='77777777-0000-0000-0000-0000000000e3'),
  5::double precision, 'provider average_rating updated');

set local role anon;
set local request.jwt.claims = '';
select throws_ok(
  $$select public.create_review('99999999-0000-0000-0000-0000000000b1', 5, 'x')$$,
  '28000', 'Not authenticated',
  'anon cannot create a review');
reset role;

select * from finish();
rollback;
