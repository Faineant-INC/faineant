-- ── services: public reads active; owner full; admin full ─────────────────────
alter table public.services enable row level security;
create policy services_public_read on public.services
  for select to anon, authenticated using (is_active = true);
create policy services_owner_read on public.services
  for select to authenticated using (provider_profile_id = public.my_provider_profile_id());
create policy services_owner_write on public.services
  for all to authenticated
  using (provider_profile_id = public.my_provider_profile_id())
  with check (provider_profile_id = public.my_provider_profile_id());
create policy services_admin on public.services
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ── availability ──────────────────────────────────────────────────────────────
alter table public.availability enable row level security;
create policy availability_public_read on public.availability
  for select to anon, authenticated using (true);
create policy availability_owner_write on public.availability
  for all to authenticated
  using (provider_profile_id = public.my_provider_profile_id())
  with check (provider_profile_id = public.my_provider_profile_id());
create policy availability_admin on public.availability
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ── availability_overrides ───────────────────────────────────────────────────
alter table public.availability_overrides enable row level security;
create policy availability_overrides_public_read on public.availability_overrides
  for select to anon, authenticated using (true);
create policy availability_overrides_owner_write on public.availability_overrides
  for all to authenticated
  using (provider_profile_id = public.my_provider_profile_id())
  with check (provider_profile_id = public.my_provider_profile_id());
create policy availability_overrides_admin on public.availability_overrides
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ── portfolio_items ──────────────────────────────────────────────────────────
alter table public.portfolio_items enable row level security;
create policy portfolio_items_public_read on public.portfolio_items
  for select to anon, authenticated using (true);
create policy portfolio_items_owner_write on public.portfolio_items
  for all to authenticated
  using (provider_profile_id = public.my_provider_profile_id())
  with check (provider_profile_id = public.my_provider_profile_id());
create policy portfolio_items_admin on public.portfolio_items
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
