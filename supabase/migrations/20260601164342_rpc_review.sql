create or replace function public.create_review(
  p_booking_id uuid,
  p_rating integer,
  p_text text default null,
  p_photos text[] default '{}'
) returns public.reviews
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_b public.bookings;
  v_review public.reviews;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if p_rating < 1 or p_rating > 5 then
    raise exception 'Rating must be between 1 and 5' using errcode = 'P0001';
  end if;

  select * into v_b from public.bookings where id = p_booking_id;
  if not found then raise exception 'Booking not found' using errcode = 'P0002'; end if;
  if v_b.client_id <> v_uid then
    raise exception 'You can only review your own booking' using errcode = '42501';
  end if;
  if v_b.status <> 'COMPLETED' then
    raise exception 'Can only review a completed booking' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.reviews where booking_id = p_booking_id) then
    raise exception 'This booking has already been reviewed' using errcode = 'P0001';
  end if;

  insert into public.reviews (booking_id, client_id, provider_profile_id, rating, text, photos)
  values (p_booking_id, v_uid, v_b.provider_profile_id, p_rating, p_text, p_photos)
  returning * into v_review;

  update public.provider_profiles pp set
    total_reviews  = (select count(*) from public.reviews r where r.provider_profile_id = pp.id),
    average_rating = (select coalesce(avg(rating), 0) from public.reviews r where r.provider_profile_id = pp.id)
  where pp.id = v_b.provider_profile_id;

  return v_review;
end;
$$;
grant execute on function public.create_review(uuid, integer, text, text[]) to authenticated;
