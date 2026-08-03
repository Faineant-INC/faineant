-- Centralize the marketplace publication rule so every public relation and RPC
-- agrees: a provider is visible only after approval and while their account is
-- active. Owners and administrators retain access to unpublished catalog rows.
create or replace function public.is_public_provider(p_provider_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.provider_profiles as provider
    join public.profiles as profile on profile.id = provider.user_id
    where provider.id = p_provider_profile_id
      and provider.is_verified = true
      and profile.is_active = true
  );
$$;

revoke all on function public.is_public_provider(uuid)
from public, anon, authenticated;
grant execute on function public.is_public_provider(uuid) to anon, authenticated;

create or replace view public.public_provider_profiles
with (security_invoker = true)
as
select
  provider.id,
  provider.slug,
  provider.business_name,
  provider.bio,
  provider.service_radius,
  provider.latitude,
  provider.longitude,
  provider.is_verified,
  provider.average_rating,
  provider.total_reviews,
  profile.first_name,
  profile.last_name,
  profile.avatar_url
from public.provider_profiles as provider
join public.profiles as profile on profile.id = provider.user_id
where profile.is_active = true
  and provider.is_verified = true;

drop policy services_anon_read on public.services;
create policy services_anon_read on public.services
  for select to anon
  using (
    is_active = true
    and public.is_public_provider(provider_profile_id)
  );

drop policy services_authenticated_read on public.services;
create policy services_authenticated_read on public.services
  for select to authenticated
  using (
    (is_active = true and public.is_public_provider(provider_profile_id))
    or provider_profile_id = (select public.my_provider_profile_id())
    or (select public.is_admin())
  );

drop policy availability_anon_read on public.availability;
create policy availability_anon_read on public.availability
  for select to anon
  using (public.is_public_provider(provider_profile_id));

drop policy availability_authenticated_read on public.availability;
create policy availability_authenticated_read on public.availability
  for select to authenticated
  using (
    public.is_public_provider(provider_profile_id)
    or provider_profile_id = (select public.my_provider_profile_id())
    or (select public.is_admin())
  );

drop policy availability_overrides_anon_read on public.availability_overrides;
create policy availability_overrides_anon_read on public.availability_overrides
  for select to anon
  using (public.is_public_provider(provider_profile_id));

drop policy availability_overrides_authenticated_read on public.availability_overrides;
create policy availability_overrides_authenticated_read on public.availability_overrides
  for select to authenticated
  using (
    public.is_public_provider(provider_profile_id)
    or provider_profile_id = (select public.my_provider_profile_id())
    or (select public.is_admin())
  );

drop policy portfolio_items_anon_read on public.portfolio_items;
create policy portfolio_items_anon_read on public.portfolio_items
  for select to anon
  using (public.is_public_provider(provider_profile_id));

drop policy portfolio_items_authenticated_read on public.portfolio_items;
create policy portfolio_items_authenticated_read on public.portfolio_items
  for select to authenticated
  using (
    public.is_public_provider(provider_profile_id)
    or provider_profile_id = (select public.my_provider_profile_id())
    or (select public.is_admin())
  );

create or replace function public.get_provider_busy_intervals(
  p_provider_profile_id uuid,
  p_from timestamptz,
  p_to timestamptz
) returns table (start_time timestamptz, end_time timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select booking.start_time, booking.end_time
  from public.bookings as booking
  where booking.provider_profile_id = p_provider_profile_id
    and (
      public.is_public_provider(p_provider_profile_id)
      or p_provider_profile_id = public.my_provider_profile_id()
      or public.is_admin()
    )
    and booking.status in ('PENDING', 'CONFIRMED', 'IN_PROGRESS')
    and booking.start_time < p_to
    and booking.end_time > p_from
  union all
  select event.start_time, event.end_time
  from public.external_events as event
  join public.calendar_connections as connection
    on connection.id = event.calendar_connection_id
  join public.provider_profiles as provider
    on provider.user_id = connection.user_id
  where provider.id = p_provider_profile_id
    and (
      public.is_public_provider(p_provider_profile_id)
      or p_provider_profile_id = public.my_provider_profile_id()
      or public.is_admin()
    )
    and event.start_time < p_to
    and event.end_time > p_from;
$$;

revoke all on function public.get_provider_busy_intervals(uuid, timestamptz, timestamptz)
from public, anon, authenticated;
grant execute on function public.get_provider_busy_intervals(uuid, timestamptz, timestamptz)
to anon, authenticated;
