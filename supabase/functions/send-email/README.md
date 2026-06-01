# send-email Edge Function

Sends transactional email (booking confirmation/cancellation, welcome) via Resend,
triggered by Database Webhooks.

## Secrets (set per environment; never commit)
- `RESEND_API_KEY` — Resend API key
- `SEND_EMAIL_WEBHOOK_SECRET` — shared secret; the DB trigger sends it as `Authorization: Bearer …`
- `EMAIL_FROM_NAME` (default "Faineant"), `EMAIL_FROM_ADDRESS` (default noreply@faineantapp.com)
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` are injected by the platform.

Set function secrets: `supabase secrets set RESEND_API_KEY=... SEND_EMAIL_WEBHOOK_SECRET=...`

## Production prerequisite
The webhook triggers call `net.http_post`, so `pg_net` must be enabled in the
target project: `create extension if not exists pg_net;` (Supabase: enable the
`pg_net` extension). Not needed locally — the trigger no-ops when unconfigured.

## Webhook wiring (per environment)
The triggers read the function URL + secret from Postgres settings:
```sql
alter database postgres set app.settings.send_email_url = 'https://<ref>.supabase.co/functions/v1/send-email';
alter database postgres set app.settings.send_email_secret = '<SEND_EMAIL_WEBHOOK_SECRET>';
```
Local: serve with `supabase functions serve send-email` and point the setting at the local URL
(`http://host.docker.internal:54321/functions/v1/send-email`).

## Tests
`deno test --allow-net supabase/functions/send-email/`

## Deploy
`supabase functions deploy send-email`
