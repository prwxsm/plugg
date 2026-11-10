# Cloud uploads and local processing

Artists submit originals to the existing private R2 bucket through authenticated `/api/upload`.
No paid worker, new database, or public bucket is required. Render does not run FFmpeg.

## Limits and safeguards

- Audio: 50 MiB/file, WAV, FLAC or MP3 matching the existing audio requirements.
- Artwork/profile images: 5 MiB, PNG/JPEG/WebP signatures; filenames and MIME claims are not trusted.
- One concurrent multipart upload per server process. Bodies are bounded even without Content-Length.
- Rolling 24-hour limits: 250 MiB and 30 files per account; 1 GiB across the service. These are application limits, not a guarantee against R2 billing.
- Server session determines ownership. Same-origin requests only; audio/covers require an artist account.
- Database quota checks are serialized. Storage/DB failures return an error; partial new objects are cleaned up where possible.
- A release can only reference its user's recorded uploads from the active provider. Hashes come from the server record.
- Nothing becomes public merely by uploading. Submissions remain `processing/pending`, and approval still requires completed variants and no rights hold.
- The upload form waits for persistence before showing success. Submitted dates are requests, not guaranteed publication times.

No schema migration is needed. Existing Render R2 variables remain in use.

## Operator workflow

On the trusted local machine, use Node 22.18+ or Node 24, npm dependencies, FFmpeg and FFprobe.
Keep `.env.neon` and `.env.r2` private (0600, Git-ignored). These files must contain the existing production configuration.

List the real queue without changing records:

```sh
node --env-file=.env.neon --env-file=.env.r2 --experimental-strip-types scripts/process-cloud-release.mjs
```

Copy the release ID from the queue. Use your existing staff **user ID**, not an email address, and run:

```sh
node --env-file=.env.neon --env-file=.env.r2 --experimental-strip-types scripts/process-cloud-release.mjs --release RELEASE_ID --staff STAFF_USER_ID --apply
```

Only an active Super Admin or Admin is accepted. This is a trusted database operator tool, not a public API: possession of the database credentials already grants database access. Do not distribute it with credentials to artists or moderators.

The command locks the release, checks original hashes, runs local validation/transcoding in a temporary workspace, writes unique variant keys to R2, downloads them to verify hashes, and records processing results in the administrative audit log. Temporary files are removed. Original R2 uploads remain intact.

Completed tracks use a prepared playback variant. The release moves to `under_review`; **it is never approved or published by this command**. Failed technical validation also reaches review with a failed processing flag, so staff can give the artist feedback; approval remains blocked. Infrastructure errors roll back database updates. Retry the command after correcting the problem. A crash can leave unreferenced R2 variants; do not blindly delete bucket objects.

Open Admin → Audio Processing to inspect pending/failed tracks. After processing, use Review Queue to approve with a future date or request changes. Artist replacement uploads return an unpublished release to processing; published/scheduled recordings cannot be replaced through this flow.

The automatic publication scheduler remains disabled on the free deployment. Continue using the existing authorized publication operation, or run the documented scheduled-publication command when approved releases are due. This change does not promise unattended publishing while the operator machine is off.

## Verification

- `node --env-file=.env --experimental-strip-types scripts/test-cloud-uploads.mjs` — isolated temporary database tables, always rolled back.
- `node --env-file=.env --experimental-strip-types scripts/test-local-cloud-processing.mjs` — real two-second FFmpeg fixture, no database mutations.
- `node --experimental-strip-types --test scripts/test-r2-storage.mjs`
- `npx tsc --noEmit` and `npm run build:node`.

The production acceptance test is one real artist submission, local processing, and staff review. Do not auto-accept copyright declarations or publish test recordings on behalf of an artist.
