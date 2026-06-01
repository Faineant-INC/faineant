begin;
select plan(4);

insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaa0000-0000-0000-0000-0000000000e1','d1@example.com','{"role":"PROVIDER","first_name":"Near","last_name":"Provider"}'),
  ('aaaa0000-0000-0000-0000-0000000000e2','d2@example.com','{"role":"PROVIDER","first_name":"Far","last_name":"Provider"}');

update public.provider_profiles set latitude = 41.8781, longitude = -87.6298
  where user_id = 'aaaa0000-0000-0000-0000-0000000000e1';
update public.provider_profiles set latitude = 34.0522, longitude = -118.2437
  where user_id = 'aaaa0000-0000-0000-0000-0000000000e2';
insert into public.services (provider_profile_id, name, category, duration_minutes, price_in_cents, is_active)
  select id, 'Cut', 'HAIRCUT', 60, 5000, true from public.provider_profiles
  where user_id in ('aaaa0000-0000-0000-0000-0000000000e1','aaaa0000-0000-0000-0000-0000000000e2');

set local role anon;
select is(
  (select count(*)::int from public.search_providers('Near')),
  1, 'text search matches the Near provider by name');
select is(
  (select count(*)::int from public.search_providers(null, 'HAIRCUT')),
  2, 'category filter returns both HAIRCUT providers');
select is(
  (select count(*)::int from public.search_providers(null, null, 41.8781, -87.6298, 50)),
  1, 'geo radius around Chicago returns only the near provider');
select is(
  (select count(*)::int from public.get_provider_busy_intervals(
      (select id from public.provider_profiles where user_id='aaaa0000-0000-0000-0000-0000000000e1'),
      '2026-08-01T00:00:00Z','2026-08-02T00:00:00Z')),
  0, 'no busy intervals for a provider with no bookings');
reset role;

select * from finish();
rollback;
