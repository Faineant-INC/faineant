begin;
select plan(4);

insert into auth.users (id, email, raw_user_meta_data) values
  ('66666666-0000-0000-0000-0000000000a1','m1@example.com','{"role":"CLIENT","first_name":"Em","last_name":"One"}'),
  ('66666666-0000-0000-0000-0000000000b2','m2@example.com','{"role":"CLIENT","first_name":"Em","last_name":"Two"}');

set local role authenticated;
set local request.jwt.claims = '{"sub":"66666666-0000-0000-0000-0000000000a1","role":"authenticated"}';
select lives_ok(
  $$select public.send_message('66666666-0000-0000-0000-0000000000b2','hello')$$,
  'm1 can send a message to m2');
select is(
  (select count(*)::int from public.conversations),
  1, 'exactly one conversation row created (normalized pair)');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"66666666-0000-0000-0000-0000000000b2","role":"authenticated"}';
select lives_ok(
  $$select public.send_message('66666666-0000-0000-0000-0000000000a1','hi back')$$,
  'm2 can reply');
select is(
  (select count(*)::int from public.conversations),
  1, 'reply reuses the same conversation (no duplicate pair)');
reset role;

select * from finish();
rollback;
