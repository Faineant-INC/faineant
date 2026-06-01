# Supabase Edge Functions: Google Calendar read-sync (Plan 4c)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let providers connect Google Calendar (and ICS feeds) so their external commitments import into `external_events` and block their availability (consumed by `get_provider_busy_intervals`). Reimplemented as Deno Edge Functions against the Google Calendar **REST API** (the Express `googleapis`/`node-ical` deps don't run in Deno).

**Scope (read-sync only).** IN: secure OAuth connect/callback, encrypted token storage, Google event import (incremental), ICS feed add + import, manual sync, a token-free connections view. **DEFERRED to 4c-2:** write-to-Google (event-on-booking) and pg_cron auto-sync.

**Security upgrades over the Express original (intentional, not ported):**
- **Signed `state`** (HMAC, short TTL) instead of raw `userId` — closes the OAuth CSRF/identity-spoof hole.
- **Encrypted tokens** — Google access/refresh tokens are AES-GCM encrypted (Web Crypto) with `CALENDAR_TOKEN_KEY` before storage; the DB only ever holds ciphertext. Client reads go through a token-free view.

**Builds on:** Plans 1–4b. Branch off `main` (or continue the edge-functions branch). Deno 2.8.1. Tables: `calendar_connections` (user_id, provider, access_token, refresh_token, external_id, feed_url, sync_token, last_synced_at, is_active), `external_events` (calendar_connection_id, external_id, title, start_time, end_time, is_all_day). `deno check` on SDK-importing files needs `--node-modules-dir=auto`.

**Secrets:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `CALENDAR_TOKEN_KEY` (base64 32-byte), `STATE_SIGNING_SECRET`, `WEB_URL`, plus platform `SUPABASE_*`.

---

## File Structure
- `_shared/crypto.ts` — AES-GCM `encrypt`/`decrypt` (Web Crypto, key from `CALENDAR_TOKEN_KEY`)
- `_shared/oauth-state.ts` — `signState(userId)` / `verifyState(token)` (HMAC + TTL)
- `_shared/google-calendar.ts` — REST: `exchangeCode`, `refreshAccessToken`, `getPrimaryCalendarId`, `listEvents`
- `_shared/ics.ts` — parse ICS via `https://esm.sh/ical.js` → normalized VEVENTs
- `calendar-sync/event-map.ts` — **pure**: `googleEventToRow`, `icsEventToRow`, `withinWindow` (+ tests)
- `calendar-google-connect/index.ts` — auth provider → OAuth URL (signed state)
- `calendar-google-callback/index.ts` — `verify_jwt=false`; code+state → tokens → encrypt → upsert → import → redirect
- `calendar-ics-connect/index.ts` — auth provider → add ICS feed + initial import
- `calendar-sync/index.ts` — auth → sync the caller's connection(s)
- migration `*_calendar_safe_view.sql` — `calendar_connections_safe` view (no token columns)
- `config.toml` — verify_jwt (callback=false; others=true)
- `calendar.README.md` — secrets, Google OAuth setup, deploy

---

## Task 0: Scaffold + crypto + state helpers (+ tests)

- [ ] **Step 1:** `supabase functions new calendar-google-connect calendar-google-callback calendar-ics-connect calendar-sync` (run individually if the CLI needs one name each).
- [ ] **Step 2:** `_shared/crypto.ts`:
```ts
// AES-GCM token encryption. CALENDAR_TOKEN_KEY = base64 of 32 random bytes.
function keyBytes(): Uint8Array {
  const b64 = Deno.env.get("CALENDAR_TOKEN_KEY");
  if (!b64) throw new Error("CALENDAR_TOKEN_KEY not set");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}
async function key(): Promise<CryptoKey> {
  return await crypto.subtle.importKey("raw", keyBytes(), "AES-GCM", false, ["encrypt", "decrypt"]);
}
export async function encrypt(plain: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await key(), new TextEncoder().encode(plain)));
  const out = new Uint8Array(iv.length + ct.length); out.set(iv); out.set(ct, iv.length);
  return btoa(String.fromCharCode(...out));
}
export async function decrypt(b64: string): Promise<string> {
  const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const iv = raw.slice(0, 12); const ct = raw.slice(12);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, await key(), ct);
  return new TextDecoder().decode(pt);
}
```
- [ ] **Step 3:** `_shared/oauth-state.ts`:
```ts
// Signed, expiring OAuth state: base64url(payload).hexHmac. payload = {u, e}.
async function hmac(data: string): Promise<string> {
  const secret = Deno.env.get("STATE_SIGNING_SECRET"); if (!secret) throw new Error("STATE_SIGNING_SECRET not set");
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(data)));
  return Array.from(sig).map((b) => b.toString(16).padStart(2, "0")).join("");
}
const b64url = (s: string) => btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64url = (s: string) => atob(s.replace(/-/g, "+").replace(/_/g, "/"));
export async function signState(userId: string, ttlSeconds = 600): Promise<string> {
  const payload = b64url(JSON.stringify({ u: userId, e: Math.floor(Date.now() / 1000) + ttlSeconds }));
  return `${payload}.${await hmac(payload)}`;
}
export async function verifyState(token: string): Promise<string | null> {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  if (await hmac(payload) !== sig) return null;
  try {
    const { u, e } = JSON.parse(unb64url(payload));
    if (typeof e !== "number" || e < Math.floor(Date.now() / 1000)) return null;
    return typeof u === "string" ? u : null;
  } catch { return null; }
}
```
> Note: `signState` uses `Date.now()`. In a normal Deno function runtime that's fine (only workflow scripts forbid it). Tests pass a fixed clock by setting `e` directly where needed.

- [ ] **Step 4:** Config `verify_jwt`: callback=false; connect/ics/sync=true. Commit scaffold + helpers (`chore(functions): scaffold calendar functions + crypto/state helpers`).

---

## Task 1: crypto + state tests

- [ ] `calendar-google-connect/state.test.ts` (or a shared test dir):
```ts
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { encrypt, decrypt } from "../_shared/crypto.ts";
import { signState, verifyState } from "../_shared/oauth-state.ts";

// 32 zero bytes, base64
Deno.env.set("CALENDAR_TOKEN_KEY", btoa(String.fromCharCode(...new Uint8Array(32))));
Deno.env.set("STATE_SIGNING_SECRET", "test-secret");

Deno.test("encrypt/decrypt round-trips", async () => {
  const ct = await encrypt("ya29.token");
  assert(ct !== "ya29.token");
  assertEquals(await decrypt(ct), "ya29.token");
});
Deno.test("state signs + verifies", async () => {
  const s = await signState("user-1");
  assertEquals(await verifyState(s), "user-1");
});
Deno.test("tampered state rejected", async () => {
  const s = await signState("user-1");
  assertEquals(await verifyState(s.slice(0, -2) + "00"), null);
});
Deno.test("forged-user state rejected (sig won't match)", async () => {
  assertEquals(await verifyState("eyджunk.deadbeef"), null);
});
```
Run `deno test --allow-env supabase/functions/calendar-google-connect/state.test.ts` → 4 pass. Commit `test(functions): calendar crypto + oauth-state tests`.

---

## Task 2: Pure event-mapping logic + tests
`calendar-sync/event-map.ts` — pure transforms (testable without network):
```ts
export interface EventRow { externalId: string; title: string | null; startTime: string; endTime: string; isAllDay: boolean; }

// Google Calendar API event -> row, or null to skip (cancelled / missing times).
export function googleEventToRow(e: Record<string, any>): EventRow | null {
  if (!e.id) return null;
  if (e.status === "cancelled") return null;
  const startsAt = e.start?.dateTime ?? e.start?.date ?? null;
  const endsAt = e.end?.dateTime ?? e.end?.date ?? null;
  if (!startsAt || !endsAt) return null;
  return { externalId: e.id, title: e.summary ?? null, startTime: new Date(startsAt).toISOString(), endTime: new Date(endsAt).toISOString(), isAllDay: !e.start?.dateTime };
}

// ICS VEVENT (normalized {uid,summary,start,end,allDay}) -> row, or null.
export function icsEventToRow(v: { uid?: string; summary?: string; start?: string; end?: string; allDay?: boolean }): EventRow | null {
  if (!v.uid || !v.start || !v.end) return null;
  return { externalId: v.uid, title: v.summary ?? null, startTime: new Date(v.start).toISOString(), endTime: new Date(v.end).toISOString(), isAllDay: !!v.allDay };
}

// Keep events overlapping [now, now+days].
export function withinWindow(row: EventRow, now: Date, days = 60): boolean {
  const max = new Date(now); max.setDate(max.getDate() + days);
  return new Date(row.endTime) >= now && new Date(row.startTime) <= max;
}
```
`event-map.test.ts`: cancelled→null, missing-times→null, all-day detection (date vs dateTime), ICS uid required, `withinWindow` includes in-range / excludes past+far-future. Run + commit `feat(functions): calendar event-mapping logic + tests`.

---

## Task 3: Google REST helpers + ICS parser
- `_shared/google-calendar.ts` — `fetch`-based: `exchangeCode(code)` POST oauth2.googleapis.com/token; `refreshAccessToken(refresh)`; `getPrimaryCalendarId(accessToken)` GET calendarList; `listEvents(accessToken, calendarId, {syncToken|timeMin/timeMax})` GET events (singleEvents=true, maxResults=500) → {items, nextSyncToken, status} (surface 410 as a typed result so the caller can reset).
- `_shared/ics.ts` — `import ICAL from "https://esm.sh/ical.js@2"`; `parseIcs(text)` → normalized `{uid,summary,start,end,allDay}[]`.
`deno check --node-modules-dir=auto` both. Commit `feat(functions): google calendar REST + ICS parser helpers`. (No unit tests here — thin I/O wrappers; logic is in event-map.ts.)

---

## Task 4: calendar-google-connect function
`calendar-google-connect/index.ts`: `getCaller`; require `role==='PROVIDER'` (403 else); build the Google auth URL (`access_type=offline`, `prompt=consent`, scope `calendar`, `state=await signState(userId)`, redirect_uri=GOOGLE_REDIRECT_URI, client_id) and return `{ url }`. `deno check`. Commit.

---

## Task 5: calendar-google-callback function (verify_jwt=false)
`calendar-google-callback/index.ts`: GET; read `code`+`state` from query; `verifyState(state)` → userId (400 if null); `exchangeCode(code)`; `getPrimaryCalendarId`; `encrypt` access+refresh; service-role `upsert` calendar_connections (onConflict user_id,provider) with ciphertext + external_id=calendarId + is_active; run an initial import (call the same import routine as calendar-sync for this connection); `302` redirect to `${WEB_URL}/dashboard/provider/integrations?calendar=connected` (or `?calendar=error` on failure). `deno check`. Commit.

---

## Task 6: calendar-sync function (Google + ICS import)
`calendar-sync/index.ts`: `getCaller`; load the caller's active connections (service role); for each:
- GOOGLE: `decrypt` access token; `listEvents` (incremental via stored sync_token else 60-day window); on 410 → clear sync_token + delete the connection's external_events + retry full; for each item `googleEventToRow` → upsert/delete external_events; if a 401, `refreshAccessToken` (decrypt refresh), `encrypt`+store new access, retry once; store nextSyncToken + last_synced_at.
- ICS: fetch feed; `parseIcs`; map via `icsEventToRow` filtered by `withinWindow`; upsert; delete stale (externalId not in seen); last_synced_at.
Return `{ synced: n }`. `deno check`. Commit. (The import routine should be a shared function reused by the callback's initial import.)

---

## Task 7: calendar-ics-connect function
`calendar-ics-connect/index.ts`: `getCaller`; require PROVIDER; read `{ feedUrl }`; normalize `webcal://`→`https://`; fetch+`parseIcs` to validate (400 if unparseable); service-role upsert calendar_connections (ICS_FEED) with feed_url; initial import; return `{ eventCount }`. `deno check`. Commit.

---

## Task 8: Safe connections view (migration)
`*_calendar_safe_view.sql`:
```sql
-- Token-free view for clients to list their connections (base table holds
-- encrypted tokens; never expose even ciphertext to the client surface).
create view public.calendar_connections_safe as
  select id, user_id, provider, external_id, feed_url, last_synced_at, is_active, created_at
  from public.calendar_connections;
grant select on public.calendar_connections_safe to authenticated;
```
> The view is owner-scoped at query time by the client (`.eq('user_id', uid)`) and the base table's RLS still applies through the view's invoker? NOTE: a definer view bypasses RLS — so this view must be created with `security_invoker = true` so the base-table RLS (owner-only) still gates rows. Set: `alter view public.calendar_connections_safe set (security_invoker = true);`
`supabase db reset`; `supabase test db` still 42. Commit.

---

## Task 9: Docs + secrets
`calendar.README.md`: Google Cloud OAuth client setup (authorized redirect URI = `…/functions/v1/calendar-google-callback`), the scope, required secrets (incl. generating `CALENDAR_TOKEN_KEY` = `openssl rand -base64 32`), `supabase secrets set …`, deploy command, and that connections list/disconnect are client `supabase-js` queries (list via `calendar_connections_safe`; disconnect = delete on `calendar_connections`, cascades to external_events). Commit.

---

## Done criteria
- `deno test supabase/functions/` green (crypto round-trip, state sign/verify/tamper, event mapping, window filter — Google/ICS network mocked or pure).
- `deno check` clean on all entrypoints + helpers.
- `supabase db reset` + `supabase test db` unaffected; `calendar_connections_safe` exists (security_invoker) exposing no token columns.
- No secrets committed.

## Known gaps / deferred
- **Write-to-Google** (create/delete event on booking) and **pg_cron auto-sync** → Plan 4c-2.
- ICAL.js timezone handling is best-effort; complex recurring/VTIMEZONE cases may need refinement (logged at sync time).
- Token refresh-on-401 retries once; persistent failures mark nothing (the connection stays; surfaced via last_synced_at staleness) — revisit error surfacing in 4c-2.
- Real Google OAuth verified at deploy (needs a Google OAuth client + redirect URI registered).
