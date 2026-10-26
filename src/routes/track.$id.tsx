import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Play, Pause, Heart, Download, Share2, Sparkles, Music2 } from "lucide-react";

import { Rail, ReleaseCard, TrackRow } from "@/components/plugg/media";
import { Button, SectionHeader } from "@/components/plugg/primitives";
import { AddToPlaylistButton } from "@/components/plugg/add-to-playlist-button";
import { ShareModal } from "@/components/plugg/share-modal";
import { art } from "@/data/covers";
import { formatCount, formatDuration } from "@/lib/plugg";
import { getTrackShareData } from "@/server-fns/data-functions";
import { usePlugg } from "@/state/plugg-store";
import { toast } from "sonner";

export const Route = createFileRoute("/track/$id")({
  loader: async ({ params }) => {
    try {
      const data = await getTrackShareData({ data: params.id });
      if (!data) throw notFound();
      return data;
    } catch {
      throw notFound();
    }
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Track not found — Plugg" },
          { name: "robots", content: "noindex" },
        ],
      };
    }

    const title = `${loaderData.title} — ${loaderData.artistName}${loaderData.features ? ` (feat. ${loaderData.features})` : ""}`;
    const description = `Stream "${loaderData.title}" by ${loaderData.artistName} on Plugg. High quality African music streaming.`;
    
    // Resolve absolute image URL for WhatsApp / social crawlers
    const rawCover = art(loaderData.coverUrl);
    const envUrl = typeof process !== "undefined" ? process.env["VITE_APP_URL"] : undefined;
    const domain = envUrl ? envUrl.replace(/\/$/, "") : "https://plugg.app";
    const imageUrl = rawCover.startsWith("http://") || rawCover.startsWith("https://")
      ? rawCover
      : `${domain}${rawCover.startsWith("/") ? "" : "/"}${rawCover}`;

    const trackUrl = `${domain}/track/${params.id}`;

    return {
      meta: [
        { title: `${title} | Plugg` },
        { name: "description", content: description },

        // Open Graph / WhatsApp
        { property: "og:site_name", content: "Plugg" },
        { property: "og:type", content: "music.song" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:image", content: imageUrl },
        { property: "og:image:alt", content: title },
        { property: "og:url", content: trackUrl },
        { property: "music:duration", content: String(loaderData.durationSeconds || 0) },
        { property: "music:musician", content: loaderData.artistName },

        // Twitter Card
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: imageUrl },
      ],
    };
  },
  component: TrackPage,
});

function TrackPage() {
  const loaderData = Route.useLoaderData();
  const { id } = Route.useParams();
  const {
    tracks,
    artists,
    releases,
    playTrack,
    togglePlay,
    currentTrack,
    isPlaying,
    isLiked,
    toggleLike,
    playlists,
    addTrackToPlaylist,
    recordDownload,
  } = usePlugg();

  const [shareOpen, setShareOpen] = useState(false);

  // Match hydrated client track or fallback to loaderData
  const track = tracks.find((t) => t.id === id) || {
    id: loaderData.id,
    pluggTrackId: loaderData.pluggTrackId,
    artistId: loaderData.artistId,
    releaseId: loaderData.releaseId,
    title: loaderData.title,
    slug: loaderData.slug,
    genre: loaderData.genre,
    coverUrl: loaderData.coverUrl,
    audioUrl: loaderData.audioUrl,
    durationSeconds: loaderData.durationSeconds,
    playCount: loaderData.playCount,
    published: true,
    releaseDate: "",
    features: loaderData.features,
    producers: loaderData.producers,
    lyrics: loaderData.lyrics,
  };

  const artist = artists.find((a) => a.id === track.artistId) || {
    id: loaderData.artistId,
    username: loaderData.artistUsername,
    displayName: loaderData.artistName,
    avatarUrl: loaderData.artistAvatarUrl,
  };

  const release = releases.find((r) => r.id === track.releaseId);
  const isCurrent = currentTrack?.id === track.id;
  const isPlayingThis = isCurrent && isPlaying;
  const liked = isLiked(track.id);

  // Auto-play when opened via share link
  useEffect(() => {
    if (track && currentTrack?.id !== track.id) {
      playTrack(track.id, [track.id]);
    }
  }, [track?.id]);

  // Other tracks by this artist
  const artistTracks = tracks.filter((t) => t.artistId === track.artistId && t.id !== track.id);
  const artistReleases = releases.filter((r) => r.artistId === track.artistId);

  return (
    <div className="space-y-10 pt-14 md:pt-0 pb-16">
      {/* Streaming Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-surface/80 via-surface/40 to-transparent p-6 sm:p-8 border border-white/5 shadow-2xl">
        <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-center sm:items-end">
          {/* Cover Art with glow */}
          <div className="relative group shrink-0">
            <div className="absolute -inset-1 rounded-2xl bg-primary/20 blur-xl opacity-75 group-hover:opacity-100 transition duration-500" />
            <img
              src={art(track.coverUrl)}
              alt={track.title}
              className="relative h-48 w-48 sm:h-60 sm:w-60 rounded-2xl object-cover shadow-2xl border border-white/10"
            />
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0 text-center sm:text-left space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
              <Sparkles size={13} />
              <span>Streaming on Plugg</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white line-clamp-2">
              {track.title}
            </h1>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-sm">
              <Link
                to="/artist/$username"
                params={{ username: artist.username }}
                className="inline-flex items-center gap-2 font-semibold text-foreground hover:text-primary transition-colors"
              >
                {artist.avatarUrl ? (
                  <img src={art(artist.avatarUrl)} alt="" className="h-6 w-6 rounded-full object-cover" />
                ) : null}
                <span>{artist.displayName}</span>
              </Link>
              {track.features ? (
                <span className="text-muted-foreground">feat. {track.features}</span>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-muted-foreground">
              <span className="rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5">
                {track.genre || "African Music"}
              </span>
              <span>•</span>
              <span>{formatDuration(track.durationSeconds)}</span>
              <span>•</span>
              <span>{formatCount(track.playCount)} streams</span>
              {release ? (
                <>
                  <span>•</span>
                  <Link
                    to="/release/$slug"
                    params={{ slug: release.slug }}
                    className="hover:text-foreground underline underline-offset-2"
                  >
                    From {release.title}
                  </Link>
                </>
              ) : null}
            </div>

            {/* Action Buttons */}
            <div className="pt-3 flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <button
                onClick={() => {
                  if (isCurrent) togglePlay();
                  else playTrack(track.id, [track.id]);
                }}
                className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-lg hover:scale-105 active:scale-95 transition-all"
              >
                {isPlayingThis ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                <span>{isPlayingThis ? "Pause" : "Play Stream"}</span>
              </button>

              <Button variant="outline" onClick={() => toggleLike(track.id)} className="rounded-full">
                <Heart size={16} fill={liked ? "currentColor" : "none"} className={liked ? "text-primary" : ""} />
                <span>{liked ? "Liked" : "Like"}</span>
              </Button>

              <AddToPlaylistButton
                trackIds={[track.id]}
                variant="outline"
                label="Add to Playlist"
              />

              <Button
                variant="outline"
                onClick={() => {
                  if (!recordDownload(track.id)) {
                    toast.error("Download limit reached for today");
                  }
                }}
                className="rounded-full"
              >
                <Download size={16} />
                <span>Download</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => setShareOpen(true)}
                className="rounded-full bg-white/10 text-white hover:bg-white/15"
              >
                <Share2 size={16} />
                <span>Share</span>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Lyrics or Track Info */}
      {track.lyrics ? (
        <section className="rounded-2xl border border-white/5 bg-surface/50 p-6 space-y-3">
          <SectionHeader title="Lyrics" />
          <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/80 max-w-2xl font-sans">
            {track.lyrics}
          </p>
        </section>
      ) : null}

      {/* More tracks from this artist */}
      {artistTracks.length > 0 && (
        <section className="space-y-4">
          <SectionHeader title={`More from ${artist.displayName}`} />
          <div className="track-list">
            {artistTracks.slice(0, 5).map((t, idx) => (
              <TrackRow key={t.id} track={t} index={idx} showArtist={false} queueIds={[t.id, ...artistTracks.map((x) => x.id)]} />
            ))}
          </div>
        </section>
      )}

      {/* More releases */}
      {artistReleases.length > 0 && (
        <section className="space-y-4">
          <SectionHeader title="Releases" />
          <Rail>
            {artistReleases.map((r) => (
              <ReleaseCard key={r.id} release={r} artist={artist as any} />
            ))}
          </Rail>
        </section>
      )}

      {/* Share Modal */}
      {shareOpen && <ShareModal trackId={track.id} onClose={() => setShareOpen(false)} />}
    </div>
  );
}
