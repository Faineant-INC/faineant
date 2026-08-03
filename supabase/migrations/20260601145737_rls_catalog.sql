-- Public catalog reads stay open, while mutations are limited to the owning
-- provider or an administrator. One policy per role/action avoids evaluating
-- several permissive policies for every row.

alter table public.services enable row level security;
create policy services_anon_read on public.services
  for select to anon using (is_active = true);
create policy services_authenticated_read on public.services
  for select to authenticated using (
    is_active = true
    or provider_profile_id = (select public.my_provider_profile_id())
    or (select public.is_admin())
  );
create policy services_insert on public.services
  for insert to authenticated with check (
    provider_profile_id = (select public.my_provider_profile_id())
    or (select public.is_admin())
  );
create policy services_update on public.services
  for update to authenticated
  using (
    provider_profile_id = (select public.my_provider_profile_id())
    or (select public.is_admin())
  )
  with check (
    provider_profile_id = (select public.my_provider_profile_id())
    or (select public.is_admin())
  );
create policy services_delete on public.services
  for delete to authenticated using (
    provider_profile_id = (select public.my_provider_profile_id())
    or (select public.is_admin())
  );

alter table public.availability enable row level security;
create policy availability_anon_read on public.availability
  for select to anon using (true);
create policy availability_authenticated_read on public.availability
  for select to authenticated using (true);
create policy availability_insert on public.availability
  for insert to authenticated with check (
    provider_profile_id = (select public.my_provider_profile_id())
    or (select public.is_admin())
  );
create policy availability_update on public.availability
  for update to authenticated
  using (
    provider_profile_id = (select public.my_provider_profile_id())
    or (select public.is_admin())
  )
  with check (
    provider_profile_id = (select public.my_provider_profile_id())
    or (select public.is_admin())
  );
create policy availability_delete on public.availability
  for delete to authenticated using (
    provider_profile_id = (select public.my_provider_profile_id())
    or (select public.is_admin())
  );

alter table public.availability_overrides enable row level security;
create policy availability_overrides_anon_read on public.availability_overrides
  for select to anon using (true);
create policy availability_overrides_authenticated_read on public.availability_overrides
  for select to authenticated using (true);
create policy availability_overrides_insert on public.availability_overrides
  for insert to authenticated with check (
    provider_profile_id = (select public.my_provider_profile_id())
    or (select public.is_admin())
  );
create policy availability_overrides_update on public.availability_overrides
  for update to authenticated
  using (
    provider_profile_id = (select public.my_provider_profile_id())
    or (select public.is_admin())
  )
  with check (
    provider_profile_id = (select public.my_provider_profile_id())
    or (select public.is_admin())
  );
create policy availability_overrides_delete on public.availability_overrides
  for delete to authenticated using (
    provider_profile_id = (select public.my_provider_profile_id())
    or (select public.is_admin())
  );

alter table public.portfolio_items enable row level security;
create policy portfolio_items_anon_read on public.portfolio_items
  for select to anon using (true);
create policy portfolio_items_authenticated_read on public.portfolio_items
  for select to authenticated using (true);
create policy portfolio_items_insert on public.portfolio_items
  for insert to authenticated with check (
    provider_profile_id = (select public.my_provider_profile_id())
    or (select public.is_admin())
  );
create policy portfolio_items_update on public.portfolio_items
  for update to authenticated
  using (
    provider_profile_id = (select public.my_provider_profile_id())
    or (select public.is_admin())
  )
  with check (
    provider_profile_id = (select public.my_provider_profile_id())
    or (select public.is_admin())
  );
create policy portfolio_items_delete on public.portfolio_items
  for delete to authenticated using (
    provider_profile_id = (select public.my_provider_profile_id())
    or (select public.is_admin())
  );
