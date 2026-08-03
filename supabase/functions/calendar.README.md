# Calendar Edge Functions

Faineant imports provider conflicts from Google Calendar and public/private ICS
feed URLs. This integration is read-only: imported events block booking windows,
but Faineant does not write appointments back to an external calendar.

## Required secrets

Set these with `supabase secrets set --project-ref <ref>`:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI` — the deployed `calendar-google-callback` function URL
- `CALENDAR_TOKEN_KEY` — `openssl rand -base64 32`
- `STATE_SIGNING_SECRET` — at least 32 random characters
- `WEB_URL` — the canonical web application origin

Supabase supplies `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and
`SUPABASE_SERVICE_ROLE_KEY` to deployed functions.

In Google Cloud, add `GOOGLE_REDIRECT_URI` to the OAuth web client and request
the read-only Calendar scope. Deploy the four functions after their secrets are
configured:

```sh
supabase functions deploy calendar-google-connect
supabase functions deploy calendar-google-callback --no-verify-jwt
supabase functions deploy calendar-ics-connect
supabase functions deploy calendar-sync
```

OAuth access and refresh tokens are encrypted with AES-256-GCM before they are
stored. The client lists connections through `calendar_connections_safe`, which
contains no token columns.

ICS URLs must use HTTPS, cannot contain credentials, reject literal/private host
names, revalidate redirects, and are capped while streaming. If arbitrary ICS
hosts are enabled in production, route requests through an egress proxy that
pins and validates DNS results as well; URL-string validation alone cannot rule
out DNS rebinding.
