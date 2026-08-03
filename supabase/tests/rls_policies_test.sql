begin;
select plan(9);

-- ── Seed (as superuser; trigger auto-creates profiles/provider_profiles) ──────
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-0000-0000-0000-000000000a01','clientA@example.com','{"role":"CLIENT","first_name":"Alice","last_name":"A"}'),
  ('11111111-0000-0000-0000-000000000b02','clientB@example.com','{"role":"CLIENT","first_name":"Bob","last_name":"B"}'),
  ('11111111-0000-0000-0000-000000000e03','prov@example.com','{"role":"PROVIDER","first_name":"Pam","last_name":"P"}');

insert into public.services (id, provider_profile_id, name, category, duration_minutes, price_in_cents, is_active)
  select '22222222-0000-0000-0000-000000000f01',
         (select id from public.provider_profiles where user_id='11111111-0000-0000-0000-000000000e03'),
         'Cut','HAIRCUT',60,5000,true;
insert into public.services (id, provider_profile_id, name, category, duration_minutes, price_in_cents, is_active)
  select '22222222-0000-0000-0000-000000000f02',
         (select id from public.provider_profiles where user_id='11111111-0000-0000-0000-000000000e03'),
         'Hidden','HAIRCUT',60,5000,false;

update public.provider_profiles
set is_verified = true
where user_id = '11111111-0000-0000-0000-000000000e03';

insert into public.bookings (id, client_id, service_id, provider_profile_id, status, start_time, end_time, total_price_in_cents)
  select '33333333-0000-0000-0000-000000000bc1',
         '11111111-0000-0000-0000-000000000a01',
         '22222222-0000-0000-0000-000000000f01',
         (select id from public.provider_profiles where user_id='11111111-0000-0000-0000-000000000e03'),
         'CONFIRMED','2026-07-01T14:00:00Z','2026-07-01T15:00:00Z',5000;

-- ── anon ────────────────────────────────────────────────────────────────────
set local role anon;
select is((select count(*)::int from public.search_providers()),
  1, 'anon can discover the provider through the public RPC');
select is((select count(*)::int from public.services),
  1, 'anon sees only the 1 ACTIVE service (inactive hidden by RLS)');
select throws_ok(
  'select count(*) from public.profiles',
  '42501', null,
  'anon cannot read base profiles at all');
select throws_ok(
  'select count(*) from public.waitlist_entries',
  '42501', null,
  'anon cannot read waitlist entries');
reset role;

-- ── clientB (unrelated to clientA/Pam) ────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-0000-0000-0000-000000000b02","role":"authenticated"}';
select is((select count(*)::int from public.profiles where id='11111111-0000-0000-0000-000000000a01'),
  0, 'clientB cannot see clientA profile (no shared booking/convo)');
select is((select count(*)::int from public.bookings),
  0, 'clientB sees no bookings (not theirs)');
reset role;

-- ── clientA (booked with Pam) ─────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-0000-0000-0000-000000000a01","role":"authenticated"}';
select is((select count(*)::int from public.bookings where id='33333333-0000-0000-0000-000000000bc1'),
  1, 'clientA can see their own booking');
select is((select count(*)::int from public.profiles where id='11111111-0000-0000-0000-000000000e03'),
  1, 'clientA can see Pam profile (shared booking -> counterparty)');
reset role;

-- ── Pam (provider) ────────────────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-0000-0000-0000-000000000e03","role":"authenticated"}';
select is((select count(*)::int from public.bookings where id='33333333-0000-0000-0000-000000000bc1'),
  1, 'provider can see the booking made for them');
reset role;

select * from finish();
rollback;
