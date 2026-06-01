-- ── calendar_connections: owner-only (tokens). Admin read. ────────────────────
alter table public.calendar_connections enable row level security;
create policy calendar_connections_owner on public.calendar_connections
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy calendar_connections_admin_read on public.calendar_connections
  for select to authenticated using (public.is_admin());

-- ── external_events: owner read via connection. Writes via service role sync. ─
alter table public.external_events enable row level security;
create policy external_events_owner_read on public.external_events
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.calendar_connections c
      where c.id = external_events.calendar_connection_id
        and c.user_id = (select auth.uid())
    )
  );

-- ── waitlist_entries: anyone may join; only admins may read. ───────────────────
alter table public.waitlist_entries enable row level security;
create policy waitlist_insert on public.waitlist_entries
  for insert to anon, authenticated with check (true);
create policy waitlist_admin_read on public.waitlist_entries
  for select to authenticated using (public.is_admin());
