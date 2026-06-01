# Supabase Storage Implementation Plan (Plan 5)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Cloudflare-R2 presigned-upload flow with **Supabase Storage** — a public `uploads` bucket plus storage-RLS policies so clients upload directly (`supabase-js`) to their own `{uid}/…` folder, with public read for display (avatars, portfolio).

**Architecture:** One public bucket `uploads` (image mime allowlist, per-file size limit). RLS on `storage.objects`: anyone may READ; an authenticated user may INSERT/UPDATE/DELETE only objects whose first path segment equals their `auth.uid()`. No Edge Function and no presign/finalize round-trip — the client calls `supabase.storage.from('uploads').upload('${uid}/${uuid}.${ext}', file)` and `getPublicUrl(...)`. The dropped `UploadRecord` table is not reintroduced (Storage's `storage.objects` is the record).

**Builds on:** Plans 1–4. Branch `claude/supabase-storage` off `main`. Local DB `postgresql://postgres:postgres@127.0.0.1:54322/postgres`; `supabase test db` currently 42 pgTAP. The R2 service/env/code is removed later in the teardown plan (8) — this plan only adds the Supabase side. `@faineant/shared` already exports `ALLOWED_UPLOAD_CONTENT_TYPES` = image/jpeg, image/png, image/webp.

**Design calls (flagged):**
- **One public bucket** `uploads` with per-user folders (avatars + portfolio share it; the app distinguishes via `profiles.avatar_url` vs `portfolio_items.image_url`). Public read is intended (these are displayed publicly).
- **Per-file** limit (5 MB) + mime allowlist on the bucket. **Per-user total quota is deferred** (Supabase Storage has no native per-user quota; the old `upload-quota` middleware is not replicated — documented gap).

---

## File Structure
- Create: `supabase/migrations/<ts>_storage_uploads.sql` — bucket + storage.objects policies
- Create: `supabase/tests/storage_policies_test.sql` — pgTAP (owner-folder write, cross-folder denied, public read)
- Modify: `packages/shared/src/index.ts` (or the uploads module) — add a `storageObjectPath(userId, contentType)` helper + reuse the mime allowlist
- Create: `packages/shared/src/__tests__/storage-path.test.ts` (or alongside existing tests)
- Create: `supabase/STORAGE.md` — client usage + deferred-quota note

---

## Task 1: Bucket + storage RLS policies (migration)

**Files:** Create `supabase/migrations/<ts>_storage_uploads.sql`.

- [ ] **Step 1:** `supabase migration new storage_uploads`

- [ ] **Step 2:** Write EXACTLY:
```sql
-- Public 'uploads' bucket: 5 MB/file, image mimes only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('uploads', 'uploads', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- RLS on storage.objects is enabled by Supabase. Public read; owner-folder writes.
create policy "uploads_public_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'uploads');

create policy "uploads_owner_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'uploads'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "uploads_owner_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'uploads' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "uploads_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = (select auth.uid())::text);
```

- [ ] **Step 3:** Apply + verify bucket + policies:
```bash
supabase db reset
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select id, public, file_size_limit from storage.buckets where id='uploads';"
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "select policyname, cmd from pg_policies where schemaname='storage' and tablename='objects' and policyname like 'uploads_%' order by policyname;"
```
Expected: the bucket row (public=t, 5242880); four `uploads_*` policies (read/insert/update/delete). Confirm `supabase test db` still passes the existing 42.

- [ ] **Step 4:** Commit:
```bash
git add supabase/migrations
git commit -m "feat(storage): uploads bucket + owner-folder RLS policies"
```

---

## Task 2: pgTAP — storage policies

**Files:** Create `supabase/tests/storage_policies_test.sql`.

- [ ] **Step 1:** Write the test (simulates two users; verifies owner-folder write, cross-folder denial, public read). Inserting into `storage.objects` directly exercises the policies:
```sql
begin;
select plan(4);

insert into auth.users (id, email) values
  ('cc000000-0000-0000-0000-0000000000a1', 'ua@example.com'),
  ('cc000000-0000-0000-0000-0000000000b2', 'ub@example.com');

-- userA: can write to own folder
set local role authenticated;
set local request.jwt.claims = '{"sub":"cc000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select lives_ok(
  $$insert into storage.objects (id, bucket_id, name, owner)
    values (gen_random_uuid(), 'uploads', 'cc000000-0000-0000-0000-0000000000a1/avatar.jpg', 'cc000000-0000-0000-0000-0000000000a1')$$,
  'user can upload to their own folder');
-- userA: cannot write to userB's folder
select throws_ok(
  $$insert into storage.objects (id, bucket_id, name, owner)
    values (gen_random_uuid(), 'uploads', 'cc000000-0000-0000-0000-0000000000b2/evil.jpg', 'cc000000-0000-0000-0000-0000000000a1')$$,
  '42501', null,
  'user cannot upload to another user''s folder');
reset role;

-- anon: can read objects in the public bucket
set local role anon;
set local request.jwt.claims = '';
select is(
  (select count(*)::int from storage.objects where bucket_id='uploads' and name like 'cc000000-0000-0000-0000-0000000000a1/%'),
  1, 'anon can read uploads (public bucket)');
reset role;

-- userB: cannot delete userA's object
set local role authenticated;
set local request.jwt.claims = '{"sub":"cc000000-0000-0000-0000-0000000000b2","role":"authenticated"}';
select is(
  (with del as (delete from storage.objects where name='cc000000-0000-0000-0000-0000000000a1/avatar.jpg' returning 1) select count(*)::int from del),
  0, 'user cannot delete another user''s object (RLS hides it from delete)');
reset role;

select * from finish();
rollback;
```

- [ ] **Step 2:** `supabase test db` — expect this file 4/4; total 46. PASS.
  - If inserting into `storage.objects` fails on a NOT-NULL column other than the ones provided, add the minimal required column(s) and report what you added. If the cross-folder insert raises a different SQLSTATE than `42501`, report the actual code (RLS WITH CHECK violation is `42501`).

- [ ] **Step 3:** Commit:
```bash
git add supabase/tests/storage_policies_test.sql
git commit -m "test(db): storage owner-folder RLS policies (pgTAP)"
```

---

## Task 3: Shared upload-path helper + test

**Files:** Modify `packages/shared/src` (add helper); add a test.

- [ ] **Step 1:** Add to the shared uploads module (next to `ALLOWED_UPLOAD_CONTENT_TYPES`) a helper that builds the storage object path used by web + mobile:
```ts
const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Storage object path for the `uploads` bucket: `<userId>/<uuid>.<ext>`. */
export function storageObjectPath(userId: string, contentType: string): string {
  const ext = EXT_BY_TYPE[contentType];
  if (!ext) throw new Error("Unsupported content type");
  return `${userId}/${crypto.randomUUID()}.${ext}`;
}
```
(Use the platform `crypto.randomUUID()` — available in Node 20+, Deno, and browsers. Find the existing uploads exports first with `grep -rn "ALLOWED_UPLOAD_CONTENT_TYPES" packages/shared/src` and add this alongside so it's exported from the package root.)

- [ ] **Step 2:** Add a test (match the package's test runner — vitest):
```ts
import { describe, it, expect } from "vitest";
import { storageObjectPath } from "../<module>"; // adjust import to where it's exported

describe("storageObjectPath", () => {
  it("builds <userId>/<uuid>.<ext>", () => {
    const p = storageObjectPath("user-1", "image/png");
    expect(p).toMatch(/^user-1\/[0-9a-f-]{36}\.png$/);
  });
  it("rejects unsupported types", () => {
    expect(() => storageObjectPath("user-1", "image/gif")).toThrow();
  });
});
```

- [ ] **Step 3:** Build + test the shared package:
```bash
pnpm --filter @faineant/shared build
cd packages/shared && npx vitest run && cd ../..
```
Expected: the new test passes; build clean.

- [ ] **Step 4:** Commit:
```bash
git add packages/shared
git commit -m "feat(shared): storageObjectPath helper for Supabase Storage uploads"
```

---

## Task 4: Docs

**Files:** Create `supabase/STORAGE.md`.

- [ ] **Step 1:** Write `supabase/STORAGE.md`:
```markdown
# Storage

Bucket `uploads` (public read; per-file 5 MB; image/jpeg|png|webp).

## Client usage (web + mobile, supabase-js)
```ts
import { storageObjectPath } from "@faineant/shared";
const path = storageObjectPath(userId, file.type);          // `<uid>/<uuid>.<ext>`
await supabase.storage.from("uploads").upload(path, file, { contentType: file.type });
const { data } = supabase.storage.from("uploads").getPublicUrl(path);
// store data.publicUrl in profiles.avatar_url or portfolio_items.image_url
```
Storage RLS lets a user write/update/delete only under their own `<uid>/` folder; anyone can read.

## Deferred / gaps
- **Per-user total quota** is not enforced (Supabase Storage has no native per-user quota; the old R2 `upload-quota` middleware is not replicated). Revisit if abuse appears (e.g., a Storage trigger counting bytes per owner).
- The Cloudflare R2 service + env (`R2_*`) are removed in the teardown plan (8).
```

- [ ] **Step 2:** Commit:
```bash
git add supabase/STORAGE.md
git commit -m "docs(storage): client usage + deferred quota note"
```

---

## Done criteria
- `supabase db reset` clean; `uploads` bucket exists (public, 5 MB, image mimes); four `uploads_*` storage.objects policies.
- `supabase test db` green at **46** (42 + 4 storage).
- `@faineant/shared` builds + the `storageObjectPath` test passes.
- No client/app rewrite here — web/mobile wire `supabase.storage` in their rewrite plans (6/7); R2 removal is plan 8.

## Known gaps / deferred
- Per-user storage quota (see above).
- Image processing/transforms (Supabase image transforms) not configured — defer.
