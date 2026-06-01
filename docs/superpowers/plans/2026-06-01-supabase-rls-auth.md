# Supabase RLS + Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the application's entire authorization boundary into the database — Supabase Auth for identity, a `handle_new_user` trigger + role helpers, and Row Level Security (RLS) policies on every table that replicate the Express API's access rules — verified by pgTAP tests that simulate anon/client/provider/admin.

**Architecture:** Identity = Supabase Auth (`auth.users`); a trigger mirrors each new user into `public.profiles` (+ `provider_profiles` for providers). Authorization = RLS policies keyed on `auth.uid()` and role/ownership SECURITY DEFINER helpers. Public discovery of provider identity goes through a curated `public_provider_profiles` VIEW exposing only safe columns; the base `profiles` table is self/admin/counterparty-only. Invariant-heavy writes (booking, messaging send, review eligibility) are intentionally NOT given write policies here — they go through SECURITY DEFINER RPCs in Plan 3. Secret-integration writes (payments, calendar sync) use the service-role key (bypasses RLS) from Edge Functions in Plan 4.

**Tech Stack:** PostgreSQL RLS, PL/pgSQL SECURITY DEFINER functions, Supabase Auth, pgTAP.

**Builds on:** Plan 1 (foundation). Local stack running; 16 tables + enums exist. Work from repo root `/Users/guillermovillegas/development/Arc`, branch `claude/supabase-baas-migration`. Local DB: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`.

**Authorization model (derived from the Express API — the spec RLS must replicate):**
- Public (anon + authenticated) READ: provider discovery (via view), active `services`, `availability`/`availability_overrides`, `portfolio_items`, `reviews`, `posts`, `comments`.
- `profiles`: SELECT self OR admin OR counterparty (shares a booking/conversation). UPDATE self. No anon.
- `provider_profiles` base: self/admin only (hides `stripe_account_id`, address); public goes through the view.
- `bookings`: SELECT owning client OR owning provider OR admin. **No direct write** (RPC in Plan 3).
- `payments`/`refunds`: SELECT admin or related client/provider. Writes via service role (Plan 4).
- `reviews`: public read; **insert via RPC** (eligibility) in Plan 3.
- `conversations`/`messages`: SELECT participants. **Send via RPC** (pair normalization) in Plan 3.
- `posts`/`comments`: public read; insert by author; delete by author or admin (direct policies — simple enough).
- `calendar_connections`/`external_events`: owner-only read; writes via service role (Plan 4).
- `waitlist_entries`: anon INSERT; admin SELECT.

---

## File Structure

- Create: `supabase/migrations/<ts>_auth_helpers.sql` — role/ownership helpers + `handle_new_user` trigger
- Create: `supabase/migrations/<ts>_rls_identity.sql` — RLS on `profiles`, `provider_profiles` + `public_provider_profiles` view
- Create: `supabase/migrations/<ts>_rls_catalog.sql` — RLS on `services`, `availability`, `availability_overrides`, `portfolio_items`
- Create: `supabase/migrations/<ts>_rls_commerce.sql` — RLS on `bookings`, `payments`, `refunds`
- Create: `supabase/migrations/<ts>_rls_engagement.sql` — RLS on `reviews`, `conversations`, `messages`, `posts`, `comments`
- Create: `supabase/migrations/<ts>_rls_calendar_waitlist.sql` — RLS on `calendar_connections`, `external_events`, `waitlist_entries`
- Modify: `supabase/config.toml` — auth email confirmations + Resend SMTP (remote) + signup
- Create: `supabase/tests/auth_trigger_test.sql` — pgTAP: signup → profile/provider_profile creation
- Create: `supabase/tests/rls_policies_test.sql` — pgTAP: simulated anon/client/provider/admin access
- Modify: `packages/shared/src/database.types.ts` — regenerate (adds the view)

**Convention:** every helper function is `security definer`, `stable`, `set search_path = ''` (so all object references are schema-qualified — this prevents RLS recursion and search-path injection). `(select auth.uid())` is wrapped in a subselect so Postgres caches it per-statement (RLS performance best practice).

---

## Task 1: Auth helpers + handle_new_user trigger

**Files:** Create `supabase/migrations/<ts>_auth_helpers.sql`; will be tested in Task 8.

- [ ] **Step 1: Create the migration**

Run: `supabase migration new auth_helpers`

- [ ] **Step 2: Write the SQL**

```sql
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
-- current user — used to let counterparties see each other's name/avatar.
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
```

- [ ] **Step 3: Apply**

Run: `supabase db reset`
Expected: applies cleanly (the smoke + booking pgTAP tests from Plan 1 still pass on the next `supabase test db`).

- [ ] **Step 4: Quick manual check**

Run:
```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "insert into auth.users (id, email, raw_user_meta_data) values ('aaaaaaaa-0000-0000-0000-000000000001','prov@example.com','{\"role\":\"PROVIDER\",\"first_name\":\"Pat\",\"last_name\":\"Provider\"}'); select p.role, p.first_name, pp.slug from public.profiles p left join public.provider_profiles pp on pp.user_id=p.id where p.id='aaaaaaaa-0000-0000-0000-000000000001';"
```
Expected: one row — role `PROVIDER`, first_name `Pat`, a slug like `pat-provider-aaaaaaaa`. Then clean up: `psql ... -c "delete from auth.users where id='aaaaaaaa-0000-0000-0000-000000000001';"` (cascades to profiles/provider_profiles).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations
git commit -m "feat(db): auth role helpers + handle_new_user trigger"
```

---

## Task 2: profiles + provider_profiles RLS + public view

**Files:** Create `supabase/migrations/<ts>_rls_identity.sql`.

- [ ] **Step 1: Create the migration**

Run: `supabase migration new rls_identity`

- [ ] **Step 2: Write the SQL**

```sql
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
-- No INSERT policy: profiles rows are created by the handle_new_user trigger
-- (SECURITY DEFINER). No anon access.

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
-- Definer-rights view (NO security_invoker) owned by postgres, so it returns
-- rows regardless of provider_profiles RLS but exposes ONLY these columns.
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
```

- [ ] **Step 3: Apply + sanity check the view excludes phone**

Run:
```bash
supabase db reset && psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select column_name from information_schema.columns where table_schema='public' and table_name='public_provider_profiles' order by column_name;"
```
Expected: lists the safe columns above; **`phone` and `stripe_account_id` and `address` are NOT present**.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations
git commit -m "feat(db): RLS on profiles/provider_profiles + public_provider_profiles view"
```

---

## Task 3: Catalog RLS (services, availability, availability_overrides, portfolio_items)

**Files:** Create `supabase/migrations/<ts>_rls_catalog.sql`.

- [ ] **Step 1: Create the migration**

Run: `supabase migration new rls_catalog`

- [ ] **Step 2: Write the SQL**

```sql
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
```

- [ ] **Step 3: Apply**

Run: `supabase db reset` — applies cleanly.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations
git commit -m "feat(db): RLS on catalog tables (services, availability, portfolio)"
```

---

## Task 4: Commerce RLS (bookings, payments, refunds)

**Files:** Create `supabase/migrations/<ts>_rls_commerce.sql`.

- [ ] **Step 1: Create the migration**

Run: `supabase migration new rls_commerce`

- [ ] **Step 2: Write the SQL**

```sql
-- ── bookings: read by owning client/provider/admin. NO direct write ───────────
-- (create_booking / update_booking_status RPCs in Plan 3 are SECURITY DEFINER.)
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
```

- [ ] **Step 3: Apply**

Run: `supabase db reset` — applies cleanly.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations
git commit -m "feat(db): RLS on bookings/payments/refunds"
```

---

## Task 5: Engagement RLS (reviews, conversations, messages, posts, comments)

**Files:** Create `supabase/migrations/<ts>_rls_engagement.sql`.

- [ ] **Step 1: Create the migration**

Run: `supabase migration new rls_engagement`

- [ ] **Step 2: Write the SQL**

```sql
-- ── reviews: public read; insert via RPC (eligibility) in Plan 3; admin manage ─
alter table public.reviews enable row level security;
create policy reviews_public_read on public.reviews
  for select to anon, authenticated using (true);
create policy reviews_admin on public.reviews
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ── conversations / messages: participants read. Send via RPC in Plan 3 ───────
alter table public.conversations enable row level security;
create policy conversations_select on public.conversations
  for select to authenticated
  using (
    participant_a_id = (select auth.uid())
    or participant_b_id = (select auth.uid())
    or public.is_admin()
  );

alter table public.messages enable row level security;
create policy messages_select on public.messages
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (select auth.uid()) in (c.participant_a_id, c.participant_b_id)
    )
  );

-- ── posts: public read; author insert; author/admin delete ────────────────────
alter table public.posts enable row level security;
create policy posts_public_read on public.posts
  for select to anon, authenticated using (true);
create policy posts_insert on public.posts
  for insert to authenticated with check (author_id = (select auth.uid()));
create policy posts_delete on public.posts
  for delete to authenticated
  using (author_id = (select auth.uid()) or public.is_admin());

-- ── comments: public read; author insert; author/admin delete ─────────────────
alter table public.comments enable row level security;
create policy comments_public_read on public.comments
  for select to anon, authenticated using (true);
create policy comments_insert on public.comments
  for insert to authenticated with check (author_id = (select auth.uid()));
create policy comments_delete on public.comments
  for delete to authenticated
  using (author_id = (select auth.uid()) or public.is_admin());
```

> NOTE (deferred, documented): `posts.likes_count`/`comments_count` are not auto-maintained here; a counts trigger (or RPC) is a later polish. Message `read_at` updates and conversation creation are part of the Plan 3 messaging RPC.

- [ ] **Step 3: Apply**

Run: `supabase db reset` — applies cleanly.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations
git commit -m "feat(db): RLS on engagement tables (reviews, messaging, community)"
```

---

## Task 6: Calendar + waitlist RLS

**Files:** Create `supabase/migrations/<ts>_rls_calendar_waitlist.sql`.

- [ ] **Step 1: Create the migration**

Run: `supabase migration new rls_calendar_waitlist`

- [ ] **Step 2: Write the SQL**

```sql
-- ── calendar_connections: owner-only (tokens). Admin read. ────────────────────
-- NOTE: token columns (access_token/refresh_token) live here; the Calendar Edge
-- Function plan (Plan 4) will read them via service role and expose only safe
-- metadata to clients via a view. For now owner can read their own row.
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
```

- [ ] **Step 3: Apply**

Run: `supabase db reset` — applies cleanly.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations
git commit -m "feat(db): RLS on calendar + waitlist tables"
```

---

## Task 7: Auth config (email confirmations + Resend SMTP + signup)

**Files:** Modify `supabase/config.toml`.

- [ ] **Step 1: Inspect current auth config**

Run: `grep -nE "^\[auth|enable_signup|enable_confirmations|\[auth.email" supabase/config.toml`
Note the line numbers for the `[auth]`, `[auth.email]` sections.

- [ ] **Step 2: Set email confirmations + signup**

In `supabase/config.toml`, under `[auth]` ensure `enable_signup = true`. Under `[auth.email]` set `enable_confirmations = true`. (Leave other values default.)

- [ ] **Step 3: Add Resend SMTP for the remote/linked project**

Add (or fill) the `[auth.email.smtp]` block exactly:
```toml
[auth.email.smtp]
enabled = true
host = "smtp.resend.com"
port = 587
user = "resend"
pass = "env(RESEND_SMTP_PASSWORD)"
admin_email = "noreply@faineantapp.com"
sender_name = "Faineant"
```

> Local dev uses the bundled Mailpit (inbucket) regardless; this SMTP block applies when pushed to the linked project. `RESEND_SMTP_PASSWORD` is a Resend SMTP credential set in the project's env, never committed.

- [ ] **Step 4: Verify config still parses**

Run: `supabase db reset` (the CLI validates config.toml on start/reset).
Expected: no config parse errors.

- [ ] **Step 5: Commit**

```bash
git add supabase/config.toml
git commit -m "feat(auth): email confirmations + Resend SMTP config"
```

---

## Task 8: pgTAP — auth trigger test

**Files:** Create `supabase/tests/auth_trigger_test.sql`.

- [ ] **Step 1: Write the test**

Create `supabase/tests/auth_trigger_test.sql`:
```sql
begin;
select plan(4);

-- A client signup
insert into auth.users (id, email, raw_user_meta_data)
  values ('00000000-0000-0000-0000-0000000000c1', 'c1@example.com',
          '{"role":"CLIENT","first_name":"Cli","last_name":"Ent"}');
-- A provider signup
insert into auth.users (id, email, raw_user_meta_data)
  values ('00000000-0000-0000-0000-0000000000d1', 'p1@example.com',
          '{"role":"PROVIDER","first_name":"Pro","last_name":"Vider"}');

select is(
  (select role::text from public.profiles where id = '00000000-0000-0000-0000-0000000000c1'),
  'CLIENT', 'client profile auto-created with CLIENT role');
select is(
  (select first_name from public.profiles where id = '00000000-0000-0000-0000-0000000000d1'),
  'Pro', 'provider profile carries first_name from metadata');
select isnt(
  (select id::text from public.provider_profiles where user_id = '00000000-0000-0000-0000-0000000000d1'),
  null, 'provider_profiles row auto-created for PROVIDER signup');
select is(
  (select count(*)::int from public.provider_profiles where user_id = '00000000-0000-0000-0000-0000000000c1'),
  0, 'no provider_profiles row for a CLIENT signup');

select * from finish();
rollback;
```

- [ ] **Step 2: Run**

Run: `supabase test db`
Expected: this file passes 4/4 (alongside the Plan 1 smoke + booking tests).

- [ ] **Step 3: Commit**

```bash
git add supabase/tests/auth_trigger_test.sql
git commit -m "test(db): handle_new_user trigger pgTAP"
```

---

## Task 9: pgTAP — RLS policy tests (the security gate)

**Files:** Create `supabase/tests/rls_policies_test.sql`.

This simulates roles by setting `role` + `request.jwt.claims` (Supabase's `auth.uid()` reads `request.jwt.claims->>'sub'`). Helper pattern used below:
- anon: `set local role anon;`
- a given user: `set local role authenticated; set local request.jwt.claims = '{"sub":"<uuid>","role":"authenticated"}';`
- reset: `reset role;`

- [ ] **Step 1: Write the test**

Create `supabase/tests/rls_policies_test.sql`:
```sql
begin;
select plan(9);

-- ── Seed (as superuser, before switching roles) ───────────────────────────────
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-0000-0000-0000-000000000a01','clientA@example.com','{"role":"CLIENT","first_name":"Alice","last_name":"A"}'),
  ('11111111-0000-0000-0000-000000000b02','clientB@example.com','{"role":"CLIENT","first_name":"Bob","last_name":"B"}'),
  ('11111111-0000-0000-0000-000000000e03','prov@example.com','{"role":"PROVIDER","first_name":"Pam","last_name":"P"}');

-- ids
-- providerProfile of Pam:
--   (select id from public.provider_profiles where user_id = '...p03')
insert into public.services (id, provider_profile_id, name, category, duration_minutes, price_in_cents, is_active)
  select '22222222-0000-0000-0000-000000000f01',
         (select id from public.provider_profiles where user_id='11111111-0000-0000-0000-000000000e03'),
         'Cut','HAIRCUT',60,5000,true;
insert into public.services (id, provider_profile_id, name, category, duration_minutes, price_in_cents, is_active)
  select '22222222-0000-0000-0000-000000000f02',
         (select id from public.provider_profiles where user_id='11111111-0000-0000-0000-000000000e03'),
         'Hidden','HAIRCUT',60,5000,false;

-- A booking linking clientA <-> Pam (so they are counterparties)
insert into public.bookings (id, client_id, service_id, provider_profile_id, status, start_time, end_time, total_price_in_cents)
  select '33333333-0000-0000-0000-000000000bc1',
         '11111111-0000-0000-0000-000000000a01',
         '22222222-0000-0000-0000-000000000f01',
         (select id from public.provider_profiles where user_id='11111111-0000-0000-0000-000000000e03'),
         'CONFIRMED','2026-07-01T14:00:00Z','2026-07-01T15:00:00Z',5000;

-- ── anon ───────────────────────────────────────────────────────────────────────
set local role anon;
select is(
  (select count(*)::int from public.public_provider_profiles where slug is not null),
  1, 'anon can see the provider via the public view');
select is(
  (select count(*)::int from public.services),
  1, 'anon sees only the 1 ACTIVE service (inactive hidden by RLS)');
select is(
  (select count(*)::int from public.profiles),
  0, 'anon cannot read base profiles at all (RLS filters to 0 rows)');
select is(
  (select count(*)::int from public.waitlist_entries),
  0, 'anon cannot read waitlist_entries (admin-only SELECT; RLS filters to 0)');
reset role;

-- ── clientB (no relationship to clientA or Pam) ───────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-0000-0000-0000-000000000b02","role":"authenticated"}';
select is(
  (select count(*)::int from public.profiles where id='11111111-0000-0000-0000-000000000a01'),
  0, 'clientB cannot see clientA''s profile (no shared booking/convo)');
select is(
  (select count(*)::int from public.bookings),
  0, 'clientB sees no bookings (not theirs)');
reset role;

-- ── clientA (booked with Pam) ─────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-0000-0000-0000-000000000a01","role":"authenticated"}';
select is(
  (select count(*)::int from public.bookings where id='33333333-0000-0000-0000-000000000bc1'),
  1, 'clientA can see their own booking');
select is(
  (select count(*)::int from public.profiles where id='11111111-0000-0000-0000-000000000e03'),
  1, 'clientA can see Pam''s profile (shared booking -> counterparty)');
reset role;

-- ── Pam (provider) ────────────────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-0000-0000-0000-000000000e03","role":"authenticated"}';
select is(
  (select count(*)::int from public.bookings where id='33333333-0000-0000-0000-000000000bc1'),
  1, 'provider can see the booking made for them');
reset role;

select * from finish();
rollback;
```

- [ ] **Step 2: Run the test**

Run: `supabase test db`
Expected: PASS. If any assertion fails, the corresponding policy is wrong — fix the policy migration (not the test), `supabase db reset`, re-run. Do NOT weaken a test to make it pass.

- [ ] **Step 3: Commit**

```bash
git add supabase/tests/rls_policies_test.sql
git commit -m "test(db): RLS policy access matrix (anon/client/provider) pgTAP"
```

---

## Task 10: Security advisors + regenerate types

**Files:** Modify `packages/shared/src/database.types.ts`.

- [ ] **Step 1: Check Supabase security advisors**

Use the Supabase MCP `get_advisors` tool with `type: "security"` (the controller will run this), OR if running headless, note that the linted check for "RLS disabled on a public table" must be clean. Every table created in Plan 1 now has RLS enabled. Expected: no "rls_disabled_in_public" errors. (The `public_provider_profiles` view may appear as a "security definer view" notice — that is intentional and acceptable here; document it.)

- [ ] **Step 2: Regenerate TypeScript types (the view is now included)**

Run (strip any CLI banner lines — the file must start with `export type Json` and contain no "Connecting to db"/version-banner lines):
```bash
supabase gen types typescript --local 2>/dev/null > packages/shared/src/database.types.ts
head -1 packages/shared/src/database.types.ts
grep -c "Connecting to db\|A new version of Supabase" packages/shared/src/database.types.ts   # must be 0
```

- [ ] **Step 3: Typecheck the shared package**

Run: `cd packages/shared && npx tsc --noEmit; cd ../..`
Expected: no error references `database.types.ts`.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/database.types.ts
git commit -m "chore(db): regenerate TS types (incl. public_provider_profiles view)"
```

---

## Done criteria for this plan

- RLS enabled on all 16 app tables; `supabase db reset` clean.
- `supabase test db` green: Plan 1 tests + auth-trigger (4) + RLS matrix (9).
- Security advisors show no "RLS disabled on public table".
- `public_provider_profiles` view exposes safe columns only (no phone/stripe/address).
- Writes that need invariants (booking, messaging send, review eligibility) are intentionally NOT writable directly — Plan 3 adds the RPCs. Payments/calendar writes happen via service role in Plan 4.

## Known gaps / deferred (documented)

- Booking/messaging/review **writes** have no policies yet by design → Plan 3 RPCs.
- `calendar_connections` token columns are owner-readable for now → Plan 4 hardens with a service-role-only + safe-view split.
- `posts.likes_count`/`comments_count` not auto-maintained → later polish.
- Role-in-JWT-claim optimization not used (policies use SECURITY DEFINER helper subqueries) → revisit only if RLS perf requires.
