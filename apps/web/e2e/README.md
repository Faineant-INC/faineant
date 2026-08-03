# Web UI QA automation

This directory is the production-safe browser contract for the deterministic QA
identities in `docs/QA.md`.

## Layout

- `fixtures/accounts.ts` is the non-secret identity and expectation registry.
- `support/credentials.ts` resolves passwords from process environment variables
  or the macOS login Keychain. It never prints credential values.
- `support/login.ts` contains shared user-visible login actions and URL checks.
- `auth.roles.spec.ts` covers client, approved provider, pending provider, admin,
  role routing, forbidden-workspace redirects, and logout.
- `auth.gates.spec.ts` covers unverified and disabled account gates.
- `marketplace.visibility.spec.ts` proves public approved/active visibility and
  pending/inactive filtering.

The suite is serial and read-only because the identities share deterministic
hosted fixtures. Do not add booking-status, profile, service, or payment writes to
this smoke lane. Stateful tests need disposable fixtures and an explicit cleanup
contract.

## Local execution

Use a Playwright-supported Node release and install its pinned Chromium build:

```sh
nvm exec 24 pnpm install --frozen-lockfile
nvm exec 24 pnpm --filter @faineant/web exec playwright install chromium
```

Run against production with Keychain-backed credentials:

```sh
E2E_BASE_URL=https://faineantapp.com nvm exec 24 pnpm test:e2e
```

Without `E2E_BASE_URL`, Playwright starts the local Next.js app on
`http://127.0.0.1:3000`. The app still needs its normal public Supabase variables.

On macOS, passwords are read directly from Keychain account `faineant`. On CI or
other operating systems, provide the six `QA_*_PASSWORD` variables documented in
`docs/QA.md`. Never paste them into this directory, a Playwright config, shell
transcript, report, screenshot, or checked-in storage-state file.

## Evidence and failure handling

- Browser contexts are isolated per test; authenticated storage state is never
  persisted or reused.
- Traces and video are disabled because they can capture credential-entry actions
  or session material. Screenshots are retained only on failure and must be
  reviewed before sharing.
- `test-results/`, `playwright-report/`, and `playwright/.auth/` are ignored.
- A production handoff records the deployment URL/ID, exact Git SHA, test command,
  and sanitized pass/fail outcomes. It does not retain cookies or tokens.
- Treat a failure as evidence: inspect the screenshot/network symptoms, reproduce
  once, fix the smallest responsible layer, then rerun the focused spec and full
  suite. Never weaken an assertion merely to make production green.

## Documentation and memory lifecycle

- `CLAUDE.md` is shared architecture authority.
- `AGENTS.md` is Codex operational guidance.
- `docs/QA.md` is the durable account/scenario runbook.
- This directory is the executable UI contract.
- Codex memory is a sanitized evidence cache, not deployment authority. Update it
  only when the user explicitly asks, never with credentials/session data, and
  always re-query Git, Supabase, Vercel, and the live UI before current claims.

When a role, route, or scenario changes, update the fixture registry, relevant
spec, `docs/QA.md`, and agent guidance in the same change.
