# Supabase BaaS Migration — Design Spec

**Date:** 2026-05-31
**Status:** Approved (pending user spec review)
**Author:** brainstormed with Claude

## Summary

Re-platform Faineant from a **standalone Express + Prisma API** to a **full Supabase
BaaS architecture**. The Express server (`apps/api`) and Prisma are deleted. The web
(Next.js) and mobile (Expo) clients talk **directly to Supabase** via `supabase-js`.
Security moves into **Row Level Security (RLS)** policies; invariant-heavy writes run
as **Postgres RPCs**; secret-holding integrations (Stripe, Google Calendar, Resend)
run as **Edge Functions**.

This is a **big-bang cutover** (one coordinated switch, no parallel running) and is
**greenfield** — there are no production users or data to migrate. Both **web and
mobile** are rewritten in the same effort.

## Goals / Non-goals

**Goals**
- Eliminate the standalone server; clients use Supabase directly.
- Recreate full feature parity for v1: auth, profiles, provider discovery, booking,
  **payments (Stripe Connect)**, **messaging (polling)**, **reviews**, **calendar
  sync (Google + ICS)**, community feed, uploads, admin, waitlist, transactional email.
- Security enforced by RLS + SECURITY DEFINER RPCs, identical across web and mobile.

**Non-goals**
- No data migration (greenfield).
- No realtime (messaging is **polling-only**; **typing indicators are dropped**).
- Rate limiting on custom endpoints is **deferred** (see Known Gaps).

## Decisions (locked during brainstorming)

| Decision | Choice |
|---|---|
| End state | Full BaaS — no application server |
| Cutover | Big-bang (one coordinated switch) |
| Data | Greenfield — clean schema, re-seed demo data, no bcrypt import |
| Clients | Web **and** mobile rewritten together |
| Security backbone | RLS + Postgres RPCs; secrets in Edge Functions |
| Primary keys | `uuid` (`gen_random_uuid()`), not Prisma cuid |
| Schema source of truth | SQL migrations via Supabase CLI (Prisma removed) |
| Messaging | Polling; **no Realtime**; typing indicators removed |
| Geo search | **PostGIS** (`geography` + `ST_DWithin`, GIST index) |
| Rate limiting | **Deferred** — Supabase Auth built-ins only; known gap |
| Uploads | **Supabase Storage** (replaces Cloudflare R2) |
| Email | Supabase Auth mail via **Resend SMTP**; transactional via `send-email` Edge Function |

## Architecture

```
Web (Next.js, @supabase/ssr)   Mobile (Expo, supabase-js + SecureStore)
        │                               │
        └──────────────┬────────────────┘
                       ▼
                   Supabase
   ├─ Postgres + RLS         (security boundary, all 20 tables)
   ├─ Postgres RPCs          (create_booking, update_booking_status, search_providers, …)
   ├─ Supabase Auth          (email/password; replaces JWT/bcrypt)
   ├─ Storage                (avatars, portfolio; replaces R2)
   ├─ Edge Functions         (stripe-*, google-calendar, send-email)
   └─ Database Webhooks      (booking events → send-email)

External: Stripe Connect, Google Calendar API, Resend
```

### Repo shape
- **Kept:** `apps/web`, `apps/mobile`, `packages/shared` (Zod schemas for client-side
  validation; generated DB types via `supabase gen types typescript`, committed).
- **New:** `supabase/` — `migrations/*.sql`, `functions/*` (Deno), `seed.sql`, `config.toml`.
- **Deleted at cutover:** `apps/api` (Express), all Prisma (schema, migrations, client),
  Cloudflare R2 config, Redis/rate-limit infra.
- Local dev: **Supabase CLI local stack** (`supabase start`, Docker) replaces the current
  `docker-compose` Postgres/Redis.

## Data model + RLS

All 20 models recreated as SQL tables, `uuid` PKs, FKs preserved. **RLS enabled on every
table** — no table is reachable without an explicit policy.

- **`profiles`** — 1:1 with `auth.users`; holds `role` (`CLIENT|PROVIDER|ADMIN`),
  `first_name`, `last_name`, `phone`, `avatar_url`. Email/verification managed by Auth.
- **`provider_profiles`** — provider-only fields; **publicly readable** (discovery).
- **`bookings`** — client sees own; provider sees theirs; admin sees all. Writes **only
  via RPC** (direct insert/update blocked by policy).
- **`conversations` / `messages`** — participants only.
- **`reviews` / `posts` / `comments`** — public read; author write; review eligibility
  enforced by RPC.
- **Admin** — full access via an `is_admin()` helper used in policies.

**Role resolution:** read from `profiles` within policies (a `SECURITY DEFINER` helper).
JWT-claim optimization (custom access-token hook) is a **future enhancement** if RLS
performance requires it — not in v1.

## Auth

- **Supabase Auth**, email/password. Native email verification.
- `handle_new_user()` trigger on `auth.users` insert creates the `profiles` row
  (default `CLIENT`; `PROVIDER` signups also create `provider_profiles`).
- **Custom SMTP → Resend** so auth mail sends from `noreply@faineantapp.com`.
- Pre-launch signup disable carries over via Supabase Auth's signup toggle.
- Sessions: web via cookies (`@supabase/ssr` + refresh middleware); mobile via SecureStore
  with `autoRefreshToken` + `AppState` refresh.

## Booking concurrency (correctness core)

Replace the serializable transaction with a Postgres **exclusion constraint** (requires
`btree_gist`):

```sql
EXCLUDE USING gist (
  provider_profile_id WITH =,
  tstzrange(start_time, end_time) WITH &&
) WHERE (status IN ('PENDING','CONFIRMED','IN_PROGRESS'))
```

Overlapping bookings become impossible at the DB level. RPCs:
- **`create_booking(service_id, start_time, notes, location, lat, lng)`** — `SECURITY
  DEFINER`; validates active service, derives `end_time` from duration, inserts; relies on
  the exclusion constraint for atomic no-overlap. Constraint violation → client maps to
  "slot unavailable."
- **`update_booking_status(booking_id, new_status)`** — enforces allowed transitions and
  role rules (client cancels; provider confirms/completes/no-shows).

## Edge Functions (Deno)

Each verifies the caller's JWT, then uses a service-role client for privileged writes.
- **`stripe-connect-onboard`** — provider Connect Express account link (create/refresh).
- **`stripe-payment`** — PaymentIntent per booking; 5% application fee as destination
  charge to the provider's connected account.
- **`stripe-webhook`** — public; verifies Stripe signature; updates
  `payments`/`refunds`/`bookings` via service role; handles refunds.
- **`google-calendar`** — OAuth start/callback (token storage), two-way sync, token
  refresh, ICS import.
- **`send-email`** — ports the existing Resend transactional templates to Deno.

**Transactional email** is triggered by **Supabase Database Webhooks** on `bookings`
insert/status-change → `send-email`. Auth confirmation/reset mail is separate (Auth +
Resend SMTP).

## Clients

**Web (Next.js + `@supabase/ssr`)** — delete `src/lib/api-client.ts`. Server
Components/Route Handlers read via the cookie-bound server client; middleware refreshes
sessions. Auth pages use `supabase.auth.*`. Writes via `.rpc()` (booking, status, reviews)
or RLS-guarded inserts; Stripe/calendar via Edge Functions.

**Mobile (Expo)** — `supabase-js` + SecureStore storage adapter, `autoRefreshToken`,
`AppState` refresh. Same `.rpc()` / table / Edge Function patterns.

## Messaging (polling)

`conversations`/`messages` RLS-scoped to participants. Open thread + unread counts polled
on an interval (no Realtime subscriptions). `send_message` is an RLS-guarded insert.
Typing indicators removed.

## Storage

Supabase Storage buckets (`avatars`, `portfolio`) with storage policies: provider writes
to its own folder; public read for portfolio/avatars. Cloudflare R2 + presigned-URL flow
and its env/config are removed.

## Search / geo

PostGIS (`geography` + `ST_DWithin`, GIST index) wrapped in a `search_providers(...)` RPC
so filters and ranking live in one place.

## Testing strategy

The DB is now the logic core, so testing shifts there:
- **pgTAP** — RLS policies + RPC behavior (booking overlap, status transitions, review
  eligibility). The most important new layer.
- **Deno tests** — Edge Function handlers, with Stripe/Google/Resend mocked.
- **Vitest (web) / Jest (mobile)** — UI; integration tests against a local Supabase stack
  (`supabase start`) seeded with test data.

Current Express/Prisma Vitest suites are removed with `apps/api`.

## Build order (big-bang, dependency-sequenced)

1. Supabase CLI init + local stack; schema migrations + extensions (`btree_gist`,
   `postgis`, `pg_trgm`) + booking exclusion constraint.
2. RLS policies + helpers + `handle_new_user` trigger.
3. RPCs (`create_booking`, `update_booking_status`, `search_providers`, review eligibility).
4. Auth config (Resend SMTP, signup toggle).
5. Edge Functions (`stripe-*`, `google-calendar`, `send-email`) + Database Webhooks.
6. Storage buckets + policies.
7. Web client rewrite.
8. Mobile client rewrite.
9. Seed + pgTAP + Deno + client tests green.
10. Delete `apps/api`, Prisma, R2 config; update env, docs, CI.

## Known gaps / risks

- **Rate limiting** on custom RPC/Edge endpoints is deferred (no Redis). Only Supabase
  Auth's built-in limits apply at launch. Revisit post-launch (Postgres-based limiter).
- **RLS surface is large and security-critical** — a missing policy = data leak. pgTAP
  coverage of every table's policies is mandatory, not optional.
- **Secret integrations still require server code** (Edge Functions) — "no server" reduces,
  not eliminates, backend code. Stripe webhook signature verification and Google token
  refresh are the highest-risk handlers.
- **Stripe Connect + Google OAuth** secrets live in Edge Function env, not the client.

## Decomposition note

Although the cutover is big-bang, the build splits into independently
specifiable/testable subprojects (schema+RLS, auth, RPCs, Edge Functions, web client,
mobile client, storage, search). The implementation plan (writing-plans) sequences these
per the build order above.
