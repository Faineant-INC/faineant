begin;
select plan(4);

-- A client signup
insert into auth.users (id, email, raw_user_meta_data)
  values ('00000000-0000-0000-0000-0000000000c1', 'c1@example.com',
          '{"role":"CLIENT","first_name":"Cli","last_name":"Ent"}');
-- A provider signup
insert into auth.users (id, email, raw_user_meta_data)
  values ('00000000-0000-0000-0000-0000000000d1', 'p1@example.com',
          '{"role":"PROVIDER","first_name":"Pro","last_name":"Vider"}');

select is(
  (select role::text from public.profiles where id = '00000000-0000-0000-0000-0000000000c1'),
  'CLIENT', 'client profile auto-created with CLIENT role');
select is(
  (select first_name from public.profiles where id = '00000000-0000-0000-0000-0000000000d1'),
  'Pro', 'provider profile carries first_name from metadata');
select isnt(
  (select id::text from public.provider_profiles where user_id = '00000000-0000-0000-0000-0000000000d1'),
  null, 'provider_profiles row auto-created for PROVIDER signup');
select is(
  (select count(*)::int from public.provider_profiles where user_id = '00000000-0000-0000-0000-0000000000c1'),
  0, 'no provider_profiles row for a CLIENT signup');

select * from finish();
rollback;
