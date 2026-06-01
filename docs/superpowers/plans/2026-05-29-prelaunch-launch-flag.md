# Pre-launch Launch Flag Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gate the marketplace nav and self-serve sign-ups behind a single launch flag so the pre-launch site is marketing + email capture only, with everything restorable by flipping the flag.

**Architecture:** A `NEXT_PUBLIC_LAUNCH_MODE` env var drives a web helper `isLaunched()` that conditionally renders nav items and the sign-up link. The `/register` page redirects to the waitlist pre-launch. A matching server-side `LAUNCH_MODE` env var (validated in `config/env.ts`) gates `POST /auth/register` with a `403` so sign-ups are actually disabled (covers web + mobile + direct API calls). Login is untouched.

**Tech Stack:** Next.js 14.2 (App Router, Server Components), Express + Zod, Vitest (web + API), Tailwind.

**Spec:** `docs/superpowers/specs/2026-05-29-prelaunch-launch-flag-design.md`

**Note on the `/register` redirect:** The spec suggested middleware. This plan implements it at the **page level** via `redirect()` from `next/navigation` instead — identical behavior (the page never renders pre-launch), but unit-testable without constructing `NextRequest`, and it keeps `middleware.ts` untouched. The existing middleware already redirects authenticated users away from `/register`; the page-level launch check composes cleanly with that.

---

## File Structure

**Web (`apps/web`)**
- Create `src/lib/flags.ts` — `isLaunched()` helper (single source of truth for the web flag).
- Modify `src/components/layout/site-header.tsx` — conditional nav + button label.
- Modify `src/app/login/page.tsx` — conditional sign-up link.
- Modify `src/app/register/page.tsx` — redirect to waitlist pre-launch.
- Modify `.env.example` — document `NEXT_PUBLIC_LAUNCH_MODE`.
- Create tests under `src/__tests__/`.

**API (`apps/api`)**
- Modify `src/config/env.ts` — add `LAUNCH_MODE` (string → boolean).
- Create `src/middleware/launch-gate.ts` — `requireSignupsEnabled` middleware.
- Modify `src/routes/auth.routes.ts` — apply gate to `POST /register`.
- Modify `.env.example` — document `LAUNCH_MODE`.
- Create `src/routes/__tests__/` register-gate test (extend the auth.routes test area).

---

## Task 1: Web launch-flag helper

**Files:**
- Create: `apps/web/src/lib/flags.ts`
- Test: `apps/web/src/__tests__/lib/flags.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/__tests__/lib/flags.test.ts`:

```ts
import { describe, it, expect, afterEach } from "vitest";
import { isLaunched } from "@/lib/flags";

describe("isLaunched", () => {
  const original = process.env.NEXT_PUBLIC_LAUNCH_MODE;
  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_LAUNCH_MODE;
    else process.env.NEXT_PUBLIC_LAUNCH_MODE = original;
  });

  it("is false when the var is unset", () => {
    delete process.env.NEXT_PUBLIC_LAUNCH_MODE;
    expect(isLaunched()).toBe(false);
  });

  it("is false when the var is the string 'false'", () => {
    process.env.NEXT_PUBLIC_LAUNCH_MODE = "false";
    expect(isLaunched()).toBe(false);
  });

  it("is true only when the var is exactly 'true'", () => {
    process.env.NEXT_PUBLIC_LAUNCH_MODE = "true";
    expect(isLaunched()).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run src/__tests__/lib/flags.test.ts`
Expected: FAIL — cannot resolve `@/lib/flags` (module not found).

- [ ] **Step 3: Write minimal implementation**

Create `apps/web/src/lib/flags.ts`:

```ts
/**
 * Pre-launch gate. When false (default), the public site is marketing +
 * email capture only: practitioner browsing nav and self-serve sign-ups
 * are hidden. Flip NEXT_PUBLIC_LAUNCH_MODE="true" at launch.
 *
 * Read at call time (not module load) so it reflects the current env in
 * tests and across renders.
 */
export const isLaunched = (): boolean =>
  process.env.NEXT_PUBLIC_LAUNCH_MODE === "true";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && npx vitest run src/__tests__/lib/flags.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/flags.ts apps/web/src/__tests__/lib/flags.test.ts
git commit -m "feat(web): add isLaunched launch-flag helper"
```

---

## Task 2: Gate header nav + CTA on the launch flag

**Files:**
- Modify: `apps/web/src/components/layout/site-header.tsx`
- Test: `apps/web/src/__tests__/components/layout/site-header.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/__tests__/components/layout/site-header.test.tsx`:

```tsx
import { describe, it, expect, afterEach, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";

// next/image is not mocked globally; stub it to a plain <img> for this file.
vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) =>
    React.createElement("img", props as Record<string, unknown>),
}));

import { SiteHeader } from "@/components/layout/site-header";

describe("SiteHeader — launch flag", () => {
  const original = process.env.NEXT_PUBLIC_LAUNCH_MODE;
  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_LAUNCH_MODE;
    else process.env.NEXT_PUBLIC_LAUNCH_MODE = original;
  });

  it("pre-launch: hides Practitioners, keeps Services + Sign in, button reads 'Join the list'", () => {
    process.env.NEXT_PUBLIC_LAUNCH_MODE = "false";
    render(<SiteHeader />);
    expect(screen.queryByText("Practitioners")).toBeNull();
    expect(screen.getByText("Services")).toBeInTheDocument();
    expect(screen.getByText("Sign in")).toBeInTheDocument();
    expect(screen.getByText("Join the list")).toBeInTheDocument();
    expect(screen.queryByText("Reserve")).toBeNull();
  });

  it("launched: shows Practitioners and the 'Reserve' button", () => {
    process.env.NEXT_PUBLIC_LAUNCH_MODE = "true";
    render(<SiteHeader />);
    expect(screen.getByText("Practitioners")).toBeInTheDocument();
    expect(screen.getByText("Reserve")).toBeInTheDocument();
    expect(screen.queryByText("Join the list")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run src/__tests__/components/layout/site-header.test.tsx`
Expected: FAIL — pre-launch case finds "Practitioners"/"Reserve" still rendered (no "Join the list").

- [ ] **Step 3: Implement the gating**

In `apps/web/src/components/layout/site-header.tsx`:

Add the import at the top, after the existing `Button` import:

```tsx
import { isLaunched } from "@/lib/flags";
```

Rename the constant and exclude Practitioners pre-launch. Replace this block:

```tsx
const NAV_LEFT = [
  { label: "Services", href: "/services" },
  { label: "Practitioners", href: "/practitioners" },
  { label: "Manifesto", href: "/manifesto" },
];

export function SiteHeader() {
  return (
```

with:

```tsx
const NAV_LEFT = [
  { label: "Services", href: "/services" },
  { label: "Practitioners", href: "/practitioners" },
  { label: "Manifesto", href: "/manifesto" },
];

export function SiteHeader() {
  const launched = isLaunched();
  const navLeft = launched
    ? NAV_LEFT
    : NAV_LEFT.filter((item) => item.href !== "/practitioners");

  return (
```

Update the nav `.map` to use `navLeft`. Replace:

```tsx
          {NAV_LEFT.map((item) => (
```

with:

```tsx
          {navLeft.map((item) => (
```

Update the CTA button label. Replace:

```tsx
          <Button asChild variant="ghost" size="sm">
            <Link href="/#waitlist">Reserve</Link>
          </Button>
```

with:

```tsx
          <Button asChild variant="ghost" size="sm">
            <Link href="/#waitlist">{launched ? "Reserve" : "Join the list"}</Link>
          </Button>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && npx vitest run src/__tests__/components/layout/site-header.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/layout/site-header.tsx apps/web/src/__tests__/components/layout/site-header.test.tsx
git commit -m "feat(web): gate Practitioners nav + Reserve CTA on launch flag"
```

---

## Task 3: Swap the login page sign-up link pre-launch

**Files:**
- Modify: `apps/web/src/app/login/page.tsx`
- Test: `apps/web/src/__tests__/app/login.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/__tests__/app/login.test.tsx`:

```tsx
import { describe, it, expect, afterEach, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";

vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) =>
    React.createElement("img", props as Record<string, unknown>),
}));
// Keep the test focused on the page's own conditional link.
vi.mock("@/components/login-form", () => ({
  LoginForm: () => React.createElement("div", { "data-testid": "login-form" }),
}));

import LoginPage from "@/app/login/page";

describe("LoginPage — sign-up link", () => {
  const original = process.env.NEXT_PUBLIC_LAUNCH_MODE;
  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_LAUNCH_MODE;
    else process.env.NEXT_PUBLIC_LAUNCH_MODE = original;
  });

  it("pre-launch: links to the waitlist, not /register", () => {
    process.env.NEXT_PUBLIC_LAUNCH_MODE = "false";
    render(<LoginPage />);
    const link = screen.getByText("Join the waitlist →");
    expect(link).toHaveAttribute("href", "/#waitlist");
    expect(screen.queryByText("Open an account →")).toBeNull();
  });

  it("launched: links to /register", () => {
    process.env.NEXT_PUBLIC_LAUNCH_MODE = "true";
    render(<LoginPage />);
    const link = screen.getByText("Open an account →");
    expect(link).toHaveAttribute("href", "/register");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run src/__tests__/app/login.test.tsx`
Expected: FAIL — "Join the waitlist →" not found pre-launch (page always shows "Open an account →").

- [ ] **Step 3: Implement the conditional link**

In `apps/web/src/app/login/page.tsx`, add the import after the `LoginForm` import (line 3):

```tsx
import { isLaunched } from "@/lib/flags";
```

Replace this block (lines ~33-38):

```tsx
          <p className="font-mono text-mono text-taupe-300">
            New here?{" "}
            <Link href="/register" className="text-champagne-400 hover:underline">
              Open an account →
            </Link>
          </p>
```

with:

```tsx
          {isLaunched() ? (
            <p className="font-mono text-mono text-taupe-300">
              New here?{" "}
              <Link href="/register" className="text-champagne-400 hover:underline">
                Open an account →
              </Link>
            </p>
          ) : (
            <p className="font-mono text-mono text-taupe-300">
              Not open yet?{" "}
              <Link href="/#waitlist" className="text-champagne-400 hover:underline">
                Join the waitlist →
              </Link>
            </p>
          )}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && npx vitest run src/__tests__/app/login.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/login/page.tsx apps/web/src/__tests__/app/login.test.tsx
git commit -m "feat(web): point login sign-up link to waitlist pre-launch"
```

---

## Task 4: Redirect /register to the waitlist pre-launch

**Files:**
- Modify: `apps/web/src/app/register/page.tsx`
- Test: `apps/web/src/__tests__/app/register.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/__tests__/app/register.test.tsx`:

```tsx
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";

const { redirectMock } = vi.hoisted(() => ({ redirectMock: vi.fn() }));

vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) =>
    React.createElement("img", props as Record<string, unknown>),
}));
vi.mock("@/components/register-form", () => ({
  RegisterForm: () => React.createElement("div", { "data-testid": "register-form" }),
}));
// Override the global next/navigation mock to capture redirect().
vi.mock("next/navigation", () => ({
  redirect: redirectMock,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/register",
  useSearchParams: () => new URLSearchParams(),
}));

import RegisterPage from "@/app/register/page";

describe("RegisterPage — launch flag", () => {
  const original = process.env.NEXT_PUBLIC_LAUNCH_MODE;
  beforeEach(() => redirectMock.mockReset());
  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_LAUNCH_MODE;
    else process.env.NEXT_PUBLIC_LAUNCH_MODE = original;
  });

  it("pre-launch: redirects to /#waitlist", () => {
    process.env.NEXT_PUBLIC_LAUNCH_MODE = "false";
    render(<RegisterPage />);
    expect(redirectMock).toHaveBeenCalledWith("/#waitlist");
  });

  it("launched: renders the register form, no redirect", () => {
    process.env.NEXT_PUBLIC_LAUNCH_MODE = "true";
    render(<RegisterPage />);
    expect(redirectMock).not.toHaveBeenCalled();
    expect(screen.getByTestId("register-form")).toBeInTheDocument();
  });
});
```

Note: the real `redirect()` throws to halt rendering; the mock does not, so the
pre-launch test asserts the call rather than a thrown error.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run src/__tests__/app/register.test.tsx`
Expected: FAIL — `redirectMock` never called pre-launch (page renders unconditionally).

- [ ] **Step 3: Implement the redirect**

In `apps/web/src/app/register/page.tsx`, add imports after the existing imports (after line 4):

```tsx
import { redirect } from "next/navigation";
import { isLaunched } from "@/lib/flags";
```

Add the guard as the first line of the component body. Replace:

```tsx
export default function RegisterPage() {
  return (
```

with:

```tsx
export default function RegisterPage() {
  if (!isLaunched()) {
    redirect("/#waitlist");
  }

  return (
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && npx vitest run src/__tests__/app/register.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Run the full web suite to confirm no regressions**

Run: `cd apps/web && npx vitest run`
Expected: PASS — all prior tests plus the 4 new files green.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/register/page.tsx apps/web/src/__tests__/app/register.test.tsx
git commit -m "feat(web): redirect /register to waitlist pre-launch"
```

---

## Task 5: Disable sign-ups server-side (API)

**Files:**
- Modify: `apps/api/src/config/env.ts`
- Create: `apps/api/src/middleware/launch-gate.ts`
- Modify: `apps/api/src/routes/auth.routes.ts`
- Test: `apps/api/src/routes/__tests__/register-gate.test.ts`

- [ ] **Step 1: Add `LAUNCH_MODE` to the env schema**

In `apps/api/src/config/env.ts`, add this line inside the `z.object({ ... })` (e.g. right after the `NODE_ENV` line, before the closing `})`):

```ts
  // Launch gate — "true" enables self-serve sign-ups. Default "false" = pre-launch.
  LAUNCH_MODE: z.string().default("false").transform((v) => v === "true"),
```

This yields a `boolean` `env.LAUNCH_MODE`. Do **not** use `z.coerce.boolean()` — it
treats the string `"false"` as `true`.

- [ ] **Step 2: Write the failing test**

Create `apps/api/src/routes/__tests__/register-gate.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import express from "express";
import request from "supertest";

const { envState, mockRegister } = vi.hoisted(() => ({
  envState: { LAUNCH_MODE: false },
  mockRegister: vi.fn(),
}));

// Spread the real env so unrelated config (JWT secrets, etc.) stays valid;
// override LAUNCH_MODE with a getter so tests can toggle it at request time.
vi.mock("../../config/env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../config/env")>();
  return {
    ...actual,
    env: {
      ...actual.env,
      get LAUNCH_MODE() {
        return envState.LAUNCH_MODE;
      },
    },
  };
});

vi.mock("../../services/auth.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/auth.service")>();
  return { ...actual, register: mockRegister };
});

import authRouter from "../auth.routes";
import { errorHandler } from "../../middleware/error-handler";

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/auth", authRouter);
  app.use(errorHandler);
  return app;
}

const validBody = {
  email: "new@example.com",
  password: "Aa1!aaaa",
  firstName: "New",
  lastName: "User",
  role: "CLIENT",
};

describe("POST /auth/register — launch gate", () => {
  beforeEach(() => {
    mockRegister.mockReset();
    envState.LAUNCH_MODE = false;
  });

  it("returns 403 SIGNUPS_DISABLED when pre-launch", async () => {
    envState.LAUNCH_MODE = false;
    const res = await request(buildApp()).post("/auth/register").send(validBody);
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({
      success: false,
      error: { code: "SIGNUPS_DISABLED" },
    });
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it("allows registration when launched", async () => {
    envState.LAUNCH_MODE = true;
    mockRegister.mockResolvedValue({
      user: { id: "u1", email: "new@example.com" },
      tokens: { accessToken: "a", refreshToken: "r" },
    });
    const res = await request(buildApp()).post("/auth/register").send(validBody);
    expect(res.status).toBe(201);
    expect(mockRegister).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd apps/api && npx vitest run src/routes/__tests__/register-gate.test.ts`
Expected: FAIL — the 403 test gets `201`/`500` (no gate yet; `requireSignupsEnabled` not defined).

- [ ] **Step 4: Create the gate middleware**

Create `apps/api/src/middleware/launch-gate.ts`:

```ts
import { Request, Response, NextFunction } from "express";
import { env } from "../config/env";
import { AppError } from "./error-handler";

/**
 * Blocks self-serve sign-ups until launch. When LAUNCH_MODE is off, reject
 * with 403 before validation or rate-limiting runs. Login is unaffected.
 */
export function requireSignupsEnabled(
  _req: Request,
  _res: Response,
  next: NextFunction,
) {
  if (!env.LAUNCH_MODE) {
    return next(
      new AppError(403, "SIGNUPS_DISABLED", "Sign-ups are not open yet."),
    );
  }
  next();
}
```

- [ ] **Step 5: Wire the gate into the register route**

In `apps/api/src/routes/auth.routes.ts`, add the import after the `authenticate` import:

```ts
import { requireSignupsEnabled } from "../middleware/launch-gate";
```

Apply it as the first middleware on `/register` (before `authLimiter`, so a blocked
sign-up never consumes the rate-limit budget or runs validation). Replace:

```ts
router.post(
  "/register",
  authLimiter,
  validate(registerSchema),
```

with:

```ts
router.post(
  "/register",
  requireSignupsEnabled,
  authLimiter,
  validate(registerSchema),
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd apps/api && npx vitest run src/routes/__tests__/register-gate.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 7: Run the full API suite to confirm no regressions**

Run: `cd apps/api && npx vitest run`
Expected: PASS — existing auth.routes tests still green (login/verify unaffected).

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/config/env.ts apps/api/src/middleware/launch-gate.ts apps/api/src/routes/auth.routes.ts apps/api/src/routes/__tests__/register-gate.test.ts
git commit -m "feat(api): disable sign-ups behind LAUNCH_MODE flag"
```

---

## Task 6: Document the flag in env examples

**Files:**
- Modify: `apps/web/.env.example`
- Modify: `apps/api/.env.example`

(No test — documentation only.)

- [ ] **Step 1: Add the web flag**

Append to `apps/web/.env.example`:

```
# Launch gate — "true" reveals practitioner browsing + self-serve sign-ups.
# Leave "false" (or unset) for the pre-launch marketing + waitlist site.
NEXT_PUBLIC_LAUNCH_MODE=false
```

- [ ] **Step 2: Add the API flag**

Append to `apps/api/.env.example` (under the `# Server` block):

```
# Launch gate — must match the web NEXT_PUBLIC_LAUNCH_MODE. "true" enables
# POST /auth/register. Default "false" returns 403 for sign-ups.
LAUNCH_MODE="false"
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/.env.example apps/api/.env.example
git commit -m "docs: document LAUNCH_MODE / NEXT_PUBLIC_LAUNCH_MODE flags"
```

---

## Final verification

- [ ] **Web typecheck + tests:** `cd apps/web && npx tsc --noEmit && npx vitest run` → all pass.
- [ ] **API typecheck + tests:** `cd apps/api && npx tsc --noEmit && npx vitest run` → all pass.
- [ ] **Manual (pre-launch, flag unset):** `cd apps/web && npm run dev` →
  - Header shows `Services` + `Manifesto`, **no** `Practitioners`; CTA reads **Join the list**; `Sign in` present.
  - `/login` bottom link reads **Join the waitlist →** and points to `/#waitlist`; login still works.
  - Visiting `/register` redirects to `/#waitlist`.
  - `POST /api/v1/auth/register` returns `403 SIGNUPS_DISABLED` (API with `LAUNCH_MODE` unset).
- [ ] **Manual (launched):** set `NEXT_PUBLIC_LAUNCH_MODE=true` (web) and `LAUNCH_MODE=true` (api), restart →
  - Header shows `Practitioners` and a `Reserve` button.
  - `/register` renders the form; `POST /auth/register` works.

## Out of scope (per spec)

- Mobile Register screen still calls the API and will now receive a `403` pre-launch rather than a polished "coming soon" state.
- `/providers` and `/providers/[slug]` remain reachable by direct URL (nav link hidden only).
