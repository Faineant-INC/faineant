-- ── bookings: read by owning client/provider/admin. NO direct write ───────────
alter table public.bookings enable row level security;
create policy bookings_select on public.bookings
  for select to authenticated
  using (
    client_id = (select auth.uid())
    or provider_profile_id = public.my_provider_profile_id()
    or public.is_admin()
  );
create policy bookings_admin_write on public.bookings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ── payments: read by related client/provider/admin. Writes via service role ──
alter table public.payments enable row level security;
create policy payments_select on public.payments
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.bookings b
      where b.id = payments.booking_id
        and (b.client_id = (select auth.uid())
             or b.provider_profile_id = public.my_provider_profile_id())
    )
  );

-- ── refunds: read by admin or the related provider. Writes via service role ───
alter table public.refunds enable row level security;
create policy refunds_select on public.refunds
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.payments p
      join public.bookings b on b.id = p.booking_id
      where p.id = refunds.payment_id
        and b.provider_profile_id = public.my_provider_profile_id()
    )
  );
