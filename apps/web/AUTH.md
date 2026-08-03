# Web Auth (Supabase)

The web app authenticates via **Supabase Auth** using `@supabase/ssr` (cookie-based
sessions), replacing the previous localStorage + Express-JWT model.

## Clients

- `src/lib/supabase/client.ts` — `createBrowserClient<Database>` for Client Components.
- `src/lib/supabase/server.ts` — `createServerClient<Database>` bound to Next `cookies()`,
  for Server Components and Route Handlers. Its `setAll` swallows the read-only-cookie
  error thrown inside Server Components by design — the middleware refreshes the session
  cookie on the next request.
- `src/lib/supabase/middleware.ts` — `updateSession(request)`: calls `supabase.auth.getUser()`
  (revalidates against the auth server, not just `getSession()`), refreshes the session
  cookie, and gates routes. Redirect responses copy the refreshed cookies forward so the
  session is never dropped on a redirect.

## Route gating

`src/lib/auth.matcher.ts` defines the prefixes:

- **Protected** (`/dashboard`, `/admin`): logged-out users are redirected to
  `/login?redirect=<path>`.
- **Auth pages** (`/login`, `/register`): logged-in users are redirected to `/dashboard`.

The Next `middleware.ts` `matcher` is scoped to those paths.

## Provider

`src/components/auth-provider.tsx` exposes `useAuth()` with `{ user, accessToken, login,
register, logout, isLoading }`.

- `user` (`AuthUser`) is derived from `supabase.auth.getUser()` + the `profiles` row
  (`role`, `first_name`, `last_name`). The profiles read uses `.maybeSingle()` so a brief
  race with the `handle_new_user` trigger returns `null` rather than erroring.
- `login` → `signInWithPassword`. `logout` → `signOut` then redirect to `/login`.
- `register` → `signUp` with `options.data: { first_name, last_name, role, phone }`. The
  `handle_new_user` DB trigger mirrors that metadata into `profiles` (and
  `provider_profiles` for providers).
- `accessToken` reflects the active Supabase session. UI components use it only as an
  authenticated-session readiness signal; database access is performed by supabase-js
  and constrained by RLS.

## Email confirmation flow

Supabase sends the confirmation email; its link lands on **`/auth/callback`**
(`src/app/auth/callback/route.ts`), which calls `exchangeCodeForSession` and then redirects
to a validated internal path (must start with `/`, not `//` — open-redirect guard),
defaulting to `/dashboard`. `/verify-email` is now a static "check your email" notice.

The local redirect allowlist lives in `supabase/config.toml [auth] additional_redirect_urls`
(includes `http://127.0.0.1:3000/auth/callback`). In hosted environments set the Auth
"Site URL" / redirect allowlist to `${SITE_URL}/auth/callback`.

## Environment

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321   # local stack
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from `supabase status`>
```

Real values go in `apps/web/.env.local` (gitignored). `.env.example` ships with an empty
anon key. The anon key is a public client key, never a secret — but it still belongs only
in `.env.local`, not in committed files.

## Current state

The web application uses Supabase Auth, PostgREST/RPCs, Storage, and Edge Functions
directly. The retired Express client and its custom JWT flow are no longer part of the
workspace.
