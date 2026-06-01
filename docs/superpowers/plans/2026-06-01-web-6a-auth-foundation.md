# Web Rewrite 6a — Auth & Supabase Client Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Replace the web app's localStorage/Express-JWT auth with Supabase Auth via `@supabase/ssr` — secure cookie sessions, real middleware session checks, and an `AuthProvider`/login/register/verify flow backed by `supabase.auth`. This is the gating foundation for the rest of the web rewrite (6b–6g).

**Architecture:** A browser client (`createBrowserClient`) and a server client (`createServerClient` bound to Next cookies) typed with `@faineant/shared` `Database`. Next middleware refreshes the session cookie and gates `/dashboard` + `/admin` on a real `getUser()`. `AuthProvider` uses `supabase.auth` (sign-in/up/out + `onAuthStateChange`) and derives the app `AuthUser` (id, email, firstName, lastName, role, emailVerified) from the session + the `profiles` row. Sign-up passes `first_name/last_name/role/phone` as user metadata (the `handle_new_user` trigger mirrors it into `profiles`/`provider_profiles`). The old `/verify-email?token=` page is replaced by an `/auth/callback` route that calls `exchangeCodeForSession`.

**Builds on:** Plans 1–5 (DB, RLS, RPCs, functions, storage). Branch `claude/web-supabase-rewrite` off `main`. Dev against the **local Supabase stack** (`supabase start`): `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`, anon key from `supabase status`. Web is Next.js 14 App Router; tests via vitest. Generated DB types: `packages/shared/src/database.types.ts`.

**TRANSITION NOTE (incremental rewrite):** After 6a, login issues a **Supabase** session, not an Express JWT. Dashboard pages still calling the Express `api-client` will no longer have a valid token and will error until their feature group is migrated (6c+). This is acceptable pre-launch / in local dev. Public pages (landing, discovery) are unaffected; `api-client` stays in the tree until the final group migrates.

**Scope:** auth/session only. Feature-page data migration is 6b–6g. Do NOT migrate dashboard data pages here.

---

## File Structure
- Modify: `apps/web/package.json` — add `@supabase/supabase-js`, `@supabase/ssr`
- Create: `apps/web/src/lib/supabase/client.ts` — browser client
- Create: `apps/web/src/lib/supabase/server.ts` — server client (RSC/route handlers)
- Create: `apps/web/src/lib/supabase/middleware.ts` — `updateSession(request)` helper
- Modify: `apps/web/src/middleware.ts` — use `updateSession` + real auth gating
- Modify: `apps/web/src/lib/auth.ts` — keep `AuthContext`/`AuthUser`; drop localStorage token helpers
- Modify: `apps/web/src/components/auth-provider.tsx` — supabase.auth-backed
- Create: `apps/web/src/app/auth/callback/route.ts` — `exchangeCodeForSession`
- Modify/Remove: `apps/web/src/app/verify-email/page.tsx` — point at the callback (or a "check your email" notice)
- Modify: `apps/web/.env.example` + create `apps/web/.env.local` (local stack values, gitignored)
- Create: `apps/web/src/lib/auth.matcher.ts` + test — pure protected-route matcher (unit-testable)

---

## Task 0: Install deps + env

- [ ] **Step 1:** Add Supabase deps to the web app:
```bash
pnpm --filter @faineant/web add @supabase/supabase-js @supabase/ssr
```
- [ ] **Step 2:** Get local stack creds: `supabase status` (note `API URL` = http://127.0.0.1:54321 and the `anon key`). Add to `apps/web/.env.example`:
```
NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
NEXT_PUBLIC_SUPABASE_ANON_KEY=""
```
and write the real local anon key into `apps/web/.env.local` (gitignored — confirm `.env.local` is in .gitignore; do NOT commit the key). Leave the legacy `NEXT_PUBLIC_API_URL` for now (unmigrated pages still use it).
- [ ] **Step 3:** Commit (package.json + .env.example only): `chore(web): add supabase-js + @supabase/ssr deps + env`.

---

## Task 1: Supabase client factories

- [ ] **Step 1:** `apps/web/src/lib/supabase/client.ts`:
```ts
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@faineant/shared";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```
> If `Database` isn't yet exported from `@faineant/shared` root, add `export type { Database } from "./database.types";` to `packages/shared/src/index.ts` and rebuild shared.

- [ ] **Step 2:** `apps/web/src/lib/supabase/server.ts`:
```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@faineant/shared";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(toSet) {
          try { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
          catch { /* called from a Server Component; middleware refreshes instead */ }
        },
      },
    },
  );
}
```

- [ ] **Step 3:** `deno`-free typecheck: `cd apps/web && npx tsc --noEmit 2>&1 | grep -i supabase || echo "no supabase type errors"` (full app may have pre-existing errors elsewhere — only assert no NEW errors in the new files). Commit `feat(web): supabase browser + server client factories`.

---

## Task 2: Session middleware

- [ ] **Step 1:** `apps/web/src/lib/supabase/middleware.ts`:
```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@faineant/shared";

const PROTECTED = ["/dashboard", "/admin"];
const AUTH_PAGES = ["/login", "/register"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(toSet) {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );
  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  if (PROTECTED.some((p) => pathname.startsWith(p)) && !user) {
    const url = new URL("/login", request.url);
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }
  if (AUTH_PAGES.some((p) => pathname.startsWith(p)) && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return response;
}
```
- [ ] **Step 2:** Replace `apps/web/src/middleware.ts` body with:
```ts
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/login", "/register"],
};
```
- [ ] **Step 3:** Commit `feat(web): @supabase/ssr session middleware (real auth gating)`.

---

## Task 3: AuthProvider + lib/auth (supabase.auth-backed)

- [ ] **Step 1:** In `apps/web/src/lib/auth.ts`: keep `AuthContext` + `AuthUser` (id, email, firstName, lastName, role, emailVerified). Remove `getStoredTokens/storeTokens/clearTokens` and the localStorage keys. (Grep for their usages — only `auth-provider.tsx` should use them; if other files do, note for their migration.) Drop `accessToken` from the context type (supabase-js holds the token); if pages reference `accessToken`, leave a deprecated `accessToken: null` field temporarily to avoid breaking unmigrated pages' compilation, with a comment.

- [ ] **Step 2:** Rewrite `apps/web/src/components/auth-provider.tsx`:
```tsx
"use client";
import { useState, useEffect, useCallback } from "react";
import { AuthContext, type AuthUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) { setUser(null); return; }
    const { data: profile } = await supabase.from("profiles")
      .select("role, first_name, last_name").eq("id", authUser.id).single();
    setUser({
      id: authUser.id, email: authUser.email ?? "",
      firstName: profile?.first_name ?? "", lastName: profile?.last_name ?? "",
      role: (profile?.role as AuthUser["role"]) ?? "CLIENT",
      emailVerified: !!authUser.email_confirmed_at,
    });
  }, [supabase]);

  useEffect(() => {
    loadUser().finally(() => setIsLoading(false));
    const { data: sub } = supabase.auth.onAuthStateChange(() => { loadUser(); });
    return () => sub.subscription.unsubscribe();
  }, [loadUser, supabase]);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    await loadUser();
  }, [supabase, loadUser]);

  const register = useCallback(async (data: Record<string, string>) => {
    const { email, password, firstName, lastName, role, phone } = data;
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { first_name: firstName, last_name: lastName, role: role ?? "CLIENT", phone } },
    });
    if (error) throw new Error(error.message);
    await loadUser();
  }, [supabase, loadUser]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    window.location.href = "/login";
  }, [supabase]);

  return (
    <AuthContext.Provider value={{ user, accessToken: null, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
```
> `login`/`register`/`logout` keep the same signatures the existing LoginForm/RegisterForm call, so those forms need no change (verify by reading them; if RegisterForm doesn't collect `role`, it defaults CLIENT — fine).

- [ ] **Step 3:** Commit `feat(web): supabase-auth-backed AuthProvider`.

---

## Task 4: Auth callback route + verify-email

- [ ] **Step 1:** `apps/web/src/app/auth/callback/route.ts`:
```ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("redirect") ?? "/dashboard";
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
```
- [ ] **Step 2:** `apps/web/src/app/verify-email/page.tsx`: replace the token-POST flow with a simple "check your email to confirm" notice (Supabase sends the confirmation email; the link lands on `/auth/callback`). Keep it a Client or Server component as simplest. Remove the `/auth/verify-email` api-client call.
- [ ] **Step 3:** Note in the README/plan: Supabase Auth's confirmation email "redirect to" must be set to `${SITE_URL}/auth/callback` (dashboard/config). For local, the Site URL + redirect allowlist are in `supabase/config.toml [auth]` — add `http://127.0.0.1:3000/auth/callback` to `additional_redirect_urls`. Make that config change.
- [ ] **Step 4:** Commit `feat(web): supabase auth callback + verify-email notice`.

---

## Task 5: Pure route-matcher helper + test

- [ ] **Step 1:** `apps/web/src/lib/auth.matcher.ts`:
```ts
export const PROTECTED_PREFIXES = ["/dashboard", "/admin"];
export const AUTH_PAGE_PREFIXES = ["/login", "/register"];
export function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
}
export function isAuthPage(pathname: string): boolean {
  return AUTH_PAGE_PREFIXES.some((p) => pathname.startsWith(p));
}
```
Use these in `lib/supabase/middleware.ts` (replace the inline arrays).
- [ ] **Step 2:** Test `apps/web/src/lib/__tests__/auth.matcher.test.ts` (vitest): `/dashboard/client/bookings` protected; `/providers` not; `/login` is auth page; `/` not.
- [ ] **Step 3:** `cd apps/web && npx vitest run src/lib/__tests__/auth.matcher.test.ts` → pass. Commit `feat(web): protected-route matcher + tests`.

---

## Task 6: Manual local verification + docs

- [ ] **Step 1:** With the local stack running (`supabase start`) and `apps/web` dev server (`pnpm --filter @faineant/web dev`), manually verify (report results):
  - Register a CLIENT (email + password + name) → a `profiles` row is created (check via psql) and a session cookie is set.
  - Visiting `/dashboard` while logged out redirects to `/login?redirect=/dashboard`; after login it loads.
  - `useAuth().user` exposes role/firstName from `profiles`.
  - Logout clears the session and redirects to `/login`.
  - (Email confirmation: with confirmations on, the confirm link in Mailpit (`http://127.0.0.1:54324`) lands on `/auth/callback` and establishes the session.)
  If a step can't be exercised locally, report which and why.
- [ ] **Step 2:** `apps/web/AUTH.md` (or append to a web README): the Supabase auth model, env vars, the `/auth/callback` flow, and the transition note (unmigrated dashboard pages error until their group is migrated).
- [ ] **Step 3:** Commit `docs(web): supabase auth foundation notes`.

---

## Done criteria
- `pnpm --filter @faineant/web build` succeeds (no NEW type errors from the auth files).
- Middleware gates `/dashboard`+`/admin` on a real Supabase session; auth pages redirect when logged in.
- Register/login/logout work against the local stack; `AuthProvider` exposes the profile-derived `AuthUser`.
- Route-matcher unit tests pass.
- No anon key or secret committed (only in `.env.local`, gitignored).

## Known gaps / deferred
- Dashboard **data** pages still call the Express `api-client` and will error post-6a until migrated (6c–6g) — documented transition.
- `accessToken` kept as `null` in context temporarily for compile-compat of unmigrated pages; removed when the last group migrates.
- Discovery pages (6b) and all dashboard groups (6c–6g) are separate sub-plans.
- Full end-to-end against remote Supabase happens at the staging deploy.
