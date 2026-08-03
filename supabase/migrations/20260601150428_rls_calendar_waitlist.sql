-- Calendar tokens are owner-only; administrators may inspect connections but
-- secret-bearing writes stay with the owning account or service role.
alter table public.calendar_connections enable row level security;
create policy calendar_connections_select on public.calendar_connections
  for select to authenticated using (
    user_id = (select auth.uid()) or (select public.is_admin())
  );
create policy calendar_connections_insert on public.calendar_connections
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy calendar_connections_update on public.calendar_connections
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy calendar_connections_delete on public.calendar_connections
  for delete to authenticated using (user_id = (select auth.uid()));

alter table public.external_events enable row level security;
create policy external_events_owner_read on public.external_events
  for select to authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.calendar_connections c
      where c.id = external_events.calendar_connection_id
        and c.user_id = (select auth.uid())
    )
  );

alter table public.waitlist_entries enable row level security;
create policy waitlist_insert on public.waitlist_entries
  for insert to anon, authenticated with check (
    length(email) between 3 and 320
    and email = btrim(email)
    and email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    and length(coalesce(source, '')) <= 100
    and length(coalesce(referrer, '')) <= 2048
    and length(coalesce(user_agent, '')) <= 1024
    and length(coalesce(ip_hash, '')) <= 128
  );
create policy waitlist_admin_read on public.waitlist_entries
  for select to authenticated using ((select public.is_admin()));
