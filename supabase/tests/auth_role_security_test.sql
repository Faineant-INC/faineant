begin;

select plan(10);

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values
  (
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'metadata-admin@example.test',
    crypt('test-password', gen_salt('bf')),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"ADMIN","first_name":"Metadata","last_name":"Admin"}'::jsonb,
    now(),
    now()
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'app-admin@example.test',
    crypt('test-password', gen_salt('bf')),
    '{"provider":"email","providers":["email"],"role":"ADMIN"}'::jsonb,
    '{"first_name":"App","last_name":"Admin"}'::jsonb,
    now(),
    now()
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'provider@example.test',
    crypt('test-password', gen_salt('bf')),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"PROVIDER","first_name":"QA","last_name":"Provider"}'::jsonb,
    now(),
    now()
  );

select is(
  (select role::text from public.profiles where id = '10000000-0000-0000-0000-000000000001'),
  'CLIENT',
  'user-editable metadata cannot create an admin'
);

select is(
  (select role::text from public.profiles where id = '10000000-0000-0000-0000-000000000002'),
  'ADMIN',
  'app metadata can create an admin through a trusted server workflow'
);

select is(
  (select role::text from public.profiles where id = '10000000-0000-0000-0000-000000000003'),
  'PROVIDER',
  'public provider signup still creates a provider profile'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select throws_ok(
  $$update public.profiles set role = 'ADMIN' where id = '10000000-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'a user cannot promote their own profile'
);

select lives_ok(
  $$update public.profiles set first_name = 'Updated' where id = '10000000-0000-0000-0000-000000000001'$$,
  'a user can update an allowed profile field'
);

select lives_ok(
  $$update public.profiles
    set street_address = '1000 W Fulton Market',
        neighbourhood = 'Fulton Market',
        notification_newsletter = true
    where id = '10000000-0000-0000-0000-000000000001'$$,
  'a user can persist their booking address and notification preferences'
);

select throws_ok(
  $$update public.profiles
    set neighbourhood = 'Outside launch area'
    where id = '10000000-0000-0000-0000-000000000001'$$,
  '23514',
  null,
  'an unsupported launch neighbourhood is rejected'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);

select throws_ok(
  $$update public.provider_profiles set is_verified = true where user_id = '10000000-0000-0000-0000-000000000003'$$,
  '42501',
  null,
  'a provider cannot verify their own profile'
);

select throws_ok(
  $$update public.provider_profiles set stripe_onboarding_complete = true where user_id = '10000000-0000-0000-0000-000000000003'$$,
  '42501',
  null,
  'a provider cannot complete their own Stripe onboarding'
);

select lives_ok(
  $$update public.provider_profiles set bio = 'Updated by the provider' where user_id = '10000000-0000-0000-0000-000000000003'$$,
  'a provider can update an allowed public profile field'
);

select * from finish();
rollback;
