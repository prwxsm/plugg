# Standalone Plugg Admin

Implemented 31 October 2026. The independent frontend is located at `/home/prwxsm/Projects/plugg-admin` and runs at `http://localhost:3001/admin`. The existing main application and backend remain in this repository on port 3000.

## Separation

The standalone project has its own package.json, package-lock.json, React router, Vite configuration, API client, components, stylesheet, official logo, build output, .gitignore and deployment example. It imports no backend/server-function modules and has no database credentials or shared node_modules symlink. Editing its UI does not change the main Plugg application.

The old `/admin` UI is retained for compatibility. Future standalone UI edits belong in the new project. Removing the embedded UI can be a separate cleanup after adoption.

## Backend changes

- `src/server/api/admin.ts`: `/api/admin/v1/` JSON endpoints for snapshots, login/logout, operations, review and failed-audio retry. Delegates business rules to existing services. Supports an injected connection for isolated integration tests.
- `src/server.ts`: routes these endpoints before SSR.
- `scripts/test-admin-rest.mjs`: direct and proxied read/auth/CSRF tests without live administrative writes.
- `scripts/test-admin-cutover.mjs`: adds successful API login/logout and membership checks on a disposable database copy.

No schema migration or replacement database was introduced. Copyright/rights-hold features present at extraction are preserved alongside all other current admin modules. Database access and role decisions remain server-side.

## Run and deploy

See `/home/prwxsm/Projects/plugg-admin/README.md` for setup, exact endpoints, environment variables and an Nginx example. The frontend uses same-origin API/media proxying; production should serve its built static files over HTTPS and proxy to Plugg. Set `PLUGG_ADMIN_ORIGINS` on the backend to the admin origin. No wildcard CORS or database port exposure is required.

## Verification

- Standalone frontend TypeScript and production build passed.
- Main backend TypeScript, targeted lint and production build passed.
- Direct and frontend-proxied REST tests passed: authenticated snapshot using an existing session; unauthenticated operation/review/retry denials; rejected untrusted origins/missing custom headers; invalid login validation; no-store responses.
- Isolated restored PostgreSQL tests passed, including API login/logout, HttpOnly cookie, role checks, staff management, final Super Admin protections, review/scheduling/media/retry behavior. Verified 22 restored table fingerprints. Backup: `/home/prwxsm/.local/state/plugg/backups/2026-10-31T11-40-49-879Z/plugg.dump`.
- Browser confirmed the standalone frontend with the existing Moderator session, correct restricted navigation, real backend response and preserved light theme/logo.
- No live staff/content/database schema mutations were used for verification. No cloud deployment was performed.
