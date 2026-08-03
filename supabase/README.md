# Supabase

Local dev: `supabase start`, apply schema with `supabase db reset`, run DB tests with `supabase test db`.

- Migrations: `supabase/migrations/` (SQL, source of truth — Prisma is removed).
- DB tests: `supabase/tests/` (pgTAP).
- Generated client types: `packages/shared/src/database.types.ts`
  (regenerate after schema changes: `supabase gen types typescript --local > packages/shared/src/database.types.ts`).

Remote project: `prod` in the `faineant` organization (`cjphfgvmbtynsfpapzrg`).
Link with `supabase link --project-ref cjphfgvmbtynsfpapzrg`.
