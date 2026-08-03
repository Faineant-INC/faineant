# Faineant QA accounts and scenarios

This runbook covers the deterministic hosted QA identities and fixtures in the
Supabase project `cjphfgvmbtynsfpapzrg`. The provisioner is idempotent and lives
at `apps/web/scripts/provision-qa.mjs`. It never prints or stores passwords in
the repository.

## Account matrix

| Identity                              | Role       | Scenario                                         | Expected sign-in                      |
| ------------------------------------- | ---------- | ------------------------------------------------ | ------------------------------------- |
| `qa.client@faineantapp.com`           | `CLIENT`   | Active, confirmed client with all booking states | Success                               |
| `qa.unverified@faineantapp.com`       | `CLIENT`   | Email confirmation gate                          | `email_not_confirmed`                 |
| `qa.disabled@faineantapp.com`         | `CLIENT`   | Inactive profile plus Auth ban                   | `user_banned`                         |
| `qa.provider@faineantapp.com`         | `PROVIDER` | Approved provider with catalog and schedule      | Success                               |
| `qa.provider.pending@faineantapp.com` | `PROVIDER` | Pending marketplace approval                     | Success; absent from public discovery |
| `qa.admin@faineantapp.com`            | `ADMIN`    | Platform administration                          | Success                               |

On this Mac, each password is stored in the login Keychain under account
`faineant` and the following service names:

| Identity          | Keychain service               |
| ----------------- | ------------------------------ |
| Active client     | `faineant-qa-client`           |
| Unverified client | `faineant-qa-unverified`       |
| Disabled client   | `faineant-qa-disabled`         |
| Approved provider | `faineant-qa-provider`         |
| Pending provider  | `faineant-qa-provider-pending` |
| Administrator     | `faineant-qa-admin`            |

Retrieve one credential without placing it in source control:

```sh
security find-generic-password -a faineant -s faineant-qa-client -w
```

## Deterministic fixture coverage

The approved provider is published as `qa-studio-chicago` and owns:

- two active services and one inactive service;
- a Monday-Friday schedule, one blocked-day override, and one portfolio item;
- `PENDING`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, and
  `NO_SHOW` bookings for the active client;
- one explicitly fake payment and partial refund (`*_qa_fixture_*` identifiers;
  no Stripe transaction exists);
- one five-star review;
- a two-message client/provider conversation;
- one community post and comment;
- one inactive ICS connection and imported busy-time fixture;
- one waitlist entry sourced as `qa-fixture`.

The active client also has a deterministic Fulton Market address and a mixed
notification preference set. This proves the profile form reads and persists
all fields instead of showing browser-only defaults.

Fixture UUIDs use obvious `71…` through `80…` prefixes. Do not use these rows
for revenue, provider payouts, or analytics.

## Re-provisioning

Supply the hosted URL, service-role key, and six passwords through the process
environment, then run:

```sh
pnpm qa:provision
```

The required password variables are:

```text
QA_CLIENT_PASSWORD
QA_UNVERIFIED_PASSWORD
QA_DISABLED_PASSWORD
QA_PROVIDER_PASSWORD
QA_PROVIDER_PENDING_PASSWORD
QA_ADMIN_PASSWORD
```

The script refuses to convert an already-confirmed identity back into the
unverified scenario. It updates only the named QA identities and deterministic
fixture rows.

## Verified hosted assertions

The hosted smoke suite currently proves:

- active client, approved provider, and admin can sign in and resolve their
  database-backed roles;
- the unverified account is rejected with `email_not_confirmed`;
- the disabled account is rejected with `user_banned`;
- client self-promotion to `ADMIN` is denied with SQLSTATE `42501`;
- provider self-editing of verification state is denied with SQLSTATE `42501`;
- role middleware sends client, provider, and admin identities only to their
  permitted workspaces and rejects inactive profiles;
- public discovery returns `Faineant QA Studio` and hides the pending provider;
- unsigned Edge Function requests are rejected, while the signed email webhook
  accepts a non-delivery test payload.

## Browser automation

The executable account contract lives in `apps/web/e2e`; its README documents
structure, secret handling, local/production commands, evidence retention, and
failure triage. The production-safe lane covers:

| Scenario          | Expected UI result                                                    |
| ----------------- | --------------------------------------------------------------------- |
| Active client     | `/dashboard`, Quinn's live booking overview, no admin access          |
| Approved provider | `/dashboard/provider/bookings`, live QA booking data, no admin access |
| Pending provider  | Private provider workspace works; public provider URL remains 404     |
| Administrator     | `/admin` and the live House ledger                                    |
| Unverified client | Remains on `/login` with an email-confirmation message                |
| Disabled client   | Remains on `/login` with a disabled-account message                   |

Run the read-only production suite on Node 24:

```sh
E2E_BASE_URL=https://faineantapp.com nvm exec 24 pnpm test:e2e
```

The suite reads the existing Keychain services directly on macOS. The manual
`Production QA UI` GitHub workflow instead expects the six password variables as
secrets in the protected `production-qa` environment. Do not upload Playwright
reports or failure screenshots until they have been checked for session or user
data.

### Process and memory ownership

- `CLAUDE.md` defines shared architecture; `AGENTS.md` defines Codex operations.
- This runbook owns durable QA identities/scenarios; `apps/web/e2e` owns their
  executable browser expectations.
- Sanitized Codex memory can summarize verified outcomes only when explicitly
  requested. It must never contain passwords, cookies, tokens, or storage state.
- Before claiming a current result, re-check the repository SHA, hosted Supabase
  state, Vercel deployment, and live browser run. Older memory is evidence, not
  release authority.

## External integration gates

### Email DNS

The Resend domain `faineantapp.com` exists but cannot be verified from Vercel:
the registrar and active nameservers are at GoDaddy
(`ns21.domaincontrol.com`, `ns22.domaincontrol.com`). Add these public records at
GoDaddy:

| Type  | Name                | Value                                                                                                                                                                                                                        |
| ----- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TXT` | `resend._domainkey` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDE+t26vTYp7UkjUi05RViTwfDSPLVIAW76o59lrwDf09IlQImcos+0sSaZDXV+qKzYZoqwaG3V0ETdnJrw1iIw7At+0OqNuPppcYDX2gcUhRGOoexCcqOJm0XLwetxWhx9z8tSt7vL7Bh/C5A43q26n4sexefvp9UZ8MopfdJToQIDAQAB` |
| `MX`  | `send`              | `feedback-smtp.us-east-1.amazonses.com`                                                                                                                                                                                      |
| `TXT` | `send`              | `v=spf1 include:amazonses.com ~all`                                                                                                                                                                                          |

Until Resend reports the domain as verified, the database email trigger is
intentionally suspended by an empty `faineant_send_email_url` Vault value. The
Edge Function and signing secret are deployed; do not enable the trigger or
custom Auth SMTP before DNS verification.

### Stripe and Google Calendar

The retired API and Vercel projects contained no real Stripe secret/webhook
secret or Google OAuth client credentials. Stripe payment/Connect/refund and
Google Calendar OAuth functions are deployed but fail closed until those
provider credentials are supplied. ICS calendar sync is available independently.
