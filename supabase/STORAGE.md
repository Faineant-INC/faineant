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
