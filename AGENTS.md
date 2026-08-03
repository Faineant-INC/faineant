# Repository Guidance for Codex

Read `CLAUDE.md` for the shared architecture and engineering conventions. Treat
this file as the Codex-specific operational memory for the repository.

- Preserve unrelated or untracked work in shared checkouts. Inspect `git status`
  before editing and never reset another agent's changes.
- The repository remote is under `Faineant-INC`; the product and package namespace
  are `Faineant` / `@faineant`. Do not revive Arc package names.
- Supabase SQL migrations, RLS, grants, RPCs, pgTAP tests, and generated types must
  move together. Validate migrations from a clean local stack.
- The hosted Supabase project, Vercel projects, GitHub integration, and DNS are
  external state. Reconcile them live before release claims, and do not push,
  deploy, rename, or delete external resources without explicit authorization.
- Never commit `.env` files, service-role keys, OAuth credentials, or local CLI
  state. Public anon/publishable values still belong in deployment configuration,
  not hard-coded application source.
- A green build is not proof of production deployment. Report Git, database,
  Edge Function, Vercel, and domain status separately.
- Browser account QA lives in `apps/web/e2e`. Keep its identity registry,
  `docs/QA.md`, and role-routing behavior synchronized. Credentials come only
  from Keychain or CI secrets; never persist Playwright storage state, traces, or
  videos containing authenticated sessions.
- Production UI smoke tests are serial and read-only. Stateful browser tests need
  disposable fixtures, explicit cleanup, and a separate lane.
- Marketing email is governed by `docs/MARKETING-EMAIL.md`. Never treat a legacy
  waitlist row as consent, bypass `marketing_status`, invent a postal address,
  pre-check consent, or send live marketing to an address that did not opt in.
