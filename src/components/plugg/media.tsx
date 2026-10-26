import { Link, useRouter } from "@tanstack/react-router";
import {
  Check,
  Heart,
  ListPlus,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  ChevronLeft,
  User,
  Share2,
  Instagram,
  Twitter,
  Facebook,
  MessageCircle,
  Download,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { art } from "@/data/covers";
import type { Artist, Release, Track } from "@/data/types";
import { buildTrackDownloadFilename, formatCount, formatDuration } from "@/lib/plugg";
import { cn } from "@/lib/utils";
import { usePlugg } from "@/state/plugg-store";
import { VerifiedBadge } from "./primitives";
import { ShareModal } from "./share-modal";

export function Rail({ children }: { children: ReactNode }) {
  return <div className="rail-scroll -mx-1 flex gap-4 overflow-x-auto px-1 pb-2">{children}</div>;
}

export function PlayButton({
  active,
  onClick,
  size = "md",
  label,
}: {
  active?: boolean;
  onClick: () => void;
  size?: "sm" | "md" | "lg";
  label: string;
}) {
  const dims = size === "lg" ? "h-14 w-14" : size === "sm" ? "h-9 w-9" : "h-11 w-11";
  const icon = size === "lg" ? 24 : size === "sm" ? 16 : 18;
  return (
    <button
      aria-label={label}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform duration-200 hover:scale-105 active:scale-95",
        dims,
      )}
    >
      {active ? (
        <Pause size={icon} fill="currentColor" />
      ) : (
        <Play size={icon} fill="currentColor" />
      )}
    </button>
  );
}

export function ReleaseCard({
  release,
  artist,
  className,
}: {
  release: Release;
  artist: Artist | undefined;
  className?: string;
}) {
  const { playTrack, tracks, currentTrack, isPlaying, togglePlay } = usePlugg();
  const releaseTracks = tracks.filter((t) => release.trackIds.includes(t.id));
  const first = releaseTracks[0];
  const active = Boolean(first && currentTrack?.releaseId === release.id && isPlaying);

  return (
    <div className={cn("group", className || "w-[158px] shrink-0 sm:w-[184px]")}>
      <Link
        to="/release/$slug"
        params={{ slug: release.slug }}
        className="relative block overflow-hidden rounded-xl bg-surface [mask-image:radial-gradient(white,black)] [-webkit-mask-image:-webkit-radial-gradient(white,black)] [transform:translateZ(0)]"
      >
        <img
          src={art(release.coverUrl)}
          alt={`${release.title} cover art`}
          loading="lazy"
          className="aspect-square w-full rounded-xl object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <div className="absolute bottom-2.5 right-2.5 translate-y-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <PlayButton
            label={`Play ${release.title}`}
            active={active}
            size="sm"
            onClick={() =>
              first
                ? currentTrack?.id === first.id
                  ? togglePlay()
                  : playTrack(
                      first.id,
                      releaseTracks.map((t) => t.id),
                    )
                : undefined
            }
          />
        </div>
      </Link>
      <Link
        to="/release/$slug"
        params={{ slug: release.slug }}
        className="mt-3 block truncate text-sm font-medium hover:underline"
      >
        {release.title}
      </Link>
      {artist ? (
        <Link
          to="/artist/$username"
          params={{ username: artist.username }}
          className="mt-0.5 block truncate text-xs text-muted-foreground hover:text-foreground"
        >
          {artist.displayName}
        </Link>
      ) : null}
    </div>
  );
}

export function ArtistCard({
  artist,
  className,
  subtext,
  badge,
}: {
  artist: Artist;
  className?: string | undefined;
  subtext?: string | undefined;
  badge?: string | undefined;
}) {
  return (
    <Link
      to="/artist/$username"
      params={{ username: artist.username }}
      className={cn("group text-center", className || "w-[136px] shrink-0 sm:w-[150px]")}
    >
      <div className="relative mx-auto aspect-square w-full">
        <img
          src={art(artist.avatarUrl)}
          alt={artist.displayName}
          loading="lazy"
          className="aspect-square w-full rounded-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        {badge ? (
          <span className="absolute bottom-1 right-1 inline-flex items-center rounded-full bg-surface/90 px-2 py-0.5 text-[10px] font-semibold text-primary shadow-xs backdrop-blur-xs ring-1 ring-border/50">
            {badge}
          </span>
        ) : null}
      </div>
      <p className="mt-3 flex items-center justify-center gap-1 truncate text-sm font-medium">
        <span className="truncate">{artist.displayName}</span>
        {artist.verified ? <VerifiedBadge /> : null}
      </p>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">
        {subtext || `${formatCount(artist.monthlyListeners)} listeners`}
      </p>
    </Link>
  );
}

export function GenreTile({
  name,
  image,
  slug,
  onClick,
  active,
}: {
  name: string;
  image: string;
  slug?: string;
  onClick?: () => void;
  active?: boolean;
}) {
  const imageSrc = (slug && art(slug)) || art(image);
  const inner = (
    <>
      <img
        src={imageSrc}
        alt={name}
        loading="lazy"
        className="absolute inset-0 h-full w-full rounded-2xl object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
      />
      <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/40 to-transparent transition-opacity duration-300" />
      <span className="absolute bottom-3.5 left-4 font-display text-base font-bold tracking-tight text-white drop-shadow-md sm:bottom-4 sm:left-4.5 sm:text-lg">
        {name}
      </span>
    </>
  );
  const className = cn(
    "group relative block aspect-[2/1] w-full overflow-hidden rounded-2xl bg-black text-left isolate transition-all duration-300 hover:shadow-2xl hover:shadow-black/80 [mask-image:radial-gradient(white,black)] [-webkit-mask-image:-webkit-radial-gradient(white,black)] [transform:translateZ(0)]",
    active && "ring-2 ring-ring",
  );

  if (slug) {
    return (
      <Link to="/genre/$slug" params={{ slug }} className={className} aria-label={`Browse ${name}`}>
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className} aria-label={`Browse ${name}`}>
      {inner}
    </button>
  );
}

export function TrackRow({
  track,
  index,
  queueIds,
  showArtist = true,
  context = "default",
  customStat,
  customStatMobile,
  highlightDuration = false,
}: {
  track: Track;
  index?: number;
  queueIds?: string[];
  showArtist?: boolean;
  context?: "playlist" | "library" | "default";
  customStat?: ReactNode;
  customStatMobile?: ReactNode;
  highlightDuration?: boolean;
}) {
  const {
    playTrack,
    togglePlay,
    currentTrack,
    isPlaying,
    isLiked,
    toggleLike,
    artists,
    playlists,
    addTrackToPlaylist,
    createPlaylist,
    session,
    userTrackPlays,
    recordDownload,
    showAuthPrompt,
  } = usePlugg();
  const router = useRouter();
  const isCurrent = currentTrack?.id === track.id;
  const artist = artists.find((a) => a.id === track.artistId);
  const liked = isLiked(track.id);
  const [menuView, setMenuView] = useState<"closed" | "main" | "playlists" | "new-playlist">("closed");
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [shareModalOpen, setShareModalOpen] = useState(false);

  useEffect(() => {
    if (menuView === "closed") {
      setNewPlaylistName("");
      return;
    }
    const close = () => setMenuView("closed");
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menuView]);

  return (
    <div
      className={cn(
        "group flex items-center gap-3 px-0 py-3 transition-colors sm:gap-4",
        isCurrent && "bg-elevated/35",
      )}
    >
      <button
        onClick={() => (isCurrent ? togglePlay() : playTrack(track.id, queueIds))}
        aria-label={`Play ${track.title}`}
        className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md"
      >
        <img
          src={art(track.coverUrl)}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
        />
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center bg-black/55 opacity-0 transition-opacity group-hover:opacity-100",
            isCurrent && "opacity-100",
          )}
        >
          {isCurrent && isPlaying ? (
            <Pause size={16} className="text-white" fill="currentColor" />
          ) : (
            <Play size={16} className="text-white" fill="currentColor" />
          )}
        </span>
      </button>

      {typeof index === "number" ? (
        <span className="hidden w-5 text-right text-xs tabular-nums text-muted-foreground sm:block">
          {index + 1}
        </span>
      ) : null}

      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm font-medium", isCurrent && "text-primary")}>
          {track.title}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {showArtist && artist && (
            <Link
              to="/artist/$username"
              params={{ username: artist.username }}
              onClick={(e) => e.stopPropagation()}
              className="hover:underline"
            >
              {artist.displayName}
            </Link>
          )}
          {showArtist && artist ? " · " : ""}
          {track.genre}
        </p>
      </div>

      {customStatMobile !== undefined ? (
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground md:hidden">
          {customStatMobile}
        </span>
      ) : null}

      {context === "library" ? null : (
        <span className="hidden shrink-0 text-xs tabular-nums text-muted-foreground md:block">
          {customStat !== undefined ? (
            customStat
          ) : context === "playlist" ? (
            <>{formatCount(userTrackPlays[track.id] || 0)} plays</>
          ) : (
            <>{formatCount(track.playCount)} plays</>
          )}
        </span>
      )}

      <button
        onClick={() => toggleLike(track.id)}
        aria-label={liked ? "Remove from liked songs" : "Add to liked songs"}
        className={cn(
          "shrink-0 rounded-full p-2 transition-colors",
          liked ? "text-primary" : "text-muted-foreground hover:text-foreground",
          customStatMobile !== undefined && "hidden md:inline-flex",
        )}
      >
        <Heart size={16} fill={liked ? "currentColor" : "none"} />
      </button>

      <span
        className={cn(
          "w-10 shrink-0 text-right text-xs tabular-nums transition-colors",
          highlightDuration ? "font-semibold text-primary" : "text-muted-foreground",
          customStatMobile !== undefined && "hidden md:inline-block",
        )}
      >
        {formatDuration(track.durationSeconds)}
      </span>
      {context !== "playlist" ? (
        <div className="relative shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuView((v) => (v === "closed" ? "main" : "closed"));
            }}
            aria-label={`More options for ${track.title}`}
            aria-expanded={menuView !== "closed"}
            className="rounded-full p-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <MoreHorizontal size={16} />
          </button>

          {menuView !== "closed" ? (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 z-50 mt-1 w-56 overflow-hidden rounded-xl border border-border bg-surface p-1.5 shadow-2xl"
            >
              {menuView === "main" && (
                <>
                  <button
                    onClick={() => {
                      if (session === "loggedOut") {
                        setMenuView("closed");
                        showAuthPrompt({
                          title: "Sign in to save to playlists",
                          description: "Create an account or sign in to add songs to playlists.",
                        });
                        return;
                      }
                      setMenuView("playlists");
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-elevated text-foreground"
                  >
                    <ListPlus size={16} className="text-muted-foreground" />
                    Add to playlist
                  </button>
                  <button
                    onClick={() => {
                      setMenuView("closed");
                      if (artist) {
                        const el = document.getElementById("main-content");
                        if (el) el.scrollTop = 0;
                        router.navigate({
                          to: "/artist/$username",
                          params: { username: artist.username },
                        });
                      }
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-elevated text-foreground"
                  >
                    <User size={16} className="text-muted-foreground" />
                    Go to artist
                  </button>
                  <button
                    onClick={() => {
                      setShareModalOpen(true);
                      setMenuView("closed");
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-elevated text-foreground"
                  >
                    <Share2 size={16} className="text-muted-foreground" />
                    Share
                  </button>
                  <button
                    onClick={() => {
                      if (!recordDownload(track.id)) {
                        setMenuView("closed");
                        return;
                      }
                      if (track.audioUrl) {
                        const urlPath = track.audioUrl.split("?")[0] ?? "";
                        const urlExt = urlPath.split(".").pop()?.toLowerCase();
                        const ext = urlExt && ["mp3", "wav", "flac", "aac", "ogg", "m4a"].includes(urlExt) ? urlExt : "mp3";
                        const fileName = buildTrackDownloadFilename(track.title, artist?.displayName, track.features, ext);
                        
                        const downloadUrl = new URL(track.audioUrl, window.location.origin);
                        downloadUrl.searchParams.set("filename", fileName);

                        const a = document.createElement("a");
                        a.href = downloadUrl.toString();
                        a.download = fileName;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      }
                      setMenuView("closed");
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-elevated text-foreground"
                  >
                    <Download size={16} className="text-muted-foreground" />
                    Download
                  </button>
                </>
              )}

              {menuView === "playlists" && (
                <>
                  <button
                    onClick={() => setMenuView("main")}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-elevated mb-1"
                  >
                    <ChevronLeft size={16} /> Back
                  </button>
                  <div className="max-h-48 overflow-y-auto">
                    {session === "loggedOut" ? (
                      <p className="px-3 pb-2 text-xs text-muted-foreground">
                        Sign in to save songs to playlists.
                      </p>
                    ) : (
                      playlists.map((p) => {
                        const inPlaylist = p.trackIds.includes(track.id);
                        return (
                          <button
                            key={p.id}
                            onClick={() => {
                              if (!inPlaylist) {
                                addTrackToPlaylist(p.id, track.id);
                              }
                              setMenuView("closed");
                            }}
                            className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-elevated text-foreground"
                          >
                            <span className="flex items-center gap-3 min-w-0">
                              <ListPlus
                                size={16}
                                className={inPlaylist ? "text-primary" : "text-muted-foreground"}
                              />
                              <span className="truncate">{p.name}</span>
                            </span>
                            {inPlaylist ? (
                              <span className="flex items-center gap-1 text-xs text-primary shrink-0">
                                <Check size={14} /> Added
                              </span>
                            ) : null}
                          </button>
                        );
                      })
                    )}
                  </div>
                  {session !== "loggedOut" && (
                    <button
                      onClick={() => {
                        setNewPlaylistName("");
                        setMenuView("new-playlist");
                      }}
                      className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-primary hover:bg-elevated"
                    >
                      <Plus size={14} /> New playlist
                    </button>
                  )}
                </>
              )}

              {menuView === "new-playlist" && (
                <div className="p-2 space-y-3">
                  <button
                    type="button"
                    onClick={() => setMenuView("playlists")}
                    className="flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left text-xs font-medium text-muted-foreground hover:text-foreground mb-1"
                  >
                    <ChevronLeft size={16} /> Back
                  </button>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const trimmed = newPlaylistName.trim();
                      if (!trimmed) return;
                      const playlist = createPlaylist(trimmed);
                      if (playlist) {
                        addTrackToPlaylist(playlist.id, track.id);
                      }
                      setNewPlaylistName("");
                      setMenuView("closed");
                    }}
                    className="space-y-3"
                  >
                    <div>
                      <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">
                        Playlist name
                      </label>
                      <input
                        autoFocus
                        value={newPlaylistName}
                        onChange={(e) => setNewPlaylistName(e.target.value)}
                        placeholder="e.g. My Favorites"
                        className="w-full border-0 border-b border-white/20 bg-transparent px-1 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-white focus:outline-none focus:ring-0 transition-colors"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setNewPlaylistName("");
                          setMenuView("playlists");
                        }}
                        className="rounded-lg px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-elevated transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={!newPlaylistName.trim()}
                        className="rounded-lg bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-40 transition-opacity"
                      >
                        Save
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {shareModalOpen && <ShareModal trackId={track.id} onClose={() => setShareModalOpen(false)} />}
    </div>
  );
}
