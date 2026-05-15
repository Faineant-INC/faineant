# FAINEANT

In-home beauty services in Chicago.

A directory of practitioners — barbers, hair stylists, nail technicians, lash artists, makeup artists, facialists — who travel to your home. Booking is the only thing you have to do.

## Stack

- **Monorepo:** pnpm workspaces + Turborepo
- **API:** Express + Prisma + PostgreSQL + Socket.IO (standalone server)
- **Web:** Next.js 14 (App Router) + Tailwind 3.4 + shadcn/ui
- **Mobile:** Expo 50 + React Native 0.73 + Expo Router
- **Shared:** `@faineant/shared` — types, Zod schemas, brand constants, theme tokens
- **Payments:** Stripe Connect Express (5% platform fee)
- **Calendar Sync:** Google Calendar API (two-way) + ICS feed import

## Run locally

```bash
pnpm install
docker compose up -d
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Then visit http://localhost:3000 (web) and run the Expo CLI for mobile.

## Database migrations

Schema changes go through Prisma Migrate — **never use `prisma db push`**.

```bash
pnpm db:migrate                # local dev: prisma migrate dev (creates + applies migration)
pnpm db:migrate:deploy         # CI / production: prisma migrate deploy (applies only)
pnpm db:seed                   # seed demo data
```

Migration files live in `apps/api/prisma/migrations/`. The initial baseline is `0001_init/`. After editing `schema.prisma`, run `pnpm db:migrate` and commit the generated migration alongside the schema change.

## Brand

FAINEANT (anglicised; French *fainéant*: idle, at leisure). The mark is always the logo image — never typed text. Visual surface is dark canonical (smoke-900 ground), with a champagne accent. Voice is sensual and slow; CTAs are imperative ("Reserve a window," "Open the door at 14:00"). See `docs/superpowers/specs/2026-04-27-faineant-rebrand-design.md` for the full design spec.

## Testing

```bash
pnpm test              # all packages
pnpm typecheck         # all packages
```
