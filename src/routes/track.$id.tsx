import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Play, Pause, Heart, Download, Share2, Sparkles, Music2, ChevronDown } from "lucide-react";

import { Rail, ReleaseCard, TrackRow } from "@/components/plugg/media";
import { Button, SectionHeader } from "@/components/plugg/primitives";
import { AddToPlaylistButton } from "@/components/plugg/add-to-playlist-button";
import { ShareModal } from "@/components/plugg/share-modal";
import { art } from "@/data/covers";
import { buildTrackHeadMeta, DEFAULT_PUBLIC_ORIGIN } from "@/lib/og-meta";
import { formatCount, formatDuration, buildTrackDownloadFilename } from "@/lib/plugg";
import { cn } from "@/lib/utils";
import { getTrackShareData } from "@/server-fns/data-functions";
import { usePlugg } from "@/state/plugg-store";
import { toast } from "sonner";


export const Route = createFileRoute("/track/$id")({
  loader: async ({ params }) => {
    const data = await getTrackShareData({ data: params.id });
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData, params }) => {
    const origin =
      loaderData?.origin ||
      (typeof window !== "undefined" ? window.location.origin : DEFAULT_PUBLIC_ORIGIN);
    return buildTrackHeadMeta(loaderData, params.id, origin);
  },
  component: TrackPage,
});

function TrackPage() {
  const loaderData = Route.useLoaderData();
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
    settings,
  } = usePlugg();

  const [shareOpen, setShareOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);

  // Match hydrated client track or fallback to loaderData
  const track = tracks.find((t) => t.id === loaderData.id) || {
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

              <div className="relative">
                <Button
                  variant="outline"
                  onClick={() => setDownloadOpen((prev) => !prev)}
                  className="rounded-full gap-2 cursor-pointer"
                >
                  <Download size={16} />
                  <span>Download</span>
                  <ChevronDown
                    size={14}
                    className={cn("transition-transform duration-200", downloadOpen && "rotate-180")}
                  />
                </Button>

                {downloadOpen && (
                  <div className="absolute left-0 sm:left-auto sm:right-0 z-50 mt-1.5 w-52 overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-2xl animate-in fade-in slide-in-from-top-1 duration-150">
                    {[
                      { id: "data_saver" as const, label: "Data Saver (96 kbps)" },
                      { id: "standard" as const, label: "Standard (160 kbps)" },
                      { id: "very_high" as const, label: "Very High (256 kbps)" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          if (!recordDownload(track.id)) {
                            toast.error("Download limit reached for today");
                            setDownloadOpen(false);
                            return;
                          }
                          if (track.audioUrl) {
                            let targetAudioUrl = track.audioUrl;
                            if (track.audioVariants) {
                              const variantKey =
                                opt.id === "data_saver"
                                  ? "download_96k"
                                  : opt.id === "very_high"
                                    ? "download_256k"
                                    : "download_160k";
                              if (track.audioVariants[variantKey]?.url) {
                                targetAudioUrl = track.audioVariants[variantKey].url;
                              }
                            }
                            const ext = "m4a";
                            const fileName = buildTrackDownloadFilename(track.title, artist?.displayName, track.features, ext);
                            const downloadUrl = new URL(targetAudioUrl, window.location.origin);
                            downloadUrl.searchParams.set("filename", fileName);
                            downloadUrl.searchParams.set("quality", opt.id);
                            downloadUrl.searchParams.set("download", "1");

                            const a = document.createElement("a");
                            a.href = downloadUrl.toString();
                            a.download = fileName;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                          }
                          setDownloadOpen(false);
                        }}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-medium text-foreground hover:bg-elevated hover:text-primary transition-colors cursor-pointer"
                      >
                        <span>{opt.label}</span>
                        <Download size={12} className="opacity-60" />
                      </button>
                    ))}
                  </div>
                )}
              </div>


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
