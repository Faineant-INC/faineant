# Deployment

Faineant deploys as a Next.js application on Vercel plus a hosted Supabase
project. There is no Render/Fly API, separate Postgres service, Redis instance,
or Prisma deployment step.

## 1. GitHub and Vercel

The canonical repository belongs to the `Faineant-INC` GitHub organization.
The Faineant Vercel project is connected through the Vercel GitHub App to
`Faineant-INC/faineant`, with `main` as its production branch and `apps/web` as
the project root. A push to `main` automatically creates a production deployment.
Pull requests create preview deployments through the same connection.

GitHub Actions and Vercel remain separate evidence planes: `CI` validates the
applications, database migrations and policies, and Edge Functions; `Verify
production build` performs the deterministic web build; and Vercel records the
deployment for the exact GitHub commit. Do not add a second token-driven deploy
workflow while the GitHub App connection is active, because that would create
duplicate deployments for the same commit.

Set these Vercel variables in Preview and Production:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_LAUNCH_MODE`

The anon key is public by design; the service-role key must never be set on the
web project. Vercel deployment is not complete until the deployment is Ready and
its exact commit is verified through the application URL.

## 2. Supabase schema

Link the CLI once, then inspect the pending migration set before any write:

```sh
supabase link --project-ref <project-ref>
supabase migration list --linked
supabase db push --linked --dry-run
pnpm db:verify:hosted # expected to fail when reviewed changes are pending
```

Before production push, a fresh local `pnpm db:reset`, `pnpm db:test`, generated
type diff, application checks, and Edge Function checks must all pass. Apply the
reviewed set with:

```sh
pnpm db:migrate:deploy
```

This changes the hosted database and therefore requires explicit release
authorization. Re-run `supabase migration list --linked` after the push.

## 3. Edge Functions and secrets

Configure integration secrets with `supabase secrets set`; do not commit them.
Function-specific requirements are documented in:

- `supabase/functions/calendar.README.md`
- `supabase/functions/_shared/stripe.README.md`
- `supabase/functions/send-email/README.md`
- `supabase/functions/marketing-subscribe/README.md`

Deploy only the reviewed functions:

```sh
supabase functions deploy send-email --no-verify-jwt
supabase functions deploy marketing-subscribe --no-verify-jwt
supabase functions deploy stripe-connect
supabase functions deploy stripe-payment
supabase functions deploy stripe-refund
supabase functions deploy stripe-webhook --no-verify-jwt
supabase functions deploy calendar-google-connect
supabase functions deploy calendar-google-callback --no-verify-jwt
supabase functions deploy calendar-ics-connect
supabase functions deploy calendar-sync
```

Configure Google OAuth with the deployed callback URL, Stripe webhook delivery
with the deployed webhook URL, and Resend/Supabase Auth SMTP independently. The
marketing-specific consent, postal-address, inbox, DNS, and unsubscribe gates are
defined in `docs/MARKETING-EMAIL.md`.

## 4. Release verification

Verify each plane separately:

1. GitHub `main` contains the intended commit and CI is green.
2. Supabase's migration ledger matches the repository migrations.
3. Database security and performance advisors are clean.
4. Required Edge Functions exist at the intended version and secrets are present.
5. The Vercel production deployment is Ready at the same commit.
6. `faineantapp.com` serves the expected public assets from that deployment.
7. Auth, marketing opt-in/delivery/unsubscribe, provider discovery, booking/RPC
   authorization, upload ownership, and calendar/Stripe failure paths are
   exercised against the deployed runtime.

A merged commit or successful local build alone is not a production release.
Run `pnpm db:verify:hosted` after every database/function release. It compares
the local and hosted migration ledgers, every enabled function in
`supabase/config.toml` (including its JWT-gateway setting), and the names of all
required marketing secrets. The command never prints secret values and must be
green before the release is called complete.
