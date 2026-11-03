# Free-only deployment preparation

Status (2026-11-01): application NOT deployed. Private R2 media and Neon database migrations are complete and verified. Local application configuration remains unchanged. No DNS changes or public media uploads were performed; R2 is the only approved metered-service exception.

## Budget policy (updated: R2 exception approved)

Use Cloudflare Workers Free and Neon Free. No Workers Paid, Containers, or paid processing. FFmpeg stays local. The user has now explicitly approved R2 Standard storage and its usage-based overage charges; this exception does not authorize other paid services.

R2 is a metered service with a free allowance. A new private Standard bucket, `plugg-private-media`, has been created with public access disabled. The existing public `plugg-media` bucket remains unchanged and must not receive masters, unreleased tracks, or private evidence. See `docs/r2-integration.md` for current migration status.

Official references checked 2026-10-31:
- https://developers.cloudflare.com/workers/platform/limits/ (Free: 10 ms CPU per invocation)
- https://developers.cloudflare.com/workers/runtime-apis/nodejs/
- https://developers.cloudflare.com/r2/pricing/ (usage above the allowance is billed)
- https://developers.cloudflare.com/workers/static-assets/binding/

## Implemented preparation

The standalone admin repo includes a Worker serving static SPA assets and forwarding approved API/media paths through a `PLUGG_BACKEND` service binding. It rejects cross-origin writes, forwards only the Plugg session cookie, preserves range responses, and disables API caching. Missing backend returns an explicit 503 rather than mock data or SPA HTML. No backend binding or production custom domain is configured yet.

Backend `PLUGG_AUDIO_PROCESSING=manual`:
- Does not start submission transcoding. Existing uploaded masters submitted in this mode remain pending in processing.
- Rejects retry before database changes and guards FFprobe/transcoding/replacement entry points.
- Exposes disabled retry controls in both admin frontends.
- Rejects all new uploads with 503 until private storage credentials and the authenticated upload workflow are ready.
- Does not weaken release approval checks or mark unvalidated audio complete.

Omit the variable, or set it to `local`, to preserve the current local app's processing. No local environment file has been changed. Only explicit `local` enables processing; other nonempty values fail closed. Use `PLUGG_SCHEDULER_ENABLED=false` for future Worker staging; its existing interval scheduler needs conversion to a scheduled handler before scheduled publication is enabled.

## Release blockers

1. **Authentication:** native bcrypt is used in login, registration, current-password checks and staff creation. It is not a portable Worker dependency. A synthetic local native bcrypt comparison measured about 55 ms CPU at cost 10 and 206 ms at cost 12. This is NOT a Cloudflare benchmark, but exceeds the Free 10 ms budget even before a JavaScript fallback. Do not lower password hashing strength. A compatible free authentication service or a separately hosted free Node backend needs selection and migration planning; swapping to bcryptjs alone is not a verified solution.
2. **Backend runtime:** local filesystem storage, Node FFmpeg imports, long-lived PostgreSQL connections and interval scheduling remain. A build is not proof that these run on Workers. Request-scoped DB access and runtime-level testing are required.
3. **Media:** private R2 storage is approved and the adapter is implemented. Scoped credentials and migration verification are complete: 96 objects, 146,926,139 bytes. The local processing synchronization workflow remains pending. New uploads stay disabled in manual/R2 mode until authentication and processing integration are ready.
4. **Public endpoint hardening:** the existing upload handler accepts ownerId from form data and lacks a session check. Before enabling cloud uploads, derive ownership from a verified session, validate category/size, rate-limit requests and fail atomically on metadata errors. Login also needs a brute-force limit before public exposure.
5. **Data migration completed:** Neon now contains 22 Plugg public tables and 337 records, verified against a consistent local backup. All nine neon_auth tables were preserved. Constraints, indexes, triggers, functions and five ID sequences were verified. Existing sessions and password-reset tokens were intentionally excluded. See `docs/neon-migration.md`. Local and cloud data are separate snapshots; reconcile later local changes before launch.

## Deployment order after blockers are resolved

1. Finish and locally test the selected free backend/auth/media arrangement.
2. Review changes since the verified 2026-11-01 database/media snapshots and plan a controlled final synchronization if needed. Do not rerun the initial database importer against the populated Neon schema.
3. Deploy backend staging with manual processing, uploads disabled and scheduler disabled. Verify login, every role, reauthentication, private media, and Worker CPU use with real staging data.
4. If the backend is a Worker, set the admin `PLUGG_BACKEND` service binding to it. If a separate Node host is selected, adapt and verify the gateway for that host first. Build admin with `VITE_PLUGG_SITE_URL=https://plugg.site`, then validate the workers.dev staging address.
5. Verify logout, session expiry, staff restrictions, API failures and mobile navigation.
6. Attach `admin.plugg.site` as a Cloudflare custom domain. Cloudflare creates its DNS record and certificate. Do not change apex/www until the main app deployment has passed its own checks.

The local FFmpeg path is retained, but a Neon/R2 download-process-upload operator pipeline has NOT been implemented or claimed ready. Do not point local processing at cloud records without also resolving the matching media storage and safe result publication.
