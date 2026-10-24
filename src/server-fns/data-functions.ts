import { createServerFn } from "@tanstack/react-start";
import sql from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";
import type { Artist, Genre, Playlist, Release, Track, Analytics, User } from "@/data/types";
import { fallbackAnalytics } from "@/data/analytics";
import { goLiveAt } from "@/lib/plugg";

export const getInitialData = createServerFn({ method: "GET" }).handler(async () => {
  const user = await getUserFromSession();

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
    socialLinks: (typeof a.socialLinks === "object" && a.socialLinks !== null ? a.socialLinks : {}) as {
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
    }[]
  >`
    SELECT id, artist_id, release_id, title, slug, genre, cover_url, audio_url, 
           duration_seconds, play_count, COALESCE(download_count, 0) as download_count,
           COALESCE(like_count, 0) as like_count, published, release_date, features, producers, lyrics 
    FROM tracks
    ORDER BY created_at ASC
  `;

  const tracks: Track[] = dbTracks.map((t) => ({
    id: t.id,
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

  // Auto-sync status for scheduled releases that have reached their go_live_at
  try {
    await sql`
      UPDATE releases
      SET status = 'published', updated_at = now()
      WHERE status = 'scheduled' AND go_live_at IS NOT NULL AND go_live_at <= now()
    `;
    await sql`
      UPDATE tracks
      SET published = true, updated_at = now()
      WHERE published = false AND release_id IN (
        SELECT id FROM releases WHERE status = 'published'
      )
    `;
  } catch (syncErr) {
    console.warn("Could not auto-sync scheduled releases in fetchInitialDataFn:", syncErr);
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
      status: "published" | "scheduled" | "draft";
      goLiveAt: Date | string | null;
      description: string | null;
      label: string | null;
    }[]
  >`
    SELECT id, artist_id, title, slug, type, cover_url, release_date, status, go_live_at, description, label 
    FROM releases
    ORDER BY release_date DESC
  `;

  const releases: Release[] = dbReleases.map((r) => {
    const trackIds =
      releaseTrackMap.get(r.id) ??
      tracks.filter((t) => t.releaseId === r.id).map((t) => t.id);

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
    };
  });

  // Fetch playlists and playlist_tracks
  const dbPlaylists = await sql<
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
    WHERE is_mock = false
    ORDER BY created_at DESC
  `;

  const playlistTrackLinks = await sql<{ playlistId: string; trackId: string; position: number }[]>`
    SELECT playlist_id, track_id, position 
    FROM playlist_tracks 
    ORDER BY position ASC
  `;
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
  .validator(
    (data: { id?: string; name: string; description?: string; coverUrl?: string }) => data,
  )
  .handler(async ({ data }) => {
    const user = await getEffectiveUser();

    const { name, description, coverUrl } = data;
    const playlistId = data.id || crypto.randomUUID();
    const finalCover = coverUrl || "c6";

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
        VALUES (${playlistId}, ${user.id}, 'New Playlist', '', 'c6', false)
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

    const cleanUsername = username ? username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "") : null;

    if (cleanUsername) {
      if (cleanUsername.length < 3 || cleanUsername.length > 15) {
        throw new Error("Username must be between 3 and 15 characters (lowercase letters, numbers, hyphens, underscores)");
      }
      if (!/^[a-z0-9_-]+$/.test(cleanUsername)) {
        throw new Error("Username can only contain lowercase letters, numbers, hyphens (-), and underscores (_)");
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
          social_links = COALESCE(${socialLinks ? JSON.stringify(socialLinks) : null}::jsonb, social_links),
          updated_at = now()
      WHERE id = ${user.artistId}
    `;

    const [updated] = await sql<Artist[]>`
      SELECT id, username, display_name as "displayName", bio, location, country, city,
             primary_genre as "primaryGenre", additional_genres as "additionalGenres",
             avatar_url as "avatarUrl", cover_url as "coverUrl", verified, fans, 
             monthly_listeners as "monthlyListeners", total_plays as "totalPlays",
             phone_number as "phoneNumber", social_links as "socialLinks"
      FROM artists
      WHERE id = ${user.artistId}
    `;

    return updated;
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
        status?: "published" | "scheduled" | "draft" | undefined;
      };
      songs: {
        title: string;
        genre?: string | undefined;
        features?: string | undefined;
        producers?: string | undefined;
        lyrics?: string | undefined;
        durationSeconds: number;
        audioUrl?: string | undefined;
      }[];
    }) => data
  )
  .handler(async ({ data }) => {
    const user = await getUserFromSession();
    if (!user || user.accountType !== "artist" || !user.artistId) {
      throw new Error("Unauthorized: Artist account required");
    }

    const { release, songs } = data;

    const releaseId = crypto.randomUUID();
    const baseSlug = release.title.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-") || "release";
    const releaseSlug = `${baseSlug}-${Math.floor(100 + Math.random() * 900)}`;

    const goLive = release.goLiveAt
      ? new Date(release.goLiveAt)
      : new Date(goLiveAt(release.releaseDate));
    const isScheduled = !isNaN(goLive.getTime()) ? goLive.getTime() > Date.now() : false;
    const finalStatus: "published" | "scheduled" | "draft" =
      release.status || (isScheduled ? "scheduled" : "published");

    await sql.begin(async (tx) => {
      await tx`
        INSERT INTO releases (id, artist_id, title, slug, type, cover_url, release_date, status, go_live_at, description, label, is_mock)
        VALUES (
          ${releaseId},
          ${user.artistId!},
          ${release.title},
          ${releaseSlug},
          ${release.type},
          ${release.coverUrl || ""},
          ${release.releaseDate},
          ${finalStatus},
          ${!isNaN(goLive.getTime()) ? goLive : null},
          ${release.description || null},
          ${release.label || null},
          false
        )
      `;

      for (let i = 0; i < songs.length; i++) {
        const song = songs[i];
        if (!song) continue;
        const trackId = crypto.randomUUID();
        const songBaseSlug = song.title.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-") || "track";
        const songSlug = `${songBaseSlug}-${Math.floor(100 + Math.random() * 900)}`;

        await tx`
          INSERT INTO tracks (
            id, artist_id, release_id, title, slug, genre, cover_url, audio_url,
            duration_seconds, play_count, published, release_date, features, producers, lyrics, is_mock
          )
          VALUES (
            ${trackId},
            ${user.artistId!},
            ${releaseId},
            ${song.title},
            ${songSlug},
            ${song.genre || release.genre || ""},
            ${release.coverUrl || ""},
            ${song.audioUrl || null},
            ${song.durationSeconds || 0},
            0,
            ${!isScheduled},
            ${release.releaseDate},
            ${song.features || null},
            ${song.producers || null},
            ${song.lyrics || null},
            false
          )
        `;

        await tx`
          INSERT INTO release_tracks (release_id, track_id, position)
          VALUES (${releaseId}, ${trackId}, ${i})
        `;
      }
    });

    return { success: true, releaseId };
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
    }) => data
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
      };
    }) => data
  )
  .handler(async ({ data }) => {
    const user = await getUserFromSession();
    if (!user || user.accountType !== "artist" || !user.artistId) {
      throw new Error("Unauthorized: Artist account required");
    }

    const { trackId, patch } = data;
    await sql`
      UPDATE tracks
      SET
        title = COALESCE(${patch.title ?? null}, title),
        features = COALESCE(${patch.features ?? null}, features),
        producers = COALESCE(${patch.producers ?? null}, producers),
        lyrics = COALESCE(${patch.lyrics ?? null}, lyrics),
        updated_at = now()
      WHERE id = ${trackId} AND artist_id = ${user.artistId}
    `;
    return { success: true };
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
    (data: {
      displayName: string;
      location?: string;
      bio?: string;
      avatarKey?: string;
    }) => data
  )
  .handler(async ({ data }) => {
    const user = await getUserFromSession();
    if (!user) throw new Error("Unauthorized");

    const { displayName, location, bio, avatarKey } = data;

    const artistId = crypto.randomUUID();
    const username = displayName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-") || "artist";
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
