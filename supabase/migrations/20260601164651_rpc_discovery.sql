create or replace function public.search_providers(
  p_text text default null,
  p_category public.service_category default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_radius_km double precision default null,
  p_limit integer default 20,
  p_offset integer default 0
) returns setof public.public_provider_profiles
language sql stable security definer set search_path = '' as $$
  select v.*
  from public.public_provider_profiles v
  where (
      p_category is null
      or exists (
        select 1 from public.services s
        where s.provider_profile_id = v.id and s.is_active and s.category = p_category
      )
    )
    and (
      p_text is null
      or v.business_name ilike '%' || p_text || '%'
      or (coalesce(v.first_name,'') || ' ' || coalesce(v.last_name,'')) ilike '%' || p_text || '%'
      or v.bio ilike '%' || p_text || '%'
    )
    and (
      p_lat is null or p_lng is null or p_radius_km is null
      or (
        v.latitude is not null and v.longitude is not null
        and extensions.st_dwithin(
              extensions.st_makepoint(v.longitude, v.latitude)::extensions.geography,
              extensions.st_makepoint(p_lng, p_lat)::extensions.geography,
              p_radius_km * 1000)
      )
    )
  order by
    case
      when p_lat is not null and p_lng is not null and v.latitude is not null
      then extensions.st_distance(
             extensions.st_makepoint(v.longitude, v.latitude)::extensions.geography,
             extensions.st_makepoint(p_lng, p_lat)::extensions.geography)
      else null
    end asc nulls last,
    v.average_rating desc
  limit least(greatest(p_limit, 0), 100) offset greatest(p_offset, 0);
$$;
grant execute on function public.search_providers(text, public.service_category, double precision, double precision, double precision, integer, integer) to anon, authenticated;

create or replace function public.get_provider_busy_intervals(
  p_provider_profile_id uuid,
  p_from timestamptz,
  p_to timestamptz
) returns table (start_time timestamptz, end_time timestamptz)
language sql stable security definer set search_path = '' as $$
  select b.start_time, b.end_time
  from public.bookings b
  where b.provider_profile_id = p_provider_profile_id
    and b.status in ('PENDING','CONFIRMED','IN_PROGRESS')
    and b.start_time < p_to and b.end_time > p_from
  union all
  select e.start_time, e.end_time
  from public.external_events e
  join public.calendar_connections c on c.id = e.calendar_connection_id
  join public.provider_profiles pp on pp.user_id = c.user_id
  where pp.id = p_provider_profile_id
    and e.start_time < p_to and e.end_time > p_from;
$$;
grant execute on function public.get_provider_busy_intervals(uuid, timestamptz, timestamptz) to anon, authenticated;
