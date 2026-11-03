import { localAudioProcessingEnabled } from "./processing-mode.ts";
import sql from "../lib/db.ts";
import { requireAdminSession, AdminAuthorizationError } from "./admin-rbac.ts";
import { jsonObject, reviewHistory, safeMediaUrl } from "../components/admin/model.ts";
import type {
  AdminResult,
  AdminSnapshot,
  AdminTrack,
  AdminRelease,
  AdminArtist,
  AdminGenre,
  AdminUser,
  AdminPlay,
  AdminComplaint,
  AdminVerificationApplication,
} from "../components/admin/model.ts";
import type { TransactionSql } from "postgres";

const RECORD_LIMIT = 2000;
const PLAY_LIMIT = 100;
type Row = Record<string, unknown>;
const text = (v: unknown) => (typeof v === "string" ? v : "");
const nullableText = (v: unknown) => (typeof v === "string" ? v : null);
const number = (v: unknown) => Number(v) || 0;
const iso = (v: unknown): string | null =>
  v instanceof Date ? v.toISOString() : typeof v === "string" ? v : null;

function technicalMetadata(value: unknown): AdminTrack["technicalValidation"] {
  const allowed = new Set([
    "format",
    "sampleRate",
    "bitDepth",
    "channels",
    "durationSeconds",
    "bitrateKbps",
    "isStereo",
    "isLossless",
    "is24Bit",
    "isVbr",
    "warning",
    "qualityWarning",
    "valid",
    "notes",
    "error",
  ]);
  const result: AdminTrack["technicalValidation"] = {};
  for (const [key, item] of Object.entries(jsonObject(value))) {
    if (
      allowed.has(key) &&
      (item === null ||
        typeof item === "string" ||
        typeof item === "number" ||
        typeof item === "boolean")
    )
      result[key] = item;
  }
  return result;
}

/** A fresh database-backed permission check, using the existing Plugg session architecture.
 * Never trust the legacy email allowlist or a client-supplied user identity. */
export async function readAdminSnapshot(
  sessionId: string | undefined,
  connection: typeof sql = sql,
): Promise<AdminResult> {
  if (!sessionId)
    return {
      status: "unauthenticated",
      message: "Sign in with an existing Plugg administrator account.",
    };
  try {
    return await connection.begin("isolation level repeatable read read only", async (tx) => {
      await tx`SET LOCAL statement_timeout = '10s'`;
      const identity = await requireAdminSession(tx, sessionId);
      const data = await readSnapshot(tx);
      const [own] =
        await tx`SELECT u.username,u.email,u.avatar_url,u.created_at,a.display_name AS artist_name,a.username AS artist_username FROM users u LEFT JOIN artists a ON a.id=u.artist_id WHERE u.id=${identity.id}`;
      if (identity.role === "super_admin") {
        const rows =
          await tx`SELECT a.id::text,u.name AS actor_name,a.actor_role,a.action,a.target_id,a.reason,a.occurred_at,a.result FROM admin_audit_log a JOIN users u ON u.id=a.actor_user_id ORDER BY a.id DESC LIMIT 200`;
        data.audit = rows.map((a) => ({
          id: text(a["id"]),
          actorName: text(a["actorName"]),
          actorRole: text(a["actorRole"]),
          action: text(a["action"]),
          targetId: text(a["targetId"]),
          reason: nullableText(a["reason"]),
          occurredAt: iso(a["occurredAt"]) || "",
          result: text(a["result"]),
        }));
      }
      if (identity.role !== "super_admin") {
        data.users = [];
        data.metrics.users = 0;
        data.metrics.adminUsers = 0;
      }
      if (identity.role === "moderator") {
        data.releases = data.releases.filter(
          (r) => r.status === "under_review" || r.status === "changes_required",
        );
        const ids = new Set(data.releases.map((r) => r.id));
        data.tracks = data.tracks.filter((t) => ids.has(t.releaseId));
        data.artists = [];
        data.genres = [];
        data.plays = [];
        data.files = [];
        data.dailyPlays = [];
        const allowed = new Set(["pending", "approaching", "breached", "missingSubmissionTime"]);
        for (const key of Object.keys(data.metrics) as (keyof typeof data.metrics)[])
          if (!allowed.has(key)) data.metrics[key] = 0;
      }
      return {
        status: "ok",
        data: {
          ...data,
          currentUser: {
            id: identity.id,
            name: identity.name,
            email: text(own?.["email"]),
            role: identity.role,
            username: nullableText(own?.["username"]),
            avatarUrl: safeMediaUrl(own?.["avatarUrl"]),
            createdAt: iso(own?.["createdAt"]),
            artistName: nullableText(own?.["artistName"]),
            artistUsername: nullableText(own?.["artistUsername"]),
          },
        },
      };
    });
  } catch (error) {
    if (error instanceof AdminAuthorizationError)
      return {
        status: error.status === 401 ? "unauthenticated" : "forbidden",
        message:
          error.status === 401
            ? "Your session has expired or is no longer valid. Sign in again to continue."
            : error.message,
        reason: error.status === 401 ? "session_expired" : undefined,
      };
    // Do not send driver messages, connection strings, SQL or credentials to the browser.
    const code =
      error && typeof error === "object" && "code" in error ? String(error.code) : "UNKNOWN";
    console.error("[admin-read] Database read failed; code:", code);
    return {
      status: "unavailable",
      message:
        "The existing Plugg database could not be read. Check the server connection or schema configuration. No substitute data has been loaded.",
    };
  }
}

async function readSnapshot(tx: TransactionSql): Promise<Omit<AdminSnapshot, "currentUser">> {
  const [clock] = await tx<{ now: Date }[]>`SELECT now()`;
  // Exclude seeded content rows, but retain genuine uploads even when their artist was originally seeded.
  const releaseRows = await tx<Row[]>`
  SELECT r.id,r.title,r.type,r.artist_id,a.display_name AS artist_name,r.cover_url,r.label,
   r.release_date::text,r.go_live_at,r.status,r.review_submitted_at,r.reviewed_at,
   r.review_feedback,r.audio_processing_status,r.review_history,
   r.uploader_role, (r.rights_declaration_text IS NOT NULL) AS rights_declaration_accepted, r.rights_declaration_version, r.rights_declaration_timestamp,
   r.rights_hold, r.rights_hold_reason, r.rights_hold_placed_at, r.rights_hold_placed_by,
   ARRAY(SELECT t.id FROM tracks t LEFT JOIN release_tracks rt ON rt.track_id=t.id AND rt.release_id=r.id
     WHERE t.release_id=r.id AND NOT t.is_mock ORDER BY rt.position NULLS LAST,t.created_at,t.id) AS track_ids
  FROM releases r JOIN artists a ON a.id=r.artist_id
  WHERE NOT r.is_mock ORDER BY r.created_at DESC,r.id LIMIT ${RECORD_LIMIT}
 `;
  const trackRows = await tx<Row[]>`
  SELECT t.id,t.plugg_track_id,t.title,t.artist_id,a.display_name AS artist_name,t.release_id,
   r.title AS release_title,r.status AS release_status,t.genre,t.cover_url,t.audio_url,
   t.duration_seconds,t.play_count,t.download_count,t.published,t.release_date::text,
   t.features,t.producers,t.audio_processing_status,t.technical_validation,t.audio_variants,
   t.recording_type, t.has_samples_or_beats, t.sample_details, t.isrc, t.file_hash,
   (SELECT count(*)::int FROM tracks other JOIN releases orl ON orl.id=other.release_id WHERE other.file_hash=t.file_hash AND other.id<>t.id AND other.artist_id<>t.artist_id AND orl.status IN ('processing','under_review','changes_required','scheduled','published')) AS foreign_duplicate_count
  FROM tracks t JOIN artists a ON a.id=t.artist_id JOIN releases r ON r.id=t.release_id
  JOIN artists ra ON ra.id=r.artist_id
  WHERE NOT t.is_mock AND NOT r.is_mock
  ORDER BY t.created_at DESC,t.id LIMIT ${RECORD_LIMIT}
 `;
  const complaintRows = await tx<Row[]>`
  SELECT c.id, c.reference AS complaint_reference, c.release_id, c.track_id,
   r.title AS release_title, t.title AS track_title, a.display_name AS artist_name,
   c.complainant_name, c.complainant_email, COALESCE(c.conflict_nature, c.nature_of_infringement) AS conflict_nature, c.evidence_notes,
   c.status, c.admin_notes, c.resolution_notes, c.created_at, c.updated_at,
   c.resolved_at, c.resolved_by
  FROM copyright_complaints c
  LEFT JOIN releases r ON r.id = c.release_id
  LEFT JOIN tracks t ON t.id = c.track_id
  LEFT JOIN artists a ON a.id = r.artist_id
  ORDER BY c.created_at DESC LIMIT 500
 `;
  const verificationRows = await tx<Row[]>`
  SELECT v.id, v.artist_id, v.user_id, v.stage_name, v.legal_name, v.contact_email,
   v.contact_phone, v.country, v.city, v.primary_genre, v.supporting_links,
   v.note, v.status, v.admin_feedback, v.reviewed_at, v.reviewer_id,
   v.created_at, v.updated_at
  FROM artist_verification_applications v
  ORDER BY v.created_at DESC LIMIT 500
 `;
  const artistRows = await tx<Row[]>`
  SELECT id,display_name,username,avatar_url,location,city,country,primary_genre,phone_number,
   verified,monthly_listeners,total_plays,fans,terms_accepted_at
  FROM artists WHERE NOT is_mock ORDER BY created_at DESC,id LIMIT ${RECORD_LIMIT}
 `;
  const genreRows = await tx<Row[]>`
  SELECT g.id,g.name,g.slug,g.image,
   (SELECT count(*) FROM tracks t JOIN artists a ON a.id=t.artist_id JOIN releases r ON r.id=t.release_id JOIN artists ra ON ra.id=r.artist_id
    WHERE NOT t.is_mock AND NOT r.is_mock AND (lower(t.genre)=lower(g.name) OR lower(t.genre)=lower(g.slug))) AS track_count,
   (SELECT count(*) FROM artists a WHERE NOT a.is_mock AND (lower(a.primary_genre)=lower(g.name) OR lower(a.primary_genre)=lower(g.slug))) AS artist_count
  FROM genres g WHERE NOT g.is_mock ORDER BY g.name,g.id LIMIT ${RECORD_LIMIT}
 `;
  const userRows = await tx<Row[]>`
  SELECT u.id,u.name,u.username,u.email,u.account_type,a.display_name AS artist_name,a.username AS artist_username,a.phone_number,a.verified,u.avatar_url,EXISTS(SELECT 1 FROM admin_memberships m WHERE m.user_id=u.id AND m.active) AS is_admin,(SELECT m.role FROM admin_memberships m WHERE m.user_id=u.id) AS admin_role,coalesce((SELECT m.active FROM admin_memberships m WHERE m.user_id=u.id),false) AS admin_active,u.created_at
  FROM users u LEFT JOIN artists a ON a.id=u.artist_id
  WHERE NOT u.is_mock ORDER BY u.created_at DESC,u.id LIMIT ${RECORD_LIMIT}
 `;
  const plays = await tx<Row[]>`
  SELECT p.id,p.created_at,t.title,t.plugg_track_id,p.duration_played_seconds AS duration,p.ip_address,
   CASE WHEN p.session_id IS NOT NULL THEN 'session_' || left(md5(p.session_id),10) ELSE NULL END AS session_label
  FROM plays p JOIN tracks t ON t.id=p.track_id JOIN artists a ON a.id=t.artist_id
   JOIN releases r ON r.id=t.release_id JOIN artists ra ON ra.id=r.artist_id
  WHERE NOT t.is_mock AND NOT r.is_mock
  ORDER BY p.created_at DESC,p.id LIMIT ${PLAY_LIMIT}
 `;
  const [metrics] = await tx<Row[]>`
  WITH real_artists AS (SELECT * FROM artists WHERE NOT is_mock),
  real_releases AS (SELECT r.* FROM releases r WHERE NOT r.is_mock),
  real_tracks AS (SELECT t.* FROM tracks t JOIN real_releases r ON r.id=t.release_id WHERE NOT t.is_mock),
  real_plays AS (SELECT p.* FROM plays p JOIN real_tracks t ON t.id=p.track_id),
  bounds AS (SELECT date_trunc('day',now() AT TIME ZONE 'Africa/Kampala') AT TIME ZONE 'Africa/Kampala' AS start,
   (date_trunc('day',now() AT TIME ZONE 'Africa/Kampala') + interval '1 day') AT TIME ZONE 'Africa/Kampala' AS next_midnight)
  SELECT
   (SELECT count(*) FROM real_releases) AS releases, (SELECT count(*) FROM real_tracks) AS tracks,
   (SELECT count(*) FROM real_artists) AS artists, (SELECT count(*) FROM users WHERE NOT is_mock) AS users,
   (SELECT count(*) FROM real_artists WHERE verified) AS verified_artists,
   (SELECT count(*) FROM users WHERE NOT is_mock AND EXISTS(SELECT 1 FROM admin_memberships m WHERE m.user_id=users.id AND m.active)) AS admin_users,
   (SELECT count(*) FROM real_releases WHERE status='under_review') AS pending,
   (SELECT count(*) FROM real_releases WHERE status='under_review' AND review_submitted_at <= now()-interval '18 hours' AND review_submitted_at >= now()-interval '24 hours') AS approaching,
   (SELECT count(*) FROM real_releases WHERE status='under_review' AND review_submitted_at < now()-interval '24 hours') AS breached,
   (SELECT count(*) FROM real_releases WHERE status='under_review' AND review_submitted_at IS NULL) AS missing_submission_time,
   (SELECT count(*) FROM real_releases WHERE status='scheduled') AS scheduled,
   (SELECT count(*) FROM real_releases WHERE status='scheduled' AND go_live_at=(SELECT next_midnight FROM bounds)) AS next_midnight_scheduled,
   (SELECT count(*) FROM real_releases WHERE status='scheduled' AND go_live_at<=now()) AS overdue_scheduled,
   (SELECT count(*) FROM real_releases WHERE status='scheduled' AND go_live_at IS NULL) AS missing_schedule,
   (SELECT count(*) FROM real_releases WHERE go_live_at IS NOT NULL AND go_live_at <> (release_date::timestamp AT TIME ZONE 'Africa/Kampala')) AS schedule_mismatches,
   (SELECT count(*) FROM real_plays WHERE duration_played_seconds>=30 AND created_at >= (SELECT start FROM bounds) AND created_at < (SELECT next_midnight FROM bounds)) AS qualified_today,
   (SELECT count(*) FROM real_plays) AS recorded_plays,
   (SELECT coalesce(sum(play_count),0) FROM real_tracks) AS stored_play_count,
   (SELECT coalesce(sum(download_count),0) FROM real_tracks) AS downloads,
   (SELECT count(*) FROM real_tracks WHERE audio_processing_status='completed') AS completed,
   (SELECT count(*) FROM real_tracks WHERE audio_processing_status='processing') AS processing,
   (SELECT count(*) FROM real_tracks WHERE audio_processing_status='failed') AS failed,
   (SELECT count(*) FROM real_tracks WHERE audio_processing_status='pending') AS pending_audio,
   (SELECT count(*) FROM real_plays WHERE ip_address IS NOT NULL) AS plays_with_ip,
   ((SELECT count(*) FROM artists WHERE is_mock)+(SELECT count(*) FROM releases WHERE is_mock)+(SELECT count(*) FROM tracks WHERE is_mock)+(SELECT count(*) FROM users WHERE is_mock)+(SELECT count(*) FROM genres WHERE is_mock)) AS excluded_seed_records,
   (SELECT count(*) FROM real_releases WHERE rights_hold = true) AS rights_hold_count,
   (SELECT count(*) FROM copyright_complaints WHERE status IN ('received', 'under_investigation')) AS open_complaints,
   (SELECT count(*) FROM artist_verification_applications WHERE status = 'pending') AS pending_verifications
 `;
  const daily = await tx<Row[]>`
  WITH days AS (SELECT generate_series((now() AT TIME ZONE 'Africa/Kampala')::date-6,(now() AT TIME ZONE 'Africa/Kampala')::date,interval '1 day')::date AS day),
  events AS (SELECT (p.created_at AT TIME ZONE 'Africa/Kampala')::date AS day,count(*) AS plays
   FROM plays p JOIN tracks t ON t.id=p.track_id JOIN artists a ON a.id=t.artist_id JOIN releases r ON r.id=t.release_id JOIN artists ra ON ra.id=r.artist_id
   WHERE NOT t.is_mock AND NOT r.is_mock AND p.duration_played_seconds>=30
    AND p.created_at >= (((now() AT TIME ZONE 'Africa/Kampala')::date-6)::timestamp AT TIME ZONE 'Africa/Kampala')
   GROUP BY 1)
  SELECT days.day::text,coalesce(events.plays,0) AS plays FROM days LEFT JOIN events USING(day) ORDER BY days.day
 `;
  const files = await tx<Row[]>`
  SELECT f.category,f.upload_status AS status,count(*) AS count,sum(f.size) AS bytes
  FROM files f JOIN users u ON u.id=f.owner_id WHERE NOT u.is_mock
  GROUP BY f.category,f.upload_status ORDER BY f.category,f.upload_status
 `;
  const releases: AdminRelease[] = releaseRows.map((r) => ({
    id: text(r["id"]),
    title: text(r["title"]),
    type: text(r["type"]),
    artistId: text(r["artistId"]),
    artistName: text(r["artistName"]),
    coverUrl: safeMediaUrl(r["coverUrl"]) || "",
    label: nullableText(r["label"]),
    releaseDate: text(r["releaseDate"]),
    goLiveAt: iso(r["goLiveAt"]),
    status: text(r["status"]),
    reviewSubmittedAt: iso(r["reviewSubmittedAt"]),
    reviewedAt: iso(r["reviewedAt"]),
    reviewFeedback: nullableText(r["reviewFeedback"]),
    audioProcessingStatus: text(r["audioProcessingStatus"]),
    uploaderRole: nullableText(r["uploaderRole"]) || "owner",
    rightsDeclarationAccepted: Boolean(r["rightsDeclarationAccepted"]),
    rightsDeclarationVersion: nullableText(r["rightsDeclarationVersion"]),
    rightsDeclarationTimestamp: iso(r["rightsDeclarationTimestamp"]),
    rightsHold: Boolean(r["rightsHold"]),
    rightsHoldReason: nullableText(r["rightsHoldReason"]),
    rightsHoldPlacedAt: iso(r["rightsHoldPlacedAt"]),
    rightsHoldPlacedBy: nullableText(r["rightsHoldPlacedBy"]),
    reviewHistory: reviewHistory(r["reviewHistory"]),
    trackIds: Array.isArray(r["trackIds"]) ? r["trackIds"].map(text) : [],
  }));
  const tracks: AdminTrack[] = trackRows.map((t) => ({
    id: text(t["id"]),
    pluggTrackId: nullableText(t["pluggTrackId"]),
    title: text(t["title"]),
    artistId: text(t["artistId"]),
    artistName: text(t["artistName"]),
    releaseId: text(t["releaseId"]),
    releaseTitle: text(t["releaseTitle"]),
    releaseStatus: text(t["releaseStatus"]),
    genre: text(t["genre"]),
    coverUrl: safeMediaUrl(t["coverUrl"]) || "",
    audioUrl: safeMediaUrl(t["audioUrl"]),
    durationSeconds: number(t["durationSeconds"]),
    playCount: number(t["playCount"]),
    downloadCount: number(t["downloadCount"]),
    published: t["published"] === true,
    releaseDate: text(t["releaseDate"]),
    features: nullableText(t["features"]),
    producers: nullableText(t["producers"]),
    audioProcessingStatus: text(t["audioProcessingStatus"]),
    processingAvailable: localAudioProcessingEnabled(),
    recordingType: nullableText(t["recordingType"]) || "original",
    hasSamplesOrBeats: Boolean(t["hasSamplesOrBeats"]),
    sampleDetails: nullableText(t["sampleDetails"]),
    isrc: nullableText(t["isrc"]),
    fileHash: nullableText(t["fileHash"]),
    duplicateMatchesCount: number(t["foreignDuplicateCount"]),
    technicalValidation: technicalMetadata(t["technicalValidation"]),
    audioVariants: Object.entries(jsonObject(t["audioVariants"])).map(([name, v]) => {
      const item = jsonObject(v);
      return {
        name,
        url: safeMediaUrl(item["url"]) || null,
        format: nullableText(item["format"]),
        type: nullableText(item["type"]),
        bitrateKbps: typeof item["bitrateKbps"] === "number" ? item["bitrateKbps"] : null,
        sizeBytes: typeof item["sizeBytes"] === "number" ? item["sizeBytes"] : null,
      };
    }),
  }));
  const complaints: AdminComplaint[] = complaintRows.map((c) => ({
    id: text(c["id"]),
    complaintReference: text(c["complaintReference"]),
    releaseId: nullableText(c["releaseId"]),
    trackId: nullableText(c["trackId"]),
    releaseTitle: nullableText(c["releaseTitle"]),
    trackTitle: nullableText(c["trackTitle"]),
    artistName: nullableText(c["artistName"]),
    complainantName: text(c["complainantName"]),
    complainantEmail: text(c["complainantEmail"]),
    conflictNature: text(c["conflictNature"]),
    evidenceNotes: nullableText(c["evidenceNotes"]),
    status: (["received", "under_investigation", "resolved", "dismissed"].includes(
      String(c["status"]),
    )
      ? c["status"]
      : "received") as AdminComplaint["status"],
    adminNotes: nullableText(c["adminNotes"]),
    resolutionNotes: nullableText(c["resolutionNotes"]),
    createdAt: iso(c["createdAt"]) || "",
    updatedAt: iso(c["updatedAt"]) || "",
    resolvedAt: iso(c["resolvedAt"]),
    resolvedBy: nullableText(c["resolvedBy"]),
  }));
  const artists: AdminArtist[] = artistRows.map((a) => ({
    id: text(a["id"]),
    displayName: text(a["displayName"]),
    username: text(a["username"]),
    avatarUrl: safeMediaUrl(a["avatarUrl"]) || "",
    location: text(a["location"]),
    city: nullableText(a["city"]),
    country: nullableText(a["country"]),
    primaryGenre: nullableText(a["primaryGenre"]),
    phoneNumber: text(a["phoneNumber"]),
    verified: a["verified"] === true,
    monthlyListeners: number(a["monthlyListeners"]),
    totalPlays: number(a["totalPlays"]),
    fans: number(a["fans"]),
    termsAcceptedAt: iso(a["termsAcceptedAt"]),
  }));
  const genres: AdminGenre[] = genreRows.map((g) => ({
    id: text(g["id"]),
    name: text(g["name"]),
    slug: text(g["slug"]),
    image: safeMediaUrl(g["image"]) || "",
    trackCount: number(g["trackCount"]),
    artistCount: number(g["artistCount"]),
  }));
  const users: AdminUser[] = userRows.map((u) => ({
    id: text(u["id"]),
    name: text(u["name"]),
    username: nullableText(u["username"]),
    email: text(u["email"]),
    accountType: text(u["accountType"]),
    artistName: nullableText(u["artistName"]),
    artistUsername: nullableText(u["artistUsername"]),
    phone: nullableText(u["phoneNumber"]),
    verified: typeof u["verified"] === "boolean" ? u["verified"] : null,
    avatarUrl: safeMediaUrl(u["avatarUrl"]),
    isAdmin: u["isAdmin"] === true,
    adminRole: nullableText(u["adminRole"]),
    adminActive: u["adminActive"] === true,
    createdAt: iso(u["createdAt"]) || "",
  }));
  return {
    audit: [],
    fetchedAt: clock!.now.toISOString(),
    releases,
    tracks,
    artists,
    genres,
    users,
    complaints,
    verifications: verificationRows.map((v) => ({
      id: text(v["id"]),
      artistId: text(v["artistId"]),
      userId: text(v["userId"]),
      stageName: text(v["stageName"]),
      legalName: text(v["legalName"]),
      contactEmail: text(v["contactEmail"]),
      contactPhone: nullableText(v["contactPhone"]),
      country: nullableText(v["country"]),
      city: nullableText(v["city"]),
      primaryGenre: nullableText(v["primaryGenre"]),
      supportingLinks: Array.isArray(v["supportingLinks"]) ? (v["supportingLinks"] as string[]) : [],
      note: nullableText(v["note"]),
      status: (v["status"] as any) || "pending",
      adminFeedback: nullableText(v["adminFeedback"]),
      reviewedAt: iso(v["reviewedAt"]),
      reviewerId: nullableText(v["reviewerId"]),
      createdAt: iso(v["createdAt"]) || "",
      updatedAt: iso(v["updatedAt"]) || "",
    })) satisfies AdminVerificationApplication[],
    plays: plays.map((p) => ({
      id: text(p["id"]),
      createdAt: iso(p["createdAt"]) || "",
      title: text(p["title"]),
      pluggTrackId: nullableText(p["pluggTrackId"]),
      duration: number(p["duration"]),
      ipAddress: nullableText(p["ipAddress"]),
      sessionLabel: nullableText(p["sessionLabel"]),
    })) satisfies AdminPlay[],
    metrics: Object.fromEntries(
      Object.entries(metrics!).map(([key, value]) => [key, number(value)]),
    ) as AdminSnapshot["metrics"],
    dailyPlays: daily.map((d) => ({ day: text(d["day"]), plays: number(d["plays"]) })),
    files: files.map((f) => ({
      category: text(f["category"]),
      status: text(f["status"]),
      count: number(f["count"]),
      bytes: number(f["bytes"]),
    })),
    limits: { records: RECORD_LIMIT, recentPlays: PLAY_LIMIT },
  };
}
