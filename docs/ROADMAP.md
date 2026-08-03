# Faineant Marketplace Roadmap (Historical)

> Archived pre-Supabase snapshot. Current code and verified runtime state outrank
> the implementation claims in this document.

## Vision (2026-04-10)

Faineant is the bridge between discerning clients and exceptional beauty professionals — a premium, concierge-grade marketplace for barbers, nail techs, lash techs, and makeup artists. The product should feel sophisticated and effortless on both sides: clients discover vetted craftspeople and book in seconds; professionals run a real business without ever managing two calendars or chasing cash.

**Brand pillars:** Quality & craftsmanship · Convenience & flexibility · Community & connection · Simplicity & sophistication · Professional empowerment.

**Brand promise:** *Your connection to exceptional beauty, anytime, anywhere.*

### Vision → current plan mapping

| Vision requirement | Existing plan | Gap |
|---|---|---|
| Calendar integration (no double-calendar management) | 1.2 Calendar Sync | On track |
| Booking confirmations, reminders, alerts | 2.1 Notifications | On track |
| Favorite / star providers | 3.5 Favorites | On track |
| Search, filter, map by location/rating/specialty | 2.3 Search + Autocomplete | Needs map view + live availability color-coding |
| Real reviews + portfolio | 3.3 Review Enhancements | Needs S3 upload (1.3) |
| Community feed / profiles | 3.6 Community Enhancements | On track |
| Guided professional onboarding | 3.1 Provider Onboarding | On track |
| Provider analytics + earnings | 3.4 Analytics Dashboard | On track |
| Simple sign-up (minimize password friction) | 1.1 Email verification | **Needs social sign-in (new)** |
| On-the-go / house-call service mode | — | **New (Phase 5.1)** |
| No-call / no-show policy enforcement | — | **New (Phase 5.2)** |
| "Ping" nearby clients when available | — | **New (Phase 5.3)** |
| AI-powered conversational booking | — | **New (Phase 5.4)** |
| Premium brand voice + polish | Landing updated 2026-04-10 | **New (Phase 5.5) — ongoing** |
| House-call base rate + travel fee | — | **New (Phase 5.1)** |

---

## Current State (as of 2026-04-01)

### Test Coverage
| Package | Files | Tests | Status |
|---------|-------|-------|--------|
| `apps/web` | 6 | 107 | All passing |
| `apps/api` | 7 | 85 | All passing |
| `apps/mobile` | 13 | 101 | All passing |
| **Total** | **26** | **293** | **All passing** |

### What's Built

**Web (Next.js 14.2)**
- Landing page with phone mockups, testimonials, dark CTA
- Auth pages (login/register) with proper error handling
- Provider discovery with search and geo filtering
- Provider detail pages with SSR + 60s revalidation
- Dashboard layouts for client + provider + admin
- Community forum with posts and categories
- shadcn/ui component library (Button, Card, Input, Badge, Avatar, Separator, Sheet)

**API (Express + Prisma + PostgreSQL)**
- JWT auth with access/refresh tokens
- Role-based access (CLIENT, PROVIDER, ADMIN)
- Booking system with conflict detection (serializable transactions)
- Stripe Connect payments with webhook handling
- Real-time messaging via Socket.IO
- Provider search with Haversine geolocation
- Availability scheduling with overrides
- Reviews and ratings with aggregation
- Community posts and comments
- Rate limiting on auth + refresh endpoints

**Mobile (Expo + React Native)**
- Auth flow with SecureStore
- Client: explore, bookings, messages, community, profile
- Provider: dashboard, bookings, messages, earnings, profile
- Input validation on login/register
- Loading + error states on data screens

---

## Phase 1: Production Blockers

Priority: Must fix before any real users.

### 1.1 Email Verification
- **Status:** Not implemented
- **Why:** Users can register with any email, no proof of ownership
- **Work:**
  - Add `emailVerified` boolean + `verificationToken` to User model
  - Create `POST /auth/verify-email` endpoint
  - Integrate email service (Resend, SendGrid, or SES)
  - Block login until verified (or allow with limited access)
  - Add resend verification flow
- **Estimate:** Medium

### 1.2 Calendar Sync (Google Calendar + ICS)
- **Status:** Not implemented
- **Why:** Barbers already use Booksy/Square/Vagaro. They won't manage two calendars. Without this, adoption is dead on arrival.
- **Work:**
  - Google Calendar OAuth 2.0 two-way sync (read external events, write FAINEANT bookings)
  - ICS feed import as fallback (paste URL from any platform)
  - New Prisma models: `CalendarConnection`, `ExternalEvent`
  - Update availability slot calculation to merge external busy times
  - Provider settings page for connect/disconnect
  - Cron job for webhook re-subscription + ICS polling
- **Estimate:** 3 weeks (Google + ICS), 5 weeks with Square Appointments
- **Cost:** $0 (Google Calendar API free, ICS free)
- **Details:** See `CALENDAR-SYNC.md` for full integration plan
- **Priority:** CRITICAL — this is the adoption wedge

### 1.3 File Upload (S3)
- **Status:** Env vars configured, no implementation
- **Why:** Portfolio images, avatars, review photos all accept URLs but have no upload mechanism
- **Work:**
  - Install `@aws-sdk/client-s3` + `multer`
  - Create upload middleware with file type/size validation
  - Add `POST /uploads/image` endpoint returning signed URL or direct upload
  - Integrate with portfolio, avatar, and review photo flows
  - Add image optimization (sharp or Cloudflare Images)
- **Estimate:** Medium

### 1.3 Dashboard Error Handling
- **Status:** 13+ pages have empty `catch {}` blocks
- **Why:** Users see blank screens when API calls fail
- **Work:**
  - Add toast/notification component (shadcn Sonner or similar)
  - Replace all empty catch blocks with user-visible error messages
  - Add retry buttons on failed fetches
  - Add error boundaries to dashboard layout
- **Estimate:** Small

### 1.4 Fix TypeScript Config
- **Status:** `@faineant/shared` missing `composite: true`, web pages have `@faineant/shared` resolution errors
- **Work:**
  - Add `"composite": true` to `packages/shared/tsconfig.json`
  - Ensure shared package builds before web/api typecheck
  - Fix remaining `unknown` type errors in providers/services pages
- **Estimate:** Small

---

## Phase 2: Core Feature Gaps

Priority: Needed for a functional marketplace.

### 2.1 Notifications System
- **Status:** Socket.IO exists for messaging only, no push/email/SMS notifications
- **Work:**
  - Create notification model in Prisma (type, read status, userId, payload)
  - Trigger notifications on: booking confirmed, booking cancelled, payment received, new message, new review
  - Email notifications via email service from 1.1
  - Push notifications for mobile (Expo Push Notifications)
  - In-app notification bell with unread count
  - Optional: SMS via Twilio (env vars already configured)
- **Estimate:** Large

### 2.2 Token Refresh on Mobile
- **Status:** Mobile api-client has no automatic token refresh
- **Why:** Users get logged out after 15 minutes when access token expires
- **Work:**
  - Add 401 interceptor in `apps/mobile/src/lib/api-client.ts`
  - On 401, call `/auth/refresh` with stored refresh token
  - Retry original request with new access token
  - If refresh fails, clear tokens and navigate to login
- **Estimate:** Small

### 2.3 Search Validation + Autocomplete
- **Status:** Search endpoint has no input validation on lat/lng/radius
- **Work:**
  - Add Zod validation to search route query params
  - Add provider name autocomplete endpoint
  - IP-based geolocation fallback when no lat/lng provided
  - Category filtering with proper indexing
- **Estimate:** Medium

### 2.4 Payment Flow Hardening
- **Status:** Stripe integration works but has gaps
- **Work:**
  - Validate `charges_enabled` before creating payment intent
  - Prevent duplicate payment intents per booking
  - Add webhook idempotency (check event ID before processing)
  - Prevent cancelled booking from being re-confirmed via webhook replay
  - Add refund endpoint
  - Provider earnings pagination
- **Estimate:** Medium

---

## Phase 3: Growth Features

Priority: Makes the product competitive.

### 3.1 Provider Onboarding Flow
- Guided setup wizard: profile > services > availability > portfolio > Stripe
- Progress indicator showing completion percentage
- "Complete your profile" nudges on dashboard

### 3.2 Booking Calendar View
- Calendar component for both clients and providers
- Week/day view for provider schedule management
- Drag-to-reschedule functionality
- Integration with native device calendars

### 3.3 Review System Enhancements
- Photo reviews with S3 upload (depends on 1.2)
- Provider response to reviews
- Review sorting and filtering
- "Verified booking" badge on reviews

### 3.4 Analytics Dashboard
- Provider: revenue trends, booking rate, popular services, peak hours
- Admin: platform metrics, growth charts, revenue, user retention
- Charts with recharts or similar library

### 3.5 Favorites & Recommendations
- Client can favorite providers
- "Recently booked" section
- "Recommended for you" based on booking history
- "Popular near you" based on geo + ratings

### 3.6 Community Enhancements
- Like/unlike posts (backend exists, frontend missing)
- Image posts with upload
- Provider verification badges
- Nested comment threads

---

## Phase 4: Scale & Polish

### 4.1 Performance
- Add Redis caching for hot queries (provider search, availability slots)
- Database connection pooling via PgBouncer
- Image CDN with responsive sizes
- Web: ISR for provider pages, streaming with Suspense

### 4.2 Testing Gaps to Fill
| Area | Current | Needed |
|------|---------|--------|
| Web UI components | 97 tests | Add header, footer, dashboard layout tests |
| Web pages (non-landing) | 0 | Add tests for login, register, providers, community pages |
| API services | 0 | Add auth.service, booking.service, payment.service integration tests |
| API routes (e2e) | 0 | Add supertest e2e tests for all routes |
| Mobile screens | 101 tests | Good coverage, add navigation flow tests |
| Shared package | 0 | Add schema validation edge case tests |

### 4.3 Infrastructure
- CI/CD pipeline (GitHub Actions: lint > typecheck > test > build > deploy)
- Staging environment with seed data
- Database migrations strategy (Prisma migrate)
- Monitoring + alerting (Sentry, Vercel Analytics)
- Rate limiting per user (not just per IP)

### 4.4 Accessibility
- Keyboard navigation audit on all forms
- Screen reader testing on booking flow
- Color contrast validation (WCAG AA)
- Focus management on modals and sheets
- ARIA labels on status indicators and icons

### 4.5 Internationalization
- Extract all strings to translation files
- RTL layout support
- Currency formatting by locale
- Timezone-aware scheduling

---

## Phase 5: Vision-Aligned Features

Priority: Closes the gap between the current marketplace and the full Faineant vision. These are net-new capabilities not covered by Phases 1–4.

### 5.1 On-the-Go Service Mode
- **Why:** The vision hinges on connecting clients who want service anywhere with professionals who travel. A barber working a mobile van or doing house calls needs a first-class "I'm out of shop" mode, not a hack.
- **Work:**
  - Add `serviceMode` enum to Provider: `IN_SHOP`, `MOBILE`, `HYBRID`
  - Add `travelRadiusMiles` and `travelBaseFee` fields
  - Live status toggle: `In Shop` / `Out of Shop` / `On Call` (available for house calls right now)
  - Service-level flag: which services are bookable in-shop vs. mobile vs. both
  - Booking flow: client chooses location type, travel fee surfaces before payment
  - Availability calc: merge with travel-time buffers so back-to-back house calls don't collide
- **Depends on:** 1.2 Calendar Sync
- **Estimate:** Medium-Large

### 5.2 No-Show & Cancellation Policy Engine
- **Why:** Every professional in the vision doc mentioned losing money to no-shows. Deposits and grace periods were explicit asks.
- **Work:**
  - Provider-configurable policy: grace period (minutes), cancellation window (hours), fee structure (flat / percentage / deposit)
  - Booking creation captures the policy snapshot (so later policy changes don't re-trace old bookings)
  - Stripe PaymentIntent with manual capture for deposits
  - Automatic fee charge on no-show confirmation (provider marks the booking)
  - Client-visible policy display before checkout
- **Depends on:** 2.4 Payment Flow Hardening
- **Estimate:** Medium

### 5.3 Proximity "Ping" Broadcasts
- **Why:** When a pro has a last-minute gap or is working mobile in an area, the vision calls for a push to nearby starred/following clients.
- **Work:**
  - Provider action: "Broadcast availability" → creates a time-bounded availability window with a geo radius
  - Targets: clients who have favorited the provider AND are within the radius AND have opted in
  - Delivery: Expo Push (mobile) + in-app notification
  - Rate limit per provider to prevent spam
  - Dedicated accept flow: tap push → lands on a pre-filled booking
- **Depends on:** 2.1 Notifications, 3.5 Favorites, mobile geolocation permissions
- **Estimate:** Large

### 5.4 AI Concierge (Conversational Booking)
- **Why:** The vision explicitly asks for a conversational interface to reduce booking friction and feel premium.
- **Work:**
  - Chat surface in web + mobile using the Vercel AI SDK / Chat SDK pattern
  - Tool-calling agent with tools: `searchProviders`, `checkAvailability`, `createBooking`, `cancelBooking`, `rescheduleBooking`
  - Backed by the existing REST endpoints (agent = orchestrator, not a rewrite)
  - Streaming responses; handoff to human support on complex cases
  - Scoped to authenticated users initially (avoids abuse)
- **Depends on:** All core booking flows (already built)
- **Estimate:** Large (prototype) — should start as a concierge for one category before rolling out

### 5.5 Premium Brand Voice & Polish
- **Why:** The vision demands a sophisticated, concierge feel. Current copy is functional but too casual.
- **Work:**
  - Landing page copy refresh (shipped 2026-04-10)
  - Consistent FAINEANT brand treatment across web, mobile, emails
  - Typography pass: serif accents for headlines, refined spacing
  - Transactional email templates in Faineant voice
  - Provider verification badge + "Vetted" language
  - Review the entire in-app microcopy for the voice guide (quality, craftsmanship, effortless, elevated)
- **Estimate:** Medium (spans several sprints)

### 5.6 Simpler Auth (Social Sign-In)
- **Why:** Vision explicitly wants to minimize password friction. "Ideally avoiding complex password requirements like multiple logins."
- **Work:**
  - Add Apple, Google, and phone-OTP sign-in (mobile-first — matches the audience)
  - Keep email/password as fallback
  - Account linking when a user who signed up with email later uses Google with the same address
  - Username/nickname field separate from legal name (vision requirement)
- **Depends on:** 1.1 Email Verification (shared auth plumbing)
- **Estimate:** Medium

### 5.7 Live Map View with Color-Coded Availability
- **Why:** Vision asks for a map showing nearby pros color-coded by availability (green = available now, amber = soon, grey = unavailable).
- **Work:**
  - Map component (Mapbox or MapLibre) on the web providers page and mobile explore tab
  - Real-time availability marker colors via existing `getAvailableSlots()` service
  - Cluster markers at city zoom, pins at neighborhood zoom
  - Tap a pin → provider mini-card → book flow
  - Uses Socket.IO presence for "On Call" providers (5.1)
- **Depends on:** 5.1 On-the-Go Mode
- **Estimate:** Large

---

## Architecture Decisions for Future Features

### State Management (Web)
Current: React Context for auth only, no global state.
Recommendation: Add TanStack Query (React Query) for server state. Handles caching, refetching, optimistic updates, and loading/error states automatically. Eliminates the need for `useEffect` + `useState` data fetching pattern used everywhere.

### State Management (Mobile)
Current: Local useState + useEffect in every screen.
Recommendation: Same as web - TanStack Query for React Native. Solves the token refresh, caching, and error handling problems in one package.

### Real-time Updates
Current: Socket.IO for messaging only.
Recommendation: Extend to booking status updates, notification delivery, provider availability changes. Use rooms per user/provider.

### Design System
Current: 7 shadcn components.
To add: Dialog, Dropdown Menu, Select, Tabs, Tooltip, Toast (Sonner), Skeleton, Progress, Switch, Textarea. Install as needed from shadcn/ui CLI.

---

## Sprint Suggestions

**Sprint 1 (Critical Path):** 1.1 + 1.3 + 1.4 + 2.2
Email verification, fix error handling, fix TypeScript, mobile token refresh.

**Sprint 2 (Uploads + Payments):** 1.2 + 2.4
S3 uploads, payment hardening.

**Sprint 3 (Notifications + Search):** 2.1 + 2.3
Full notification system, search improvements.

**Sprint 4 (Growth):** 3.1 + 3.2 + 3.5
Provider onboarding, calendar, favorites.

**Sprint 5 (Polish):** 3.3 + 3.4 + 3.6 + 4.2
Reviews, analytics, community, testing.

**Sprint 6 (Vision — Foundations):** 5.5 + 5.6 + 5.2
Premium voice rollout, social sign-in, no-show policy engine. These unlock the concierge brand and unblock house-call monetization.

**Sprint 7 (Vision — Mobile-first):** 5.1 + 5.7
On-the-go mode + live map. The "anywhere" half of the brand promise.

**Sprint 8 (Vision — Delight):** 5.3 + 5.4
Ping broadcasts + AI concierge. These are the features that make Faineant feel like nothing else in the category.
