import { verificationInput, submitVerificationApplication } from "../server/artist-verification";
import { createServerFn } from "@tanstack/react-start";
import sql from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";
import type {
  Artist,
  Genre,
  Playlist,
  Release,
  Track,
  Analytics,
  User,
  ReleaseStatus,
  RecordingType,
  UploaderRole,
  ArtistVerificationApplication,
} from "@/data/types";
import {
  PLUGG_RIGHTS_DECLARATION_TEXT,
  PLUGG_RIGHTS_DECLARATION_VERSION,
  isValidIsrc,
  normalizeIsrc,
} from "@/lib/rights-validation";
import { fallbackAnalytics } from "@/data/analytics";
import { goLiveAt, todayISO } from "@/lib/plugg";
import { tracks as seedTracks } from "@/data/tracks";
import { artists as seedArtists } from "@/data/artists";
import { releases as seedReleases } from "@/data/releases";

export function parseSocialLinks(val: unknown): Record<string, string> {
  if (!val) return {};
  let parsed: any = val;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
      if (typeof parsed === "string") {
        parsed = JSON.parse(parsed);
      }
    } catch {
      return {};
    }
  }
  if (!parsed || typeof parsed !== "object") return {};
  const clean: Record<string, string> = {};
  for (const k of ["instagram", "facebook", "tiktok", "x", "youtube"]) {
    if (typeof parsed[k] === "string" && parsed[k].trim()) {
      clean[k] = parsed[k].trim();
    }
  }
  return clean;
}

export const getInitialData = createServerFn({ method: "GET" }).handler(async () => {
  const user = await getUserFromSession();

  // Publication is performed by the controlled backend scheduler, never by this GET loader.
  // Fetch artists
  const dbArtists = await sql<
    {
      id: string;
      username: string;
      displayName: string;
      bio: string;
      location: string;
      avatarUrl: string;
      coverUrl: string;
      verified: boolean;
      fans: number;
      monthlyListeners: number;
      totalPlays: string | number;
      phoneNumber?: string;
      country?: string;
      city?: string;
      primaryGenre?: string;
      additionalGenres?: string[];
      socialLinks: Record<string, string>;
    }[]
  >`
    SELECT id, username, display_name, bio, location, country, city, 
           primary_genre as "primaryGenre", additional_genres as "additionalGenres",
           avatar_url, cover_url, verified, fans, monthly_listeners, total_plays, phone_number, social_links 
    FROM artists
    ORDER BY created_at ASC
  `;

  const artists: Artist[] = dbArtists.map((a) => ({
    id: a.id,
    username: a.username,
    displayName: a.displayName,
    bio: a.bio || "",
    location: a.location || "",
    country: a.country || undefined,
    city: a.city || undefined,
    primaryGenre: a.primaryGenre || undefined,
    additionalGenres: a.additionalGenres || undefined,
    avatarUrl: a.avatarUrl || "",
    coverUrl: a.coverUrl || "",
    verified: Boolean(a.verified),
    fans: Number(a.fans) || 0,
    monthlyListeners: Number(a.monthlyListeners) || 0,
    totalPlays: Number(a.totalPlays) || 0,
    phoneNumber: a.phoneNumber || "",
    socialLinks: parseSocialLinks(a.socialLinks) as {
      instagram?: string;
      facebook?: string;
      x?: string;
      youtube?: string;
      tiktok?: string;
    },
  }));

  // Fetch tracks
  const dbTracks = await sql<
    {
      id: string;
      pluggTrackId: string;
      artistId: string;
      releaseId: string;
      title: string;
      slug: string;
      genre: string;
      coverUrl: string;
      audioUrl: string | null;
      durationSeconds: number;
      playCount: string | number;
      downloadCount: string | number;
      likeCount: string | number;
      published: boolean;
      releaseDate: Date | string;
      features: string | null;
      producers: string | null;
      lyrics: string | null;
      recordingType: any;
      hasSamplesOrBeats: boolean | null;
      sampleDetails: string | null;
      isrc: string | null;
      fileHash: string | null;
      audioProcessingStatus: "pending" | "processing" | "completed" | "failed" | null;
      technicalValidation: any;
      audioVariants: any;
    }[]
  >`
    SELECT id, plugg_track_id, artist_id, release_id, title, slug, genre, cover_url, audio_url, 
           duration_seconds, play_count, COALESCE(download_count, 0) as download_count,
           COALESCE(like_count, 0) as like_count, published, release_date, features, producers, lyrics,
           COALESCE(recording_type, 'original') as "recordingType",
           COALESCE(has_samples_or_beats, false) as "hasSamplesOrBeats",
           sample_details as "sampleDetails",
           isrc,
           file_hash as "fileHash",
           COALESCE(audio_processing_status, 'completed') as "audioProcessingStatus",
           COALESCE(technical_validation, '{}'::jsonb) as "technicalValidation",
           COALESCE(audio_variants, '{}'::jsonb) as "audioVariants"
    FROM tracks
    ORDER BY created_at ASC
  `;

  const tracks: Track[] = dbTracks.map((t) => ({
    id: t.id,
    pluggTrackId: t.pluggTrackId || undefined,
    artistId: t.artistId,
    releaseId: t.releaseId,
    title: t.title,
    slug: t.slug,
    genre: t.genre || "",
    coverUrl: t.coverUrl || "",
    audioUrl: t.audioUrl || null,
    durationSeconds: Number(t.durationSeconds) || 0,
    playCount: Number(t.playCount) || 0,
    downloadCount: Number(t.downloadCount) || 0,
    likeCount: Number(t.likeCount) || 0,
    published: Boolean(t.published),
    releaseDate:
      t.releaseDate instanceof Date
        ? t.releaseDate.toISOString().slice(0, 10)
        : String(t.releaseDate || ""),
    features: t.features || undefined,
    producers: t.producers || undefined,
    lyrics: t.lyrics || undefined,
    recordingType: t.recordingType || "original",
    hasSamplesOrBeats: Boolean(t.hasSamplesOrBeats),
    sampleDetails: t.sampleDetails || undefined,
    isrc: t.isrc || undefined,
    fileHash: t.fileHash || undefined,
    audioProcessingStatus: t.audioProcessingStatus || "completed",
    technicalValidation:
      t.technicalValidation && Object.keys(t.technicalValidation).length > 0
        ? t.technicalValidation
        : undefined,
    audioVariants:
      t.audioVariants && Object.keys(t.audioVariants).length > 0 ? t.audioVariants : undefined,
  }));

  // Fetch release track ordering
  const releaseTrackLinks = await sql<{ releaseId: string; trackId: string; position: number }[]>`
    SELECT release_id, track_id, position 
    FROM release_tracks 
    ORDER BY position ASC
  `;
  const releaseTrackMap = new Map<string, string[]>();
  for (const link of releaseTrackLinks) {
    const list = releaseTrackMap.get(link.releaseId) ?? [];
    list.push(link.trackId);
    releaseTrackMap.set(link.releaseId, list);
  }

  // Fetch releases
  const dbReleases = await sql<
    {
      id: string;
      artistId: string;
      title: string;
      slug: string;
      type: "single" | "EP" | "album";
      coverUrl: string;
      releaseDate: Date | string;
      status: ReleaseStatus;
      goLiveAt: Date | string | null;
      description: string | null;
      label: string | null;
      reviewSubmittedAt: Date | string | null;
      reviewedAt: Date | string | null;
      reviewerId: string | null;
      reviewFeedback: string | null;
      audioProcessingStatus: "pending" | "processing" | "completed" | "failed" | null;
      technicalValidation: any;
      reviewHistory: any;
      uploaderRole: any;
      rightsDeclarationAccepted: boolean | null;
      rightsDeclarationText: string | null;
      rightsDeclarationVersion: string | null;
      rightsDeclarationTimestamp: Date | string | null;
      rightsDeclaredByUserId: string | null;
      rightsHold: boolean | null;
      rightsHoldReason: string | null;
      rightsHoldPlacedAt: Date | string | null;
      rightsHoldPlacedBy: string | null;
    }[]
  >`
    SELECT id, artist_id, title, slug, type, cover_url, release_date, status, go_live_at, description, label,
           review_submitted_at as "reviewSubmittedAt",
           reviewed_at as "reviewedAt",
           reviewer_id as "reviewerId",
           review_feedback as "reviewFeedback",
           COALESCE(audio_processing_status, 'completed') as "audioProcessingStatus",
           COALESCE(technical_validation, '{}'::jsonb) as "technicalValidation",
           COALESCE(review_history, '[]'::jsonb) as "reviewHistory",
           COALESCE(uploader_role, 'owner') as "uploaderRole",
           (rights_declaration_text IS NOT NULL) as "rightsDeclarationAccepted",
           rights_declaration_text as "rightsDeclarationText",
           rights_declaration_version as "rightsDeclarationVersion",
           rights_declaration_timestamp as "rightsDeclarationTimestamp",
           rights_declared_by_user_id as "rightsDeclaredByUserId",
           COALESCE(rights_hold, false) as "rightsHold",
           rights_hold_reason as "rightsHoldReason",
           rights_hold_placed_at as "rightsHoldPlacedAt",
           rights_hold_placed_by as "rightsHoldPlacedBy"
    FROM releases
    ORDER BY release_date DESC
  `;

  const releases: Release[] = dbReleases.map((r) => {
    const trackIds =
      releaseTrackMap.get(r.id) ?? tracks.filter((t) => t.releaseId === r.id).map((t) => t.id);

    return {
      id: r.id,
      artistId: r.artistId,
      title: r.title,
      slug: r.slug,
      type: r.type,
      coverUrl: r.coverUrl || "",
      releaseDate:
        r.releaseDate instanceof Date
          ? r.releaseDate.toISOString().slice(0, 10)
          : String(r.releaseDate || ""),
      status: r.status,
      trackIds,
      goLiveAt: r.goLiveAt
        ? r.goLiveAt instanceof Date
          ? r.goLiveAt.toISOString()
          : String(r.goLiveAt)
        : undefined,
      description: r.description || undefined,
      label: r.label || undefined,
      reviewSubmittedAt: r.reviewSubmittedAt
        ? r.reviewSubmittedAt instanceof Date
          ? r.reviewSubmittedAt.toISOString()
          : String(r.reviewSubmittedAt)
        : undefined,
      reviewedAt: r.reviewedAt
        ? r.reviewedAt instanceof Date
          ? r.reviewedAt.toISOString()
          : String(r.reviewedAt)
        : undefined,
      reviewerId: r.reviewerId || undefined,
      reviewFeedback: r.reviewFeedback || undefined,
      audioProcessingStatus: r.audioProcessingStatus || "completed",
      technicalValidation:
        r.technicalValidation && Object.keys(r.technicalValidation).length > 0
          ? r.technicalValidation
          : undefined,
      reviewHistory: Array.isArray(r.reviewHistory) ? r.reviewHistory : undefined,
      uploaderRole: r.uploaderRole || "owner",
      rightsDeclarationAccepted: Boolean(r.rightsDeclarationAccepted),
      rightsDeclarationText: r.rightsDeclarationText || undefined,
      rightsDeclarationVersion: r.rightsDeclarationVersion || undefined,
      rightsDeclarationTimestamp: r.rightsDeclarationTimestamp
        ? r.rightsDeclarationTimestamp instanceof Date
          ? r.rightsDeclarationTimestamp.toISOString()
          : String(r.rightsDeclarationTimestamp)
        : undefined,
      rightsDeclaredByUserId: r.rightsDeclaredByUserId || undefined,
      rightsHold: Boolean(r.rightsHold),
      rightsHoldReason: r.rightsHoldReason || undefined,
      rightsHoldPlacedAt: r.rightsHoldPlacedAt
        ? r.rightsHoldPlacedAt instanceof Date
          ? r.rightsHoldPlacedAt.toISOString()
          : String(r.rightsHoldPlacedAt)
        : undefined,
      rightsHoldPlacedBy: r.rightsHoldPlacedBy || undefined,
    };
  });

  // Fetch playlists and playlist_tracks (for authenticated user only)
  const dbPlaylists = user
    ? await sql<
        {
          id: string;
          userId: string;
          name: string;
          description: string;
          coverUrl: string;
        }[]
      >`
        SELECT id, user_id, name, description, cover_url 
        FROM playlists
        WHERE user_id = ${user.id} AND is_mock = false
        ORDER BY created_at DESC
      `
    : [];

  const playlistIds = dbPlaylists.map((p) => p.id);
  const playlistTrackLinks =
    playlistIds.length > 0
      ? await sql<{ playlistId: string; trackId: string; position: number }[]>`
          SELECT playlist_id, track_id, position 
          FROM playlist_tracks 
          WHERE playlist_id = ANY(${playlistIds})
          ORDER BY position ASC
        `
      : [];
  const playlistTrackMap = new Map<string, string[]>();
  for (const link of playlistTrackLinks) {
    const list = playlistTrackMap.get(link.playlistId) ?? [];
    list.push(link.trackId);
    playlistTrackMap.set(link.playlistId, list);
  }

  const playlists: Playlist[] = dbPlaylists.map((p) => ({
    id: p.id,
    userId: p.userId,
    name: p.name,
    description: p.description || "",
    coverUrl: p.coverUrl || "",
    trackIds: playlistTrackMap.get(p.id) ?? [],
  }));

  // Fetch genres
  const dbGenres = await sql<{ id: string; name: string; slug: string; image: string }[]>`
    SELECT id, name, slug, image FROM genres ORDER BY 
      CASE slug
        WHEN 'afrobeats' THEN 1
        WHEN 'dancehall' THEN 2
        WHEN 'dj' THEN 3
        WHEN 'gospel' THEN 4
        WHEN 'rnb' THEN 5
        WHEN 'hip-hop' THEN 6
        ELSE 7
      END, name ASC
  `;
  const genres: Genre[] = dbGenres.map((g) => ({
    id: g.id,
    name: g.name,
    slug: g.slug,
    image: g.image || "",
  }));

  // User-specific data
  let likedTrackIds: string[] = [];
  let followingArtistIds: string[] = [];

  if (user) {
    const likes = await sql<{ trackId: string }[]>`
      SELECT track_id FROM likes WHERE user_id = ${user.id}
    `;
    likedTrackIds = likes.map((l) => l.trackId);

    const follows = await sql<{ artistId: string }[]>`
      SELECT artist_id FROM follows WHERE user_id = ${user.id}
    `;
    followingArtistIds = follows.map((f) => f.artistId);
  }

  // Analytics for the user's artist or default artist (a1)
  const targetArtistId = user?.artistId || "a1";
  const analytics = await fetchArtistAnalytics(targetArtistId);

  let verificationApplication: ArtistVerificationApplication | null = null;
  if (user?.artistId) {
    const [app] = await sql<any[]>`
      SELECT id, artist_id as "artistId", user_id as "userId", stage_name as "stageName",
             legal_name as "legalName", contact_email as "contactEmail", contact_phone as "contactPhone",
             country, city, primary_genre as "primaryGenre", supporting_links as "supportingLinks",
             note, status, admin_feedback as "adminFeedback", reviewed_at as "reviewedAt",
             reviewer_id as "reviewerId", created_at as "createdAt", updated_at as "updatedAt"
      FROM artist_verification_applications
      WHERE artist_id = ${user.artistId}
      ORDER BY created_at DESC
      LIMIT 1
    `;
    if (app) {
      verificationApplication = {
        id: app.id,
        artistId: app.artistId,
        userId: app.userId,
        stageName: app.stageName,
        legalName: app.legalName,
        contactEmail: app.contactEmail,
        contactPhone: app.contactPhone || undefined,
        country: app.country || undefined,
        city: app.city || undefined,
        primaryGenre: app.primaryGenre || undefined,
        supportingLinks: Array.isArray(app.supportingLinks) ? app.supportingLinks : [],
        note: app.note || undefined,
        status: app.status,
        adminFeedback: app.adminFeedback || null,
        reviewedAt: app.reviewedAt
          ? app.reviewedAt instanceof Date
            ? app.reviewedAt.toISOString()
            : String(app.reviewedAt)
          : null,
        reviewerId: app.reviewerId || null,
        createdAt:
          app.createdAt instanceof Date ? app.createdAt.toISOString() : String(app.createdAt),
        updatedAt:
          app.updatedAt instanceof Date ? app.updatedAt.toISOString() : String(app.updatedAt),
      };
    }
  }

  return {
    artists,
    tracks,
    releases,
    playlists,
    genres,
    user,
    likedTrackIds,
    followingArtistIds,
    analytics,
    verificationApplication,
  };
});

async function fetchArtistAnalytics(artistId: string): Promise<Analytics> {
  const [stats] = await sql<
    {
      artistId: string;
      totalPlays: string | number;
      monthlyListeners: number;
      fans: number;
      growthPercent: string | number;
    }[]
  >`
    SELECT artist_id, total_plays, monthly_listeners, fans, growth_percent
    FROM artist_analytics
    WHERE artist_id = ${artistId}
    LIMIT 1
  `;

  if (!stats) {
    return fallbackAnalytics(artistId);
  }

  const timelineRows = await sql<{ label: string; plays: string | number; listeners: number }[]>`
    SELECT label, plays, listeners
    FROM analytics_timeline
    WHERE artist_id = ${artistId}
    ORDER BY id ASC
  `;

  const recentPlayRows = await sql<{ trackId: string; city: string; minutesAgo: number }[]>`
    SELECT track_id, city, minutes_ago
    FROM analytics_recent_plays
    WHERE artist_id = ${artistId}
    ORDER BY id ASC
  `;

  const releasePerfRows = await sql<{ releaseId: string; plays: string | number; saves: number }[]>`
    SELECT release_id, plays, saves
    FROM analytics_release_performance
    WHERE artist_id = ${artistId}
  `;

  const topTracks = await sql<{ id: string }[]>`
    SELECT id FROM tracks WHERE artist_id = ${artistId} ORDER BY play_count DESC LIMIT 5
  `;

  const [downloadRow] = await sql<{ totalDownloads: string | number }[]>`
    SELECT COALESCE(SUM(download_count), 0) as total_downloads
    FROM tracks
    WHERE artist_id = ${artistId}
  `;

  return {
    artistId,
    totalPlays: Number(stats.totalPlays) || 0,
    totalDownloads: Number(downloadRow?.totalDownloads) || 0,
    monthlyListeners: Number(stats.monthlyListeners) || 0,
    fans: Number(stats.fans) || 0,
    growthPercent: Number(stats.growthPercent) || 0,
    timeline: timelineRows.map((t) => ({
      label: t.label,
      plays: Number(t.plays) || 0,
      listeners: Number(t.listeners) || 0,
    })),
    topTrackIds: topTracks.map((t) => t.id),
    recentPlays: recentPlayRows.map((r) => ({
      trackId: r.trackId,
      city: r.city,
      minutesAgo: Number(r.minutesAgo) || 0,
    })),
    releasePerformance: releasePerfRows.map((rp) => ({
      releaseId: rp.releaseId,
      plays: Number(rp.plays) || 0,
      saves: Number(rp.saves) || 0,
    })),
  };
}

// ── Mutations ──

export const toggleLikeTrackFn = createServerFn({ method: "POST" })
  .validator((data: { trackId: string }) => data)
  .handler(async ({ data }) => {
    const user = await getUserFromSession();
    if (!user) throw new Error("Unauthorized");

    const { trackId } = data;
    if (!trackId) throw new Error("trackId required");

    const [existing] = await sql`
      SELECT user_id FROM likes WHERE user_id = ${user.id} AND track_id = ${trackId}
    `;

    if (existing) {
      await sql`DELETE FROM likes WHERE user_id = ${user.id} AND track_id = ${trackId}`;
      await sql`UPDATE tracks SET like_count = GREATEST(0, like_count - 1) WHERE id = ${trackId}`;
      return { liked: false, trackId };
    } else {
      await sql`INSERT INTO likes (user_id, track_id) VALUES (${user.id}, ${trackId})`;
      await sql`UPDATE tracks SET like_count = like_count + 1 WHERE id = ${trackId}`;
      return { liked: true, trackId };
    }
  });

export const recordTrackDownloadFn = createServerFn({ method: "POST" })
  .validator((data: { trackId: string }) => data)
  .handler(async ({ data }) => {
    const { trackId } = data;
    if (!trackId) throw new Error("trackId required");

    await sql`
      UPDATE tracks
      SET download_count = download_count + 1
      WHERE id = ${trackId}
    `;
    return { success: true, trackId };
  });

export const toggleFollowArtistFn = createServerFn({ method: "POST" })
  .validator((data: { artistId: string }) => data)
  .handler(async ({ data }) => {
    const user = await getUserFromSession();
    if (!user) throw new Error("Unauthorized");

    const { artistId } = data;
    if (!artistId) throw new Error("artistId required");

    const [existing] = await sql`
      SELECT user_id FROM follows WHERE user_id = ${user.id} AND artist_id = ${artistId}
    `;

    if (existing) {
      await sql`DELETE FROM follows WHERE user_id = ${user.id} AND artist_id = ${artistId}`;
      await sql`UPDATE artists SET fans = GREATEST(0, fans - 1) WHERE id = ${artistId}`;
      return { following: false, artistId };
    } else {
      await sql`INSERT INTO follows (user_id, artist_id) VALUES (${user.id}, ${artistId})`;
      await sql`UPDATE artists SET fans = fans + 1 WHERE id = ${artistId}`;
      return { following: true, artistId };
    }
  });

async function getEffectiveUser(): Promise<User> {
  const sessionUser = await getUserFromSession();
  if (sessionUser) return sessionUser;

  const [dbFallback] = await sql<
    {
      id: string;
      name: string;
      email: string;
      accountType: "listener" | "artist";
      avatarUrl: string | null;
      artistId: string | null;
    }[]
  >`
    SELECT id, name, email, account_type as "accountType", avatar_url as "avatarUrl", artist_id as "artistId"
    FROM users
    WHERE id = 'u2' OR id = 'u1'
    ORDER BY CASE WHEN id = 'u2' THEN 0 ELSE 1 END
    LIMIT 1
  `;

  if (dbFallback) {
    const res: User = {
      id: dbFallback.id,
      name: dbFallback.name,
      email: dbFallback.email,
      accountType: dbFallback.accountType,
      avatarUrl: dbFallback.avatarUrl || "",
    };
    if (dbFallback.artistId) {
      res.artistId = dbFallback.artistId;
    }
    return res;
  }

  return {
    id: "u2",
    name: "Zuri Mwangi",
    email: "zuri@plugg.fm",
    accountType: "artist",
    avatarUrl: "",
    artistId: "a1",
  };
}

export const createPlaylistFn = createServerFn({ method: "POST" })
  .validator((data: { id?: string; name: string; description?: string; coverUrl?: string }) => data)
  .handler(async ({ data }) => {
    const user = await getEffectiveUser();

    const { name, description, coverUrl } = data;
    const playlistId = data.id || crypto.randomUUID();
    const finalCover = coverUrl || "default_playlist";

    await sql`
      INSERT INTO playlists (id, user_id, name, description, cover_url, is_mock)
      VALUES (${playlistId}, ${user.id}, ${name}, ${description || ""}, ${finalCover}, false)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        cover_url = EXCLUDED.cover_url
    `;

    return {
      id: playlistId,
      userId: user.id,
      name,
      description: description || "",
      coverUrl: finalCover,
      trackIds: [],
    };
  });

export const addTrackToPlaylistFn = createServerFn({ method: "POST" })
  .validator((data: { playlistId: string; trackId: string }) => data)
  .handler(async ({ data }) => {
    const user = await getEffectiveUser();

    const { playlistId, trackId } = data;

    // Ensure playlist exists in DB if it was created client-side
    const [existingPlaylist] = await sql<{ id: string }[]>`
      SELECT id FROM playlists WHERE id = ${playlistId} LIMIT 1
    `;
    if (!existingPlaylist) {
      await sql`
        INSERT INTO playlists (id, user_id, name, description, cover_url, is_mock)
        VALUES (${playlistId}, ${user.id}, 'New Playlist', '', 'default_playlist', false)
        ON CONFLICT (id) DO NOTHING
      `;
    }

    const [maxPos] = await sql<{ pos: number }[]>`
      SELECT COALESCE(MAX(position), -1) + 1 as pos FROM playlist_tracks WHERE playlist_id = ${playlistId}
    `;
    const position = maxPos?.pos ?? 0;

    await sql`
      INSERT INTO playlist_tracks (playlist_id, track_id, position)
      VALUES (${playlistId}, ${trackId}, ${position})
      ON CONFLICT (playlist_id, track_id) DO NOTHING
    `;

    return { success: true };
  });

export const removeTrackFromPlaylistFn = createServerFn({ method: "POST" })
  .validator((data: { playlistId: string; trackId: string }) => data)
  .handler(async ({ data }) => {
    await getEffectiveUser();
    const { playlistId, trackId } = data;
    await sql`DELETE FROM playlist_tracks WHERE playlist_id = ${playlistId} AND track_id = ${trackId}`;
    return { success: true };
  });

export const deletePlaylistFn = createServerFn({ method: "POST" })
  .validator((data: { playlistId: string }) => data)
  .handler(async ({ data }) => {
    await getEffectiveUser();
    const { playlistId } = data;
    await sql`DELETE FROM playlist_tracks WHERE playlist_id = ${playlistId}`;
    await sql`DELETE FROM playlists WHERE id = ${playlistId}`;
    return { success: true };
  });

export const updatePlaylistFn = createServerFn({ method: "POST" })
  .validator(
    (data: {
      playlistId: string;
      patch: {
        name?: string | undefined;
        description?: string | undefined;
        coverUrl?: string | undefined;
      };
    }) => data,
  )
  .handler(async ({ data }) => {
    await getEffectiveUser();
    const { playlistId, patch } = data;
    await sql`
      UPDATE playlists
      SET
        name = COALESCE(${patch.name ?? null}, name),
        description = COALESCE(${patch.description ?? null}, description),
        cover_url = COALESCE(${patch.coverUrl ?? null}, cover_url),
        updated_at = now()
      WHERE id = ${playlistId}
    `;
    return { success: true };
  });

export const updateArtistProfileFn = createServerFn({ method: "POST" })
  .validator((data: Partial<Artist>) => data)
  .handler(async ({ data }) => {
    const user = await getUserFromSession();
    if (!user || user.accountType !== "artist" || !user.artistId) {
      throw new Error("Unauthorized artist");
    }

    const {
      username,
      displayName,
      bio,
      location,
      country,
      city,
      primaryGenre,
      additionalGenres,
      avatarUrl,
      coverUrl,
      phoneNumber,
      socialLinks,
    } = data;

    const cleanUsername = username
      ? username
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9_-]/g, "")
      : null;

    if (cleanUsername) {
      if (cleanUsername.length < 3 || cleanUsername.length > 15) {
        throw new Error(
          "Username must be between 3 and 15 characters (lowercase letters, numbers, hyphens, underscores)",
        );
      }
      if (!/^[a-z0-9_-]+$/.test(cleanUsername)) {
        throw new Error(
          "Username can only contain lowercase letters, numbers, hyphens (-), and underscores (_)",
        );
      }
      const existingArtist = await sql<{ id: string }[]>`
        SELECT id FROM artists WHERE lower(username) = ${cleanUsername} AND id != ${user.artistId} LIMIT 1
      `;
      const existingUser = await sql<{ id: string }[]>`
        SELECT id FROM users WHERE lower(username) = ${cleanUsername} AND id != ${user.id} LIMIT 1
      `;
      if (existingArtist.length > 0 || existingUser.length > 0) {
        throw new Error("Username is already taken");
      }
    }

    const cleanSocial = socialLinks ? parseSocialLinks(socialLinks) : null;

    await sql`
      UPDATE artists
      SET username = COALESCE(${cleanUsername}, username),
          display_name = COALESCE(${displayName ?? null}, display_name),
          bio = COALESCE(${bio ?? null}, bio),
          location = COALESCE(${location ?? null}, location),
          country = COALESCE(${country ?? null}, country),
          city = COALESCE(${city ?? null}, city),
          primary_genre = COALESCE(${primaryGenre ?? null}, primary_genre),
          additional_genres = COALESCE(${additionalGenres ?? null}, additional_genres),
          avatar_url = COALESCE(${avatarUrl ?? null}, avatar_url),
          cover_url = COALESCE(${coverUrl ?? null}, cover_url),
          phone_number = COALESCE(${phoneNumber ?? null}, phone_number),
          social_links = COALESCE(${cleanSocial ? sql.json(cleanSocial) : null}, social_links),
          updated_at = now()
      WHERE id = ${user.artistId}
    `;

    const [updated] = await sql<any[]>`
      SELECT id, username, display_name as "displayName", bio, location, country, city,
             primary_genre as "primaryGenre", additional_genres as "additionalGenres",
             avatar_url as "avatarUrl", cover_url as "coverUrl", verified, fans, 
             monthly_listeners as "monthlyListeners", total_plays as "totalPlays",
             phone_number as "phoneNumber", social_links as "socialLinks"
      FROM artists
      WHERE id = ${user.artistId}
    `;

    if (!updated) return null;

    return {
      ...updated,
      fans: Number(updated.fans) || 0,
      monthlyListeners: Number(updated.monthlyListeners) || 0,
      totalPlays: Number(updated.totalPlays) || 0,
      socialLinks: parseSocialLinks(updated.socialLinks),
    };
  });

export const createReleaseWithTracksFn = createServerFn({ method: "POST" })
  .validator(
    (data: {
      release: {
        title: string;
        type: "single" | "EP" | "album";
        genre: string;
        coverUrl: string;
        description?: string | undefined;
        label?: string | undefined;
        releaseDate: string;
        goLiveAt?: string | undefined;
        status?: ReleaseStatus | undefined;
        uploaderRole?: UploaderRole | undefined;
        rightsDeclarationAccepted?: boolean | undefined;
      };
      songs: {
        title: string;
        genre?: string | undefined;
        features?: string | undefined;
        producers?: string | undefined;
        lyrics?: string | undefined;
        durationSeconds: number;
        audioUrl?: string | undefined;
        recordingType?: RecordingType | undefined;
        hasSamplesOrBeats?: boolean | undefined;
        sampleDetails?: string | undefined;
        isrc?: string | undefined;
        fileHash?: string | undefined;
      }[];
    }) => data,
  )
  .handler(async ({ data }) => {
    const user = await getUserFromSession();
    if (!user || user.accountType !== "artist" || !user.artistId) {
      throw new Error("Unauthorized: Artist account required");
    }

    const { release, songs } = data;

    if (!release || !Array.isArray(songs) || songs.length < 1 || songs.length > 30 ||
        typeof release.title !== "string" || !release.title.trim() || release.title.length > 200 ||
        !["single", "EP", "album"].includes(release.type) ||
        songs.some(song => typeof song.title !== "string" || !song.title.trim() || song.title.length > 200)) {
      throw new Error("Provide a release title and between 1 and 30 named tracks.");
    }
    const { ownedUpload } = await import("@/server/upload-reference");
    const provider = process.env["STORAGE_PROVIDER"] || "local";
    if (release.status !== "draft") await ownedUpload(sql, release.coverUrl, user.id, "cover", provider);

    // Validate mandatory copyright declaration for non-draft submissions
    const isDraft = release.status === "draft";
    if (!isDraft && release.rightsDeclarationAccepted !== true) {
      throw new Error(
        "Mandatory copyright declaration must be confirmed before submitting for review.",
      );
    }

    const releaseId = crypto.randomUUID();
    const baseSlug =
      release.title
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-") || "release";
    const releaseSlug = `${baseSlug}-${Math.floor(100 + Math.random() * 900)}`;

    const goLive = release.goLiveAt
      ? new Date(release.goLiveAt)
      : new Date(goLiveAt(release.releaseDate));

    const { localAudioProcessingEnabled } = await import("@/server/processing-mode");
    const processingEnabled = localAudioProcessingEnabled();

    // New submissions enter processing -> under_review workflow unless explicitly saved as draft
    const initialStatus: ReleaseStatus = isDraft
      ? "draft"
      : processingEnabled
        ? "under_review"
        : "processing";
    const initialProcessingStatus = isDraft
      ? "completed"
      : processingEnabled
        ? "processing"
        : "pending";
    const reviewHistory = isDraft
      ? []
      : [
          {
            id: crypto.randomUUID(),
            action: "submitted" as const,
            timestamp: new Date().toISOString(),
            actorId: user.id,
            actorName: user.name,
          },
        ];

    // Pre-resolve song hashes and validate ISRCs
    let initialRightsHold = false;
    let initialRightsHoldReason: string | null = null;

    const processedSongs: {
      song: (typeof songs)[number];
      fileHash: string | null;
      normIsrc: string | null;
    }[] = [];

    for (const song of songs) {
      // Never trust a submitted hash or another artist's storage URL.
      const uploaded = song.audioUrl
        ? await ownedUpload(sql, song.audioUrl, user.id, "audio", provider)
        : null;
      if (!isDraft && !uploaded) throw new Error("Upload audio for every track before submitting.");
      const hash = uploaded?.fileHash || null;

      // 2. Validate and normalize ISRC if supplied
      let normIsrc: string | null = null;
      if (song.isrc) {
        if (!isValidIsrc(song.isrc)) {
          throw new Error(
            `Invalid ISRC format: "${song.isrc}". Official ISRC must be 12 alphanumeric characters (e.g. US-RC1-76-04981).`,
          );
        }
        normIsrc = normalizeIsrc(song.isrc);
      }

      // 3. Duplicate detection across accounts
      if (hash) {
        const matches = await sql<{ id: string; artist_id: string; title: string }[]>`
          SELECT t.id, t.artist_id, t.title
          FROM tracks t
          JOIN releases r ON r.id = t.release_id
          WHERE t.file_hash = ${hash}
            AND r.status IN ('processing', 'under_review', 'changes_required', 'scheduled', 'published')
          LIMIT 5
        `;
        const foreignMatch = matches.find((m) => m.artist_id !== user.artistId);
        if (foreignMatch) {
          // Different account exact same file: Flag for rights review, hold release from auto-publishing
          initialRightsHold = true;
          initialRightsHoldReason = `Exact audio duplicate match detected across accounts. Release held for copyright review.`;
        }
      }

      // 4. ISRC conflict detection across accounts
      if (normIsrc) {
        const isrcMatches = await sql<{ id: string; artist_id: string }[]>`
          SELECT id, artist_id FROM tracks WHERE isrc = ${normIsrc} LIMIT 5
        `;
        const foreignIsrcMatch = isrcMatches.find((m) => m.artist_id !== user.artistId);
        if (foreignIsrcMatch) {
          initialRightsHold = true;
          initialRightsHoldReason = `ISRC conflict (${normIsrc}) detected across accounts. Release held for administrative review.`;
        }
      }

      processedSongs.push({ song, fileHash: hash, normIsrc });
    }

    const createdTrackJobs: { trackId: string; audioUrl: string | null }[] = [];

    const declarationAccepted = !isDraft && Boolean(release.rightsDeclarationAccepted);
    const declarationText = declarationAccepted ? PLUGG_RIGHTS_DECLARATION_TEXT : null;
    const declarationVersion = declarationAccepted ? PLUGG_RIGHTS_DECLARATION_VERSION : null;
    const declarationUserId = declarationAccepted ? user.id : null;

    await sql.begin(async (tx) => {
      await tx`
        INSERT INTO releases (
          id, artist_id, title, slug, type, cover_url, release_date, status, go_live_at,
          description, label, review_submitted_at, audio_processing_status, review_history, is_mock,
          uploader_role, rights_declaration_text, rights_declaration_version,
          rights_declaration_timestamp, rights_declared_by_user_id,
          rights_hold, rights_hold_reason, rights_hold_placed_at, rights_hold_placed_by
        )
        VALUES (
          ${releaseId},
          ${user.artistId!},
          ${release.title},
          ${releaseSlug},
          ${release.type},
          ${release.coverUrl || ""},
          ${release.releaseDate},
          ${initialStatus},
          ${!isNaN(goLive.getTime()) ? goLive : null},
          ${release.description || null},
          ${release.label || null},
          ${isDraft ? null : sql`now()`},
          ${initialProcessingStatus},
          ${JSON.stringify(reviewHistory)},
          false,
          ${release.uploaderRole || "owner"},
          ${declarationText},
          ${declarationVersion},
          ${declarationAccepted ? sql`now()` : null},
          ${declarationUserId},
          ${initialRightsHold},
          ${initialRightsHoldReason},
          ${initialRightsHold ? sql`now()` : null},
          ${initialRightsHold ? "system" : null}
        )
      `;

      for (let i = 0; i < processedSongs.length; i++) {
        const item = processedSongs[i];
        if (!item) continue;
        const { song, fileHash, normIsrc } = item;
        const trackId = crypto.randomUUID();
        const songBaseSlug =
          song.title
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "-")
            .replace(/-+/g, "-") || "track";
        const songSlug = `${songBaseSlug}-${Math.floor(100 + Math.random() * 900)}`;

        // Generate Plugg Track ID using the sequence (concurrency-safe)
        const idRows = await tx<{ pluggTrackId: string }[]>`
          SELECT 'PLG-' || EXTRACT(YEAR FROM now())::INT || '-' || LPAD(nextval('plugg_track_id_seq')::TEXT, 6, '0') AS plugg_track_id
        `;
        const newPluggTrackId = idRows[0]?.pluggTrackId;
        if (!newPluggTrackId) {
          throw new Error("Failed to generate Plugg Track ID");
        }

        await tx`
          INSERT INTO tracks (
            id, plugg_track_id, artist_id, release_id, title, slug, genre, cover_url, audio_url,
            duration_seconds, play_count, published, release_date, features, producers, lyrics,
            recording_type, has_samples_or_beats, sample_details, isrc, file_hash,
            audio_processing_status, is_mock
          )
          VALUES (
            ${trackId},
            ${newPluggTrackId},
            ${user.artistId!},
            ${releaseId},
            ${song.title},
            ${songSlug},
            ${song.genre || release.genre || ""},
            ${release.coverUrl || ""},
            ${song.audioUrl || null},
            ${song.durationSeconds || 0},
            0,
            false,
            ${release.releaseDate},
            ${song.features || null},
            ${song.producers || null},
            ${song.lyrics || null},
            ${song.recordingType || "original"},
            ${Boolean(song.hasSamplesOrBeats)},
            ${song.sampleDetails || null},
            ${normIsrc},
            ${fileHash},
            ${initialProcessingStatus},
            false
          )
        `;

        await tx`
          INSERT INTO release_tracks (release_id, track_id, position)
          VALUES (${releaseId}, ${trackId}, ${i})
        `;

        createdTrackJobs.push({ trackId, audioUrl: song.audioUrl || null });
      }
    });

    // Run audio variant generation in background / async for real audio files
    if (processingEnabled && !isDraft && createdTrackJobs.length > 0) {
      (async () => {
        try {
          const { processMasterAudio } = await import("@/server/audio-processor");
          let allSuccess = true;
          for (const job of createdTrackJobs) {
            if (!job.audioUrl) continue;
            const cleanKey = decodeURIComponent(
              job.audioUrl.replace(/^\/api\/stream\//, "").replace(/^\/api\/file\//, ""),
            );
            const res = await processMasterAudio(cleanKey, job.trackId);
            if (!res.success) allSuccess = false;
          }
          await sql`
            UPDATE releases
            SET
              status = ${allSuccess ? "under_review" : "processing"},
              audio_processing_status = ${allSuccess ? "completed" : "failed"},
              updated_at = now()
            WHERE id = ${releaseId}
          `;
        } catch (procErr) {
          console.error("Background variant processing error for release:", releaseId, procErr);
          await sql`
            UPDATE releases
            SET audio_processing_status = 'failed', updated_at = now()
            WHERE id = ${releaseId}
          `;
        }
      })();
    }

    return {
      success: true,
      releaseId,
      status: initialStatus,
      rightsHold: initialRightsHold,
      rightsHoldReason: initialRightsHoldReason,
    };
  });

export const approveReleaseFn = createServerFn({ method: "POST" })
  .validator((data: { releaseId: string; newReleaseDate?: string | undefined }) => data)
  .handler(async ({ data }) => {
    const { getCookie } = await import("@tanstack/react-start/server");
    const { reviewRelease } = await import("@/server/admin-review");
    return reviewRelease(getCookie("plugg_session"), {
      action: "approve",
      releaseId: data.releaseId,
      ...(data.newReleaseDate ? { date: data.newReleaseDate } : {}),
    });
  });
export const requestChangesReleaseFn = createServerFn({ method: "POST" })
  .validator((data: { releaseId: string; feedback: string }) => data)
  .handler(async ({ data }) => {
    const { getCookie } = await import("@tanstack/react-start/server");
    const { reviewRelease } = await import("@/server/admin-review");
    return reviewRelease(getCookie("plugg_session"), {
      action: "request_changes",
      releaseId: data.releaseId,
      feedback: data.feedback,
    });
  });

export const resubmitReleaseFn = createServerFn({ method: "POST" })
  .validator(
    (data: { releaseId: string; releaseDate?: string | undefined; notes?: string | undefined }) =>
      data,
  )
  .handler(async ({ data }) => {
    const user = await getUserFromSession();
    if (!user || user.accountType !== "artist" || !user.artistId) {
      throw new Error("Unauthorized: Artist account required");
    }

    const { releaseId, releaseDate, notes } = data;
    return sql.begin(async (tx) => {
      await tx`SELECT pg_advisory_xact_lock(734821,1)`;
      const [release] =
        await tx`SELECT id,status,release_date::text,review_history FROM releases WHERE id=${releaseId} AND artist_id=${user.artistId!} FOR UPDATE`;
      if (!release || !["changes_required", "draft"].includes(release["status"]))
        throw new Error("Only your draft or correction-requested release can be resubmitted.");
      const [last] =
        await tx`SELECT action FROM admin_audit_log WHERE target_type='release' AND target_id=${releaseId} AND action IN ('release.takedown','release.reinstate') ORDER BY id DESC LIMIT 1`;
      if (last?.["action"] === "release.takedown")
        throw new Error("This release is taken down. Contact an administrator.");
      const { futureMidnight } = await import("@/server/admin-review");
      const { decodeJson } = await import("@/components/admin/model");
      const date = releaseDate || release["releaseDate"];
      const [clock] = await tx<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
      const at = futureMidnight(date, clock!.now);
      const raw = decodeJson(release["reviewHistory"]);
      const history = Array.isArray(raw) ? raw : [];
      history.push({
        id: crypto.randomUUID(),
        action: "resubmitted",
        timestamp: clock!.now.toISOString(),
        actorId: user.id,
        actorName: user.name,
        feedback: notes || "Corrections applied and resubmitted by artist.",
      });
      await tx`UPDATE releases SET status='under_review',release_date=${date},go_live_at=${at},review_submitted_at=now(),review_history=${tx.json(history)},updated_at=now() WHERE id=${releaseId}`;
      return { success: true, releaseId, status: "under_review" };
    });
  });

export const retryTrackProcessingFn = createServerFn({ method: "POST" })
  .validator((data: { trackId: string }) => data)
  .handler(async ({ data }) => {
    const { getCookie } = await import("@tanstack/react-start/server");
    const { retryAudio } = await import("@/server/admin-retry");
    return retryAudio(getCookie("plugg_session"), data.trackId, true);
  });

export const updateReleaseFn = createServerFn({ method: "POST" })
  .validator(
    (data: {
      releaseId: string;
      patch: {
        title?: string | undefined;
        description?: string | undefined;
        coverUrl?: string | undefined;
      };
    }) => data,
  )
  .handler(async ({ data }) => {
    const user = await getUserFromSession();
    if (!user || user.accountType !== "artist" || !user.artistId) {
      throw new Error("Unauthorized: Artist account required");
    }

    const { releaseId, patch } = data;
    await sql`
      UPDATE releases
      SET
        title = COALESCE(${patch.title ?? null}, title),
        description = COALESCE(${patch.description ?? null}, description),
        cover_url = COALESCE(${patch.coverUrl ?? null}, cover_url),
        updated_at = now()
      WHERE id = ${releaseId} AND artist_id = ${user.artistId}
    `;
    return { success: true };
  });

export const updateTrackFn = createServerFn({ method: "POST" })
  .validator(
    (data: {
      trackId: string;
      patch: {
        title?: string | undefined;
        features?: string | undefined;
        producers?: string | undefined;
        lyrics?: string | undefined;
        recordingType?: RecordingType | undefined;
        hasSamplesOrBeats?: boolean | undefined;
        sampleDetails?: string | undefined;
        isrc?: string | undefined;
      };
    }) => data,
  )
  .handler(async ({ data }) => {
    const user = await getUserFromSession();
    if (!user || user.accountType !== "artist" || !user.artistId) {
      throw new Error("Unauthorized: Artist account required");
    }

    const { trackId, patch } = data;

    let normIsrc: string | null | undefined = undefined;
    if (patch.isrc !== undefined) {
      if (patch.isrc && !isValidIsrc(patch.isrc)) {
        throw new Error(
          `Invalid ISRC format: "${patch.isrc}". Must be 12 alphanumeric characters.`,
        );
      }
      normIsrc = patch.isrc ? normalizeIsrc(patch.isrc) : null;
    }

    await sql`
      UPDATE tracks
      SET
        title = COALESCE(${patch.title ?? null}, title),
        features = COALESCE(${patch.features ?? null}, features),
        producers = COALESCE(${patch.producers ?? null}, producers),
        lyrics = COALESCE(${patch.lyrics ?? null}, lyrics),
        recording_type = COALESCE(${patch.recordingType ?? null}, recording_type),
        has_samples_or_beats = COALESCE(${patch.hasSamplesOrBeats ?? null}, has_samples_or_beats),
        sample_details = COALESCE(${patch.sampleDetails ?? null}, sample_details),
        isrc = CASE WHEN ${patch.isrc !== undefined} THEN ${normIsrc ?? null} ELSE isrc END,
        updated_at = now()
      WHERE id = ${trackId} AND artist_id = ${user.artistId}
    `;
    return { success: true };
  });

export const replaceTrackAudioFn = createServerFn({ method: "POST" })
  .validator(
    (data: { trackId: string; audioUrl: string; durationSeconds?: number | undefined }) => data,
  )
  .handler(async ({ data }) => {
    const user = await getUserFromSession();
    if (!user || user.accountType !== "artist" || !user.artistId) {
      throw new Error("Unauthorized: Artist account required");
    }

    const { trackId, audioUrl } = data;

    if (process.env["STORAGE_PROVIDER"] === "r2") {
      const { ownedUpload } = await import("@/server/upload-reference");
      const file = await ownedUpload(sql, audioUrl, user.id, "audio", "r2");
      return sql.begin(async tx => {
        const [target] = await tx`SELECT r.id,r.status FROM releases r JOIN tracks t ON t.release_id=r.id WHERE t.id=${trackId} AND t.artist_id=${user.artistId!} FOR UPDATE OF r`;
        if (!target || !["changes_required", "draft", "under_review"].includes(target["status"])) throw new Error("Replacement requires a draft or release awaiting review/corrections.");
        await tx`SELECT id FROM tracks WHERE id=${trackId} FOR UPDATE`;
        await tx`UPDATE tracks SET audio_url=${audioUrl},file_hash=${file.fileHash},audio_variants='{}',technical_validation='{}',audio_processing_status='pending',published=false,updated_at=now() WHERE id=${trackId}`;
        await tx`UPDATE releases SET status='processing',audio_processing_status='pending',reviewer_id=NULL,updated_at=now() WHERE id=${target["id"]}`;
        await tx`UPDATE tracks SET published=false WHERE release_id=${target["id"]}`;
        const [duplicate] = await tx`SELECT id FROM tracks WHERE file_hash=${file.fileHash} AND artist_id<>${user.artistId!} LIMIT 1`;
        if (duplicate) await tx`UPDATE releases SET rights_hold=true,rights_hold_reason='Replacement recording matches another artist. Staff rights review required.',rights_hold_placed_at=now(),rights_hold_placed_by='system' WHERE id=${target["id"]}`;

        return { success: true, trackId, pending: true, variants: {}, technicalValidation: {} };
      });
    }

    // Verify track ownership and allowed replacement state
    const [track] = await sql<
      {
        id: string;
        release_id: string;
        artist_id: string;
        plugg_track_id: string;
        title: string;
        status: ReleaseStatus;
      }[]
    >`
      SELECT t.id, t.release_id, t.artist_id, t.plugg_track_id, t.title, r.status
      FROM tracks t
      JOIN releases r ON r.id = t.release_id
      WHERE t.id = ${trackId} AND t.artist_id = ${user.artistId}
    `;

    if (!track) {
      throw new Error("Track not found or you are not authorized to edit it.");
    }

    if (!["changes_required", "draft", "under_review"].includes(track.status)) {
      throw new Error(
        "Audio replacement is only permitted for releases in Changes Required, Draft, or Under Review status.",
      );
    }

    const cleanKey = decodeURIComponent(
      audioUrl.replace(/^\/api\/stream\//, "").replace(/^\/api\/file\//, ""),
    );

    const { replaceTrackAudioMaster } = await import("@/server/audio-processor");
    const result = await replaceTrackAudioMaster(cleanKey, trackId, user.id, user.name);

    if (!result.success) {
      throw new Error(result.error || "Failed to process replacement audio");
    }

    return {
      success: true,
      trackId,
      pluggTrackId: track.plugg_track_id,
      variants: result.variants,
      technicalValidation: result.technicalValidation,
    };
  });

export const checkAudioDuplicateFn = createServerFn({ method: "POST" })
  .validator((data: { fileHash: string }) => data)
  .handler(async ({ data }) => {
    const user = await getUserFromSession();
    const { fileHash } = data;
    if (!fileHash) return { isDuplicate: false, sameArtist: false };

    const matches = await sql<
      {
        id: string;
        artist_id: string;
        title: string;
        release_id: string;
        release_title: string;
        isrc: string | null;
      }[]
    >`
      SELECT t.id, t.artist_id, t.title, t.release_id, r.title as release_title, t.isrc
      FROM tracks t
      JOIN releases r ON r.id = t.release_id
      WHERE t.file_hash = ${fileHash}
        AND r.status IN ('processing', 'under_review', 'changes_required', 'scheduled', 'published')
      LIMIT 1
    `;

    if (matches.length === 0) {
      return { isDuplicate: false, sameArtist: false };
    }

    const match = matches[0]!;
    const sameArtist = Boolean(user?.artistId && match.artist_id === user.artistId);

    // If same artist, return release and track info so they can navigate or reuse safely
    if (sameArtist) {
      return {
        isDuplicate: true,
        sameArtist: true,
        existingTrackId: match.id,
        existingTrackTitle: match.title,
        existingReleaseId: match.release_id,
        existingReleaseTitle: match.release_title,
        isrc: match.isrc || undefined,
      };
    }

    // If different artist, strictly protect private metadata and identity
    return {
      isDuplicate: true,
      sameArtist: false,
    };
  });

export const deleteReleaseFn = createServerFn({ method: "POST" })
  .validator((data: { releaseId: string }) => data)
  .handler(async ({ data }) => {
    const user = await getUserFromSession();
    if (!user || user.accountType !== "artist" || !user.artistId) {
      throw new Error("Unauthorized: Artist account required");
    }

    const { releaseId } = data;
    const artistId = user.artistId;

    await sql.begin(async (tx) => {
      const [owned] =
        await tx`SELECT id FROM releases WHERE id=${releaseId} AND artist_id=${artistId} FOR UPDATE`;
      if (!owned) throw new Error("Release not found or not owned by artist");
      await tx`DELETE FROM release_tracks WHERE release_id = ${releaseId}`;
      await tx`
        DELETE FROM playlist_tracks 
        WHERE track_id IN (SELECT id FROM tracks WHERE release_id = ${releaseId})
      `;
      await tx`
        DELETE FROM likes 
        WHERE track_id IN (SELECT id FROM tracks WHERE release_id = ${releaseId})
      `;
      await tx`
        DELETE FROM analytics_recent_plays 
        WHERE track_id IN (SELECT id FROM tracks WHERE release_id = ${releaseId})
      `;
      await tx`
        DELETE FROM plays 
        WHERE track_id IN (SELECT id FROM tracks WHERE release_id = ${releaseId})
      `;
      await tx`
        DELETE FROM files 
        WHERE track_id IN (SELECT id FROM tracks WHERE release_id = ${releaseId})
      `;
      await tx`DELETE FROM analytics_release_performance WHERE release_id = ${releaseId}`;
      await tx`DELETE FROM tracks WHERE release_id = ${releaseId} AND artist_id = ${artistId}`;
      await tx`DELETE FROM releases WHERE id = ${releaseId} AND artist_id = ${artistId}`;
    });

    return { success: true };
  });

export const upgradeToArtistFn = createServerFn({ method: "POST" })
  .validator(
    (data: { displayName: string; location?: string; bio?: string; avatarKey?: string }) => data,
  )
  .handler(async ({ data }) => {
    const user = await getUserFromSession();
    if (!user) throw new Error("Unauthorized");

    const { displayName, location, bio, avatarKey } = data;

    const artistId = crypto.randomUUID();
    const username =
      displayName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-") || "artist";
    const uniqueUsername = `${username}-${Math.floor(100 + Math.random() * 900)}`;

    await sql.begin(async (tx) => {
      await tx`
        INSERT INTO artists (id, username, display_name, bio, location, avatar_url, cover_url, is_mock)
        VALUES (${artistId}, ${uniqueUsername}, ${displayName}, ${bio || ""}, ${location || ""}, ${avatarKey || ""}, '', false)
      `;

      await tx`
        UPDATE users
        SET account_type = 'artist',
            artist_id = ${artistId},
            updated_at = now()
        WHERE id = ${user.id}
      `;

      await tx`
        INSERT INTO artist_analytics (artist_id, total_plays, monthly_listeners, fans, growth_percent)
        VALUES (${artistId}, 0, 0, 0, 0)
        ON CONFLICT (artist_id) DO NOTHING
      `;
    });

    return {
      id: artistId,
      username: uniqueUsername,
      displayName,
      bio: bio || "",
      location: location || "",
      avatarUrl: avatarKey || "",
      coverUrl: "",
      verified: false,
      fans: 0,
      monthlyListeners: 0,
      totalPlays: 0,
      phoneNumber: "",
      socialLinks: {},
    };
  });

export const getTrackShareData = createServerFn({ method: "GET" })
  .validator((d: string) => d)
  .handler(async ({ data: trackId }) => {
    try {
      const dbTracks = await sql<
        {
          id: string;
          pluggTrackId: string;
          artistId: string;
          releaseId: string;
          title: string;
          slug: string;
          genre: string;
          coverUrl: string;
          audioUrl: string | null;
          durationSeconds: number;
          playCount: string | number;
          features: string | null;
          producers: string | null;
          lyrics: string | null;
          artistName: string | null;
          artistUsername: string | null;
          artistAvatarUrl: string | null;
          releaseTitle: string | null;
          releaseSlug: string | null;
        }[]
      >`
        SELECT t.id, t.plugg_track_id as "pluggTrackId", t.artist_id as "artistId", t.release_id as "releaseId", t.title, t.slug,
               t.genre, t.cover_url as "coverUrl", t.audio_url as "audioUrl", t.duration_seconds as "durationSeconds",
               t.play_count as "playCount", t.features, t.producers, t.lyrics,
               a.display_name as "artistName", a.username as "artistUsername", a.avatar_url as "artistAvatarUrl",
               r.title as "releaseTitle", r.slug as "releaseSlug"
        FROM tracks t
        LEFT JOIN artists a ON a.id = t.artist_id
        LEFT JOIN releases r ON r.id = t.release_id
        WHERE t.id = ${trackId}
        LIMIT 1
      `;

      if (dbTracks.length > 0) {
        const row = dbTracks[0]!;
        return {
          id: row.id,
          pluggTrackId: row.pluggTrackId || undefined,
          artistId: row.artistId,
          releaseId: row.releaseId,
          title: row.title,
          slug: row.slug,
          genre: row.genre || "",
          coverUrl: row.coverUrl || "",
          audioUrl: row.audioUrl || null,
          durationSeconds: Number(row.durationSeconds) || 0,
          playCount: Number(row.playCount) || 0,
          features: row.features || undefined,
          producers: row.producers || undefined,
          lyrics: row.lyrics || undefined,
          artistName: row.artistName || "Artist",
          artistUsername: row.artistUsername || "",
          artistAvatarUrl: row.artistAvatarUrl || "",
          releaseTitle: row.releaseTitle || "",
          releaseSlug: row.releaseSlug || "",
        };
      }
    } catch (e) {
      console.error("Error looking up track from database:", e);
    }

    // Fallback to seed data
    const seedTrack = seedTracks.find((t) => t.id === trackId);
    if (!seedTrack) return null;
    const seedArtist = seedArtists.find((a) => a.id === seedTrack.artistId);
    const seedRelease = seedReleases.find((r) => r.id === seedTrack.releaseId);
    return {
      id: seedTrack.id,
      artistId: seedTrack.artistId,
      releaseId: seedTrack.releaseId,
      title: seedTrack.title,
      slug: seedTrack.slug,
      genre: seedTrack.genre,
      coverUrl: seedTrack.coverUrl,
      audioUrl: seedTrack.audioUrl,
      durationSeconds: seedTrack.durationSeconds,
      playCount: seedTrack.playCount,
      features: seedTrack.features,
      producers: seedTrack.producers,
      lyrics: seedTrack.lyrics,
      artistName: seedArtist?.displayName ?? "Artist",
      artistUsername: seedArtist?.username ?? "",
      artistAvatarUrl: seedArtist?.avatarUrl ?? "",
      releaseTitle: seedRelease?.title ?? "",
      releaseSlug: seedRelease?.slug ?? "",
    };
  });

export const submitVerificationApplicationFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => verificationInput.parse(data))
  .handler(async ({ data }) => {
    const user = await getUserFromSession();
    return sql.begin((tx) => submitVerificationApplication(tx, user, data));
  });
