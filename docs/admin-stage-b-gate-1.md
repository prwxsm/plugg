> Historical preparation report. The approved migration and current implementation are documented in [the Stage B report](admin-stage-b-implementation.md).

# Stage B — Gate 1 preparation and approval checkpoint

Status: **prepared and tested on a disposable restored copy; not activated on the existing database**. The project owner has not yet selected or approved the first Super Admin. Gates 2–4 have not started. No live privileges, user records, submissions, sessions, or schema were changed by this preparation.

## Verified backup

Latest successful backup: `/home/prwxsm/.local/state/plugg/backups/2026-10-30T09-33-26-541Z/plugg.dump`.

The adjacent `verification.json` contains the dump SHA-256 and per-table row counts/checksums. `accounts.json` contains the reviewed account inventory. These are private local files outside the repository (directory mode 0700, files 0600). The backup contains credentials and session data and must not be committed or shared publicly. PostgreSQL 18.6 `pg_dump` used an exported read-only snapshot. The dump was restored with `pg_restore --exit-on-error` into an independently initialized, socket-only PostgreSQL cluster in a private temporary directory; all 18 table fingerprints matched. That temporary cluster was stopped and removed. External audio/artwork storage and PostgreSQL global roles are not included in this database dump.

`node scripts/prepare-admin-stage-b.mjs --test-migration` reproduces the backup, isolated restore, and staged migration tests. It does not migrate the source database. Test accounts exist only in the disposable restored copy.

## Approval plan

1. Owner selects one of the 11 existing non-seed accounts with a password and explicitly approves bootstrap. No identity is inferred from an email allowlist. The two seed accounts are excluded from initial bootstrap eligibility.
2. Keep the application loopback-only, stop it for coordinated cutover, and take a fresh verified backup immediately before migration. The dev server is already bound to `127.0.0.1:3000` rather than all interfaces.
3. In one transaction, lock users, validate the exact approved ID, create the membership/audit schema, save previous legacy flags, grant **only** that account `super_admin`, set every legacy `users.is_admin` flag to false, and write the bootstrap audit event. No other account receives staff membership. Sessions and artist/listener account types are retained.
4. Before restarting, replace the old email/boolean authorization in auth, the admin reader, and existing review endpoints with the new membership authority. Derive any compatibility `User.isAdmin` value from membership only. Do not consult the stored legacy flag. Restrict moderator responses at the server DTO level, not only navigation. Gate legacy writes until their operations pass subsequent gates.
5. Address the reset-code disclosure and retry ownership issues described below, then verify direct endpoint denial, role-based data access, and normal artist/listener sessions on the isolated copy. Gate 1 is not complete until the coordinated runtime cutover and these checks pass.
6. Only then begin Gate 2 review writes, followed by Gate 3 content/artist/genre operations and Gate 4 staff UI/integrations. Actual live test mutations require separate explicit authorization; destructive tests remain isolated.

The SQL does not embed a selected account. Its caller must set transaction-local `plugg.bootstrap_user_id` to the approved ID. There is deliberately no live migration command wired to package scripts or application startup.

## Prepared schema and authorization

- `db/migrations/001-admin-rbac.sql`: explicit `admin_memberships` with one membership per existing user, constrained roles, active status, and timestamps; `admin_audit_log`; bootstrap rollback metadata.
- `src/server/admin-rbac.ts`: typed permission matrix, `requireAdminSession`, `requireRole`, `requirePermission`. Missing/expired sessions and inactive/missing membership fail closed. There is no boolean/email fallback. This staged module is **not imported by live endpoints yet**.
- `super_admin`: review, catalog, analytics, artists, genres, scheduling, takedown, processing, users, staff, audit and settings permissions.
- `admin`: review and operational permissions; no staff/security settings or restricted user/audit access.
- `moderator`: review read/write only. No administrative role is the default for everyone else.
- Final active Super Admin demotion/deactivation/deletion is rejected; membership truncation is prohibited. Membership identities cannot be reassigned. Staff-user deletion is restricted by foreign keys; any future account-deletion workflow must handle staff revocation first and retain historical identities.
- Application role-change operations must acquire advisory transaction lock `(734821, 1)` **before** permission/target reads under READ COMMITTED, require current-password confirmation/recent authentication, protect self-lockout, and write an audit entry in the same transaction. These endpoints are not yet implemented or exposed. The database trigger is defense in depth, not a substitute for endpoint authorization.
- Audit records include actor ID/role, action, target type/ID, time, reason, before/after JSON and result. UPDATE/DELETE/TRUNCATE are rejected. The bootstrap writes one success record transactionally. Future operation handlers must whitelist audit payload fields and never include credentials. Database owners can still alter/drop schema; this is not tamper-proof external logging.

## Rollback

`db/migrations/001-admin-rbac.rollback.sql` is an emergency **pre-activation** rollback, run transactionally with the application stopped. It restores the previous legacy flags and removes only newly introduced tables/functions. It refuses rollback when additional membership/audit changes exist. Tests verified flag restoration and rejection after subsequent changes.

Restoring the previous flags reintroduces the unsafe all-admin state, so do not reopen the legacy admin UI to network access. After staff/content operations begin, preserve audit records and use a reviewed forward repair. A full dump restore is disaster recovery, not a normal downgrade; restore to a separate database and assess intervening changes before any replacement. No live rollback or restore was performed.

## Existing security findings and remaining work

- Confirmed **all 13 users have `is_admin=true`**, including all 11 non-seed users. Their live access is unchanged pending explicit approval.
- `src/lib/auth.ts:getUserFromSession` and `src/server-fns/data-functions.ts:approveReleaseFn/requestChangesReleaseFn` use the legacy email allowlist. These must be replaced during coordinated cutover. Admin read permissions currently use the persisted boolean.
- `requestPasswordResetCodeFn` returns the reset code to the requester. A privileged account would be vulnerable to takeover unless reset delivery is secured or the insecure reset flow is disabled pending verified delivery. This must be fixed before Gate 1 is declared secure.
- `retryTrackProcessingFn` requires login but does not check track ownership or administrative permission. Preserve legitimate artist retries while restricting cross-account retries.
- The normal `getInitialData` loader publishes scheduled releases and sets unpublished tracks true for published releases. Takedowns must not be enabled before publication state transitions are made safe. Independent scheduled publication remains a later controlled improvement.
- `/api/file` and `/api/stream` do not currently authorize unreleased media. Preserve public streaming while adding owner/reviewer access checks in the later media integration.
- CSRF middleware is present for server functions. New mutation handlers still need strict runtime input validation, permission checks within their transactions, conflict protection, and explicit sensitive-action confirmation.
- Existing Stage A admin remains read-only. No new write endpoint, staff UI action, review approval, takedown, artist edit, genre edit, retry or scheduling action was activated.

## Verification and limits

Passed isolated restore and staged migration tests: missing bootstrap rejection; exactly one initial member; all legacy flags cleared in the copy; ordinary-user denial; moderator/admin staff denial; Super Admin staff permission; invalid/expired session denial; no legacy-flag bypass; final Super Admin protection; audit immutability; guarded rollback; original flags restored after rollback. TypeScript and production build pass.

Repository-wide lint was run and reports 628 findings (602 errors, 26 warnings) across existing code, mostly formatting and existing type/style issues. New Stage B files are checked separately. No bulk formatting or fixes were applied to unrelated code or the user's dashboard edits.

These are staged authorization/database tests, not claims that live endpoints enforce RBAC already. Direct endpoint, authenticated UI, concurrent staff-change, review-transition, takedown, audit-operation and listener/upload regression tests remain required as their implementations proceed. Existing real records were read/backed up only. The first Super Admin selection and explicit migration-plan approval are the next required inputs.
