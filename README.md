# FAINEANT

In-home beauty services in Chicago. Faineant connects clients with independent
practitioners who travel to them.

## Architecture

- **Monorepo:** pnpm workspaces + Turborepo
- **Backend:** Supabase Postgres, Auth, Storage, Row Level Security, and RPCs
- **Integrations:** Deno Edge Functions for Stripe, Resend, Google Calendar, and ICS
- **Web:** Next.js 15 App Router + Tailwind + Radix UI
- **Mobile:** Expo + React Native + Expo Router
- **Shared:** `@faineant/shared` schemas, design tokens, and generated database types

There is no standalone application server and no ORM. SQL migrations in
`supabase/migrations/` are the database source of truth. Web and mobile use
Supabase directly; invariant-heavy writes go through Postgres RPCs.

## Local development

Requirements: Node 22.13+, pnpm 9, Docker Desktop, and Deno 2.

```sh
pnpm install
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env
pnpm db:start
supabase status
pnpm dev
```

Copy the local API URL and anon key printed by `supabase status` into both app
environment files. The web application runs at <http://localhost:3000>; Expo
prints its mobile development URLs.

## Database workflow

```sh
supabase migration new <change_name>
pnpm db:reset
pnpm db:test
pnpm db:types
```

Commit the SQL migration, pgTAP coverage, and regenerated
`packages/shared/src/database.types.ts` together. `pnpm db:migrate:deploy`
pushes migrations to the linked hosted project and is intentionally an explicit
production operation.

## Verification

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
deno check --node-modules-dir=auto supabase/functions/*/index.ts
deno test --allow-env --node-modules-dir=auto supabase/functions
```

## Brand

FAINEANT uses an editorial, dark-first visual system with champagne accents.
Use the logo asset for the mark and the shared tokens rather than ad hoc colors.
The full design specification lives in
`docs/superpowers/specs/2026-04-27-faineant-rebrand-design.md`.

The hosted test identities, deterministic scenarios, secure credential lookup,
and remaining provider-integration gates are documented in [docs/QA.md](docs/QA.md).
