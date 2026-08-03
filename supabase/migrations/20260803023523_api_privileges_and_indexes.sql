-- Supabase no longer auto-grants API access for newly created tables. Keep the
-- exposed surface explicit so RLS is the row-level boundary and SQL privileges
-- are the operation-level boundary.

revoke all on table
  public.profiles,
  public.provider_profiles,
  public.services,
  public.availability,
  public.availability_overrides,
  public.portfolio_items,
  public.bookings,
  public.payments,
  public.refunds,
  public.reviews,
  public.conversations,
  public.messages,
  public.posts,
  public.comments,
  public.calendar_connections,
  public.external_events,
  public.waitlist_entries,
  public.public_provider_profiles
from anon, authenticated;

grant select on table
  public.services,
  public.availability,
  public.availability_overrides,
  public.portfolio_items,
  public.reviews,
  public.posts,
  public.comments
to anon;
grant insert on table public.waitlist_entries to anon;

grant select, update on table public.profiles, public.provider_profiles to authenticated;
grant select, insert, update, delete on table
  public.services,
  public.availability,
  public.availability_overrides,
  public.portfolio_items
to authenticated;
grant delete on table public.calendar_connections to authenticated;
grant select (
  id,
  user_id,
  provider,
  external_id,
  feed_url,
  last_synced_at,
  is_active,
  created_at
) on table public.calendar_connections to authenticated;
grant select on table
  public.bookings,
  public.payments,
  public.refunds,
  public.reviews,
  public.conversations,
  public.messages,
  public.external_events
to authenticated;
grant select, insert, delete on table public.posts, public.comments to authenticated;
grant select, insert on table public.waitlist_entries to authenticated;

grant all on all tables in schema public to service_role;

-- SECURITY DEFINER routines are not callable by PUBLIC unless intentionally
-- exposed below.
revoke all on function public.current_app_role() from public, anon, authenticated;
revoke all on function public.is_admin() from public, anon, authenticated;
revoke all on function public.my_provider_profile_id() from public, anon, authenticated;
revoke all on function public.shares_booking_or_convo(uuid) from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.create_booking(uuid, timestamptz, text, text, double precision, double precision) from public, anon, authenticated;
revoke all on function public.update_booking_status(uuid, public.booking_status) from public, anon, authenticated;
revoke all on function public.send_message(uuid, text, text) from public, anon, authenticated;
revoke all on function public.mark_conversation_read(uuid) from public, anon, authenticated;
revoke all on function public.create_review(uuid, integer, text, text[]) from public, anon, authenticated;
revoke all on function public.search_providers(text, public.service_category, double precision, double precision, double precision, integer, integer) from public, anon, authenticated;
revoke all on function public.get_provider_busy_intervals(uuid, timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.tg_send_email_webhook() from public, anon, authenticated;

grant execute on function public.current_app_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.my_provider_profile_id() to authenticated;
grant execute on function public.shares_booking_or_convo(uuid) to authenticated;
grant execute on function public.create_booking(uuid, timestamptz, text, text, double precision, double precision) to authenticated;
grant execute on function public.update_booking_status(uuid, public.booking_status) to authenticated;
grant execute on function public.send_message(uuid, text, text) to authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
grant execute on function public.create_review(uuid, integer, text, text[]) to authenticated;
grant execute on function public.search_providers(text, public.service_category, double precision, double precision, double precision, integer, integer) to anon, authenticated;
grant execute on function public.get_provider_busy_intervals(uuid, timestamptz, timestamptz) to anon, authenticated;

-- Keep encrypted OAuth credentials off every client-readable relation. RLS is
-- evaluated as the caller because the view is a security invoker.
create view public.calendar_connections_safe
with (security_invoker = true)
as
select
  connection.id,
  connection.user_id,
  connection.provider,
  connection.external_id,
  connection.feed_url,
  connection.last_synced_at,
  connection.is_active,
  connection.created_at,
  (
    select count(*)::integer
    from public.external_events event
    where event.calendar_connection_id = connection.id
  ) as external_event_count
from public.calendar_connections connection;

revoke all on table public.calendar_connections_safe from public, anon, authenticated;
grant select on table public.calendar_connections_safe to authenticated;
grant select on table public.calendar_connections_safe to service_role;

alter table public.availability
  add constraint availability_time_format_check check (
    start_time ~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$'
    and end_time ~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$'
  ),
  add constraint availability_time_order_check check (
    start_time::time < end_time::time
  );

-- Replacing a weekly schedule is a single transaction, so a failed insert
-- cannot leave the provider with an empty schedule.
create or replace function public.replace_my_availability(p_slots jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_provider_id uuid;
begin
  if jsonb_typeof(p_slots) is distinct from 'array' then
    raise exception 'Availability slots must be a JSON array'
      using errcode = '22023';
  end if;

  v_provider_id := public.my_provider_profile_id();
  if v_provider_id is null then
    raise exception 'Provider profile required'
      using errcode = '42501';
  end if;

  delete from public.availability
  where provider_profile_id = v_provider_id;

  insert into public.availability (
    provider_profile_id,
    day_of_week,
    start_time,
    end_time
  )
  select
    v_provider_id,
    (slot.value ->> 'dayOfWeek')::integer,
    slot.value ->> 'startTime',
    slot.value ->> 'endTime'
  from jsonb_array_elements(p_slots) as slot(value);
end;
$$;

revoke all on function public.replace_my_availability(jsonb)
from public, anon, authenticated;
grant execute on function public.replace_my_availability(jsonb) to authenticated;

-- PostgreSQL does not add indexes to the referencing side of foreign keys.
create index bookings_service_idx on public.bookings(service_id);
create index portfolio_items_service_idx on public.portfolio_items(service_id);
create index refunds_initiated_by_user_idx on public.refunds(initiated_by_user_id);
create index comments_author_idx on public.comments(author_id);
