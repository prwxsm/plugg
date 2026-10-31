# Plugg Admin Stage B — implementation report

> Staff-management scope and UI have since been updated: see [design and role corrections](admin-design-role-corrections.md). Super Admin creation/grants are not available through lower-staff management.

Implemented and verified on 30 October 2026. The existing `/admin` interface was extended; the public app and artist dashboard were not rebuilt. The owner explicitly selected the newly requested Plugg God account and approved the initial role migration.

## Current access

**Plugg God**, username `god`, email `god@plugg.com`, ID `067ed1fe-0f73-46c7-a00f-639f3ed6662d`, is the only active **Super Admin**. Login uses Plugg's existing password authentication, not Google. Its password is stored as a bcrypt hash and is not included in this report or source files.

All 13 pre-existing users have no administrative membership. All 14 legacy `users.is_admin` flags are false. Their listener/artist account types and existing sessions were preserved. Existing accounts now without staff access are Amani Kariuki (both the real artist and seed listener), Bad Boy, Big Boy, Big Mosh, King Bash, King Popii, Kofi Mensah, Mego Bhee, Nia Adebayo, xsm, and Zuri Mwangi (both the real listener and seed artist). The private backup account inventory contains their full IDs. Future registration has no staff access by default.

| Role | Allowed access |
| --- | --- |
| Super Admin | All implemented modules, operational actions, user directory, staff grants/revocation, audit history |
| Admin | Reviews, catalog, artists/verification, genres, scheduling, takedown/reinstatement, processing and analytics; no staff/security or restricted user/audit access |
| Moderator | Review overview, submitted releases, technical metadata, authorized preview audio, approval/corrections and review history |
| Ordinary user | Normal Plugg listener/artist features; no admin access |

`admin_memberships` is the sole role authority. Compatibility `User.isAdmin` is derived from active membership; the database boolean and legacy email allowlist are never consulted for authorization. Server snapshots redact user/security data for non-Super-Admins and restrict moderators to review records. UI navigation and direct-route guards mirror this scope.

## Migration, backup and rollback

Applied `db/migrations/001-admin-rbac.sql` in one transaction, using the exact owner-approved account ID as a transaction-local parameter. It created memberships, durable audit records, rollback metadata, final-Super-Admin safeguards and append-only audit triggers. It granted only Plugg God access and recorded `staff.bootstrap`. No catalog migration or replacement database was introduced.

Verified pre-migration backup:
`/home/prwxsm/.local/state/plugg/backups/2026-10-30T09-44-59-535Z/plugg.dump`

Subsequent verified backup including the role schema:
`/home/prwxsm/.local/state/plugg/backups/2026-10-30T14-15-30-298Z/plugg.dump`

Each backup directory contains `verification.json` with the dump SHA-256 and table fingerprints, plus a private account inventory. Dumps were restored with `pg_restore --exit-on-error` into independently initialized, private, socket-only temporary PostgreSQL instances. All source/restore fingerprints matched; temporary clusters were then removed. Backup directories are mode 0700 and files 0600, outside Git. Dumps contain sensitive credentials/session data. External audio/artwork files and PostgreSQL global roles are not included.

The guarded rollback script is only for the initial bootstrap before subsequent membership/audit changes. Stop the app and use a transaction. It restores prior legacy flags, which would restore the unsafe all-admin state; never reopen legacy admin to the network after rollback. After operational writes begin, preserve audit history and use a reviewed forward repair. Full restore requires separate disaster-recovery assessment of intervening data. No live rollback was performed.

## Implemented operations

- **Review approval:** active-role authorization, release row locking, under-review status validation, completed processing and stored variants for every track, real calendar-date validation, and future midnight Africa/Kampala scheduling. Duplicate concurrent approvals produce one success. Expired dates require a new future date.
- **Corrections:** mandatory written feedback, validated status transition, retained/normalized review history and artist resubmission support. Resubmission is transactional, ownership-checked, restricted to draft/correction states, and rejects taken-down releases.
- **Scheduling:** authorized rescheduling only for approved scheduled releases with completed processing. All dates use Kampala midnight. Public GET loaders no longer publish content.
- **Publication worker:** `publication-worker.ts` checks every 30 seconds while the initialized local Node backend is running; `.env` enables it with `PLUGG_SCHEDULER_ENABLED=true`. It transitions only eligible scheduled releases and their own tracks, excludes takedowns, checks review attribution and completed audio, and uses the same transaction lock as admin writes. `node scripts/publish-scheduled.mjs` is the separate trusted-server entry point. This command performs real due publication; it is not a test. Keep the backend running for automatic publication; a stopped backend cannot publish at midnight and publishes eligible overdue releases on its next poll.
- **Artists:** platform verification/revocation and permitted name, biography and location edits. The UI explicitly states that recording verification does not perform an identity check.
- **Genres:** create/edit/artwork updates and deletion of unused genres. Name/slug uniqueness is validated. Referenced names/slugs cannot be renamed or deleted; track, primary-genre and additional-genre references are checked while relevant tables are locked.
- **Takedowns:** required reason and explicit confirmation; tracks become unpublished and the release becomes an unscheduled draft. The durable takedown event also blocks the scheduler. Reinstatement is authorized and returns content to review without immediately publishing it.
- **Processing:** authorized failed-track retries reuse the existing transcoder. A transactional claim prevents duplicate concurrent retries. Track results and administrative audit records commit together. Existing artist retries are ownership-checked and use the same claim mechanism. Real file transcoding is unchanged; the processor gained an optional persistence switch so the administrative wrapper can atomically persist its results and audit event.
- **Staff:** Super Admin-only grants, role changes and revocation for existing non-seed password-bearing accounts. The dialog requires current-password verification, target confirmation and a reason. Self-role changes are blocked; final active Super Admin removal/deactivation is blocked by the database as well. Active and revoked memberships and durable audit history appear in Staff & Access. No password-reset shortcut was added.

Actions are exposed through the existing module pages using a shared confirmation dialog, validation, busy/error states, success feedback and data refresh. Existing dark/light visual styling is retained. No live artist submission or ordinary account was mutated to test these controls.

## Server implementation and security

- `admin-rbac.ts`: `requireAdminSession`, `requireRole`, `requirePermission` and role/permission matrix.
- `admin-data.ts` / `getAdminSnapshot`: authenticated read-only snapshot and role-specific DTOs; private/no-store responses.
- `admin-review.ts`: shared transactional review implementation. Existing `approveReleaseFn` and `requestChangesReleaseFn` delegate to it, so independent calls cannot bypass authorization.
- `admin-operations.ts` / `performAdminOperation`: strict input validation and authorized artist, genre, scheduling, takedown/reinstatement and staff changes.
- `admin-retry.ts` / `retryAdminAudio`: guarded retries; the artist-facing `retryTrackProcessingFn` delegates with an explicit owner check.
- `publication.ts`: controlled publisher, independent of public reads.
- `media-access.ts`: published tracks remain publicly streamable; unreleased audio requires ownership or appropriate review/operational permission. Both stream and file audio routes enforce access. Audio uses private/no-store caching; path traversal and arbitrary variant names are rejected. General file responses also have nosniff and sandbox CSP headers.

POST server functions retain the existing origin/CSRF middleware. SQL is parameterized. Administrative mutations take a transaction advisory lock before permission and target reads; entity rows are locked where appropriate. Role revocation and concurrent operations therefore cannot race through stale authorization checks. Database credentials stay in the server environment. No public hosting or external tunnel was provisioned; the dev server is loopback-only on `127.0.0.1:3000`.

The insecure password-recovery endpoints that disclosed reset codes are disabled pending verified out-of-band delivery. Existing sign-in and authenticated password changes remain available. A separate existing cross-owner deletion defect was fixed: release ownership is now checked before deleting related playlist/play/file records.

## Audit logging

Successful administrative writes and their audit entries commit in the same transaction. Events record actor ID, role at action time, action, target type/ID, timestamp, reason/feedback when relevant, safe before/after fields and result. Processing has a claimed-job event and a separate transactional success/failure result event. The bootstrap is also recorded.

Audit UPDATE/DELETE/TRUNCATE is rejected; there is no application editing endpoint. Audit access is Super Admin-only. Passwords, session tokens, database credentials and raw submitted password fields are excluded from audit payloads. Anonymous denials and validation failures are rejected but are not persisted as administrative audit events. A database owner can still alter schema; this is not tamper-proof external security logging.

## Verification

Passed TypeScript, production build, targeted lint for the new services and action UI, and automated tests:

- `node scripts/prepare-admin-stage-b.mjs --test-runtime`: fresh backup/restore verification and all destructive/write tests against synthetic fixtures in the disposable copy. Covers role/DTO restrictions, invalid/expired/ordinary sessions, review transitions, invalid dates/audio, concurrent duplicate approvals, correction feedback, audited writes, schedule/takedown/reinstatement safety, media access, artist edits, genre reference checks, staff password confirmation, self-lockout prevention, immediate revocation, and concurrent retry prevention. Retry tests inject a processor; they do not transcode real artist files.
- The original migration/rollback tests verified single-account bootstrap, final Super Admin protection, append-only audit and guarded rollback before live migration. `--test-migration` expects a pre-migration source; use `--test-runtime` after cutover.
- `node scripts/test-admin-http.mjs`: direct read/write endpoints deny missing authentication and reject cross-site requests, using nonexistent targets.
- `node scripts/test-admin.mjs --database`: existing-session reads, SQL-count parity and unchanged fingerprints across all 21 current tables.
- Live preservation check: all 16 original non-user/session content and analytics tables exactly matched the pre-migration backup. Only approved account/role setup and normal sign-in session creation occurred on live data. One live administrative audit event exists: the bootstrap.
- Browser: normal Plugg God sign-in succeeded, Staff & Access showed the sole active Super Admin, the role dialog exposed current-password/reason/confirmation requirements, and no actual role/content change was submitted.
- Public HTTP smoke checks: homepage 200, nine published real audio URLs readable, one unreleased real audio URL blocked without authentication. These requests do not record plays.

Repository-wide lint was run; it reports 533 errors and 26 warnings, primarily pre-existing formatting/type/style findings outside the new services, including the user's dashboard work. No claim is made that the entire repository is lint-clean. Existing upload/listener flows were inspected and the public homepage/media checked; a complete interactive regression of every unrelated workflow and real FFmpeg job was not performed.

## Remaining limits / not ready for public production

- No featured-artist or genre-order schema exists; those optional features remain unavailable rather than conflating featured status with verification. No undefined platform/security settings were invented.
- Password recovery needs a verified delivery provider, rate limiting and a reviewed recovery flow before re-enabling.
- Last-login tracking, KYC records, IP-based fraud analysis and transcoding throughput/latency history remain unavailable where source data is absent.
- Retry claims are durable track states, not a crash-recoverable job queue. A backend crash during processing can leave a track marked processing; investigate before recovery rather than launching overlapping jobs.
- The local publication worker requires the backend process to stay up. A production deployment needs a supervised Node process or external scheduler using the controlled publisher.
- Entity snapshots are bounded at 2,000 rows and audit display at 200 events. Large installations need server pagination and audit search/export.
- Stored historical release-date/go-live discrepancies are reported, not bulk-repaired. Existing public metadata exposure and unrelated application endpoints have not undergone a full security audit.
- No public deployment, commit, or push was performed. The app remains local while these operational limitations are reviewed.
