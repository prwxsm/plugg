> Historical preparation report. The approved migration and current implementation are documented in [the Stage B report](admin-stage-b-implementation.md).

# Plugg Admin: read-only integration

Verified 30 October 2026. Stage A uses the main application's existing server-side PostgreSQL client. The independent admin shell lives at `/admin`; it is not a separate database or deployment.

## Run and configuration

Run `npm run dev -- --host 0.0.0.0 --port 3000` and open `http://localhost:3000/admin`. Sign in with an existing Plugg account whose persisted `users.is_admin` is true. The server is reachable on port 3000 through the machine's network address where the local firewall permits; no public hosting or tunnel was provisioned.

The gitignored `.env` supplies `DATABASE_URL`, `SESSION_SECRET`, `STORAGE_DIR`, and `STORAGE_PROVIDER`. Credentials stay on the server. The previous hardcoded database connection fallback was removed; `DATABASE_URL` is required. Never copy credentials into Vite public environment variables or frontend code.

DBeaver's native and Flatpak connection configurations both identify PostgreSQL at `localhost:5432`, database `plugg`. The existing backend reaches this same local PostgreSQL 18.6 instance (IPv6 loopback). DBeaver is a database client, not the database host. No replacement database, migration, role grant, or data repair was executed.

## Data and relationships

The public schema has 18 tables: users, sessions, password_resets, artists, releases, tracks, release_tracks, genres, files, plays, likes, follows, playlists, playlist_tracks, artist_analytics, analytics_timeline, analytics_recent_plays, and analytics_release_performance.

Sessions join users through user_id; users may reference artists; releases and tracks reference artists; tracks reference releases and release_tracks supplies ordering. Plays reference tracks; files reference their owning users. Playlist membership connects playlists and tracks. Existing analytics tables contain stored aggregates, distinct from recorded play events.

At verification, non-seed data comprised **8 releases, 10 tracks, 7 artists, 11 users and 6 genres**. Database totals include seed records: 19 releases, 38 tracks, 15 artists and 13 users. Admin entity lists exclude rows flagged `is_mock`; genuine uploads belonging to a seeded artist remain visible. For example, the real release “Damn” remains visible with its existing artist attribution. No fictional replacement is supplied.

“Mine” (PLG-2026-000038) supplies genuine review and audio metadata: WAV, 48 kHz, 16-bit stereo, seven stored variants. Some JSONB fields contain encoded JSON strings; these are normalized in memory without updating the database. Stored release-date/go-live discrepancies are surfaced rather than silently repaired. SLA and schedule displays use Africa/Kampala and the database clock.

## Connected pages

| Page | Existing data used |
| --- | --- |
| Overview | release/track/artist/user totals, review SLA, schedule and processing counts, plays |
| Review queue | releases under review, tracks, artist attribution, technical metadata and review_history |
| Scheduled | scheduled releases and stored publication dates, overdue/mismatch indicators |
| Catalog | actual releases and tracks, artwork, audio URLs and processing metadata |
| Artists | non-seed artists, verification and stored artist metadata |
| Genres | genres and related artist/track counts |
| Users | non-seed users, persisted admin flag and linked artist |
| Processing | track processing state and variant metadata; owned-file category/status totals |
| Telemetry | latest 100 recorded plays and pseudonymized playback session labels |
| Analytics | seven-day recorded-play chart, stored track counters and qualified plays today |
| Staff | persisted administrator flags and explicit missing-capability states |

Entity lists are bounded at 2,000 rows; aggregate counts are computed independently over all matching records. This is a bounded snapshot, not full server-side pagination. Search and filters operate on the loaded snapshot. Optional polling refreshes every 30 seconds. Empty, loading, access-denied and database-unavailable states contain no fixtures. Missing artwork uses a neutral placeholder. Audio previews use actual stored media URLs and never call the play-count endpoint.

## Read-only and authentication boundaries

`getAdminSnapshot` reads the existing HttpOnly `plugg_session` cookie server-side. Every read joins sessions/users, checks expiry, and requires the strict persisted boolean `is_admin === true`. It accepts no client-supplied user or role. Responses use `Cache-Control: private, no-store`. Queries use the existing parameterized SQL client in a repeatable-read, read-only transaction with a 10-second statement timeout. Explicit DTOs omit password hashes, authentication tokens, raw storage keys and connection details. Database failures produce an unavailable state with no fallback data; server logs retain the database error code.

The admin root bypasses the normal `getInitialData` loader because that legacy loader can publish scheduled records using UPDATE statements. Existing listener/artist routes, uploads, player and dashboard remain in place. Admin sign-in/out uses existing authentication functions; these normal, user-triggered authentication actions manage sessions. Administrative write buttons remain disabled and do not call mutation functions.

## Findings to resolve before Stage B

- **All 13 existing user rows currently have `is_admin=true`, including all 11 non-seed users.** The strict guard therefore admits all those accounts when they have valid sessions. No privileges were changed. Review intended staff membership before exposing this interface beyond the trusted local environment.
- Legacy authentication/review code elsewhere still has an email allowlist. The new reader does not rely on it. Unify authorization before enabling writes.
- Existing `/api/file` and `/api/stream` handlers are not authenticated. The admin reuses existing media URLs; media authorization needs a separate review.
- There is no granular staff-role model, immutable global administrative audit log, last-login field, KYC request store, or featured-artist flag. These are explicitly unavailable; no fields or tables were invented.
- No transcoding completion timestamps or durable job history exist for throughput/latency calculations. Current states and stored variants are available.
- All 88 existing play rows lack IP addresses. Short/repeated plays rejected by the play endpoint are not stored, so skipped-play rates, bot pass rates and stream-farm conclusions cannot be calculated reliably. No fraud labels are fabricated.
- Stored schedule timestamps disagree with release-date midnight for some records. Approval, rescheduling, feedback, retries, takedowns, genre edits and privilege changes require hardened transitions, validation and durable auditing before activation.

## Verification

Passed `npx tsc --noEmit`, `npm run build`, and `node scripts/test-admin.mjs --database` (Node 24). Tests cover JSON normalization, Kampala midnight conversion, missing SLA timestamps, safe media URLs, strict role checks, missing/invalid/expired session denial, authorized reads through an existing session, count parity with independent SQL, real audio metadata, and credential-free DTOs. Fingerprints of **all 18 tables remained identical before and after the integration test**. No sessions were created by tests.

The browser showed the real signed-out login gate and did not reveal administrative records before authentication. Authenticated rendering still needs a user sign-in in the browser; authorized server reads were verified independently without installing session cookies or changing accounts. There are no existing non-admin users to exercise a real database-backed denied-role session without mutation; strict false/missing/string/numeric role rejection is covered by unit checks.

The ordinary application loader was deliberately not invoked during read-only database verification because of its existing publication side effects. Existing dashboard work was preserved. This report does not claim a complete regression test of unrelated listener/upload workflows.
