-- ── profiles ────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;

create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or public.is_admin()
    or public.shares_booking_or_convo(id)
  );

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy profiles_admin_all on public.profiles
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ── provider_profiles (base: owner/admin only; public goes via the view) ──────
alter table public.provider_profiles enable row level security;

create policy provider_profiles_select_self on public.provider_profiles
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

create policy provider_profiles_update_self on public.provider_profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy provider_profiles_admin_all on public.provider_profiles
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ── public_provider_profiles VIEW (safe columns only; bypasses base RLS) ──────
create view public.public_provider_profiles as
  select
    pp.id, pp.slug, pp.business_name, pp.bio, pp.service_radius,
    pp.latitude, pp.longitude, pp.is_verified,
    pp.average_rating, pp.total_reviews,
    pr.first_name, pr.last_name, pr.avatar_url
  from public.provider_profiles pp
  join public.profiles pr on pr.id = pp.user_id
  where pr.is_active = true;

grant select on public.public_provider_profiles to anon, authenticated;
