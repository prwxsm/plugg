# PLUGG — Evidence-Based Administrator System Audit (Document A)

> **Document Type:** Document A — Verified Technical Audit  
> **Target:** Plugg Music Streaming Platform (`/home/prwxsm/Projects/plugg`)  
> **Audit Date:** 29 October 2026  
> **Core Server/DB Environment:** PostgreSQL (Neon / Cloudflare / Local), TanStack Start (Nitro/Node.js), FFmpeg

---

## 1. Executive Summary & Verification Matrix

This audit reviews every administrative capability identified in previous specifications against the live codebase. Features are classified by their actual implementation state:
- **Fully Implemented:** Active in database, backend, and server functions.
- **Partially Implemented:** Active in schema or business logic, but missing administrative management endpoints or automated triggers.
- **Proposed / Missing:** Desired for platform governance, but not currently supported by schema, backend APIs, or server functions.

### Implementation Status Matrix

| Administrative Feature | Implementation Status | Existing DB Tables & Columns | Existing File References & Server Functions | Automated vs. Admin Required |
| :--- | :--- | :--- | :--- | :--- |
| **Track Review & SLA Queue** | **Fully Implemented** (Backend) | `releases` (`status`, `review_submitted_at`, `reviewed_at`, `reviewer_id`, `review_feedback`, `review_history`, `go_live_at`, `release_date`), `tracks` (`technical_validation`, `audio_variants`, `audio_processing_status`) | [`src/server-fns/data-functions.ts`](file:///home/prwxsm/Projects/plugg/src/server-fns/data-functions.ts#L911-L1075) (`approveReleaseFn`, `requestChangesReleaseFn`) | **Admin Action Required**: Staff must review lossless audio, inspect technical specs, and approve or write change requests. |
| **Audio Transcoder & Quality Pipeline** | **Fully Implemented** | `tracks.audio_processing_status`, `tracks.audio_variants`, `tracks.technical_validation` | [`src/server/audio-processor.ts`](file:///home/prwxsm/Projects/plugg/src/server/audio-processor.ts#L20-L150), [`src/lib/audio-validation.ts`](file:///home/prwxsm/Projects/plugg/src/lib/audio-validation.ts#L1-L150), [`retryTrackProcessingFn`](file:///home/prwxsm/Projects/plugg/src/server-fns/data-functions.ts#L1133) | **Automated Backend**: Transcoding into 4 streaming (Opus 64k/96k/160k, AAC 256k) and 3 download (AAC 96k/160k/256k) variants runs on upload. Admin only triggers manual retry on failed jobs. |
| **Midnight Kampala Release Scheduler** | **Partially Implemented** | `releases.go_live_at`, `releases.status`, `releases.release_date`, `tracks.published` | [`src/lib/plugg.ts`](file:///home/prwxsm/Projects/plugg/src/lib/plugg.ts#L42) (`goLiveAt`), [`src/server-fns/data-functions.ts`](file:///home/prwxsm/Projects/plugg/src/server-fns/data-functions.ts#L168-L184) | **Automated Backend (Passive)**: Transitions `scheduled` $\rightarrow$ `published` when `getInitialData` runs. No standalone daemon/cron currently exists. |
| **Plugg Track ID (`PLG-YYYY-XXXXXX`)** | **Fully Implemented** | `tracks.plugg_track_id`, sequence `plugg_track_id_seq` | [`db/migrations/011_add_plugg_track_id.sql`](file:///home/prwxsm/Projects/plugg/db/migrations/011_add_plugg_track_id.sql), [`src/server-fns/data-functions.ts`](file:///home/prwxsm/Projects/plugg/src/server-fns/data-functions.ts#L831) | **Automated Backend**: Sequentially generated on track creation. Admin reads/searches only. |
| **Artist Verification Badge** | **Partially Implemented** | `artists.verified` (BOOLEAN DEFAULT FALSE) | [`db/schema.sql`](file:///home/prwxsm/Projects/plugg/db/schema.sql#L46), [`src/server-fns/data-functions.ts`](file:///home/prwxsm/Projects/plugg/src/server-fns/data-functions.ts#L78) | **Admin Action Required**: Column exists and displays on UI, but **NO mutation endpoint exists**. Currently requires manual SQL `UPDATE artists SET verified = true`. |
| **Featured Artist Spotlight** | **Missing in DB** | *None* (Exists only in TS type [`src/data/types.ts`](file:///home/prwxsm/Projects/plugg/src/data/types.ts#L23) and mock seed data) | [`src/routes/index.tsx`](file:///home/prwxsm/Projects/plugg/src/routes/index.tsx#L57-L67), [`src/components/plugg/app-shell.tsx`](file:///home/prwxsm/Projects/plugg/src/components/plugg/app-shell.tsx#L62-L68) | **Proposed Enhancement**: Requires adding `featured BOOLEAN DEFAULT FALSE` to `artists` table and an admin toggle endpoint. |
| **Admin User Roles & Privileges** | **Partially Implemented** | `users.is_admin` (BOOLEAN DEFAULT FALSE) | [`src/lib/auth.ts`](file:///home/prwxsm/Projects/plugg/src/lib/auth.ts#L61-L77), [`db/schema.sql`](file:///home/prwxsm/Projects/plugg/db/schema.sql#L29) | **Admin Action Required**: Column exists, but **NO mutation endpoint exists**. Admins are currently granted via direct DB query or hardcoded email check in code. |
| **Emergency Content Takedowns (DMCA)** | **Partially Implemented** | `tracks.published` (BOOLEAN DEFAULT TRUE), `releases.status` | [`src/server-fns/data-functions.ts`](file:///home/prwxsm/Projects/plugg/src/server-fns/data-functions.ts#L1215) (`deleteReleaseFn` is artist-only) | **Admin Action Required**: Takedown/unpublish currently requires manual SQL update. No staff takedown function exists. |
| **Taxonomy & Genre Management** | **Partially Implemented** | `genres` (`id`, `name`, `slug`, `image`) | [`db/schema.sql`](file:///home/prwxsm/Projects/plugg/db/schema.sql#L68-L73), [`src/server-fns/data-functions.ts`](file:///home/prwxsm/Projects/plugg/src/server-fns/data-functions.ts#L309-L326) | **Proposed Admin Feature**: Queried with hardcoded sort in `data-functions.ts`. Mutation requires manual SQL migrations. |
| **Stream Fraud & Play Telemetry** | **Fully Implemented** (Backend) | `plays` (`id`, `track_id`, `user_id`, `session_id`, `duration_played_seconds`, `created_at`) | [`src/server/api/play.ts`](file:///home/prwxsm/Projects/plugg/src/server/api/play.ts#L28-L68), [`db/migrations/002_plays_table.sql`](file:///home/prwxsm/Projects/plugg/db/migrations/002_plays_table.sql) | **Automated Backend**: Enforces 30s playback threshold and 30-minute repeat session window. Admin only needs read-only logs. |
| **Download Quality Tier Telemetry** | **Missing in DB** | `tracks.download_count` (BIGINT aggregate only) | [`src/server-fns/data-functions.ts`](file:///home/prwxsm/Projects/plugg/src/server-fns/data-functions.ts#L463-L475) (`recordTrackDownloadFn`) | **Proposed Enhancement**: Does not track download events by tier (96k/160k/256k). Requires a dedicated `downloads` table if breakdown is needed. |
| **System Notifications & Announcements** | **Missing in DB** | *None* (Exists only in React state and `localStorage`) | [`src/state/plugg-store.tsx`](file:///home/prwxsm/Projects/plugg/src/state/plugg-store.tsx#L72-L115), [`src/routes/updates.tsx`](file:///home/prwxsm/Projects/plugg/src/routes/updates.tsx) | **Proposed Feature**: No backend broadcast system or persistence table exists. |

---

## 2. In-Depth Audit of Existing Components

### 2.1 The Review Lifecycle & Moderation Engine
- **Existing Implementation:**
  - Releases uploaded via [`src/routes/upload.tsx`](file:///home/prwxsm/Projects/plugg/src/routes/upload.tsx) and [`createReleaseWithTracksFn`](file:///home/prwxsm/Projects/plugg/src/server-fns/data-functions.ts#L738) are assigned `status = 'under_review'`, `review_submitted_at = now()`, and `published = false`.
  - [`approveReleaseFn`](file:///home/prwxsm/Projects/plugg/src/server-fns/data-functions.ts#L911):
    1. Enforces staff authorization.
    2. Validates that audio transcoding is `completed` (`if (release.audioProcessingStatus !== "completed") throw Error`).
    3. Checks if original release date has elapsed. If elapsed, forces a future date input (`newReleaseDate`).
    4. Computes target midnight in Kampala (`targetGoLive = new Date(goLiveAt(targetReleaseDate))`).
    5. Appends an audit entry to `review_history` JSONB array (`{ id, action: 'approved', timestamp, actorId, actorName }`).
    6. Updates `releases.status = 'scheduled'`.
  - [`requestChangesReleaseFn`](file:///home/prwxsm/Projects/plugg/src/server-fns/data-functions.ts#L1017):
    1. Enforces staff authorization.
    2. Validates mandatory feedback text (`if (!feedback.trim()) throw Error`).
    3. Appends audit item to `review_history` (`action: 'changes_requested'`).
    4. Sets `releases.status = 'changes_required'` and stores `review_feedback`.
  - [`resubmitReleaseFn`](file:///home/prwxsm/Projects/plugg/src/server-fns/data-functions.ts#L1076):
    - Artist can resubmit from dashboard, resetting status to `under_review` and recording `action: 'resubmitted'`.

### 2.2 Audio Processing Pipeline & Technical Validation
- **Existing Implementation:**
  - Located in [`src/server/audio-processor.ts`](file:///home/prwxsm/Projects/plugg/src/server/audio-processor.ts) and [`src/lib/audio-validation.ts`](file:///home/prwxsm/Projects/plugg/src/lib/audio-validation.ts).
  - Validation: Inspects first 8KB binary header to verify RIFF/WAV or fLaC magic bytes, sample rate (44.1, 48, 88.2, 96 kHz), bit depth (16 or 24-bit), and channel count ($\ge 2$ stereo).
  - Transcoding: Invokes FFmpeg asynchronously via `execAsync` to generate:
    - `stream_64k.opus` (Opus 64 kbps VBR)
    - `stream_96k.opus` (Opus 96 kbps VBR)
    - `stream_160k.opus` (Opus 160 kbps VBR)
    - `stream_256k.aac` (AAC 256 kbps CBR)
    - `download_96k.aac` (AAC 96 kbps Data Saver)
    - `download_160k.aac` (AAC 160 kbps Standard)
    - `download_256k.aac` (AAC 256 kbps High Fidelity)
  - Stored in `tracks.audio_variants` JSONB column.

### 2.3 Midnight Release Scheduling (`Africa/Kampala UTC+03:00`)
- **Existing Implementation:**
  - Function [`goLiveAt(dateStr)`](file:///home/prwxsm/Projects/plugg/src/lib/plugg.ts#L42): Takes a `YYYY-MM-DD` string and returns the exact ISO timestamp representing midnight at UTC+03:00 (i.e. `T21:00:00.000Z` of the prior day).
  - Auto-publish mechanism: Located in [`getInitialData`](file:///home/prwxsm/Projects/plugg/src/server-fns/data-functions.ts#L168-L184). When any client requests initial data, it executes:
    ```sql
    UPDATE releases SET status = 'published', updated_at = now()
    WHERE status = 'scheduled' AND go_live_at IS NOT NULL AND go_live_at <= now();
    
    UPDATE tracks SET published = true, updated_at = now()
    WHERE published = false AND release_id IN (SELECT id FROM releases WHERE status = 'published');
    ```
  - **Limitation:** If no user visits the platform around midnight, tracks do not flip until the next request arrives. A true background cron or Cloudflare Worker scheduled trigger is recommended.

### 2.4 Play Telemetry & Fraud Guard
- **Existing Implementation:**
  - Endpoint [`handlePlayRequest`](file:///home/prwxsm/Projects/plugg/src/server/api/play.ts):
    1. Rejects plays under 30 seconds (`durationPlayedSeconds < 30` returns `{ counted: false }`).
    2. Enforces a 30-minute deduplication window per session/user (`created_at > now() - INTERVAL '30 minutes'`).
    3. Atomically logs row in `plays` table and increments `tracks.play_count` and `artists.total_plays`.

---

## 3. External Administration Requirements

Functionality currently handled via hardcoded code, manual SQL, or configuration files that should be exposed to an admin UI:

### 3.1 Admin Dashboard Configuration (Safe for Admin Panel)
1. **Artist Verification Management:**
   - *Current state:* Direct SQL (`UPDATE artists SET verified = true WHERE id = '...'`).
   - *Recommendation:* Expose a toggle in the Admin Artist Directory calling a new `setArtistVerificationFn`.
2. **Artist Discovery Curation ("Featured Artists"):**
   - *Current state:* Hardcoded mock boolean in [`src/data/artists.ts`](file:///home/prwxsm/Projects/plugg/src/data/artists.ts).
   - *Recommendation:* Add `featured BOOLEAN DEFAULT FALSE` to `artists` table and provide an admin toggle.
3. **Emergency Content Takedowns (DMCA / Copyright Invalidation):**
   - *Current state:* Direct SQL (`UPDATE tracks SET published = false`).
   - *Recommendation:* Add staff `takedownReleaseFn` / `takedownTrackFn` with required reason notes.
4. **Staff Role Assignment:**
   - *Current state:* Direct SQL (`UPDATE users SET is_admin = true`) or hardcoding email in [`src/lib/auth.ts`](file:///home/prwxsm/Projects/plugg/src/lib/auth.ts#L76).
   - *Recommendation:* Expose staff management table accessible only to super-admins.
5. **Genre Taxonomy Management:**
   - *Current state:* Direct SQL migrations.
   - *Recommendation:* Admin CRUD table for genres (name, slug, cover image).

### 3.2 Automated Backend Responsibility (Do NOT make manual in UI)
1. **Plugg Track ID generation (`PLG-YYYY-XXXXXX`):** Must remain strictly automated via PostgreSQL sequence `plugg_track_id_seq` on upload.
2. **Audio Variant Transcoding:** Must remain an automated background task triggered upon upload. Admin UI should only offer a manual "Retry" button.
3. **SLA Calculation:** Must be dynamically derived from `review_submitted_at` against current time ($24\text{h}$ countdown).
4. **Scheduled Midnight Publication:** Should be automated via a recurring server cron or scheduled webhook at 00:00 Kampala time.

### 3.3 Infrastructure / Developer-Only Configuration (NEVER expose to Admin UI)
1. Database connection strings (`DATABASE_URL`).
2. Session cookie encryption keys (`SESSION_SECRET`).
3. Direct storage path configuration (`STORAGE_DIR`, `STORAGE_PROVIDER`).
4. Raw database migrations (`db/migrations/*`).

---

## 4. Security, Authentication & Permissions

### 4.1 Reusing Existing Authentication
The main platform uses HTTP-only cookie-based sessions:
- **Cookie Name:** `plugg_session`
- **Session Duration:** 30 days
- **Store:** `sessions` table in PostgreSQL
- **Verification Function:** [`getUserFromSession()`](file:///home/prwxsm/Projects/plugg/src/lib/auth.ts#L54)

### 4.2 Standalone Admin Panel Integration Options
Because the admin panel will be built as a separate frontend in Lovable and hosted independently (e.g. `admin.plugg.site`):
- **Cross-Domain Session Sharing:** If hosted on a subdomain of `plugg.site`, set cookie `domain: ".plugg.site"` with `SameSite=lax; Secure; HttpOnly`.
- **API Token / Bearer Auth (Alternative):** Allow staff to generate admin API tokens from their primary login, passed via `Authorization: Bearer <token>`.
- **Authorization Guard:**
  All administrative server functions must enforce:
  ```ts
  const user = await getUserFromSession();
  if (!user || !user.isAdmin) {
    throw new Error("Forbidden: Administrator access required");
  }
  ```
- **Audit Logging:** Every sensitive operation (Approvals, Rejections, Takedowns, Role changes) must write an immutable audit record containing `actor_id`, `actor_name`, `action`, `target_id`, `notes`, and `timestamp`.

---

## 5. Risks & Implementation Priorities

### Identified Technical Risks
1. **Hardcoded Admin Emails in Source Code:** [`src/lib/auth.ts`](file:///home/prwxsm/Projects/plugg/src/lib/auth.ts#L76) and [`src/server-fns/data-functions.ts`](file:///home/prwxsm/Projects/plugg/src/server-fns/data-functions.ts#L920) hardcode emails (`zuri@plugg.fm`, `admin@plugg.fm`, `xsm@plugg.com`). If a user changes email, permissions break.
2. **Missing `featured` column in `artists` table:** Currently referenced in TypeScript and UI ranking, but does not exist in PostgreSQL.
3. **Passive Scheduled Publishing:** Scheduled releases only publish when a client makes a web request. If traffic is quiet at 00:00 Kampala time, releases will be delayed.

### Implementation Priorities for Future Backend Integration
1. **Priority 1 (Crucial):** Wire standalone admin API endpoints for existing review queue logic (`getReviewQueue`, `approveRelease`, `requestChanges`, `retryTranscode`).
2. **Priority 2 (High):** Implement staff takedown endpoint (`takedownReleaseFn`) and artist verification toggle (`setArtistVerifiedFn`).
3. **Priority 3 (Medium):** Run database migration for `artists.featured` and create independent midnight cron trigger.
4. **Priority 4 (Low):** Genre management CRUD and system broadcast announcements.
