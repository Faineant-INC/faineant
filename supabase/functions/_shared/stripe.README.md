# Stripe Edge Functions

Four functions replicate the old Express `payment.service.ts`:
- `stripe-connect` — provider Express-account onboarding link (auth: provider JWT)
- `stripe-payment` — PaymentIntent for a booking (5% fee + destination charge) (auth: client JWT)
- `stripe-refund` — provider/admin refund, partial or full (auth: provider/admin JWT)
- `stripe-webhook` — Stripe → us; signature-verified, `verify_jwt = false`

## Secrets (set per environment; never commit)
- `STRIPE_SECRET_KEY` — Stripe secret key (test key in staging)
- `STRIPE_WEBHOOK_SECRET` — signing secret from the Stripe webhook endpoint
- `STRIPE_PLATFORM_FEE_PERCENT` — platform fee percent (default 5)
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — injected by the platform
- `WEB_URL` — used for Connect onboarding return/refresh URLs (default https://faineantapp.com)

Set: `supabase secrets set STRIPE_SECRET_KEY=... STRIPE_WEBHOOK_SECRET=... STRIPE_PLATFORM_FEE_PERCENT=5`

## Stripe Connect setup
- Enable Connect (Express accounts) in the Stripe dashboard.
- The platform takes a 5% application fee via `application_fee_amount` + `transfer_data.destination`.

## Webhook registration
In the Stripe dashboard → Developers → Webhooks, add an endpoint:
`https://<project-ref>.supabase.co/functions/v1/stripe-webhook`
Subscribe to: `payment_intent.succeeded`, `payment_intent.payment_failed`, `account.updated`.
Copy the endpoint's signing secret into `STRIPE_WEBHOOK_SECRET`.

## Earnings
Provider earnings is NOT a function — it's a client `supabase-js` query against `payments`
(the RLS SELECT policy authorizes a provider to read their own payments). Implemented in the
web/mobile rewrite.

## Tests
`deno test supabase/functions/stripe-payment/ supabase/functions/stripe-refund/ supabase/functions/stripe-webhook/`

## Deploy
`supabase functions deploy stripe-connect stripe-payment stripe-refund stripe-webhook`

## Known pre-prod hardening
- Refund DB writes (refund insert + payment update) are not yet a single transaction — move to a Postgres RPC for atomicity before prod.
- `account.updated` idempotency is not gated on `stripe_event_id` (no payment row to stamp); the write is effectively idempotent.
