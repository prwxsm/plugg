# Plugg Admin design and role corrections

Completed 31 October 2026. This supersedes the Stage B report's staff-role assignment scope.

## Delivered

- A single light theme throughout `/admin`: white cards, light-gray backgrounds and borders, charcoal controls, restrained semantic status colors. Removed the theme switch and general yellow emphasis. Dialogs and browser autofill use the same light palette; the public application's theme is preserved.
- Matching sign-in, access-denied, session-expired, auth-check/loading and connection-error states in the admin gate. Existing Plugg password login is used; Google is not required. Invalid or expired sessions return the explicit expired state; missing sessions show sign-in.
- Exactly three administrative roles remain. Only Super Admin can create Admin/Moderator accounts, edit their name/username/email, assign existing users to these roles, change between those roles, or revoke access. All three operations enforce `staff.manage` and current-password verification on the server, with explicit confirmation and a required audit reason. Passwords are bcrypt-hashed and excluded from audit records. Email/username collisions are checked transactionally.
- The ordinary staff-management endpoint cannot grant Super Admin or modify any existing Super Admin. The existing database guard still prevents final-active-Super-Admin demotion, revocation and deletion. User deletion is also protected by membership references.
- Reusable `ProfileCard` with compact and full variants: initials/avatar fallback, name, handle, role, available email/phone, status, joined date and linked artist/verification details. Used for current-user sidebar and profile dialog, staff cards and user detail dialogs. Missing fields are omitted rather than invented.
- Real-data snapshots, permission-based redaction, review actions, audit history and existing music workflows remain in place. No schema change or live staff/content mutation was performed for this correction. Browser verification signed out and back in normally.

## Files added or updated for these corrections

- `src/components/admin/brand.tsx` — shared brand anchor and official-logo integration point.
- `src/components/admin/profile-card.tsx` — reusable profile display.
- `src/components/admin/admin.css` — light theme, responsive cards/forms and dialogs.
- `src/components/admin/admin-app.tsx` — auth states, navigation, current/user profile dialogs.
- `src/components/admin/model.ts` — profile DTO fields and session-expiry reason.
- `src/components/admin/operations.tsx` — staff profile cards.
- `src/components/admin/actions.tsx` — Super Admin creation/editing and lower-role forms.
- `src/components/ui/dialog.tsx` — optional overlay class; existing callers retain their styling.
- `src/server/admin-data.ts` — actual profile fields and expired-session response.
- `src/server/admin-operations.ts` — server-enforced lower-staff creation/editing and role restrictions.
- `scripts/test-admin-cutover.mjs` — hierarchy, account creation/editing, hashing, audit secrecy, uniqueness and final-Super-Admin regression checks.
- This report and a superseding note in `docs/admin-stage-b-implementation.md`.

## Verification

- TypeScript check and production build passed.
- Targeted ESLint: no errors; one existing effect-cleanup ref warning in `admin-app.tsx`.
- Isolated restored-database tests passed for roles, staff creation/editing, password confirmation/hash storage, collisions, protected Super Admin targets, final-active-Super-Admin database guards, audit secrecy, review/publication/media/retry safety and session/DTO redaction.
- Live read-only test passed: all 21 table fingerprints unchanged; 8 releases, 10 tracks, 7 artists and 12 non-seed users.
- Direct HTTP authorization and cross-site-write rejection tests passed.
- Browser review confirmed the light staff screen, creation form restricted to Admin/Moderator, and matching sign-in screen. The form was closed without submission.
- Test fixtures were confined to a temporary restored PostgreSQL instance and removed with it. Backup: `/home/prwxsm/.local/state/plugg/backups/2026-10-31T03-39-42-258Z/plugg.dump`.

## Official logo integrated

The supplied `/home/prwxsm/Pictures/plugg/logo.png` is copied unchanged to `public/admin/plugg-logo.png`. The shared `AdminBrand` displays the official white transparent mark on a small charcoal tile alongside the product name, in both the sidebar and all authentication states. The surrounding UI remains light. No logo items remain pending.
