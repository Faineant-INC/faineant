create or replace function public.create_booking(
  p_service_id uuid,
  p_start_time timestamptz,
  p_notes text default null,
  p_location text default null,
  p_latitude double precision default null,
  p_longitude double precision default null
) returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_verified boolean;
  v_svc public.services;
  v_booking public.bookings;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select (email_confirmed_at is not null) into v_verified
  from auth.users where id = v_uid;
  if not coalesce(v_verified, false) then
    raise exception 'Email not verified' using errcode = '42501';
  end if;

  select * into v_svc from public.services
  where id = p_service_id and is_active = true;
  if not found then
    raise exception 'Service not found or inactive' using errcode = 'P0002';
  end if;

  begin
    insert into public.bookings (
      client_id, service_id, provider_profile_id, status,
      start_time, end_time, total_price_in_cents, notes, location, latitude, longitude
    ) values (
      v_uid, p_service_id, v_svc.provider_profile_id, 'PENDING',
      p_start_time, p_start_time + make_interval(mins => v_svc.duration_minutes),
      v_svc.price_in_cents, p_notes, p_location, p_latitude, p_longitude
    ) returning * into v_booking;
  exception when exclusion_violation then
    raise exception 'This time slot is no longer available' using errcode = 'P0001';
  end;

  return v_booking;
end;
$$;
grant execute on function public.create_booking(uuid, timestamptz, text, text, double precision, double precision) to authenticated;

create or replace function public.update_booking_status(
  p_booking_id uuid,
  p_new_status public.booking_status
) returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_b public.bookings;
  v_is_client boolean;
  v_is_provider boolean;
  v_allowed public.booking_status[];
begin
  select * into v_b from public.bookings where id = p_booking_id;
  if not found then
    raise exception 'Booking not found' using errcode = 'P0002';
  end if;

  v_is_client := v_b.client_id = v_uid;
  v_is_provider := coalesce(v_b.provider_profile_id = public.my_provider_profile_id(), false);
  if not (v_is_client or v_is_provider) then
    raise exception 'Not authorized to update this booking' using errcode = '42501';
  end if;

  v_allowed := case v_b.status
    when 'PENDING'     then array['CONFIRMED','CANCELLED']
    when 'CONFIRMED'   then array['IN_PROGRESS','CANCELLED','NO_SHOW']
    when 'IN_PROGRESS' then array['COMPLETED']
    else array[]::text[]
  end::public.booking_status[];
  if not (p_new_status = any (v_allowed)) then
    raise exception 'Cannot transition from % to %', v_b.status, p_new_status using errcode = 'P0001';
  end if;

  if p_new_status in ('CONFIRMED','IN_PROGRESS','COMPLETED','NO_SHOW') and not coalesce(v_is_provider, false) then
    raise exception 'Only the provider can perform this action' using errcode = '42501';
  end if;

  update public.bookings set status = p_new_status
  where id = p_booking_id returning * into v_b;
  return v_b;
end;
$$;
grant execute on function public.update_booking_status(uuid, public.booking_status) to authenticated;
