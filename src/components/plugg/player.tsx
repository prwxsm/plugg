import { Link } from "@tanstack/react-router";
import {
  ChevronDown,
  Heart,
  Maximize2,
  Mic,
  Minimize2,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import { Button } from "@/components/ui/button";
import { art } from "@/data/covers";
import { formatCount, formatDuration } from "@/lib/plugg";
import { cn } from "@/lib/utils";
import { usePlugg } from "@/state/plugg-store";
import { PlayButton } from "./media";
import logoImg from "@/assets/logo.png";

function Scrubber({ className }: { className?: string }) {
  const { progress, duration, seek } = usePlugg();
  const percent = duration > 0 ? Math.min(100, Math.max(0, (progress / duration) * 100)) : 0;
  return (
    <input
      type="range"
      min={0}
      max={Math.max(duration, 1)}
      value={Math.min(progress, Math.max(duration, 1))}
      aria-label="Seek"
      onChange={(event) => seek(Number(event.target.value))}
      style={{ background: `linear-gradient(to right, var(--foreground) ${percent}%, var(--muted) ${percent}%)` }}
      className={cn("h-1 w-full cursor-pointer appearance-none rounded-full accent-primary", className)}
    />
  );
}

export function CompactPlayerButton() {
  const { currentTrack, progress, duration, setFullPlayerOpen, clearPlayer } = usePlugg();
  const startY = useRef<number | null>(null);
  const [dragY, setDragY] = useState(0);
  if (!currentTrack) return <span className="h-14 w-14 shrink-0" aria-hidden="true" />;

  const percent = duration > 0 ? Math.min(100, Math.max(0, (progress / duration) * 100)) : 0;
  const ring = `conic-gradient(var(--foreground) ${percent}%, var(--border-strong) ${percent}%)`;
  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    startY.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (startY.current === null) return;
    setDragY(Math.min(0, event.clientY - startY.current));
  };
  const onPointerUp = () => {
    if (dragY < -44) clearPlayer();
    else if (Math.abs(dragY) < 8) setFullPlayerOpen(true);
    startY.current = null;
    setDragY(0);
  };

  return (
    <div className="group/player relative -mt-4 h-14 w-14 shrink-0">
      <button
        type="button"
        aria-label={`Open player for ${currentTrack.title}. Swipe up to dismiss.`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          startY.current = null;
          setDragY(0);
        }}
        className="absolute inset-0 touch-none rounded-full p-[2px] shadow-2xl transition-transform"
        style={{ background: ring, transform: `translateY(${dragY}px)` }}
      >
        <img
          src={art(currentTrack.coverUrl)}
          alt=""
          className="h-full w-full rounded-full border-[3px] border-surface object-cover"
        />
      </button>
      <button
        type="button"
        onClick={clearPlayer}
        aria-label="Close player"
        className="absolute -right-1 -top-1 hidden h-5 w-5 items-center justify-center rounded-full border border-border-strong bg-foreground text-background shadow-lg group-hover/player:flex"
      >
        <X size={12} />
      </button>
    </div>
  );
}

export function PlayerBar() {
  const {
    currentTrack,
    isPlaying,
    togglePlay,
    next,
    previous,
    artists,
    isLiked,
    toggleLike,
    setFullPlayerOpen,
    fullPlayerOpen,
    volume,
    setVolume,
    clearPlayer,
    shuffle,
    toggleShuffle,
    repeatMode,
    cycleRepeat,
    settings,
  } = usePlugg();
  const artist = currentTrack ? artists.find((item) => item.id === currentTrack.artistId) : null;
  const hasTrack = Boolean(currentTrack);

  return (
    <>
      {/* ── Desktop player bar (Always visible at the bottom, even in full screen) ── */}
      <div className="fixed inset-x-0 bottom-0 z-[60] hidden h-[76px] border-t border-border/60 bg-background/95 backdrop-blur-2xl md:block shadow-[0_-8px_32px_rgba(0,0,0,0.45)]">
        <div className="grid h-full grid-cols-[minmax(220px,0.85fr)_minmax(360px,1.4fr)_minmax(220px,0.85fr)] items-center gap-5 px-6">
          {/* Left: Track thumbnail, title, artist, and immediately adjacent like button */}
          {hasTrack && currentTrack ? (
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setFullPlayerOpen(!fullPlayerOpen)}
                className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-lg shadow-sm"
                title={fullPlayerOpen ? "Collapse full player" : "Expand full player"}
              >
                <img
                  src={art(currentTrack.coverUrl)}
                  alt=""
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  {fullPlayerOpen ? <ChevronDown size={18} className="text-white" /> : <Maximize2 size={16} className="text-white" />}
                </div>
              </button>

              <div className="min-w-0 max-w-[190px] xl:max-w-[240px]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => setFullPlayerOpen(!fullPlayerOpen)}
                    className="truncate text-left text-sm font-semibold hover:underline"
                  >
                    {currentTrack.title}
                  </button>
                  {settings.highQualityStreaming && (
                    <span
                      title="High Quality Audio (320 kbps)"
                      className="shrink-0 rounded bg-primary/15 px-1 py-0.5 text-[9px] font-bold tracking-wider text-primary"
                    >
                      HQ
                    </span>
                  )}
                </div>
                {artist ? (
                  <Link
                    to="/artist/$username"
                    params={{ username: artist.username }}
                    onClick={() => setFullPlayerOpen(false)}
                    className="block truncate text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {artist.displayName}
                  </Link>
                ) : (
                  <span className="block truncate text-xs text-muted-foreground">Unknown artist</span>
                )}
              </div>

              {/* Like button positioned closely adjacent to the track info */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleLike(currentTrack.id)}
                aria-label={isLiked(currentTrack.id) ? "Unlike song" : "Like song"}
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
              >
                <Heart
                  size={16}
                  className={cn(isLiked(currentTrack.id) ? "fill-primary text-primary" : "")}
                />
              </Button>
            </div>
          ) : (
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-surface border border-border/40">
                <img src={logoImg} alt="" className="h-7 w-7 object-contain opacity-40" />
              </div>
              <div className="min-w-0">
                <span className="block truncate text-sm font-medium text-muted-foreground">Nothing playing</span>
                <span className="block truncate text-xs text-muted-foreground/60">Choose a song to start listening</span>
              </div>
            </div>
          )}

          {/* Center: Playback controls */}
          <div className="flex min-w-0 flex-col items-center gap-1.5">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleShuffle}
                aria-label="Shuffle"
                disabled={!hasTrack}
                className={cn(
                  "h-8 w-8 text-muted-foreground hover:text-foreground",
                  shuffle && "text-primary hover:text-primary",
                  !hasTrack && "pointer-events-none opacity-30"
                )}
              >
                <Shuffle size={15} />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={previous}
                aria-label="Previous song"
                disabled={!hasTrack}
                className={cn("h-8 w-8", !hasTrack && "pointer-events-none opacity-30")}
              >
                <SkipBack size={18} fill="currentColor" />
              </Button>

              <PlayButton
                label={isPlaying ? "Pause" : "Play"}
                active={isPlaying}
                size="sm"
                onClick={hasTrack ? togglePlay : () => {}}
              />

              <Button
                variant="ghost"
                size="icon"
                onClick={next}
                aria-label="Next song"
                disabled={!hasTrack}
                className={cn("h-8 w-8", !hasTrack && "pointer-events-none opacity-30")}
              >
                <SkipForward size={18} fill="currentColor" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={cycleRepeat}
                aria-label="Repeat"
                disabled={!hasTrack}
                className={cn(
                  "relative h-8 w-8 text-muted-foreground hover:text-foreground",
                  repeatMode !== "off" && "text-primary hover:text-primary",
                  !hasTrack && "pointer-events-none opacity-30"
                )}
              >
                {repeatMode === "one" ? <Repeat1 size={15} /> : <Repeat size={15} />}
              </Button>
            </div>

            <div className={cn("flex w-full max-w-lg items-center gap-2", !hasTrack && "pointer-events-none opacity-30")}>
              <PlayerTime current />
              <Scrubber />
              <PlayerTime />
            </div>
          </div>

          {/* Right: Volume & Full screen controls */}
          <div className={cn("flex items-center justify-end gap-1.5", !hasTrack && "pointer-events-none opacity-30")}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setFullPlayerOpen(!fullPlayerOpen)}
              aria-label={fullPlayerOpen ? "Exit full player" : "Open full player"}
              disabled={!hasTrack}
              className={cn("h-9 w-9 text-muted-foreground hover:text-foreground", fullPlayerOpen && "text-primary bg-secondary/60")}
              title={fullPlayerOpen ? "Collapse full screen" : "Full screen"}
            >
              {fullPlayerOpen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
            </Button>

            <div className="flex items-center gap-2 pl-1">
              <Volume2 size={17} className="text-muted-foreground" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                aria-label="Volume"
                onChange={(event) => setVolume(Number(event.target.value))}
                className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-muted accent-primary"
              />
            </div>

            {hasTrack ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={clearPlayer}
                aria-label="Close player"
                className="h-8 w-8 text-muted-foreground hover:text-foreground ml-1"
                title="Dismiss player"
              >
                <X size={15} />
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── Mobile player bar (slim, above bottom nav) ── */}
      {hasTrack && currentTrack ? (
        <div className="fixed inset-x-0 bottom-[68px] z-50 border-t border-border bg-background/95 backdrop-blur-xl md:hidden">
          <div
            role="button"
            tabIndex={0}
            onClick={() => setFullPlayerOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setFullPlayerOpen(true);
            }}
            className="flex w-full cursor-pointer items-center gap-3 px-4 py-2 text-left"
          >
            <img src={art(currentTrack.coverUrl)} alt="" className="h-11 w-11 shrink-0 rounded object-cover" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{currentTrack.title}</span>
              <span className="block truncate text-xs text-muted-foreground">{artist?.displayName}</span>
            </span>
            <div onClick={(e) => e.stopPropagation()}>
              <PlayButton label={isPlaying ? "Pause" : "Play"} active={isPlaying} size="sm" onClick={togglePlay} />
            </div>
          </div>
          <Scrubber className="absolute -top-0.5 left-0 !h-[3px] rounded-none" />
        </div>
      ) : null}
    </>
  );
}

function PlayerTime({ current = false }: { current?: boolean }) {
  const { progress, duration } = usePlugg();
  return (
    <span className="w-9 text-[11px] tabular-nums text-muted-foreground">
      {formatDuration(current ? Math.min(progress, duration || 0) : duration || 0)}
    </span>
  );
}

type InfoTab = "lyrics" | "about" | "credits";

export function FullPlayer() {
  const {
    currentTrack,
    fullPlayerOpen,
    setFullPlayerOpen,
    artists,
    releases,
    settings,
  } = usePlugg();

  const [activeTab, setActiveTab] = useState<InfoTab>("lyrics");

  // Lock body and html scrolling when full player is active to prevent page overlay appearance
  useEffect(() => {
    if (!fullPlayerOpen) return;
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, [fullPlayerOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!fullPlayerOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullPlayerOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fullPlayerOpen, setFullPlayerOpen]);

  if (!fullPlayerOpen || !currentTrack) return null;

  const artist = artists.find((item) => item.id === currentTrack.artistId);
  const release = releases.find((r) => r.id === currentTrack.releaseId);

  return (
    <div
      className="fixed inset-0 bottom-[76px] z-50 flex flex-col overflow-hidden bg-background md:bottom-[76px] animate-in fade-in duration-200 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="region"
      aria-label="Full screen player"
    >
      {/* Immersive blurred ambient backdrop */}
      <div className="pointer-events-none fixed inset-0 bottom-[76px] overflow-hidden">
        <img
          src={art(currentTrack.coverUrl)}
          alt=""
          className="h-full w-full scale-125 object-cover opacity-20 blur-3xl filter transition-all duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/90 to-background" />
      </div>

      <div className="relative mx-auto flex h-full w-full max-w-7xl flex-col justify-between px-6 py-4 sm:px-10 lg:px-14 overflow-hidden">
        {/* Top Header Bar: Clean, prominent Plugg branding without distracting buttons */}
        <header className="flex shrink-0 items-center justify-center py-3 sm:py-4">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="Plugg" className="h-9 w-9 sm:h-10 sm:w-10 object-contain drop-shadow" />
            <span className="font-display text-lg sm:text-xl font-bold tracking-wide text-foreground">
              plugg<span className="text-muted-foreground">.</span>
            </span>
          </div>
        </header>

        {/* Main Content Area: 45% Artwork (Left) / 55% Information (Right) */}
        <div className="my-auto grid w-full flex-1 grid-cols-1 items-center gap-8 py-2 lg:grid-cols-[45%_55%] lg:gap-14 overflow-hidden">
          {/* Left Column: Visual Identity (Large Artwork, Title, Artist — without duplicate like icon) */}
          <div className="flex flex-col items-center lg:items-start justify-center">
            <div className="relative aspect-square w-full max-w-[340px] sm:max-w-[420px] overflow-hidden rounded-2xl shadow-[0_24px_60px_-12px_rgba(0,0,0,0.85)] ring-1 ring-white/10 group transition-all duration-300">
              <img
                src={art(currentTrack.coverUrl)}
                alt={`${currentTrack.title} cover art`}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>

            <div className="mt-5 w-full max-w-[340px] sm:max-w-[420px]">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-2xl font-bold tracking-tight text-foreground sm:text-3xl" title={currentTrack.title}>
                  {currentTrack.title}
                </h1>
                {settings.highQualityStreaming && (
                  <span
                    title="High Quality Audio (320 kbps)"
                    className="shrink-0 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-primary"
                  >
                    HQ
                  </span>
                )}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {artist ? (
                  <Link
                    to="/artist/$username"
                    params={{ username: artist.username }}
                    onClick={() => setFullPlayerOpen(false)}
                    className="font-medium text-foreground/90 hover:text-foreground hover:underline transition-colors"
                  >
                    {artist.displayName}
                  </Link>
                ) : null}
                {currentTrack.features ? (
                  <span className="text-muted-foreground/75 truncate">
                    · feat. {currentTrack.features}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {/* Right Column: Information Layer (Lyrics | About | Credits) */}
          <div className="flex w-full flex-col justify-center overflow-hidden">
            {/* Tabs Header */}
            <div className="flex items-center gap-8 border-b border-border/40 pb-3">
              {(["lyrics", "about", "credits"] as const).map((tab) => {
                const isActive = activeTab === tab;
                const label = tab === "lyrics" ? "Lyrics" : tab === "about" ? "About" : "Credits";
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "relative text-sm font-semibold transition-colors pb-1 tracking-wide",
                      isActive
                        ? "text-foreground after:absolute after:-bottom-3.5 after:left-0 after:right-0 after:h-[2.5px] after:rounded-full after:bg-primary"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Tab Content Container (Fixed height with clean internal scroll) */}
            <div className="mt-5 h-[340px] sm:h-[400px] lg:h-[450px] w-full overflow-hidden">
              {/* Lyrics Tab */}
              {activeTab === "lyrics" ? (
                <div className="h-full overflow-y-auto pr-4 scrollbar-thin space-y-4">
                  {currentTrack.lyrics?.trim() ? (
                    <p className="whitespace-pre-line text-lg sm:text-xl font-medium leading-relaxed sm:leading-loose text-foreground/90 selection:bg-primary/25">
                      {currentTrack.lyrics}
                    </p>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center text-center p-6 text-muted-foreground space-y-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface border border-border text-muted-foreground/60">
                        <Mic size={24} />
                      </div>
                      <p className="text-base font-medium text-foreground">No lyrics available</p>
                      <p className="text-xs text-muted-foreground max-w-xs">
                        Lyrics haven't been added for this track yet. Sing along anyway!
                      </p>
                    </div>
                  )}
                </div>
              ) : null}

              {/* About Tab */}
              {activeTab === "about" ? (
                <div className="h-full overflow-y-auto pr-4 scrollbar-thin">
                  {artist ? (
                    <div className="rounded-2xl bg-surface/70 backdrop-blur-md p-6 space-y-6">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <img
                            src={art(artist.avatarUrl)}
                            alt={artist.displayName}
                            className="h-16 w-16 rounded-full object-cover ring-2 ring-border shadow-md"
                          />
                          <div>
                            <h3 className="text-lg font-bold text-foreground">
                              {artist.displayName}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {formatCount(artist.monthlyListeners)} monthly listeners
                            </p>
                          </div>
                        </div>

                        <Link
                          to="/artist/$username"
                          params={{ username: artist.username }}
                          onClick={() => setFullPlayerOpen(false)}
                          className="rounded-full bg-elevated px-4 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
                        >
                          View profile
                        </Link>
                      </div>

                      {artist.bio ? (
                        <div className="space-y-1.5 border-t border-border/40 pt-4">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            About the artist
                          </h4>
                          <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-line">
                            {artist.bio}
                          </p>
                        </div>
                      ) : null}

                      <div className="grid grid-cols-2 gap-4 border-t border-border/40 pt-4 text-xs">
                        <div>
                          <span className="text-muted-foreground block">Verified Artist</span>
                          <span className="font-medium text-foreground mt-0.5 block">Plugg Artist</span>
                        </div>
                        {release ? (
                          <div>
                            <span className="text-muted-foreground block">Current Release</span>
                            <span className="font-medium text-foreground mt-0.5 block truncate">{release.title}</span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No artist information available.</p>
                  )}
                </div>
              ) : null}

              {/* Credits Tab */}
              {activeTab === "credits" ? (
                <div className="h-full overflow-y-auto pr-4 scrollbar-thin">
                  <div className="rounded-2xl bg-surface/70 backdrop-blur-md p-6 space-y-5">
                    <div className="space-y-4 divide-y divide-border/40">
                      <div className="pt-0">
                        <span className="text-xs font-medium text-muted-foreground block">Performed by</span>
                        <span className="text-base font-semibold text-foreground mt-0.5 block">
                          {artist?.displayName ?? "Unknown artist"}
                        </span>
                        <span className="text-xs text-muted-foreground/70">Main artist</span>
                      </div>

                      {currentTrack.features?.trim() ? (
                        <div className="pt-3.5">
                          <span className="text-xs font-medium text-muted-foreground block">Featured artists</span>
                          <span className="text-sm font-semibold text-foreground mt-0.5 block">
                            {currentTrack.features}
                          </span>
                        </div>
                      ) : null}

                      <div className="pt-3.5">
                        <span className="text-xs font-medium text-muted-foreground block">Producers</span>
                        <span className="text-sm font-semibold text-foreground mt-0.5 block">
                          {currentTrack.producers?.trim() || artist?.displayName || "Not listed"}
                        </span>
                      </div>

                      {release ? (
                        <div className="pt-3.5 space-y-1">
                          <span className="text-xs font-medium text-muted-foreground block">Release info</span>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-foreground">{release.title}</span>
                            <span className="rounded bg-elevated px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              {release.type}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Release date: {release.releaseDate} · Genre: {currentTrack.genre}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}