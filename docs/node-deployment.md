# Node deployment preparation

Status: prepared and locally smoke-tested on 2026-11-01; not deployed.

## Build and runtime

- Install: `npm ci`
- Build: `npm run build:node`
- Start: `npm start`
- Node: use a supported Node 22 release (22.12 or newer).
- The Node build uses Nitro's `node-server` preset and emits `.output/server/index.mjs`. The original build command remains available for the existing Lovable workflow.
- Bind to `0.0.0.0` and use the host-provided `PORT` in deployment.

## Server-side configuration

Set `DATABASE_URL` to the existing Neon connection held in the protected local `.env.neon` file. Supply the four R2 settings from protected `.env.r2` as server secrets. Do not place either file or their values in Git or frontend build variables.

Set:

- `NODE_ENV=production`
- `HOST=0.0.0.0`
- `STORAGE_PROVIDER=r2`
- `PLUGG_AUDIO_PROCESSING=manual`
- `PLUGG_SCHEDULER_ENABLED=false`
- `PLUGG_ADMIN_ORIGINS` to the exact verified admin staging origin, adding `https://admin.plugg.site` when configured.

Cloud uploads and FFmpeg processing remain disabled. Existing uploaded content is available through the backend's authorized media endpoints.

## Verification completed

The Node build succeeded. The compiled production server was run on loopback port 3099 with existing Neon/R2 configuration. The homepage returned HTTP 200 and rendered HTML; an anonymous admin snapshot returned the signed-out response. No login, registration, or administrative write was executed during this smoke test. The local application's environment was unchanged.

## Remaining before public launch

1. Confirm the free Node host and sign in. Render Free is a candidate; keep its account without a payment method to avoid metered overages. Its idle sleep makes it suitable for an initial preview rather than an always-on service.
2. Add login abuse limits and verify authentication, authorization and private media behavior for the public deployment.
3. Adapt the standalone admin gateway to the selected HTTPS backend origin; its current service binding expects a Worker.
4. Deploy tested source and supply runtime secrets, then verify the generated staging URLs before changing DNS.
5. Attach the admin domain and move the main-site DNS only after successful staging verification. Preserve existing mail and unrelated DNS records.

The database and media copies are snapshots. Reconcile later local changes deliberately before launch; do not rerun the initial database restore against the populated Neon schema.

## Render deployment — 2026-11-02

Created the Free Node web service `plugg` in Frankfurt, service ID `srv-dbk4oh8473hc73fkbk40`, using `codex/render-deployment`. Server credentials were added with the user's explicit approval. Automatic deployment is off. Main-site and admin custom DNS remain unchanged.

Public URL: https://plugg-92h9.onrender.com

The initial deployment started but logged a release query schema mismatch. Commit `fc3f05f` fixes the nonexistent rights-declaration boolean and user-ID column names to match the migrated schema; no schema changes were run. It also removes sample catalog fallbacks and surfaces initial-data failures. TypeScript, Node build and the corrected read-only release query passed locally. Render deployment `dep-dbk4vamtlv9c73ertf50` reports Live, with startup listening on port 10000 and no repeated database error in the visible startup logs.

Public HTTP verification remains pending: the external hostname returned DNS resolution errors from both the local HTTP client and in-app browser at verification time. Do not treat Render's Live status alone as full application verification.

Security follow-up: a browser diagnostic response inadvertently included cloud credentials. Rotate the Neon database password and scoped R2 credential, update the protected local files and Render runtime settings, and verify access before connecting production domains. Do not copy secret values into documentation or chat.

The standalone admin HTTPS gateway has been prepared locally and all six gateway tests passed; its production build passed. It has not yet been deployed to Cloudflare.
