# Artist verification review

Badge applications appear in Admin → Review Queue → Artist verifications. The sidebar count includes pending releases and pending badge applications. Pending badge applications appear before previously reviewed applications.

Admins and Super Admins can approve, request more information, or decline. Moderators can read the queue but cannot decide badge applications. Decisions require an audit reason; requests for more information and declines also require nonempty artist feedback. The artist sees this feedback in their verification application and an in-app notification after their data refreshes. Email delivery is not configured.

Only pending applications can be reviewed. A request for more information or rejection can be updated and resubmitted by its artist. Approval updates the application's status and artist badge within the same transaction. Audit entries retain the decision and feedback. Repeat decisions are rejected, and each review timestamp produces a separate notification.

Submission validates actual booleans, email, length limits, and HTTP(S) supporting links without embedded credentials. Submission and administrative decisions use the existing transaction advisory lock. A partial unique index also prevents multiple pending applications per artist.

## Validation

- `node --experimental-strip-types scripts/test-verification.mjs`: local PostgreSQL lifecycle test with temporary tables and transaction rollback; covers validation, duplicates, permission denial, required feedback, resubmission, badges, stale decisions, and audit entries.
- `node --experimental-strip-types scripts/test-admin.mjs`
- `npx tsc --noEmit`
- `npm run build:node`
- In the standalone admin repository: `npm run build` and `node --test tests/worker.test.mjs`.

## Deployment order

1. Apply `db/migrations/014_artist_verification_applications.sql` to the existing Neon database in a transaction before publishing the backend. This is additive and must not replace existing artist or user data. If pending duplicates already exist, resolve them deliberately before adding the unique index.
2. Deploy the main application's `codex/render-deployment` branch to the existing Render service.
3. Deploy the standalone admin build to the existing Cloudflare Worker.
4. Verify the authenticated Review Queue and artist application views. Do not approve/reject real applications merely as a deployment test.

The main app and standalone admin source both contain the review UI. Their API import paths differ; preserve the standalone API gateway when updating shared components.
