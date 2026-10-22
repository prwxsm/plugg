import { Heart, MoreHorizontal, Trash, X, Share2, Plus } from "lucide-react";
import { useState, useEffect } from "react";

import { PlayButton, TrackRow } from "@/components/plugg/media";
import { Button, EmptyState, SectionHeader } from "@/components/plugg/primitives";
import { art } from "@/data/covers";
import { formatDuration } from "@/lib/plugg";
import { usePlugg } from "@/state/plugg-store";
import { useRouter } from "@tanstack/react-router";

import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/playlist/$id")({
  head: () => ({
    meta: [
      { title: "Playlist — Plugg" },
      { name: "description", content: "Play, reorder and manage the songs saved in your Plugg playlist." },
      { property: "og:title", content: "Playlist — Plugg" },
      { property: "og:description", content: "Your saved songs on Plugg." },
    ],
  }),
  component: PlaylistPage,
});

function PlaylistPage() {
  const { id } = Route.useParams();
  const {
    playlists,
    tracks,
    artists,
    playTrack,
    togglePlay,
    currentTrack,
    isPlaying,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
    deletePlaylist,
    toggleLikePlaylist,
    likedPlaylistIds,
  } = usePlugg();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menuOpen]);

  const playlist = playlists.find((p) => p.id === id);

  if (!playlist) {
    return (
      <EmptyState
        title="Playlist not found"
        description="This playlist doesn't exist anymore."
        ctaLabel="Back to library"
        ctaTo="/library"
      />
    );
  }

  const items = playlist.trackIds
    .map((tid) => tracks.find((t) => t.id === tid))
    .filter((t): t is (typeof tracks)[number] => Boolean(t));
  const queueIds = items.map((t) => t.id);
  const totalSeconds = items.reduce((sum, t) => sum + t.durationSeconds, 0);
  const playingHere = !!currentTrack && queueIds.includes(currentTrack.id) && isPlaying;
  const cover = items[0]?.coverUrl ?? playlist.coverUrl;

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-end">
        <img
          src={art(cover)}
          alt=""
          className="h-40 w-40 shrink-0 rounded-2xl object-cover shadow-2xl sm:h-52 sm:w-52"
        />
        <div className="min-w-0 space-y-3">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Playlist</p>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">{playlist.name}</h1>
          {playlist.description ? (
            <p className="max-w-xl text-sm text-muted-foreground">{playlist.description}</p>
          ) : null}
          <p className="text-sm text-muted-foreground">
            {items.length} {items.length === 1 ? "song" : "songs"}
            {items.length ? ` · ${formatDuration(totalSeconds)}` : ""}
          </p>
          {items.length ? (
            <div className="flex items-center gap-3">
              <PlayButton
                size="lg"
                label={playingHere ? "Pause playlist" : "Play playlist"}
                active={playingHere}
                onClick={() => {
                  if (currentTrack && queueIds.includes(currentTrack.id)) togglePlay();
                  else if (queueIds[0]) playTrack(queueIds[0], queueIds);
                }}
              />
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen((v) => !v);
                  }}
                  aria-label={`More options for ${playlist.name}`}
                  aria-expanded={menuOpen}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-muted-foreground transition-colors hover:text-foreground"
                >
                  <MoreHorizontal size={20} />
                </button>
                {menuOpen ? (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute left-0 sm:left-auto sm:right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-surface p-1.5 shadow-2xl"
                  >
                    <button
                      onClick={() => {
                        // TODO: Implement playlist sharing
                        alert("Share playlist placeholder");
                        setMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-elevated"
                    >
                      <Share2 size={16} className="text-muted-foreground" /> Share
                    </button>
                    <button
                      onClick={() => {
                        toggleLikePlaylist(playlist.id);
                        setMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-elevated"
                    >
                      <Heart size={16} className={likedPlaylistIds.includes(playlist.id) ? "text-primary fill-primary" : "text-muted-foreground"} />
                      {likedPlaylistIds.includes(playlist.id) ? "Remove from favorites" : "Add to favorites"}
                    </button>
                    <button
                      onClick={() => {
                        deletePlaylist(playlist.id);
                        router.navigate({ to: "/library" });
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10"
                    >
                      <Trash size={16} /> Delete playlist
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </header>

      {items.length ? (
        <section>
          <SectionHeader title="Songs" />
          <div className="track-list">
            {items.map((t, i) => (
              <div key={t.id} className="flex items-center gap-1">
                <div className="min-w-0 flex-1">
                  <TrackRow track={t} index={i} queueIds={queueIds} context="playlist" />
                </div>
                <button
                  onClick={() => removeTrackFromPlaylist(playlist.id, t.id)}
                  aria-label={`Remove ${t.title} from ${playlist.name}`}
                  className="shrink-0 rounded-full p-2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            {artists.length ? "Add more songs from the menu on any song row or from the suggestions below." : null}
          </p>
        </section>
      ) : (
        <EmptyState
          title="This playlist is empty"
          description="Add songs below or use the menu on any song to add it here."
          ctaLabel="Browse all music"
          ctaTo="/discover"
        />
      )}

      {tracks.filter((t) => !playlist.trackIds.includes(t.id)).length > 0 && (
        <section className="space-y-4 pt-4 border-t border-border/50">
          <SectionHeader
            title="Recommended songs"
            subtitle="Add songs directly to this playlist with one click."
          />
          <div className="grid gap-2 sm:grid-cols-2">
            {tracks
              .filter((t) => !playlist.trackIds.includes(t.id))
              .slice(0, 6)
              .map((t) => (
                <div
                  key={t.id}
                  className="surface-card flex items-center justify-between gap-3 p-3 transition-colors hover:bg-elevated"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={art(t.coverUrl)} alt="" className="h-11 w-11 rounded-lg object-cover shrink-0" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{t.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {artists.find((a) => a.id === t.artistId)?.displayName ?? "Artist"} · {t.genre}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => addTrackToPlaylist(playlist.id, t.id)}
                    className="shrink-0 text-xs px-3 py-1.5 h-8 gap-1.5"
                  >
                    <Plus size={14} /> Add
                  </Button>
                </div>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}
