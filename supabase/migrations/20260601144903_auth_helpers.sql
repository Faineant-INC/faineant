-- Role of the current user (from profiles). SECURITY DEFINER bypasses RLS so
-- it can be safely called inside policies without recursion.
create or replace function public.current_app_role()
returns public.user_role
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = (select auth.uid());
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'ADMIN'
  );
$$;

-- The provider_profiles.id owned by the current user (NULL if not a provider).
create or replace function public.my_provider_profile_id()
returns uuid
language sql stable security definer set search_path = '' as $$
  select id from public.provider_profiles where user_id = (select auth.uid());
$$;

-- True if `other` (a profile id) shares a booking or conversation with the
-- current user -- used to let counterparties see each other's name/avatar.
create or replace function public.shares_booking_or_convo(other uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.bookings b
    join public.provider_profiles pp on pp.id = b.provider_profile_id
    where (b.client_id = (select auth.uid()) and pp.user_id = other)
       or (b.client_id = other and pp.user_id = (select auth.uid()))
  ) or exists (
    select 1 from public.conversations c
    where (c.participant_a_id = (select auth.uid()) and c.participant_b_id = other)
       or (c.participant_b_id = (select auth.uid()) and c.participant_a_id = other)
  );
$$;

-- Mirror each new auth user into profiles (+ provider_profiles for providers).
-- Metadata comes from supabase.auth.signUp({ options: { data: {...} } }).
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_role  public.user_role := coalesce(
            nullif(new.raw_user_meta_data->>'role','')::public.user_role, 'CLIENT');
  v_first text := coalesce(new.raw_user_meta_data->>'first_name', '');
  v_last  text := coalesce(new.raw_user_meta_data->>'last_name', '');
  v_phone text := new.raw_user_meta_data->>'phone';
  v_slug  text;
begin
  insert into public.profiles (id, role, first_name, last_name, phone)
  values (new.id, v_role, v_first, v_last, v_phone);

  if v_role = 'PROVIDER' then
    v_slug := lower(regexp_replace(coalesce(nullif(v_first || '-' || v_last, '-'), 'provider'),
                                   '[^a-zA-Z0-9]+', '-', 'g'))
              || '-' || substr(new.id::text, 1, 8);
    insert into public.provider_profiles (user_id, slug) values (new.id, v_slug);
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
