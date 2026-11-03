# R2 integration status

The user approved R2 Standard storage, including possible usage-based overages. Other services remain on free plans; FFmpeg stays local.

## Cloud resources

Created `plugg-private-media` in Cloudflare account `d5547d92c5a59d24c06262c061fb9943` with Standard storage and Public Access Disabled. The existing `plugg-media` bucket and its public `cdn.plugg.site` domain were not changed. No custom domain, r2.dev public access or browser CORS is enabled for the new bucket.

Created the user-approved credential `Plugg private media backend` on 2026-11-01: Object Read & Write, scoped only to `plugg-private-media`, with Forever expiry (non-expiring, revocable). Object write permissions include destructive object operations; the migration script never deletes or overwrites existing objects.

## Implemented locally

- Server-only S3-compatible `R2StorageProvider` using the official AWS SDK. Missing configuration fails explicitly, without silently switching storage.
- `STORAGE_PROVIDER=local` preserves local storage; `r2` selects the R2 adapter.
- File and audio endpoints use the selected provider. Existing `/api/file/` and `/api/stream/` URLs remain valid without exposing bucket credentials or presigned URLs.
- GET uses streaming and byte ranges; HEAD reads metadata only. Invalid ranges return 416. Every quality-variant candidate is authorized before storage access.
- Existing audio release/session rules remain in place. Public artwork must be referenced; other files need an owner/staff session. The bucket itself stays private, while authorized published content is served through Plugg's API.
- Server responses are private/no-store so takedowns cannot be bypassed by an old shared cache.
- FFmpeg and all uploads are disabled when storage is R2. Local upload/processing works as before when storage and processing are both local. A safe cloud upload and local-processing synchronization workflow remains to be implemented.

## Migration

`node --experimental-strip-types scripts/migrate-media-to-r2.mjs` previews without contacting R2. Latest preview: 96 files, 146,926,139 bytes (about 147 MB or 0.137 GiB).

The approved credentials are saved in Git-ignored `.env.r2`, permissions 0600 (owner read/write only). Load it explicitly with `node --env-file=.env.r2`; no frontend or VITE variables contain credentials:

- `R2_ACCOUNT_ID`
- `R2_BUCKET=plugg-private-media`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`

Keep `STORAGE_PROVIDER=local` until verification. Run `node --env-file=.env.r2 --experimental-strip-types scripts/migrate-media-to-r2.mjs --apply` to copy local uploads with their existing keys. Each uploaded file is downloaded and SHA-256 verified. Identical existing objects are verified and skipped; different objects cause an error, and conditional writes prevent races from overwriting existing data. No local files are deleted and no database records are changed.

Migration completed and was independently re-run on 2026-11-01: 96 existing R2 objects matched all 96 local files byte-for-byte by SHA-256, totaling 146,926,139 bytes. The verification run reported copied=0, unchanged=96, verified=96, localFilesDeleted=0, databaseChanges=0. Real R2 metadata, byte-range response contents, and HEAD were also tested successfully. Do not switch the running application to R2 before migration and integration checks.

## Verification

- `node --experimental-strip-types --test scripts/test-r2-storage.mjs`: adapter request construction, missing vs denied objects, URL/key safety, GET/HEAD/ranges, local compatibility.
- `node --experimental-strip-types scripts/test-manual-processing.mjs`: processing blocked before mutations in manual mode.
- `npx tsc --noEmit` and `npm run build`.
- Read-only PostgreSQL probes verified the new file-access queries reject an anonymous unreferenced image and an invalid-session document request.

## Remaining deployment work

R2 does not resolve the Cloudflare Free CPU/native-bcrypt issue. Neon data migration is complete (see `docs/neon-migration.md`). Backend hosting/authentication must be settled and the cloud upload endpoint hardened before public launch. This implementation targets the existing Node backend; it is not a claim that the full backend runs on Cloudflare Workers.
