-- Harden update_booking_status: explicit auth gate + NULL-safe ownership checks
-- (an anon caller with auth.uid()=NULL must not slip past the authorization guard).
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
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select * into v_b from public.bookings where id = p_booking_id;
  if not found then
    raise exception 'Booking not found' using errcode = 'P0002';
  end if;

  v_is_client := coalesce(v_b.client_id = v_uid, false);
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

  if p_new_status in ('CONFIRMED','IN_PROGRESS','COMPLETED','NO_SHOW') and not v_is_provider then
    raise exception 'Only the provider can perform this action' using errcode = '42501';
  end if;

  update public.bookings set status = p_new_status
  where id = p_booking_id returning * into v_b;
  return v_b;
end;
$$;
