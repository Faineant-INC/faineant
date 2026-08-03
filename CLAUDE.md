# FAINEANT Project Instructions

Faineant is a pnpm/Turborepo monorepo for in-home beauty services. The active
applications are `apps/web` and `apps/mobile`; reusable contracts and generated
database types live in `packages/shared`.

## Architecture authority

- Supabase is the backend: Postgres, Auth, Storage, RLS, RPCs, and Edge Functions.
- `supabase/migrations/*.sql` is the only schema source of truth. There is no ORM.
- Clients use `supabase-js` directly. Put cross-row invariants in transactional
  Postgres RPCs and secret-bearing integration code in Deno Edge Functions.
- RLS and SQL grants are both required. A policy does not replace table/function
  privileges, and a grant does not replace a policy.
- Never expose service-role keys, OAuth tokens, or integration secrets to a client.
  Calendar tokens are encrypted and readable only through the service role.
- Messaging is polling-based. Do not add Socket.IO or another standalone API.

## Database changes

Create forward-only migrations with `supabase migration new`. Add pgTAP tests for
authorization, tenant isolation, and invariant changes. Verify from a fresh local
database with `pnpm db:reset && pnpm db:test`, then regenerate types with
`pnpm db:types`. Do not hand-edit `packages/shared/src/database.types.ts`.

Do not run `supabase db push`, deploy Edge Functions, or mutate the hosted project
unless the user explicitly authorizes that external change. The linked project is
not a substitute for fresh local migration verification.

## Client conventions

- TypeScript strict mode; validate untrusted user input with shared Zod schemas.
- Web uses Tailwind tokens and Radix/shadcn patterns. Preserve the sharp,
  dark-first editorial design; avoid default gray scales and ad hoc radii.
- Mobile sessions use Supabase with Expo SecureStore and AppState-driven refresh.
- Supabase Storage object paths start with the authenticated user ID so storage
  policies can enforce ownership.
- Handle loading, empty, and failure states on every remote-data surface.

## Verification

Build `@faineant/shared` before app-specific checks, or use the root Turbo tasks.

```sh
pnpm --filter @faineant/shared build
pnpm lint
pnpm typecheck
pnpm test
pnpm build
deno check --node-modules-dir=auto supabase/functions/*/index.ts
deno test --allow-env --node-modules-dir=auto supabase/functions
```

Keep historical planning documents clearly labeled as historical. Current code,
SQL migrations, tests, linked-project state, and deployed runtime evidence outrank
old roadmap claims.
