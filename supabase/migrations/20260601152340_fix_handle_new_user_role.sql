-- Harden handle_new_user: validate role before casting so an unrecognized
-- role value falls back to CLIENT instead of raising and failing the signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_role  public.user_role := case
            when (new.raw_user_meta_data->>'role') in ('CLIENT','PROVIDER','ADMIN')
              then (new.raw_user_meta_data->>'role')::public.user_role
            else 'CLIENT' end;
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
