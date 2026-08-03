# FAINEANT — Calendar & Booking Platform Sync Strategy (Historical)

> This document describes the retired standalone API design and is retained for
> product history only. The implemented read-only Supabase design is documented
> in `supabase/functions/calendar.README.md` and the calendar Edge Function code.

> Barbers won't adopt FAINEANT if it means managing two calendars.
> This document plans how FAINEANT syncs with existing booking tools so providers
> see one unified schedule regardless of where the booking came from.

---

## The Problem

Most barbers already use a booking platform. The top ones:

| Platform | Barber Users | Has API | Sync Possible |
|----------|-------------|---------|---------------|
| **Booksy** | 60K+ barbers, 10M+ users | Alpha (invite-only) | Not yet reliably |
| **Squire** | Barbershop-focused, Series D | No public API | No |
| **theCut** | 50K+ barbers, 5M users | No public API | No |
| **Square Appointments** | Huge (payments + bookings) | **Yes, full API** | **Yes** |
| **Vagaro** | 220K+ pros | Yes (paid, gated) | Yes (with Enterprise) |
| **Fresha** | 450K+ pros | No API | No |
| **StyleSeat** | Popular with independents | No API | No |

**Reality:** Most barber-specific platforms (Booksy, Squire, theCut) are walled gardens. But almost all of them offer one thing: **Google Calendar sync**. That's our bridge.

---

## Strategy: Google Calendar as the Universal Bridge

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Booksy      │────>│                  │<───>│             │
│  Squire      │────>│  Google Calendar  │<───>│    FAINEANT      │
│  theCut      │────>│  (hub)           │<───>│  Calendar   │
│  Vagaro      │────>│                  │     │             │
│  Fresha      │────>│                  │     │             │
└──────────────┘     └──────────────────┘     └─────────────┘
      one-way               two-way sync
    (platform → GCal)      (GCal ↔ FAINEANT)
```

Almost every booking platform pushes events to Google Calendar. FAINEANT does two-way sync with Google Calendar. The result: bookings from ANY platform appear as busy time in FAINEANT, and FAINEANT bookings appear in the provider's other platform.

---

## Integration Tiers

### Tier 1: Google Calendar (Two-Way Sync) — LAUNCH

**Why first:** Free API, 1M requests/day, every barber has Gmail, every booking platform syncs to it. This alone solves 80% of the double-booking problem.

**What it does:**
- Provider connects Google account via OAuth 2.0
- FAINEANT reads existing events as "busy" time (blocks those slots)
- FAINEANT writes new bookings as Google Calendar events
- Changes in either direction sync within minutes via push notifications (webhooks)

**API capabilities:**
| Action | Endpoint | Notes |
|--------|----------|-------|
| List events | `GET /calendars/{id}/events` | Read busy times |
| Create event | `POST /calendars/{id}/events` | Write FAINEANT bookings |
| Update event | `PUT /calendars/{id}/events/{id}` | Reschedule |
| Delete event | `DELETE /calendars/{id}/events/{id}` | Cancel |
| Watch for changes | `POST /calendars/{id}/events/watch` | Real-time push notifications |
| Free/busy query | `POST /freeBusy/query` | Bulk availability check |

**Auth:** OAuth 2.0 with `calendar.events` scope
**Cost:** $0 (1M requests/day quota)
**Docs:** https://developers.google.com/calendar

**Implementation plan:**
```
apps/api/
  src/services/calendar-sync.service.ts    # Core sync logic
  src/routes/calendar.routes.ts            # OAuth callback, settings
  src/jobs/calendar-poll.ts                # Fallback polling (if webhooks fail)

apps/web/
  src/app/dashboard/provider/settings/     # "Connect Google Calendar" UI

prisma/schema.prisma
  + CalendarConnection model (userId, provider, accessToken, refreshToken, calendarId, syncToken)
```

**Sync logic:**
1. On connect: full import of next 30 days of events → mark as "external busy"
2. On new FAINEANT booking: create Google Calendar event with booking details
3. On Google Calendar change (webhook): check if it conflicts with FAINEANT bookings, update availability
4. On FAINEANT cancellation: delete corresponding Google Calendar event
5. Every 15 min: poll for changes as webhook fallback (Google requires re-subscription every 7 days)

**Edge cases:**
- All-day events: treat as fully blocked
- Recurring events: expand instances, check each occurrence
- Multi-calendar: let provider choose which calendar to sync
- Conflicts: if external event overlaps existing FAINEANT booking, notify provider

---

### Tier 1B: ICS/iCal Feed Import — LAUNCH

**Why:** Universal fallback. Any platform that can't do API sync can usually export an ICS feed URL. Booksy, Vagaro, Acuity, Calendly all offer this.

**What it does:**
- Provider pastes an ICS feed URL from their other platform
- FAINEANT polls the feed every 15–30 minutes
- Events from the feed are marked as "external busy" time
- One-way only (read from other platform, can't write back)

**Implementation:**
- Parse ICS using `ical.js` or `node-ical` npm package
- Store feed URL in CalendarConnection model
- Cron job polls feeds on interval
- Display external events in provider schedule view (grayed out / different color)

**Limitation:** ICS feeds can have 12–24 hour delay on Google Calendar's side. Direct ICS URL from the source platform is faster but still poll-based (not real-time).

**Cost:** $0

---

### Tier 2: Square Appointments (Direct API) — Month 2–3

**Why:** Square is already huge with barbers (many use Square POS for payments). Full two-way API, free, well-documented.

**API capabilities:**
| Action | Endpoint | Notes |
|--------|----------|-------|
| List bookings | `GET /v2/bookings` | Filter by date, status, team member |
| Create booking | `POST /v2/bookings` | Create from FAINEANT into Square |
| Update booking | `PUT /v2/bookings/{id}` | Reschedule, status change |
| Cancel booking | `POST /v2/bookings/{id}/cancel` | Cancel with reason |
| List availability | `POST /v2/bookings/availability/search` | Get open slots |
| Webhooks | `booking.created`, `booking.updated` | Real-time push events |

**Auth:** OAuth 2.0 (Square Developer account, free)
**Cost:** $0 for API. Square Appointments is free for solo. 2.6% + $0.10 per transaction.
**Docs:** https://developer.squareup.com/docs/bookings-api

**Sync logic:**
- Two-way: FAINEANT bookings → Square, Square bookings → FAINEANT
- Use webhooks for real-time updates
- Map FAINEANT services to Square catalog items
- Handle Square team members → FAINEANT provider profiles

---

### Tier 2B: Acuity Scheduling (Direct API) — Month 2–3

**Why:** Popular with independent professionals, solid REST API, included with paid plans.

**API capabilities:**
- Full CRUD on appointments, availability, calendars, clients
- Webhook support
- OAuth 2.0 or HTTP Basic Auth

**Cost:** Included with Acuity paid plans ($16+/mo for the barber)
**Docs:** https://developers.acuityscheduling.com

---

### Tier 3: Vagaro (Paid API) — Month 4–6

**Why:** 220K+ professionals, growing barber base. API exists but gated behind Enterprise sales.

**Access:** Contact Vagaro Enterprise sales team
**Cost:** $10/mo for webhook access (5,000 API calls included), $0.002/additional call
**Auth:** API Key
**Capabilities:** Read appointments, employees, locations. Webhooks for appointment events.

**Docs:** https://docs.vagaro.com

---

### Tier 4: Booksy (Monitor) — Future

**Status:** Alpha API exists at `alpha.docs.booksy.net`. REST API with OAuth 2.0 and JSON responses. But access appears to be invite-only/restricted.

**Action:** 
- Monitor for public API launch
- Apply for alpha access
- Booksy has 60K+ barbers — this is the single highest-value integration for the barber vertical

---

### Tier 5: Cal.com (Open Source Alternative) — Optional

**Why consider:** Open source (AGPLv3), self-hostable, free API. Could use as FAINEANT's internal scheduling engine instead of building from scratch.

**Capabilities:** Full REST API v2, webhooks, embeddable booking widget, workflow automation.
**Cost:** Free (self-hosted) or $15/user/mo (cloud)
**Docs:** https://cal.com/docs/api-reference/v2/introduction

---

## Data Model Changes

```prisma
model CalendarConnection {
  id              String   @id @default(uuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  provider        CalendarProvider  // GOOGLE, SQUARE, VAGARO, ACUITY, ICS_FEED
  accessToken     String?           // encrypted
  refreshToken    String?           // encrypted
  externalId      String?           // Google calendar ID, Square location ID, etc.
  feedUrl         String?           // for ICS feeds
  syncToken       String?           // Google incremental sync token
  lastSyncedAt    DateTime?
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([userId, provider])
  @@index([userId])
}

model ExternalEvent {
  id                    String   @id @default(uuid())
  calendarConnectionId  String
  calendarConnection    CalendarConnection @relation(fields: [calendarConnectionId], references: [id], onDelete: Cascade)
  externalId            String            // ID from external platform
  title                 String?
  startTime             DateTime
  endTime               DateTime
  isAllDay              Boolean  @default(false)
  source                CalendarProvider
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@unique([calendarConnectionId, externalId])
  @@index([calendarConnectionId, startTime])
}

enum CalendarProvider {
  GOOGLE
  SQUARE
  VAGARO
  ACUITY
  ICS_FEED
}
```

---

## Availability Conflict Resolution

When checking available slots, FAINEANT now checks THREE sources:

```
Available slot = NOT blocked by:
  1. FAINEANT bookings (existing booking.service.ts conflict check)
  2. FAINEANT availability overrides (existing availability.service.ts)
  3. External calendar events (NEW - ExternalEvent table)
```

Updated slot query:
```typescript
async function getAvailableSlots(providerProfileId: string, date: string) {
  // Existing: get FAINEANT bookings for this provider on this date
  const arcBookings = await getArcBookings(providerProfileId, date);
  
  // Existing: get availability schedule + overrides
  const schedule = await getAvailability(providerProfileId, date);
  
  // NEW: get external events from synced calendars
  const externalEvents = await getExternalEvents(providerProfileId, date);
  
  // Merge all busy times, then compute free slots
  const allBusy = [...arcBookings, ...externalEvents].map(e => ({
    start: e.startTime,
    end: e.endTime,
  }));
  
  return computeFreeSlots(schedule, allBusy);
}
```

---

## UX Flow

### Provider connects Google Calendar:
1. Provider goes to Dashboard → Settings → Calendar Sync
2. Clicks "Connect Google Calendar"
3. OAuth popup → select Google account → grant calendar access
4. FAINEANT imports existing events (shows "Syncing..." with progress)
5. Provider sees their Google Calendar events as gray blocks in their FAINEANT schedule
6. New FAINEANT bookings automatically appear in their Google Calendar

### Provider imports ICS feed:
1. Provider goes to Dashboard → Settings → Calendar Sync
2. Clicks "Import Calendar Feed"
3. Pastes ICS URL from Booksy/Vagaro/etc (instruction text: "Find this in your booking app's settings under 'Calendar Export' or 'Sync'")
4. FAINEANT validates the feed URL, shows preview of upcoming events
5. Events sync every 15 minutes

### Client books a time slot:
1. Client views provider's available times
2. Slots blocked by Booksy/Square/Google events are NOT shown (just invisible)
3. Client only sees truly available slots
4. Zero double-booking risk

---

## Implementation Cost & Timeline

| Phase | Work | Effort | Dependencies |
|-------|------|--------|-------------|
| Google Calendar OAuth + sync | New service, routes, cron job | 1–2 weeks | Google Cloud project, OAuth consent screen |
| ICS feed import | Parser + cron job | 2–3 days | npm: `node-ical` |
| Availability merge | Update `getAvailableSlots` | 1–2 days | Schema migration |
| Provider settings UI | Connect/disconnect, status display | 3–4 days | Settings page |
| Square Appointments sync | OAuth + two-way sync service | 1–2 weeks | Square Developer account |
| External events in schedule view | Gray blocks in provider calendar | 2–3 days | Frontend component |

**Total Tier 1 (Google + ICS): ~3 weeks**
**Total Tier 1+2 (+ Square): ~5 weeks**

---

## API Costs

| Integration | API Cost | Notes |
|-------------|---------|-------|
| Google Calendar | $0 | 1M requests/day free quota |
| ICS Feed polling | $0 | Just HTTP GET on interval |
| Square Appointments | $0 | Free API, free for solo appointments |
| Vagaro | $10/mo + $0.002/call | Requires Enterprise sales |
| Acuity | $0 (included) | Barber needs Acuity paid plan |

**Total infrastructure cost for calendar sync: $0/mo** (Google + ICS + Square)

---

## Competitive Advantage

Most barber marketplaces are **walled gardens** — they force providers to use ONLY their platform. This creates friction and limits adoption.

FAINEANT's approach: **meet providers where they are.** If a barber uses Booksy for their existing clients, FAINEANT doesn't ask them to abandon it. FAINEANT syncs with their existing calendar and adds marketplace discovery on top. The barber gets:

1. Their existing clients keep booking through Booksy (business as usual)
2. NEW clients discover them through FAINEANT's marketplace
3. One unified schedule — zero double-booking risk
4. They can gradually shift clients to FAINEANT if they prefer the lower fees

This is the **adoption wedge**. It removes the biggest objection: "I can't switch because all my clients are already on [X]." They don't have to switch. FAINEANT just adds on top.
