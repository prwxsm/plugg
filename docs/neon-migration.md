# Neon migration — verified 2026-11-01

The existing Neon Free project `plugg` (`fancy-sound-22886340`), production branch `br-lingering-credit-asmow0jb`, database `neondb`, now contains the Plugg public schema and existing records. This is a verified database copy, not an application deployment or cutover.

## Verification

- 22 public tables and 337 records matched per-table counts and SHA-256 row fingerprints from a consistent local PostgreSQL snapshot.
- 217 constraints, 58 indexes, three triggers and three functions matched their source definitions.
- All five restored ID sequence values and called states matched the backup.
- One active Super Admin, one Admin and one Moderator were verified.
- All nine existing Neon-managed `neon_auth` tables were preserved and checked before/after.
- User accounts, password hashes and role memberships were copied. Session and password-reset table structures were copied with zero records; users must sign in afresh on the cloud deployment.

## Protected local backup and evidence

Directory: `/home/prwxsm/.local/state/plugg/backups/neon-2026-11-01T09-54-17-195Z/`

- `local-complete.dump`: full local backup, including local sessions.
- `plugg-cloud.dump`: migration archive excluding session and password-reset data.
- `neon-auth-before.dump`: backup of the existing Neon-managed schema.
- `manifest.json`, `verification.json`, `additional-verification.json`: migration and read-only verification evidence.

Backups contain sensitive data and are stored outside the repository with owner-only permissions. Do not commit or publish them.

## Connection and local development

The existing direct Neon connection is saved as `NEON_DATABASE_URL` in Git-ignored `.env.neon`, permissions 0600. No credential was reset. The migration verified the server TLS certificate. Connection credentials must only be supplied to server-side runtime secrets at deployment.

The local `.env` and application `DATABASE_URL` were not changed. Local PostgreSQL, files and FFmpeg remain the development setup. Neon and local PostgreSQL do not automatically synchronize; further local edits need a deliberate final synchronization before launch.

## Migration implementation

`scripts/migrate-postgres-to-neon.mjs` defaults to preview and requires `--apply` for restoration. It pins the intended target, requires an empty public schema, backs up both sides, restores in a single transaction without deleting the Neon-managed schema, then verifies data and schema definitions. The successful import has already run: do not rerun it or clear the populated schema.

## Next deployment step

Resolve the free backend hosting/authentication arrangement, then deploy staging with server-side Neon/R2 secrets. Keep cloud uploads and automatic processing disabled until their secure workflow is ready. Verify sign-in, staff permissions, private media and session behavior before attaching production domains. No backend, admin custom domain, or main-site cutover was completed by this migration.
