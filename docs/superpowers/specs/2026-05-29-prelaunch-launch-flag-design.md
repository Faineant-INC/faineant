# Pre-launch Launch Flag — Design

**Date:** 2026-05-29
**Status:** Approved (pending spec review)

## Problem

Before public launch, the site should present as **marketing + email capture** only.
The full marketplace surfaces — practitioner browsing ("view practitioner") and the
booking/"Reserve" call-to-action — plus self-serve **sign-ups** should be hidden, but
not deleted: they must be restorable at launch by flipping a single flag. Login stays
working throughout (for the team / early accounts).

## Goal

A single launch flag that, when off (pre-launch), hides the marketplace nav and
disables registration; when on (launch), restores everything with no code changes.

## Decisions (from brainstorming)

- **One flag**, env-var based.
- **Keep login working**; **disable sign-ups** only.
- For practitioner browsing, **hide nav links only** — leave the pages reachable by
  direct URL (no redirect/middleware lockdown for `/providers`).
- **`Reserve` button → relabel to "Join the list"** (keep pointing at `/#waitlist`).
- **Keep `Services`** in the nav; hide only **`Practitioners`**.

## Design

### 1. The flag

- **Web:** `NEXT_PUBLIC_LAUNCH_MODE`, string `"true" | "false"`, default `false`
  (treat unset as pre-launch). New helper `apps/web/src/lib/flags.ts`:
  ```ts
  export const isLaunched = () =>
    process.env.NEXT_PUBLIC_LAUNCH_MODE === "true";
  ```
- **API:** matching `LAUNCH_MODE` validated in `apps/api/src/config/env.ts`. Parse as a
  string and derive a boolean by exact compare (`z.string().default("false")` then
  `LAUNCH_MODE === "true"`) — **not** `z.coerce.boolean()`, which treats the string
  `"false"` as `true`. Required because `NEXT_PUBLIC_*` is not readable
  server-side, and disabling sign-ups must be enforced on the server to actually hold.
- At launch: set `NEXT_PUBLIC_LAUNCH_MODE=true` and `LAUNCH_MODE=true`. No code changes.
- Document both in `apps/web/.env.example` (if present) and `apps/api/.env.example`.

### 2. Header — `apps/web/src/components/layout/site-header.tsx`

When `!isLaunched()`:
- Remove **`Practitioners`** from `NAV_LEFT`. `Services` and `Manifesto` stay.
- Relabel the **`Reserve`** button to **"Join the list"** — still `href="/#waitlist"`.
- **`Sign in`** link unchanged (→ `/login`).

When `isLaunched()`: original nav (incl. `Practitioners`) and the `Reserve` button label.

`site-header.tsx` is a Server Component (no `"use client"`), so it can read the flag
directly at render time.

### 3. Disable sign-ups

- **Login page** (`apps/web/src/app/login/page.tsx`): when `!isLaunched()`, replace the
  "create account → `/register`" link (line ~35) with **"Join the waitlist" → `/#waitlist`**.
- **`/register`** (`apps/web/src/app/register/page.tsx`): when `!isLaunched()`, redirect
  to `/#waitlist`. Implement via the existing `apps/web/src/middleware.ts` (which already
  matches `/register`) — when the flag is off, redirect `/register` → `/#waitlist` before
  the existing auth-page logic runs.
- **API `POST /auth/register`** (`apps/api/src/routes/auth.routes.ts`): when
  `env.LAUNCH_MODE` is off, short-circuit with `throw new AppError(403, "...")`
  (`AppError` from `apps/api/src/middleware/error-handler.ts`) before calling
  `authService.register`. This is the real enforcement and also blocks the mobile app
  and any direct API calls.

### 4. Practitioner pages

No change beyond removing the nav link (decision: hide nav only). `/providers` and
`/providers/[slug]` remain reachable by direct URL.

## Out of scope

- **Mobile app:** still shows a Register screen pre-launch; it will receive a `403` from
  the API rather than a polished "coming soon" state. Mobile UI changes are deferred.
- No analytics/gating of the practitioner pages themselves (direct URLs still work).
- No new auth mechanism (no magic-link / passwordless).

## Testing / success criteria

- **Web (Vitest):**
  - `isLaunched()` returns `false` when env unset/`"false"`, `true` when `"true"`.
  - `site-header` renders without `Practitioners` and with a "Join the list" button when
    pre-launch; renders `Practitioners` + `Reserve` when launched.
  - Login page shows "Join the waitlist" link pre-launch; "create account" when launched.
- **API (Vitest):**
  - `POST /auth/register` returns `403` when `LAUNCH_MODE` is off.
  - `POST /auth/register` succeeds (existing behavior) when `LAUNCH_MODE` is on.
  - `POST /auth/login` unaffected by the flag in both states.
- **Manual:** with the flag off, header has no Practitioners link, button reads "Join the
  list", `/register` redirects to `/#waitlist`, login still works. Flip flag on → full nav,
  Reserve button, registration restored.
