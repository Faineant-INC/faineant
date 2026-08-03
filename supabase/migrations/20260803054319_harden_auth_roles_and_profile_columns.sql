-- Authorization belongs in app metadata and database rows, never in
-- user-editable signup metadata. Public signup may select the CLIENT or
-- PROVIDER experience, but only an administrator using the Auth Admin API can
-- create an ADMIN identity by setting raw_app_meta_data.role.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.user_role := case
    when new.raw_app_meta_data->>'role' = 'ADMIN' then 'ADMIN'
    when new.raw_user_meta_data->>'role' = 'PROVIDER' then 'PROVIDER'
    else 'CLIENT'
  end;
  v_first text := coalesce(new.raw_user_meta_data->>'first_name', '');
  v_last text := coalesce(new.raw_user_meta_data->>'last_name', '');
  v_phone text := new.raw_user_meta_data->>'phone';
  v_slug text;
begin
  insert into public.profiles (id, role, first_name, last_name, phone)
  values (new.id, v_role, v_first, v_last, v_phone);

  if v_role = 'PROVIDER' then
    v_slug := lower(
      regexp_replace(
        coalesce(nullif(v_first || '-' || v_last, '-'), 'provider'),
        '[^a-zA-Z0-9]+',
        '-',
        'g'
      )
    ) || '-' || substr(new.id::text, 1, 8);

    insert into public.provider_profiles (user_id, slug)
    values (new.id, v_slug);
  end if;

  return new;
end;
$$;

-- RLS determines whose record can be changed. Column grants determine which
-- fields a browser or mobile client is allowed to change. Sensitive fields are
-- reserved for service-role workflows and SECURITY DEFINER RPCs.
revoke update on table public.profiles from authenticated;
grant update (first_name, last_name, phone, avatar_url)
on table public.profiles to authenticated;

revoke update on table public.provider_profiles from authenticated;
grant update (
  bio,
  business_name,
  address,
  latitude,
  longitude,
  service_radius
)
on table public.provider_profiles to authenticated;
