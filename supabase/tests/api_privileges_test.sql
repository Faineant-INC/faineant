begin;
select plan(10);

insert into auth.users (id, email, raw_user_meta_data) values
  (
    'dd000000-0000-0000-0000-0000000000a1',
    'calendar-provider@example.com',
    '{"role":"PROVIDER","first_name":"Cal","last_name":"Provider"}'
  ),
  (
    'dd000000-0000-0000-0000-0000000000b2',
    'unrelated-client@example.com',
    '{"role":"CLIENT","first_name":"Una","last_name":"Related"}'
  );

insert into public.calendar_connections (
  id,
  user_id,
  provider,
  access_token,
  refresh_token,
  external_id
) values (
  'dd100000-0000-0000-0000-0000000000a1',
  'dd000000-0000-0000-0000-0000000000a1',
  'GOOGLE',
  'encrypted-access-token',
  'encrypted-refresh-token',
  'primary'
);

insert into public.external_events (
  calendar_connection_id,
  external_id,
  start_time,
  end_time
) values (
  'dd100000-0000-0000-0000-0000000000a1',
  'event-1',
  '2026-09-01T14:00:00Z',
  '2026-09-01T15:00:00Z'
);

select hasnt_column(
  'public',
  'calendar_connections_safe',
  'access_token',
  'safe calendar view never exposes access tokens'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"dd000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

select is(
  (select count(*)::integer from public.calendar_connections_safe),
  1,
  'provider can list their safe calendar connection'
);
select is(
  (
    select external_event_count
    from public.calendar_connections_safe
    where id = 'dd100000-0000-0000-0000-0000000000a1'
  ),
  1,
  'safe calendar connection includes its RLS-scoped event count'
);
select throws_ok(
  'select access_token from public.calendar_connections',
  '42501',
  null,
  'client role cannot select encrypted token columns'
);
select lives_ok(
  $$select public.replace_my_availability(
    '[{"dayOfWeek":1,"startTime":"09:00","endTime":"12:00"},{"dayOfWeek":3,"startTime":"13:00","endTime":"17:00"}]'::jsonb
  )$$,
  'provider can atomically replace their weekly availability'
);
select is(
  (select count(*)::integer from public.availability),
  2,
  'availability replacement inserted every requested slot'
);
select throws_ok(
  $$select public.replace_my_availability(
    '[{"dayOfWeek":2,"startTime":"17:00","endTime":"09:00"}]'::jsonb
  )$$,
  '23514',
  null,
  'invalid availability window is rejected'
);
select is(
  (select count(*)::integer from public.availability),
  2,
  'failed replacement rolls back instead of erasing the prior schedule'
);
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"dd000000-0000-0000-0000-0000000000b2","role":"authenticated"}';
select is(
  (select count(*)::integer from public.calendar_connections_safe),
  0,
  'unrelated client cannot list another user calendar connection'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"dd000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select lives_ok(
  $$delete from public.calendar_connections
    where id = 'dd100000-0000-0000-0000-0000000000a1'$$,
  'provider can disconnect their own calendar'
);
reset role;

select * from finish();
rollback;
