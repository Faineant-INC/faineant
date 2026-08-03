# FAINEANT Build Plan (Historical)

> Archived pre-Supabase plan. It is not an implementation or deployment
> authority; use the current code, `README.md`, `CLAUDE.md`, and SQL migrations.

> Living document. Audit + per-phase requirements for the work that remains
> end-to-end across web, API, mobile, and infrastructure.
>
> Last reviewed: **2026-05-01** (against the codebase on `main`).

---

## 0. Audit — what's actually built

### Web (`apps/web`, Next.js 14.2)

- Marketing: home (with new waitlist section), services list + detail, manifesto, practitioners.
- Auth: login, register (Suspense fix), AuthProvider with localStorage tokens + cookie.
- Dashboards: client (overview/bookings/messages/profile), provider (overview/bookings/schedule/services/portfolio/messages/earnings/integrations/profile/settings), admin (overview).
- Layout primitives: Topbar, SiteHeader, SiteFooter, AppSidebar (role-aware, active highlight, working logout).
- shadcn/ui re-themed with FAINEANT tokens; tests: 107.

### API (`apps/api`, Express + Prisma + PostgreSQL)

- JWT auth + refresh tokens with `RefreshToken` model.
- Booking creation in serializable transaction.
- Stripe Connect Express + webhook.
- Socket.IO messaging.
- Provider search (Haversine).
- Availability + `AvailabilityOverride`.
- Reviews + community posts + comments.
- Calendar sync routes + service + `CalendarConnection`/`ExternalEvent` models (Google OAuth + ICS).
- Waitlist (just shipped — `WaitlistEntry`, idempotent upsert, IP hash, honeypot).
- Email **templates** as data only — no transport wired.
- Tests: 85.

### Mobile (`apps/mobile`, Expo 50)

- Auth (login/register) with SecureStore.
- Client tabs: home, bookings, messages, community, profile.
- Provider tabs: home, bookings, earnings, messages, profile.
- 4-step booking flow: service → window → confirm → success.
- Tests: 101.

### Shared (`packages/shared`)

- Brand constants, theme tokens (palette, type, motion), Zod schemas, types.

### Infrastructure

- Web on Vercel (`arc-marketplace.vercel.app`) — live.
- API: **not deployed**. Vercel attempts errored (Express ≠ serverless).
- DB: **not provisioned in prod**. Local docker-compose only.
- No CI/CD, no staging, no monitoring.
- Prisma uses `db push` — no migrations folder yet.

### Critical "looks built but isn't"

| Claim | Reality |
|---|---|
| Email templates exist | True, but no transport — they're inert data |
| Calendar sync wired | Server side complete; UI to connect/disconnect not surfaced beyond `/dashboard/provider/integrations` |
| Auth works in prod | False — no API in prod, login will fail |
| Waitlist captures emails in prod | False — same reason |

---

## 1. Phase 1 — Production blockers

Goal: get a real, end-to-end working product on prod with a real backend, real
data, real email. **Nothing else matters until this is done.**

### 1.1 Email transport + email verification

**Goal:** users prove ownership of their email; transactional emails actually send.

**Acceptance criteria**
- New `User.emailVerified` boolean (default `false`); `EmailVerificationToken` model with `userId`, `token`, `expiresAt` (24h), `consumedAt`.
- `POST /auth/register` creates user with `emailVerified=false` and triggers verification email (existing `email-templates.ts` rendered through transport).
- `POST /auth/verify-email` accepts `{ token }`, marks user verified, consumes token. Idempotent on double-submit.
- `POST /auth/resend-verification` rate-limited (3/hour/IP).
- Login allowed for unverified users but a banner appears in dashboard until verified; bookings + payments are gated until verified.
- Resend account: `noreply@faineantapp.com` (DNS pending), DKIM + SPF + DMARC configured.

**Technical approach**
- Provider: **Resend** (best dev DX, generous free tier, good DMARC support).
- New module `apps/api/src/services/email.ts` — single `sendEmail(rendered: RenderedEmail, to: string)` taking templates from `email-templates.ts`.
- Env: `RESEND_API_KEY`, `EMAIL_FROM_NAME`, `EMAIL_FROM_ADDRESS`. Validate in `config/env.ts`.
- Schema migration via `prisma migrate dev --name add_email_verification` (also seeds the migrations folder for first time).

**Files to touch**
- `apps/api/prisma/schema.prisma` (new model + field)
- `apps/api/src/services/auth.service.ts` (issue token, send email)
- `apps/api/src/services/email.ts` (new)
- `apps/api/src/routes/auth.routes.ts` (verify + resend)
- `apps/web/src/app/verify-email/page.tsx` (new, consumes `?token=`)
- `apps/web/src/components/dashboard/verify-email-banner.tsx` (new)
- `packages/shared/src/schemas/auth.schema.ts` (verify schema)

**Effort:** M · **Depends on:** none · **Unlocks:** 2.1, 5.6.

---

### 1.2 File upload (S3/R2)

**Goal:** practitioners upload portfolio images, avatars; clients upload review photos.

**Acceptance criteria**
- `POST /uploads/sign` returns a presigned PUT URL + final public URL. Validates content-type (`image/jpeg|png|webp`) and size ≤ 8 MB before signing.
- Upload happens client-side directly to object storage (no server roundtrip on payload).
- `POST /uploads/finalize` records the final URL and image metadata in DB and runs basic validation (HEAD request to confirm object exists, optional sharp metadata).
- Avatar, `PortfolioItem`, and review photo flows on web + mobile use the new flow.
- Image variants generated on demand via Vercel Image Optimization (web) / `expo-image` (mobile) — no separate worker.

**Technical approach**
- **Cloudflare R2** (S3-compatible, free egress, generous free tier) over AWS S3.
- `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`.
- Buckets: `faineant-uploads` with public-read.
- Server signs URLs scoped to `users/<userId>/<uuid>.<ext>`; bucket lifecycle deletes orphaned objects after 24h if no `uploads/finalize` call.

**Files**
- `apps/api/src/routes/uploads.routes.ts` (new), `services/uploads.service.ts` (new)
- `apps/api/src/middleware/upload-quota.ts` — per-user daily cap (50 uploads/day)
- `apps/web/src/components/uploader.tsx` (drop-zone + progress, uses presigned URL)
- `apps/mobile/src/components/uploader.tsx` (uses `expo-image-picker` + presigned URL)
- `packages/shared/src/schemas/upload.schema.ts`

**Effort:** M · **Depends on:** 1.4 (env loaded in prod) · **Unlocks:** 3.3, 3.6, 5.1.

---

### 1.3 Dashboard error handling

**Goal:** users see meaningful errors when API calls fail; no blank screens.

**Acceptance criteria**
- All `catch {}` empty blocks replaced; toast surfaces user-readable copy.
- Toast component installed (shadcn `Sonner`) with FAINEANT styling — taupe border, oxblood for destructive, champagne for success.
- Top-level `error.tsx` route boundary on `/dashboard` renders a recovery card with retry.
- API failures in `useEffect` data fetching show inline retry on the affected card (not just a toast).
- Accessibility: errors announce via `role="alert"` (toast), `role="status"` (inline), `aria-live` set appropriately.

**Files**
- `apps/web/src/components/ui/sonner.tsx` (new, shadcn)
- `apps/web/src/app/dashboard/error.tsx`, `apps/web/src/app/dashboard/loading.tsx`
- Audit + fix: every file under `apps/web/src/app/dashboard/**` with empty `catch`.

**Effort:** S · **Depends on:** none.

---

### 1.4 API + DB deployment to prod

**Goal:** the live web app talks to a real backend.

**Acceptance criteria**
- API deployed at `api.faineantapp.com` (or interim `arc-api.fly.dev`).
- Postgres provisioned with daily backups.
- Web `NEXT_PUBLIC_API_URL` points at prod API; CORS configured to accept `arc-marketplace.vercel.app` and the eventual custom domain.
- Migrations run automatically on deploy (`prisma migrate deploy`).
- Seed runs once via a one-shot job, **not** on every deploy.
- Health probe `/health` returns `{ status: "ok", db: "ok" }`.
- Secrets stored in deploy provider secret manager — never in repo or `.env`.

**Technical approach**
- **API:** Render free web service (Express works as-is) **or** Fly.io 1× shared VM. Render is simpler; Fly is faster cold-start. Default: Render.
- **DB:** Neon free tier (0.5 GB, persistent, auto-resume per query) — better than Render's free Postgres which deletes after 30 days.
- **Redis:** Upstash free tier (10K commands/day) for rate-limit + Socket.IO adapter eventually.
- Adopt **Prisma migrations** here (`prisma migrate dev` locally, `prisma migrate deploy` on prod).

**Files**
- `apps/api/render.yaml` (new) or `fly.toml` (new)
- `apps/api/Dockerfile` (already exists; verify build target)
- `apps/api/prisma/migrations/` (new — initial migration squashed from current schema)
- `.github/workflows/deploy-api.yml` (new, see 4.3)

**Effort:** M · **Depends on:** none. **Critical path** — blocks every other phase from being real.

---

### 1.5 Prisma migration baseline

**Goal:** stop using `db push`; ship schema changes safely.

**Acceptance criteria**
- Initial migration generated from current schema (`prisma migrate dev --name init`).
- All future schema work goes through migrations, not `db push`.
- Local `pnpm db:migrate` runs `prisma migrate dev`.
- CI fails if `schema.prisma` changes without an accompanying migration.

**Files**
- `apps/api/prisma/migrations/0001_init/`
- `package.json` scripts updated (`db:migrate` → `migrate dev`, add `db:migrate:deploy`).
- CI step: `pnpm prisma migrate diff --from-migrations apps/api/prisma/migrations --to-schema-datamodel apps/api/prisma/schema.prisma --exit-code`.

**Effort:** S · **Depends on:** 1.4.

---

## 2. Phase 2 — Functional gaps

### 2.1 Notifications system

**Goal:** booking + message + payment + review events deliver via email + push + in-app.

**Acceptance criteria**
- New models: `Notification` (`userId`, `type`, `payload JSON`, `readAt`, `createdAt`), `PushDevice` (`userId`, `expoPushToken`, `platform`, `lastSeenAt`).
- Event emitter wraps existing services — emits `booking.created`, `booking.confirmed`, `booking.cancelled`, `booking.reminder` (24h + 1h), `payment.succeeded`, `payment.failed`, `message.received`, `review.posted`.
- Worker process (BullMQ on Upstash Redis) consumes events and fans out to:
  - Email via Resend (uses 1.1 transport).
  - Expo Push for mobile devices.
  - In-app `Notification` row.
- In-app bell on web + mobile shows unread count, marks-on-open, swipe-to-dismiss on mobile.
- Per-user notification preferences (email + push toggles per category).
- 24h booking reminders scheduled via BullMQ delayed jobs (cancelled if booking cancelled).

**Effort:** L · **Depends on:** 1.1, 1.4 · **Unlocks:** 5.3.

### 2.2 Mobile token refresh

**Goal:** users stay signed in until refresh token expires (30d), not 15min access.

**Acceptance criteria**
- `apps/mobile/src/lib/api-client.ts` intercepts 401, calls `/auth/refresh`, retries original request once.
- Concurrent 401s deduplicate: only one refresh in flight; queued requests resolve with the new token.
- On refresh failure: clear SecureStore, navigate to `/login`.

**Effort:** S · **Depends on:** none.

### 2.3 Search validation + autocomplete + IP geolocation fallback

**Goal:** search is bulletproof and helpful.

**Acceptance criteria**
- `GET /search/providers` query params validated with Zod (`lat`, `lng`, `radiusMi`, `category`, `priceMin`, `priceMax`, `availability=now|today|this_week`, `q`, `cursor`, `limit`).
- New `GET /search/autocomplete?q=` returns provider names + service names (uses Postgres trigram index).
- When no `lat`/`lng`, server falls back to IP geolocation (Vercel `request.geo` on the web side; fallback to Chicago lat/lng).
- Indexes: GIN trigram on `ProviderProfile.displayName`, `Service.title`.

**Effort:** M · **Depends on:** none.

### 2.4 Payment flow hardening

**Goal:** no double-charges, no replay, no orphaned PaymentIntents, refund support.

**Acceptance criteria**
- `Payment` rows have `stripeEventId UNIQUE` for webhook idempotency.
- Booking creation aborts if provider's Stripe account `charges_enabled === false`.
- One PaymentIntent per booking (DB constraint + idempotency key = `booking_${bookingId}`).
- `POST /payments/:bookingId/refund` issues refund (provider can issue partial; admin can issue full).
- Webhook ignores events for cancelled bookings.
- Provider earnings endpoint paginated (cursor on `createdAt desc`).

**Effort:** M · **Depends on:** 1.4.

---

## 3. Phase 3 — Growth

### 3.1 Provider onboarding wizard

**Goal:** new practitioners hit "ready to take bookings" in <10 minutes.

**Acceptance criteria**
- Stepper: profile basics → service offerings → availability windows → portfolio (≥3 images) → Stripe Connect onboarding.
- Each step persistable; resume from last incomplete step on next login.
- Dashboard "Complete your profile" card with percent complete until all 5 done.
- Step 5 redirects to Stripe Connect Express onboarding; on return, reads `charges_enabled` and shows pending state if still false.

**Effort:** M · **Depends on:** 1.2, 2.4.

### 3.2 Booking calendar view

**Goal:** providers manage their week visually; clients see open windows visually.

**Acceptance criteria**
- Provider: week view (default) + day view with bookings, blocked time, external calendar events (from 1.2 calendar sync).
- Drag-to-reschedule with conflict check via existing `getAvailableSlots()`.
- Client: month view on service detail showing earliest available days; tap to slide to time slots.
- ICS export: client gets `.ics` attachment on confirmation email; provider gets a feed URL.

**Effort:** L · **Depends on:** 2.1.

### 3.3 Reviews v2

**Goal:** reviews feel real; providers can respond.

**Acceptance criteria**
- Photo reviews (≤4 per review, S3 from 1.2).
- Provider can post one response per review; response shown inline.
- Sort: most recent / highest / lowest. Filter by rating.
- "Verified booking" badge on reviews backed by a `Booking.completedAt`.

**Effort:** M · **Depends on:** 1.2.

### 3.4 Analytics

**Goal:** providers see what's working; admin sees platform health.

**Acceptance criteria**
- Provider dashboard widgets: revenue (7/30/90d), booking rate, top services, busiest hours, repeat-client %.
- Admin dashboard widgets: GMV, take-rate revenue, MAU, new providers, conversion funnel (visit → book).
- Charts via Recharts. All queries materialized in `mat_views` refreshed nightly to keep response < 200ms.

**Effort:** M-L · **Depends on:** none directly, more useful after 1.4.

### 3.5 Favorites + recommendations

**Goal:** clients build a small, repeat-visit roster; we surface "again?" prompts.

**Acceptance criteria**
- New `Favorite` model (`clientId`, `providerId`, `createdAt`, `@@unique([clientId, providerId])`).
- Heart icon on provider cards + detail; toggle is optimistic.
- "Again?" homepage card (already mocked) is real — shows favorited providers with current open windows.
- Simple recs: "Popular near you" = top-rated within 5mi; "Recently booked" = client history; "You might like" = service-category collaborative filter (later).

**Effort:** M · **Depends on:** 5.3 ping needs this model.

### 3.6 Community v2

**Goal:** the community tab is alive, not decorative.

**Acceptance criteria**
- Like/unlike posts (BE exists — wire FE).
- Image posts via 1.2 uploads.
- Provider verification badge in feed.
- Single-level reply threads on comments (no infinite nesting).

**Effort:** M · **Depends on:** 1.2.

---

## 4. Phase 4 — Scale & polish

### 4.1 Performance

- Redis cache (Upstash) for: provider search results (60s), available-slot windows (300s), aggregate review stats (3600s).
- PgBouncer on prod DB (Neon already pools).
- ISR on `/services/[slug]` (60s) and `/practitioners/[slug]` (60s).
- Streaming with React `Suspense` on dashboard data sections.
- Move from manual `useEffect` data fetching → **TanStack Query** everywhere on web + mobile (this is the single biggest DX/perf win and will also fix half the empty `catch` blocks).

### 4.2 Test gaps

| Area | Now | Target |
|---|---|---|
| Web pages (non-landing) | 0 | login, register, dashboard root, booking page, services slug |
| API services | 0 | auth, booking, payment, calendar-sync — focused integration tests |
| API e2e | 0 | supertest covering happy paths on every router |
| Mobile navigation | 0 | nav-flow tests across (auth)→(client) and (client)→(booking) |
| Shared schemas | 0 | edge cases for every Zod schema |

### 4.3 Infrastructure

- GitHub Actions: `lint → typecheck → test → build → preview deploy → prod deploy`.
- Required checks: prevent merges with red CI.
- Sentry on web, API, mobile.
- Vercel Analytics on web.
- BetterStack heartbeat on `/health`.
- Per-user rate limiting (already per-IP).

### 4.4 Accessibility

- Keyboard nav audit on every form.
- VoiceOver / TalkBack pass on booking flow.
- WCAG AA color contrast on all FAINEANT tokens (taupe-300 on smoke-900 is borderline — verify and adjust if needed).
- Focus trap + return on dialogs/sheets.
- ARIA labels on icon-only buttons.

### 4.5 Internationalization (deferred until post-MVP)

- Strings extracted to message catalogs (next-intl on web, expo-localization on mobile).
- Currency + date formatting per locale.
- Timezone-aware booking display (provider tz vs. viewer tz).

---

## 5. Phase 5 — Vision-aligned (the differentiators)

### 5.1 Service mode (in-shop / mobile / hybrid)

**Acceptance criteria**
- `ProviderProfile.serviceMode: IN_SHOP | MOBILE | HYBRID`.
- `ProviderProfile.travelRadiusMiles`, `travelBaseFee`, `travelPerMileFee`.
- Live status enum: `IN_SHOP | OUT_OF_SHOP | ON_CALL`.
- `Service.locationModes: ServiceLocationMode[]` — which of `IN_SHOP|MOBILE|BOTH` each service supports.
- Booking flow asks: in-shop / at-my-place. Travel fee surfaces before payment.
- Availability calc adds travel-time buffer between back-to-back mobile bookings.
- Mobile screen: "Out of shop" toggle in provider home tab.

**Effort:** M-L · **Depends on:** 1.2 calendar sync.

### 5.2 No-show / cancellation policy engine

**Acceptance criteria**
- Provider configures: grace minutes, cancellation window hours, fee model (`flat` / `percent` / `deposit`), deposit %.
- Booking captures **policy snapshot** at creation (later policy changes don't apply retroactively).
- Stripe PaymentIntent uses **manual capture** when deposit policy active.
- Provider can mark a booking "no-show" within 30 minutes of start; charges fee per snapshot.
- Client cancellation outside the window: full refund. Inside window: percent refund per policy.
- Policy displayed during checkout — client must scroll past it.

**Effort:** M · **Depends on:** 2.4.

### 5.3 Proximity ping broadcasts

**Acceptance criteria**
- Provider action: "Broadcast next 2 hours" creates a `BroadcastWindow` (geo lat/lng, radiusMi, startsAt, endsAt).
- Targets: clients with `Favorite(providerId)` AND last-known location within radius AND `notifications.proximityPings === true`.
- Delivery: Expo Push + in-app notification.
- Rate limit: ≤2 broadcasts/provider/day.
- Tap notification → pre-filled booking screen (mobile + web).
- Server-side sanity check: provider must be in `ON_CALL` status to broadcast.

**Effort:** L · **Depends on:** 2.1, 3.5, 5.1.

### 5.4 AI concierge

**Goal:** "I want a haircut Saturday morning, somewhere in West Loop" → confirmed booking, conversationally.

**Acceptance criteria**
- Chat surface on web (`/concierge`) and mobile (a tab or floating button).
- Vercel AI SDK with tool-calling; tools: `searchProviders`, `getAvailableSlots`, `createBooking`, `cancelBooking`, `rescheduleBooking`, `recommend` (uses 3.5 + favorites).
- All tools call existing REST endpoints with the user's session — no privilege escalation.
- Streaming responses; markdown rendered.
- Handoff: explicit "talk to a human" button writes to admin Slack/email.
- Scope: authenticated users only (rate-limit anon route to a 4-message demo).
- Logs: every tool call captured for evals.

**Effort:** L (prototype: 2 weeks) · **Depends on:** 1.4, 2.1.

### 5.5 Premium voice rollout

- Web: every dashboard, settings, error copy in FAINEANT voice (currently inconsistent — booking flow is good, error states are not).
- Mobile: same audit.
- Email: every transactional email through `email-templates.ts` — booking confirm, reminder, cancellation, payment receipt, review request.
- Voice guide doc — extract the lexicon ("ritual", "window", "open the door", "one address", "never loud") to `docs/VOICE.md`.

**Effort:** M · **Depends on:** 1.1.

### 5.6 Social sign-in

**Acceptance criteria**
- Apple Sign-In (mobile-first; web later).
- Google OAuth (web + mobile).
- Phone OTP (Twilio Verify) — primary path on mobile per vision.
- Account linking when same email across providers.
- Username/nickname separate from legal name.

**Effort:** M · **Depends on:** 1.1.

### 5.7 Live map view

**Acceptance criteria**
- Map component (Mapbox GL JS on web, `react-native-mapbox-gl` on mobile) on `/practitioners` and mobile explore.
- Markers color-coded: green `ON_CALL`, amber available within 24h, grey otherwise.
- Cluster at city zoom; pins at neighborhood zoom.
- Tap pin → bottom sheet w/ provider mini-card → booking flow.
- Live updates via Socket.IO room `availability:<geohash>`.

**Effort:** L · **Depends on:** 5.1.

---

## 6. Mobile-specific gaps (delta to web parity)

| Surface | Status | Phase |
|---|---|---|
| Token refresh | Missing | 2.2 |
| Push notifications (Expo) | Missing | 2.1 |
| Provider schedule editor | Missing | 3.2 |
| Provider services editor | Missing | 3.1 |
| Provider portfolio editor | Missing | 1.2 + 3.1 |
| Provider integrations screen | Missing | 1.2 calendar UI |
| Provider settings | Missing | 5.2 policies + general |
| Reviews (write/view) on mobile | Missing | 3.3 |
| Favorites on mobile | Missing | 3.5 |
| Search filters / map | Basic only | 2.3 + 5.7 |
| AI concierge surface | Missing | 5.4 |

---

## 7. Recommended sequencing

The roadmap doc orders by phase. The realistic critical path orders by what
unblocks the most work for the least effort.

**Sprint A — Make it real (1 week)**
1.4 deploy API + Neon + migrations baseline · 1.1 Resend transport + verification · 2.2 mobile refresh · 1.5 migrations baseline.
**End state:** real users can sign up, verify email, log in on web + mobile against a real prod backend.

**Sprint B — Make it usable (1 week)**
1.3 error toasts · 1.2 R2 uploads · 2.4 payment hardening · 2.3 search Zod.
**End state:** marketplace transactional flow is bulletproof; portfolio/avatars/reviews can be real.

**Sprint C — Make it competitive (2 weeks)**
2.1 notifications · 3.1 onboarding wizard · 3.2 calendar view · 3.5 favorites.
**End state:** practitioners onboard themselves; reminders go out; "again?" surface works.

**Sprint D — Make it differentiated (2 weeks)**
5.6 social sign-in · 5.2 no-show policy · 5.5 voice rollout.
**End state:** auth friction near-zero; deposits + no-show charges live; brand voice consistent.

**Sprint E — Make it FAINEANT (3 weeks)**
5.1 service mode · 5.7 live map · 3.3 reviews v2.
**End state:** the "anywhere" half of the brand promise lives; map is the discovery surface; reviews look real.

**Sprint F — Make it magical (3 weeks)**
5.3 ping broadcasts · 5.4 AI concierge · 4.1 perf + TanStack Query rollout.
**End state:** proximity pings + concierge are functional; perf is professional-grade.

**Background, always-on**
4.2 tests · 4.3 CI/CD · 4.4 a11y. These shouldn't be a sprint — they should be a guardrail every PR satisfies.
