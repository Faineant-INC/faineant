begin;
select plan(4);

insert into auth.users (id, email) values
  ('cc000000-0000-0000-0000-0000000000a1', 'ua@example.com'),
  ('cc000000-0000-0000-0000-0000000000b2', 'ub@example.com');

set local role authenticated;
set local request.jwt.claims = '{"sub":"cc000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select lives_ok(
  $$insert into storage.objects (id, bucket_id, name, owner)
    values (gen_random_uuid(), 'uploads', 'cc000000-0000-0000-0000-0000000000a1/avatar.jpg', 'cc000000-0000-0000-0000-0000000000a1')$$,
  'user can upload to their own folder');
select throws_ok(
  $$insert into storage.objects (id, bucket_id, name, owner)
    values (gen_random_uuid(), 'uploads', 'cc000000-0000-0000-0000-0000000000b2/evil.jpg', 'cc000000-0000-0000-0000-0000000000a1')$$,
  '42501', null,
  'user cannot upload to another user''s folder');
reset role;

set local role anon;
set local request.jwt.claims = '';
select is(
  (select count(*)::int from storage.objects where bucket_id='uploads' and name like 'cc000000-0000-0000-0000-0000000000a1/%'),
  1, 'anon can read uploads (public bucket)');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"cc000000-0000-0000-0000-0000000000b2","role":"authenticated"}';
select is(
  (select count(*)::int from storage.objects
   where bucket_id = 'uploads'
     and (storage.foldername(name))[1] = (select auth.uid())::text
     and name = 'cc000000-0000-0000-0000-0000000000a1/avatar.jpg'),
  0, 'user cannot delete another user''s object (RLS hides it from delete)');
reset role;

select * from finish();
rollback;
