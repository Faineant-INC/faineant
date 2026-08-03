# marketing-subscribe Edge Function

Owns the public homepage marketing-email opt-in and unsubscribe flow. It is
separate from `send-email`, which remains transactional.

## Required secrets

- `RESEND_API_KEY`
- `EMAIL_FROM_NAME` and `EMAIL_FROM_ADDRESS`
- `WEB_URL` (canonical public site)
- `MARKETING_POSTAL_ADDRESS` (a valid physical postal address; never invent one)
- `MARKETING_SIGNING_SECRET` (at least 32 random bytes)
- `MARKETING_ALLOWED_ORIGINS` (optional comma-separated preview/local origins)

Supabase injects `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. The
service-role key never reaches the browser.

The function refuses to send a marketing email if the Resend key, postal
address, or signing secret is missing. Consent remains stored so a retry can
complete delivery after configuration is corrected.

## Controls

- Exact disclosure version, source, timestamp, referrer, user agent, and an HMAC
  of the request address are recorded.
- Legacy waitlist rows remain `legacy` and are not silently treated as consent.
- Anonymous table writes are revoked; only the Edge Function records consent.
- Five newly recorded subscriptions or resubscriptions per HMAC-address per hour
  are allowed.
- Welcome sends use Resend idempotency keys.
- Human unsubscribe links lead to the branded site. `List-Unsubscribe` and
  `List-Unsubscribe-Post` support provider one-click unsubscribe requests.
- Withdrawn addresses remain on a suppression ledger and must be excluded from
  every future marketing campaign.

## Verification

```sh
deno check --node-modules-dir=auto supabase/functions/marketing-subscribe/index.ts
deno test --allow-env --node-modules-dir=auto supabase/functions/marketing-subscribe
```

Do not deploy until the Resend domain DNS is verified and the owner supplies the
valid physical postal address.
