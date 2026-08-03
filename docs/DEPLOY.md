# Deployment

Faineant deploys as a Next.js application on Vercel plus a hosted Supabase
project. There is no Render/Fly API, separate Postgres service, Redis instance,
or Prisma deployment step.

## 1. GitHub and Vercel

The canonical repository belongs to the `Faineant-INC` GitHub organization.
Install the Vercel GitHub app for that organization, connect the web project to
the repository, and configure production deployments from `main`.

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

Deploy only the reviewed functions:

```sh
supabase functions deploy send-email --no-verify-jwt
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
with the deployed webhook URL, and Resend/Supabase Auth SMTP independently.

## 4. Release verification

Verify each plane separately:

1. GitHub `main` contains the intended commit and CI is green.
2. Supabase's migration ledger matches the repository migrations.
3. Database security and performance advisors are clean.
4. Required Edge Functions exist at the intended version and secrets are present.
5. The Vercel production deployment is Ready at the same commit.
6. Auth, waitlist, provider discovery, booking/RPC authorization, upload ownership,
   and calendar/Stripe failure paths are exercised against the deployed runtime.

A merged commit or successful local build alone is not a production release.
