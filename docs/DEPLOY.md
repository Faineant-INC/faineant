# FAINEANT — Production Deploy Runbook

> First-time deploy of the API + DB. Web app is already on Vercel
> (`arc-marketplace.vercel.app`). Follow these steps in order.

**Default target:** Render (API) + Neon (Postgres) + Upstash (Redis) + Cloudflare R2 (uploads) + Resend (email).

**Alternative:** Fly.io instead of Render — see `apps/api/fly.toml`. Everything else is identical.

---

## 0. Prereqs

- GitHub repo pushed.
- Accounts (free tier on each, no card needed except Stripe):
  - [Render](https://render.com)
  - [Neon](https://console.neon.tech)
  - [Upstash](https://console.upstash.com)
  - [Cloudflare](https://dash.cloudflare.com) (R2 requires adding a card but free tier doesn't charge)
  - [Resend](https://resend.com)
  - [Stripe](https://dashboard.stripe.com)
  - [Google Cloud Console](https://console.cloud.google.com) — calendar OAuth + Maps

You'll collect **secret values** along the way. Keep a scratchpad (1Password, Bitwarden) — do **not** paste them in chat or files.

---

## 1. Provision the database (Neon)

1. https://console.neon.tech → **Create project** → name `faineant-prod`, region `US East (Ohio)`.
2. After creation, **Connection Details** → copy the **Pooled connection** string. It looks like:
   ```
   postgresql://<user>:<pwd>@<host>-pooler.<region>.aws.neon.tech/<db>?sslmode=require
   ```
3. Save as `DATABASE_URL`.
4. (Optional) Create a `branch` for previews later. Not needed for first deploy.

> Neon free tier: 0.5 GB storage, auto-suspend after inactivity (resumes per query in ~1s). Daily PITR (7-day window).

---

## 2. Provision Redis (Upstash)

1. https://console.upstash.com → **Create Database** → Type `Regional`, region `us-east-1` (close to Neon), TLS enabled.
2. Open the database → **Connect to your database** → copy the `rediss://` URL.
3. Save as `REDIS_URL`.

---

## 3. Set up object storage (Cloudflare R2)

1. https://dash.cloudflare.com → R2 → **Create bucket** → name `faineant-uploads`, location automatic.
2. Bucket → Settings → **Public access** → Allow Access via R2.dev subdomain (or attach a custom domain like `cdn.faineantapp.com`). Copy the public URL — save as `R2_PUBLIC_URL`.
3. R2 home → **Manage R2 API Tokens** → Create token → Permissions: **Object Read & Write**, scope to bucket `faineant-uploads`.
   - Save `Access Key ID` → `R2_ACCESS_KEY_ID`
   - Save `Secret Access Key` → `R2_SECRET_ACCESS_KEY`
   - Save the Account ID from the R2 sidebar → `R2_ACCOUNT_ID`
4. (Recommended) Add CORS to the bucket allowing PUT from `https://arc-marketplace.vercel.app`, `https://faineantapp.com`, `http://localhost:3000`.

---

## 4. Set up email (Resend)

1. https://resend.com → **Domains** → Add `faineantapp.com`.
2. Resend gives you DNS records (SPF, DKIM, DMARC). Add them in Cloudflare DNS for `faineantapp.com`. Wait for "verified" (usually <5 min).
3. **API Keys** → Create → scope `Sending access` → save as `RESEND_API_KEY`.

> If `faineantapp.com` DNS isn't pointed at Cloudflare yet, skip this for now — leave `RESEND_API_KEY` blank in Render. Email transport is wired in Phase 1.1.

---

## 5. Stripe Connect

1. https://dashboard.stripe.com → **Developers → API keys** → copy **Secret key** (`sk_live_...` or `sk_test_...` for first deploy) → save as `STRIPE_SECRET_KEY`.
2. **Developers → Webhooks** → Add endpoint:
   - URL: `https://<your-render-url>/api/v1/payments/webhook` (you'll know the Render URL after step 7; come back here)
   - Events: `account.updated`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`
   - After creation, reveal the **Signing secret** → save as `STRIPE_WEBHOOK_SECRET`.
3. **Connect → Settings** → enable Express accounts. Branding optional.

---

## 6. Google APIs

1. https://console.cloud.google.com → create/select a project `faineant-prod`.
2. **APIs & Services → Library** → enable: Google Calendar API, Maps JavaScript API, Geocoding API, Places API.
3. **Credentials → Create credentials → OAuth client ID** → Web application:
   - Authorized redirect URIs: `https://<your-render-url>/api/v1/calendar/google/callback` (also add the final `https://api.faineantapp.com/...` once domain is mapped)
   - Save `Client ID` → `GOOGLE_CLIENT_ID`, `Client secret` → `GOOGLE_CLIENT_SECRET`.
4. **Credentials → Create credentials → API key** → restrict to the Maps + Geocoding + Places APIs → save as `GOOGLE_MAPS_API_KEY`.

---

## 7. Deploy the API (Render)

1. Push this repo to GitHub if you haven't.
2. https://dashboard.render.com/blueprints → **New Blueprint Instance** → connect the repo.
3. Render reads `apps/api/render.yaml`. It will:
   - Create the `faineant-api` web service.
   - Auto-generate `JWT_SECRET` and `JWT_REFRESH_SECRET`.
   - Prompt for every `sync: false` env var.
4. Paste the secrets you collected:

   | Render env var          | Value source                       |
   |-------------------------|------------------------------------|
   | `DATABASE_URL`          | Neon (step 1)                      |
   | `STRIPE_SECRET_KEY`     | Stripe (step 5)                    |
   | `STRIPE_WEBHOOK_SECRET` | Stripe (step 5)                    |
   | `RESEND_API_KEY`        | Resend (step 4) — or leave blank   |
   | `R2_ACCOUNT_ID`         | Cloudflare R2 (step 3)             |
   | `R2_ACCESS_KEY_ID`      | Cloudflare R2 (step 3)             |
   | `R2_SECRET_ACCESS_KEY`  | Cloudflare R2 (step 3)             |
   | `R2_PUBLIC_URL`         | Cloudflare R2 (step 3)             |
   | `GOOGLE_CLIENT_ID`      | Google (step 6)                    |
   | `GOOGLE_CLIENT_SECRET`  | Google (step 6)                    |
   | `GOOGLE_MAPS_API_KEY`   | Google (step 6)                    |
   | `REDIS_URL`             | Upstash (step 2)                   |

5. Click **Apply**. Render builds the Docker image (~5–8 min first time).
6. After the build, the **preDeployCommand** runs `prisma migrate deploy`. The first deploy will baseline the migrations folder.
7. Once the service is live, copy the Render URL (e.g. `https://faineant-api.onrender.com`).
8. Map the custom domain `api.faineantapp.com`:
   - Render → Settings → Custom Domains → Add → `api.faineantapp.com`.
   - In Cloudflare DNS: add a CNAME `api → <render-cname>.onrender.com`, proxy **off** (so TLS terminates at Render).
9. Update Stripe webhook URL + Google OAuth redirect URI to use the final domain.

---

## 8. Point the web app at the API

1. https://vercel.com → `arc-marketplace` project → Settings → Environment Variables.
2. Add (Production + Preview):
   - `NEXT_PUBLIC_API_URL=https://api.faineantapp.com` (or the Render URL until DNS is mapped)
3. Redeploy the web app (Deployments → ⋯ → Redeploy).

---

## 9. Verify

```bash
# Public health
curl https://api.faineantapp.com/health
# → {"status":"ok","db":"ok","timestamp":"..."}

# CORS preflight from the web origin
curl -i -X OPTIONS https://api.faineantapp.com/api/v1/auth/login \
  -H "Origin: https://arc-marketplace.vercel.app" \
  -H "Access-Control-Request-Method: POST"
# → 204 with Access-Control-Allow-Origin echoed back
```

If `/health` returns `{"db":"ok"}`, the API can reach Neon and migrations applied. If `db: "err"`, check Render logs and the `DATABASE_URL` (must include `?sslmode=require`).

---

## 10. Seed (one-shot)

The seed creates an admin user + demo provider + demo client. Run it **once**, locally, against the prod DB:

```bash
DATABASE_URL='<neon-pooled-url>' pnpm --filter @faineant/api db:seed
```

Do **not** add this to the deploy hook — it would re-seed on every release.

---

## 11. Subsequent deploys

- Push to `main` → GitHub Actions runs `.github/workflows/deploy-api.yml`:
  - Builds + tests against an ephemeral Postgres.
  - If the `RENDER_DEPLOY_HOOK` repo secret is set, it `curl`s the Render hook to trigger deploy.
  - (Optional) If `API_HEALTH_URL` repo variable is set, polls `/health` for up to 5 minutes after deploy.
- Render runs the preDeployCommand → `prisma migrate deploy` → promotes the new instance.
- Rollback: Render dashboard → Deploys → previous deploy → **Rollback**.

To set up the deploy hook:
1. Render → service → Settings → Deploy Hook → copy URL.
2. GitHub repo → Settings → Secrets → Actions → add `RENDER_DEPLOY_HOOK`.
3. (Optional) Add `API_HEALTH_URL` as a repo **variable** (not secret): `https://api.faineantapp.com/health`.

---

## Secrets checklist — must be set in Render before first deploy

| Required        | Optional (Phase 1.1+) |
|-----------------|------------------------|
| `DATABASE_URL`  | `RESEND_API_KEY`       |
| `STRIPE_SECRET_KEY` | `R2_ACCOUNT_ID`     |
| `STRIPE_WEBHOOK_SECRET` | `R2_ACCESS_KEY_ID` |
| `GOOGLE_CLIENT_ID` | `R2_SECRET_ACCESS_KEY` |
| `GOOGLE_CLIENT_SECRET` | `R2_PUBLIC_URL`   |
| `GOOGLE_MAPS_API_KEY` | `REDIS_URL`         |

`JWT_SECRET` and `JWT_REFRESH_SECRET` are auto-generated by Render via `generateValue: true` in `render.yaml`.

---

## Troubleshooting

- **Build fails on Render at `pnpm install`** — confirm the workspace stubs in the Dockerfile match the real package names (`@faineant/web`, `@faineant/mobile`).
- **`prisma migrate deploy` fails with P3005** ("database schema is not empty") — only on first deploy against an existing DB. Either start with an empty Neon DB, or run `prisma migrate resolve --applied <migration_name>` locally pointed at Neon to mark the baseline as applied.
- **Health 503 with `db:"err"`** — `DATABASE_URL` wrong, IP blocked, or sslmode missing. Neon needs `?sslmode=require`.
- **CORS error from web app** — the web origin isn't in the `WEB_URL` comma-separated list on Render. Add it and redeploy.
