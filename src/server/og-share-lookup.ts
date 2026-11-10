import sql from "@/lib/db";
import { artists as seedArtists } from "@/data/artists";
import { releases as seedReleases } from "@/data/releases";
import { tracks as seedTracks } from "@/data/tracks";

export interface TrackShareRecord {
  id: string;
  pluggTrackId?: string | undefined;
  artistId: string;
  releaseId: string;
  title: string;
  slug: string;
  genre: string;
  coverUrl: string;
  audioUrl: string | null;
  durationSeconds: number;
  playCount: number;
  features?: string | undefined;
  producers?: string | undefined;
  lyrics?: string | undefined;
  artistName: string;
  artistUsername: string;
  artistAvatarUrl: string;
  releaseTitle: string;
  releaseSlug: string;
  isPublic: boolean;
}

export interface ReleaseShareRecord {
  id: string;
  artistId: string;
  title: string;
  slug: string;
  type: "single" | "EP" | "album";
  coverUrl: string;
  status: string;
  artistName: string;
  artistUsername: string;
  artistAvatarUrl: string;
  trackCount: number;
  isPublic: boolean;
}

export interface ArtistShareRecord {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  coverUrl: string;
  verified: boolean;
  monthlyListeners: number;
}

export async function fetchTrackShareRecord(ref: string): Promise<TrackShareRecord | null> {
  const cleanRef = ref.trim();
  if (!cleanRef) return null;

  try {
    const dbTracks = await sql<
      {
        id: string;
        pluggTrackId: string | null;
        artistId: string;
        releaseId: string;
        title: string;
        slug: string;
        genre: string | null;
        coverUrl: string | null;
        audioUrl: string | null;
        durationSeconds: number | string | null;
        playCount: number | string | null;
        published: boolean;
        features: string | null;
        producers: string | null;
        lyrics: string | null;
        artistName: string | null;
        artistUsername: string | null;
        artistAvatarUrl: string | null;
        releaseTitle: string | null;
        releaseSlug: string | null;
        releaseStatus: string | null;
        rightsHold: boolean | null;
      }[]
    >`
      SELECT
        t.id,
        t.plugg_track_id as "pluggTrackId",
        t.artist_id as "artistId",
        t.release_id as "releaseId",
        t.title,
        t.slug,
        t.genre,
        COALESCE(NULLIF(t.cover_url, ''), r.cover_url, '') as "coverUrl",
        t.audio_url as "audioUrl",
        t.duration_seconds as "durationSeconds",
        t.play_count as "playCount",
        t.published,
        t.features,
        t.producers,
        t.lyrics,
        a.display_name as "artistName",
        a.username as "artistUsername",
        a.avatar_url as "artistAvatarUrl",
        r.title as "releaseTitle",
        r.slug as "releaseSlug",
        r.status as "releaseStatus",
        COALESCE(r.rights_hold, false) as "rightsHold"
      FROM tracks t
      LEFT JOIN artists a ON a.id = t.artist_id
      LEFT JOIN releases r ON r.id = t.release_id
      WHERE t.id = ${cleanRef} OR t.slug = ${cleanRef} OR t.plugg_track_id = ${cleanRef}
      ORDER BY (t.id = ${cleanRef}) DESC, (t.published = true) DESC, t.created_at DESC
      LIMIT 1
    `;

    const row = dbTracks[0];
    if (row) {
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
        isPublic: Boolean(row.published) && row.releaseStatus === "published" && !row.rightsHold,
      };
    }
  } catch (error) {
    console.error("Error looking up track share record:", error);
  }

  const seedTrack = seedTracks.find(
    (t) => t.id === cleanRef || t.slug === cleanRef || t.pluggTrackId === cleanRef,
  );
  if (!seedTrack) return null;

  const seedArtist = seedArtists.find((a) => a.id === seedTrack.artistId);
  const seedRelease = seedReleases.find((r) => r.id === seedTrack.releaseId);

  return {
    id: seedTrack.id,
    pluggTrackId: seedTrack.pluggTrackId,
    artistId: seedTrack.artistId,
    releaseId: seedTrack.releaseId,
    title: seedTrack.title,
    slug: seedTrack.slug,
    genre: seedTrack.genre,
    coverUrl: seedTrack.coverUrl || seedRelease?.coverUrl || "",
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
    isPublic: Boolean(seedTrack.published) && seedRelease?.status === "published",
  };
}

export async function fetchReleaseShareRecord(ref: string): Promise<ReleaseShareRecord | null> {
  const cleanRef = ref.trim();
  if (!cleanRef) return null;

  try {
    const dbReleases = await sql<
      {
        id: string;
        artistId: string;
        title: string;
        slug: string;
        type: "single" | "EP" | "album";
        coverUrl: string | null;
        status: string;
        rightsHold: boolean | null;
        artistName: string | null;
        artistUsername: string | null;
        artistAvatarUrl: string | null;
        trackCount: number | string | null;
      }[]
    >`
      SELECT
        r.id,
        r.artist_id as "artistId",
        r.title,
        r.slug,
        r.type,
        r.cover_url as "coverUrl",
        r.status,
        COALESCE(r.rights_hold, false) as "rightsHold",
        a.display_name as "artistName",
        a.username as "artistUsername",
        a.avatar_url as "artistAvatarUrl",
        (SELECT COUNT(*)::int FROM tracks t WHERE t.release_id = r.id) as "trackCount"
      FROM releases r
      LEFT JOIN artists a ON a.id = r.artist_id
      WHERE r.slug = ${cleanRef} OR r.id = ${cleanRef}
      ORDER BY (r.slug = ${cleanRef}) DESC, (r.status = 'published') DESC, r.created_at DESC
      LIMIT 1
    `;

    const row = dbReleases[0];
    if (row) {
      return {
        id: row.id,
        artistId: row.artistId,
        title: row.title,
        slug: row.slug,
        type: row.type,
        coverUrl: row.coverUrl || "",
        status: row.status,
        artistName: row.artistName || "Artist",
        artistUsername: row.artistUsername || "",
        artistAvatarUrl: row.artistAvatarUrl || "",
        trackCount: Number(row.trackCount) || 0,
        isPublic: row.status === "published" && !row.rightsHold,
      };
    }
  } catch (error) {
    console.error("Error looking up release share record:", error);
  }

  const seedRelease = seedReleases.find((r) => r.slug === cleanRef || r.id === cleanRef);
  if (!seedRelease) return null;
  const seedArtist = seedArtists.find((a) => a.id === seedRelease.artistId);

  return {
    id: seedRelease.id,
    artistId: seedRelease.artistId,
    title: seedRelease.title,
    slug: seedRelease.slug,
    type: seedRelease.type,
    coverUrl: seedRelease.coverUrl,
    status: seedRelease.status,
    artistName: seedArtist?.displayName ?? "Artist",
    artistUsername: seedArtist?.username ?? "",
    artistAvatarUrl: seedArtist?.avatarUrl ?? "",
    trackCount: seedRelease.trackIds.length,
    isPublic: seedRelease.status === "published",
  };
}

export async function fetchArtistShareRecord(ref: string): Promise<ArtistShareRecord | null> {
  const cleanRef = ref.trim();
  if (!cleanRef) return null;

  try {
    const dbArtists = await sql<
      {
        id: string;
        username: string;
        displayName: string;
        bio: string | null;
        avatarUrl: string | null;
        coverUrl: string | null;
        verified: boolean | null;
        monthlyListeners: number | string | null;
      }[]
    >`
      SELECT
        a.id,
        a.username,
        a.display_name as "displayName",
        a.bio,
        a.avatar_url as "avatarUrl",
        a.cover_url as "coverUrl",
        a.verified,
        a.monthly_listeners as "monthlyListeners"
      FROM artists a
      WHERE lower(a.username) = lower(${cleanRef}) OR a.id = ${cleanRef}
      ORDER BY (lower(a.username) = lower(${cleanRef})) DESC
      LIMIT 1
    `;

    const row = dbArtists[0];
    if (row) {
      return {
        id: row.id,
        username: row.username,
        displayName: row.displayName,
        bio: row.bio || "",
        avatarUrl: row.avatarUrl || "",
        coverUrl: row.coverUrl || "",
        verified: Boolean(row.verified),
        monthlyListeners: Number(row.monthlyListeners) || 0,
      };
    }
  } catch (error) {
    console.error("Error looking up artist share record:", error);
  }

  const seedArtist = seedArtists.find(
    (a) => a.username.toLowerCase() === cleanRef.toLowerCase() || a.id === cleanRef,
  );
  if (!seedArtist) return null;

  return {
    id: seedArtist.id,
    username: seedArtist.username,
    displayName: seedArtist.displayName,
    bio: seedArtist.bio,
    avatarUrl: seedArtist.avatarUrl,
    coverUrl: seedArtist.coverUrl,
    verified: seedArtist.verified,
    monthlyListeners: seedArtist.monthlyListeners,
  };
}
