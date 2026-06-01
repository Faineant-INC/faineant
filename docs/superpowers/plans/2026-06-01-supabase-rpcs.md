# Supabase RPCs Implementation Plan (Plan 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the invariant-heavy write paths (and a couple of privileged reads) as SECURITY DEFINER Postgres RPCs, so clients perform bookings, status transitions, messaging, and reviews through `.rpc()` calls — never direct table writes (which RLS blocks).

**Architecture:** Each RPC is `SECURITY DEFINER set search_path = ''`, derives the caller from `(select auth.uid())`, enforces ownership/eligibility/transition rules in SQL, and is `GRANT EXECUTE`-d to the appropriate role(s). Booking double-booking is still enforced by the Plan 1 `EXCLUDE` constraint; `create_booking` catches the violation and returns a friendly error. Discovery (`search_providers`) and busy-time lookup (`get_provider_busy_intervals`) are privileged reads that return only non-PII data, so they're granted to `anon` too.

**Builds on:** Plans 1–2. Local stack running; schema + RLS + helpers + `public_provider_profiles` view exist. Work from repo root `/Users/guillermovillegas/development/Arc`, branch `claude/supabase-baas-migration`. Local DB: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`. `supabase test db` currently passes 23 pgTAP.

**Design calls baked in (flagged for review):**
- `create_booking` enforces a **verified-email gate** (`auth.users.email_confirmed_at is not null`), matching the Express `requireVerifiedEmail` middleware on booking.
- `create_review` **recomputes** `provider_profiles.average_rating`/`total_reviews` inline (no separate trigger).
- Slot availability: instead of porting the full slot-generation algorithm, expose **`get_provider_busy_intervals`** (returns busy `[start,end)` ranges only — no client/booking PII). Full slot rendering (availability windows minus busy intervals) is the web app's job in a later plan. Rationale: a client cannot read a provider's bookings directly under RLS, so busy-time lookup must be a privileged RPC; but generating display slots is presentation logic.

---

## File Structure

- Create: `supabase/migrations/<ts>_rpc_booking.sql` — `create_booking`, `update_booking_status`
- Create: `supabase/migrations/<ts>_rpc_messaging.sql` — `send_message`, `mark_conversation_read`
- Create: `supabase/migrations/<ts>_rpc_review.sql` — `create_review` (+ rating aggregate)
- Create: `supabase/migrations/<ts>_rpc_discovery.sql` — `search_providers`, `get_provider_busy_intervals`
- Create: `supabase/tests/rpc_booking_test.sql`
- Create: `supabase/tests/rpc_messaging_test.sql`
- Create: `supabase/tests/rpc_review_test.sql`
- Create: `supabase/tests/rpc_discovery_test.sql`
- Modify: `packages/shared/src/database.types.ts` — regenerate (RPCs appear under `Functions`)

**RPC test pattern (reused):** seed `auth.users` (set `email_confirmed_at = now()` where a verified user is needed) → trigger creates profiles → `set local role authenticated; set local request.jwt.claims = '{"sub":"<uuid>","role":"authenticated"}';` → `select public.<rpc>(...)` → assert. Wrap in `begin; … rollback;`.

---

## Task 1: create_booking + update_booking_status

**Files:** Create `supabase/migrations/<ts>_rpc_booking.sql`.

- [ ] **Step 1:** `supabase migration new rpc_booking`

- [ ] **Step 2:** Write this EXACT SQL:
```sql
-- Create a booking for the current user. Price/end-time derived from the service.
-- Verified-email gate mirrors the old requireVerifiedEmail middleware.
-- The EXCLUDE constraint guarantees no overlap; we translate its error.
create or replace function public.create_booking(
  p_service_id uuid,
  p_start_time timestamptz,
  p_notes text default null,
  p_location text default null,
  p_latitude double precision default null,
  p_longitude double precision default null
) returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_verified boolean;
  v_svc public.services;
  v_booking public.bookings;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select (email_confirmed_at is not null) into v_verified
  from auth.users where id = v_uid;
  if not coalesce(v_verified, false) then
    raise exception 'Email not verified' using errcode = '42501';
  end if;

  select * into v_svc from public.services
  where id = p_service_id and is_active = true;
  if not found then
    raise exception 'Service not found or inactive' using errcode = 'P0002';
  end if;

  begin
    insert into public.bookings (
      client_id, service_id, provider_profile_id, status,
      start_time, end_time, total_price_in_cents, notes, location, latitude, longitude
    ) values (
      v_uid, p_service_id, v_svc.provider_profile_id, 'PENDING',
      p_start_time, p_start_time + make_interval(mins => v_svc.duration_minutes),
      v_svc.price_in_cents, p_notes, p_location, p_latitude, p_longitude
    ) returning * into v_booking;
  exception when exclusion_violation then
    raise exception 'This time slot is no longer available' using errcode = 'P0001';
  end;

  return v_booking;
end;
$$;
grant execute on function public.create_booking(uuid, timestamptz, text, text, double precision, double precision) to authenticated;

-- Update a booking's status with transition + role enforcement.
create or replace function public.update_booking_status(
  p_booking_id uuid,
  p_new_status public.booking_status
) returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_b public.bookings;
  v_is_client boolean;
  v_is_provider boolean;
  v_allowed public.booking_status[];
begin
  select * into v_b from public.bookings where id = p_booking_id;
  if not found then
    raise exception 'Booking not found' using errcode = 'P0002';
  end if;

  v_is_client := v_b.client_id = v_uid;
  v_is_provider := v_b.provider_profile_id = public.my_provider_profile_id();
  if not (v_is_client or v_is_provider) then
    raise exception 'Not authorized to update this booking' using errcode = '42501';
  end if;

  v_allowed := case v_b.status
    when 'PENDING'     then array['CONFIRMED','CANCELLED']
    when 'CONFIRMED'   then array['IN_PROGRESS','CANCELLED','NO_SHOW']
    when 'IN_PROGRESS' then array['COMPLETED']
    else array[]::text[]
  end::public.booking_status[];
  if not (p_new_status = any (v_allowed)) then
    raise exception 'Cannot transition from % to %', v_b.status, p_new_status using errcode = 'P0001';
  end if;

  -- Only the provider may confirm/progress/complete/no-show; either party may cancel.
  if p_new_status in ('CONFIRMED','IN_PROGRESS','COMPLETED','NO_SHOW') and not v_is_provider then
    raise exception 'Only the provider can perform this action' using errcode = '42501';
  end if;

  update public.bookings set status = p_new_status
  where id = p_booking_id returning * into v_b;
  return v_b;
end;
$$;
grant execute on function public.update_booking_status(uuid, public.booking_status) to authenticated;
```

- [ ] **Step 3:** `supabase db reset` — applies cleanly.

- [ ] **Step 4:** Commit:
```bash
git add supabase/migrations
git commit -m "feat(db): create_booking + update_booking_status RPCs"
```

---

## Task 2: pgTAP — booking RPCs

**Files:** Create `supabase/tests/rpc_booking_test.sql`.

- [ ] **Step 1:** Write the test:
```sql
begin;
select plan(5);

-- Verified client + provider + active service
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  ('44444444-0000-0000-0000-0000000000c1','vc@example.com', now(), '{"role":"CLIENT","first_name":"Val","last_name":"Id"}'),
  ('44444444-0000-0000-0000-0000000000e3','vp@example.com', now(), '{"role":"PROVIDER","first_name":"Prov","last_name":"Ider"}');
-- Unverified client
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  ('44444444-0000-0000-0000-0000000000c2','uc@example.com', null, '{"role":"CLIENT","first_name":"Un","last_name":"Verified"}');

insert into public.services (id, provider_profile_id, name, category, duration_minutes, price_in_cents, is_active)
  select '55555555-0000-0000-0000-0000000000f1',
         (select id from public.provider_profiles where user_id='44444444-0000-0000-0000-0000000000e3'),
         'Cut','HAIRCUT',60,5000,true;

-- Verified client books successfully
set local role authenticated;
set local request.jwt.claims = '{"sub":"44444444-0000-0000-0000-0000000000c1","role":"authenticated"}';
select lives_ok(
  $$select public.create_booking('55555555-0000-0000-0000-0000000000f1','2026-08-01T14:00:00Z')$$,
  'verified client can create a booking');
select is(
  (select count(*)::int from public.bookings where client_id='44444444-0000-0000-0000-0000000000c1'),
  1, 'booking row created for the client');
-- Overlapping slot rejected with friendly message
select throws_ok(
  $$select public.create_booking('55555555-0000-0000-0000-0000000000f1','2026-08-01T14:30:00Z')$$,
  'P0001', 'This time slot is no longer available',
  'overlapping booking rejected with friendly error');
reset role;

-- Unverified client blocked
set local role authenticated;
set local request.jwt.claims = '{"sub":"44444444-0000-0000-0000-0000000000c2","role":"authenticated"}';
select throws_ok(
  $$select public.create_booking('55555555-0000-0000-0000-0000000000f1','2026-08-02T14:00:00Z')$$,
  '42501', 'Email not verified',
  'unverified client cannot book');
reset role;

-- Role guard: PENDING->CONFIRMED is a VALID transition, but only the provider
-- may confirm — so a client attempting it must hit the role guard (not the
-- transition guard). This proves the role check, not the transition check.
set local role authenticated;
set local request.jwt.claims = '{"sub":"44444444-0000-0000-0000-0000000000c1","role":"authenticated"}';
select throws_ok(
  $$select public.update_booking_status(
      (select id from public.bookings where client_id='44444444-0000-0000-0000-0000000000c1' limit 1),
      'CONFIRMED')$$,
  '42501', 'Only the provider can perform this action',
  'client cannot CONFIRM a booking (provider-only action)');
reset role;

select * from finish();
rollback;
```

- [ ] **Step 2:** `supabase test db` — expect this file 5/5; total now 28. PASS.

- [ ] **Step 3:** Commit:
```bash
git add supabase/tests/rpc_booking_test.sql
git commit -m "test(db): booking RPC pgTAP (verified-email, overlap, transitions)"
```

---

## Task 3: send_message + mark_conversation_read

**Files:** Create `supabase/migrations/<ts>_rpc_messaging.sql`.

- [ ] **Step 1:** `supabase migration new rpc_messaging`

- [ ] **Step 2:** Write this EXACT SQL:
```sql
-- Send a message to another user, creating/normalizing the conversation pair.
create or replace function public.send_message(
  p_recipient_id uuid,
  p_text text,
  p_image_url text default null
) returns public.messages
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_a uuid; v_b uuid; v_conv uuid;
  v_msg public.messages;
begin
  if v_uid is null then raise exception 'Not authenticated' using errcode = '28000'; end if;
  if p_recipient_id = v_uid then raise exception 'Cannot message yourself' using errcode = 'P0001'; end if;
  if not exists (select 1 from public.profiles where id = p_recipient_id) then
    raise exception 'Recipient not found' using errcode = 'P0002';
  end if;

  -- Deterministic pair ordering for the unique(participant_a_id, participant_b_id).
  if v_uid < p_recipient_id then v_a := v_uid; v_b := p_recipient_id;
  else v_a := p_recipient_id; v_b := v_uid; end if;

  select id into v_conv from public.conversations
  where participant_a_id = v_a and participant_b_id = v_b;
  if v_conv is null then
    insert into public.conversations (participant_a_id, participant_b_id, last_message_at)
    values (v_a, v_b, now()) returning id into v_conv;
  else
    update public.conversations set last_message_at = now() where id = v_conv;
  end if;

  insert into public.messages (conversation_id, sender_id, text, image_url)
  values (v_conv, v_uid, p_text, p_image_url) returning * into v_msg;
  return v_msg;
end;
$$;
grant execute on function public.send_message(uuid, text, text) to authenticated;

-- Mark all messages from the other participant in a conversation as read.
create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_count integer;
begin
  if not exists (
    select 1 from public.conversations c
    where c.id = p_conversation_id
      and v_uid in (c.participant_a_id, c.participant_b_id)
  ) then
    raise exception 'Not a participant' using errcode = '42501';
  end if;

  update public.messages
  set read_at = now()
  where conversation_id = p_conversation_id
    and sender_id <> v_uid
    and read_at is null;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
```

- [ ] **Step 3:** `supabase db reset` — applies cleanly.

- [ ] **Step 4:** Commit:
```bash
git add supabase/migrations
git commit -m "feat(db): send_message + mark_conversation_read RPCs"
```

---

## Task 4: pgTAP — messaging RPCs

**Files:** Create `supabase/tests/rpc_messaging_test.sql`.

- [ ] **Step 1:** Write the test:
```sql
begin;
select plan(4);

insert into auth.users (id, email, raw_user_meta_data) values
  ('66666666-0000-0000-0000-0000000000a1','m1@example.com','{"role":"CLIENT","first_name":"Em","last_name":"One"}'),
  ('66666666-0000-0000-0000-0000000000b2','m2@example.com','{"role":"CLIENT","first_name":"Em","last_name":"Two"}');

-- m1 sends to m2
set local role authenticated;
set local request.jwt.claims = '{"sub":"66666666-0000-0000-0000-0000000000a1","role":"authenticated"}';
select lives_ok(
  $$select public.send_message('66666666-0000-0000-0000-0000000000b2','hello')$$,
  'm1 can send a message to m2');
select is(
  (select count(*)::int from public.conversations),
  1, 'exactly one conversation row created (normalized pair)');
-- sending the reverse direction reuses the same conversation
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"66666666-0000-0000-0000-0000000000b2","role":"authenticated"}';
select lives_ok(
  $$select public.send_message('66666666-0000-0000-0000-0000000000a1','hi back')$$,
  'm2 can reply');
select is(
  (select count(*)::int from public.conversations),
  1, 'reply reuses the same conversation (no duplicate pair)');
reset role;

select * from finish();
rollback;
```

- [ ] **Step 2:** `supabase test db` — expect this file 4/4; total now 32. PASS.

- [ ] **Step 3:** Commit:
```bash
git add supabase/tests/rpc_messaging_test.sql
git commit -m "test(db): messaging RPC pgTAP (pair normalization)"
```

---

## Task 5: create_review (+ rating aggregate)

**Files:** Create `supabase/migrations/<ts>_rpc_review.sql`.

- [ ] **Step 1:** `supabase migration new rpc_review`

- [ ] **Step 2:** Write this EXACT SQL:
```sql
-- Create a review for a COMPLETED booking the caller owns (one per booking),
-- then recompute the provider's rating aggregate.
create or replace function public.create_review(
  p_booking_id uuid,
  p_rating integer,
  p_text text default null,
  p_photos text[] default '{}'
) returns public.reviews
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_b public.bookings;
  v_review public.reviews;
begin
  if p_rating < 1 or p_rating > 5 then
    raise exception 'Rating must be between 1 and 5' using errcode = 'P0001';
  end if;

  select * into v_b from public.bookings where id = p_booking_id;
  if not found then raise exception 'Booking not found' using errcode = 'P0002'; end if;
  if v_b.client_id <> v_uid then
    raise exception 'You can only review your own booking' using errcode = '42501';
  end if;
  if v_b.status <> 'COMPLETED' then
    raise exception 'Can only review a completed booking' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.reviews where booking_id = p_booking_id) then
    raise exception 'This booking has already been reviewed' using errcode = 'P0001';
  end if;

  insert into public.reviews (booking_id, client_id, provider_profile_id, rating, text, photos)
  values (p_booking_id, v_uid, v_b.provider_profile_id, p_rating, p_text, p_photos)
  returning * into v_review;

  update public.provider_profiles pp set
    total_reviews  = (select count(*)        from public.reviews r where r.provider_profile_id = pp.id),
    average_rating = (select coalesce(avg(rating), 0) from public.reviews r where r.provider_profile_id = pp.id)
  where pp.id = v_b.provider_profile_id;

  return v_review;
end;
$$;
grant execute on function public.create_review(uuid, integer, text, text[]) to authenticated;
```

- [ ] **Step 3:** `supabase db reset` — applies cleanly.

- [ ] **Step 4:** Commit:
```bash
git add supabase/migrations
git commit -m "feat(db): create_review RPC with rating aggregate"
```

---

## Task 6: pgTAP — review RPC

**Files:** Create `supabase/tests/rpc_review_test.sql`.

- [ ] **Step 1:** Write the test:
```sql
begin;
select plan(4);

insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  ('77777777-0000-0000-0000-0000000000c1','rc@example.com', now(), '{"role":"CLIENT","first_name":"Rev","last_name":"Client"}'),
  ('77777777-0000-0000-0000-0000000000e3','rp@example.com', now(), '{"role":"PROVIDER","first_name":"Rev","last_name":"Prov"}');

insert into public.services (id, provider_profile_id, name, category, duration_minutes, price_in_cents, is_active)
  select '88888888-0000-0000-0000-0000000000f1',
         (select id from public.provider_profiles where user_id='77777777-0000-0000-0000-0000000000e3'),
         'Cut','HAIRCUT',60,5000,true;

-- A COMPLETED booking for the client
insert into public.bookings (id, client_id, service_id, provider_profile_id, status, start_time, end_time, total_price_in_cents)
  select '99999999-0000-0000-0000-0000000000b1',
         '77777777-0000-0000-0000-0000000000c1',
         '88888888-0000-0000-0000-0000000000f1',
         (select id from public.provider_profiles where user_id='77777777-0000-0000-0000-0000000000e3'),
         'COMPLETED','2026-05-01T14:00:00Z','2026-05-01T15:00:00Z',5000;

set local role authenticated;
set local request.jwt.claims = '{"sub":"77777777-0000-0000-0000-0000000000c1","role":"authenticated"}';
select lives_ok(
  $$select public.create_review('99999999-0000-0000-0000-0000000000b1', 5, 'Great')$$,
  'client can review their completed booking');
select throws_ok(
  $$select public.create_review('99999999-0000-0000-0000-0000000000b1', 4, 'again')$$,
  'P0001', 'This booking has already been reviewed',
  'cannot review the same booking twice');
reset role;

-- Aggregate updated on the provider
select is(
  (select total_reviews from public.provider_profiles where user_id='77777777-0000-0000-0000-0000000000e3'),
  1, 'provider total_reviews incremented');
select is(
  (select average_rating from public.provider_profiles where user_id='77777777-0000-0000-0000-0000000000e3'),
  5::double precision, 'provider average_rating updated');

select * from finish();
rollback;
```

- [ ] **Step 2:** `supabase test db` — expect this file 4/4; total now 36. PASS.

- [ ] **Step 3:** Commit:
```bash
git add supabase/tests/rpc_review_test.sql
git commit -m "test(db): review RPC pgTAP (eligibility + aggregate)"
```

---

## Task 7: search_providers + get_provider_busy_intervals

**Files:** Create `supabase/migrations/<ts>_rpc_discovery.sql`.

> PostGIS schema note: this function references PostGIS functions (`st_dwithin`, `st_makepoint`, `st_distance`, `geography`). With `search_path = ''` they must be schema-qualified. Determine the schema first:
> `psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select extnamespace::regnamespace as schema from pg_extension where extname='postgis';"`
> Use that schema to qualify the calls below. The SQL below assumes `extensions` — **if the query returns `public`, replace `extensions.` with `public.` in the PostGIS calls before writing the migration.** Report which schema you used.

- [ ] **Step 1:** `supabase migration new rpc_discovery`

- [ ] **Step 2:** Determine the PostGIS schema (see note above), then write this SQL (with the PostGIS calls qualified by the detected schema — shown here as `extensions.`):
```sql
-- Public provider discovery: text + category + optional geo-radius, ranked by
-- distance (when geo given) then rating. Returns only safe view columns.
create or replace function public.search_providers(
  p_text text default null,
  p_category public.service_category default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_radius_km double precision default null,
  p_limit integer default 20,
  p_offset integer default 0
) returns setof public.public_provider_profiles
language sql stable security definer set search_path = '' as $$
  select v.*
  from public.public_provider_profiles v
  where (
      p_category is null
      or exists (
        select 1 from public.services s
        where s.provider_profile_id = v.id and s.is_active and s.category = p_category
      )
    )
    and (
      p_text is null
      or v.business_name ilike '%' || p_text || '%'
      or (coalesce(v.first_name,'') || ' ' || coalesce(v.last_name,'')) ilike '%' || p_text || '%'
      or v.bio ilike '%' || p_text || '%'
    )
    and (
      p_lat is null or p_lng is null or p_radius_km is null
      or (
        v.latitude is not null and v.longitude is not null
        and extensions.st_dwithin(
              extensions.st_makepoint(v.longitude, v.latitude)::extensions.geography,
              extensions.st_makepoint(p_lng, p_lat)::extensions.geography,
              p_radius_km * 1000)
      )
    )
  order by
    case
      when p_lat is not null and p_lng is not null and v.latitude is not null
      then extensions.st_distance(
             extensions.st_makepoint(v.longitude, v.latitude)::extensions.geography,
             extensions.st_makepoint(p_lng, p_lat)::extensions.geography)
      else null
    end asc nulls last,
    v.average_rating desc
  limit greatest(p_limit, 0) offset greatest(p_offset, 0);
$$;
grant execute on function public.search_providers(text, public.service_category, double precision, double precision, double precision, integer, integer) to anon, authenticated;

-- Busy time ranges for a provider (active bookings + synced external events).
-- Returns only [start,end) intervals — no client identity or booking detail —
-- so it is safe to expose for availability rendering.
create or replace function public.get_provider_busy_intervals(
  p_provider_profile_id uuid,
  p_from timestamptz,
  p_to timestamptz
) returns table (start_time timestamptz, end_time timestamptz)
language sql stable security definer set search_path = '' as $$
  select b.start_time, b.end_time
  from public.bookings b
  where b.provider_profile_id = p_provider_profile_id
    and b.status in ('PENDING','CONFIRMED','IN_PROGRESS')
    and b.start_time < p_to and b.end_time > p_from
  union all
  select e.start_time, e.end_time
  from public.external_events e
  join public.calendar_connections c on c.id = e.calendar_connection_id
  join public.provider_profiles pp on pp.user_id = c.user_id
  where pp.id = p_provider_profile_id
    and e.start_time < p_to and e.end_time > p_from;
$$;
grant execute on function public.get_provider_busy_intervals(uuid, timestamptz, timestamptz) to anon, authenticated;
```

- [ ] **Step 3:** `supabase db reset` — applies cleanly. If a PostGIS function is "not found", you used the wrong schema — fix the qualifier per the note and re-run.

- [ ] **Step 4:** Commit:
```bash
git add supabase/migrations
git commit -m "feat(db): search_providers + get_provider_busy_intervals RPCs"
```

---

## Task 8: pgTAP — discovery RPCs

**Files:** Create `supabase/tests/rpc_discovery_test.sql`.

- [ ] **Step 1:** Write the test:
```sql
begin;
select plan(4);

insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaa0000-0000-0000-0000-0000000000e1','d1@example.com','{"role":"PROVIDER","first_name":"Near","last_name":"Provider"}'),
  ('aaaa0000-0000-0000-0000-0000000000e2','d2@example.com','{"role":"PROVIDER","first_name":"Far","last_name":"Provider"}');

-- Place provider 1 in Chicago, provider 2 far away; give each an active service.
update public.provider_profiles set latitude = 41.8781, longitude = -87.6298
  where user_id = 'aaaa0000-0000-0000-0000-0000000000e1';
update public.provider_profiles set latitude = 34.0522, longitude = -118.2437
  where user_id = 'aaaa0000-0000-0000-0000-0000000000e2';
insert into public.services (provider_profile_id, name, category, duration_minutes, price_in_cents, is_active)
  select id, 'Cut', 'HAIRCUT', 60, 5000, true from public.provider_profiles
  where user_id in ('aaaa0000-0000-0000-0000-0000000000e1','aaaa0000-0000-0000-0000-0000000000e2');

set local role anon;
-- Text search by name
select is(
  (select count(*)::int from public.search_providers('Near')),
  1, 'text search matches the Near provider by name');
-- Category filter returns both providers (both offer HAIRCUT)
select is(
  (select count(*)::int from public.search_providers(null, 'HAIRCUT')),
  2, 'category filter returns both HAIRCUT providers');
-- Geo radius 50km around Chicago returns only the near provider
select is(
  (select count(*)::int from public.search_providers(null, null, 41.8781, -87.6298, 50)),
  1, 'geo radius around Chicago returns only the near provider');
-- Busy intervals empty for a provider with no bookings
select is(
  (select count(*)::int from public.get_provider_busy_intervals(
      (select id from public.provider_profiles where user_id='aaaa0000-0000-0000-0000-0000000000e1'),
      '2026-08-01T00:00:00Z','2026-08-02T00:00:00Z')),
  0, 'no busy intervals for a provider with no bookings');
reset role;

select * from finish();
rollback;
```

- [ ] **Step 2:** `supabase test db` — expect this file 4/4; total now 40. PASS.

- [ ] **Step 3:** Commit:
```bash
git add supabase/tests/rpc_discovery_test.sql
git commit -m "test(db): discovery RPC pgTAP (text/category/geo, busy intervals)"
```

---

## Task 9: Regenerate types

**Files:** Modify `packages/shared/src/database.types.ts`.

- [ ] **Step 1:** Regenerate (strip CLI banner; file must start with `export type Json`):
```bash
supabase gen types typescript --local 2>/dev/null > packages/shared/src/database.types.ts
head -1 packages/shared/src/database.types.ts
grep -c "Connecting to db\|A new version of Supabase" packages/shared/src/database.types.ts   # must be 0
grep -c "create_booking\|search_providers\|send_message\|create_review\|get_provider_busy_intervals\|mark_conversation_read" packages/shared/src/database.types.ts  # must be > 0 (Functions section)
```

- [ ] **Step 2:** Typecheck: `cd packages/shared && npx tsc --noEmit; cd ../..` — no error references `database.types.ts`.

- [ ] **Step 3:** Commit:
```bash
git add packages/shared/src/database.types.ts
git commit -m "chore(db): regenerate TS types (RPC function signatures)"
```

---

## Done criteria

- `supabase db reset` clean; `supabase test db` green at **40** (23 prior + 5 + 4 + 4 + 4).
- All RPCs are `SECURITY DEFINER set search_path = ''` and granted to the correct roles (write RPCs → authenticated; discovery → anon+authenticated).
- Booking writes only via `create_booking`/`update_booking_status`; reviews only via `create_review`; messages only via `send_message`; all enforce ownership/eligibility/transitions.

## Known gaps / deferred (documented)

- Full available-slot generation (availability windows minus busy intervals) is the web app's job (later plan) on top of `get_provider_busy_intervals`.
- Payment intent / refund / Stripe Connect and Google Calendar sync are Edge Functions (Plan 4) — `bookings.stripe_payment_intent_id` and `external_events` get populated there.
- Optional perf: a functional GiST index on `(st_makepoint(longitude,latitude)::geography)` for `search_providers` at scale — defer until needed; log if provider counts grow.
