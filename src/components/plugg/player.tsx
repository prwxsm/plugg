import { Link } from "@tanstack/react-router";
import {
  ChevronDown,
  Heart,
  Maximize2,
  Mic,
  Minimize2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
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
  const { progress, duration, seek, isPlaying, getCurrentTime } = usePlugg();
  const fillRef = useRef<HTMLDivElement | null>(null);
  const thumbRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isDraggingRef = useRef(false);

  const initialPercent = duration > 0 ? Math.min(100, Math.max(0, (progress / duration) * 100)) : 0;

  // Real-time smooth flowing audio progress loop (60fps animation)
  useEffect(() => {
    if (!isPlaying || duration <= 0) {
      const pct = duration > 0 ? Math.min(100, Math.max(0, (progress / duration) * 100)) : 0;
      if (fillRef.current) fillRef.current.style.width = `${pct}%`;
      if (thumbRef.current) thumbRef.current.style.left = `${pct}%`;
      if (inputRef.current && !isDraggingRef.current) {
        inputRef.current.value = String(Math.min(progress, duration));
      }
      return;
    }

    let animId: number;
    const tick = () => {
      if (!isDraggingRef.current) {
        const cur = getCurrentTime();
        const pct = duration > 0 ? Math.min(100, Math.max(0, (cur / duration) * 100)) : 0;
        if (fillRef.current) fillRef.current.style.width = `${pct}%`;
        if (thumbRef.current) thumbRef.current.style.left = `${pct}%`;
        if (inputRef.current) {
          inputRef.current.value = String(Math.min(cur, duration));
        }
      }
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, duration, getCurrentTime, progress]);

  const isSlim = className?.includes("!h-[3px]") || className?.includes("rounded-none");

  return (
    <div
      className={cn(
        "group/scrubber relative flex w-full items-center select-none",
        isSlim ? "h-[3px] py-0 cursor-default" : "h-5 py-2 cursor-pointer",
        className
      )}
    >
      {/* Background track */}
      <div
        className={cn(
          "relative h-1 w-full bg-muted overflow-hidden transition-[height] duration-150",
          isSlim ? "!h-[3px] rounded-none" : "rounded-full group-hover/scrubber:h-1.5"
        )}
      >
        {/* Smooth flowing progress fill */}
        <div
          ref={fillRef}
          className={cn(
            "h-full bg-foreground will-change-[width]",
            isSlim ? "rounded-none" : "rounded-full"
          )}
          style={{ width: `${initialPercent}%` }}
        />
      </div>

      {/* Thumb handle (only shown on desktop scrubber on hover/active) */}
      {!isSlim && (
        <div
          ref={thumbRef}
          className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 rounded-full bg-foreground shadow-md opacity-0 group-hover/scrubber:opacity-100 transition-opacity duration-150"
          style={{ left: `${initialPercent}%` }}
        />
      )}

      {/* Native Range Input on top for accessibility, touch & keyboard control */}
      <input
        ref={inputRef}
        type="range"
        min={0}
        max={Math.max(duration, 1)}
        step="any"
        defaultValue={Math.min(progress, Math.max(duration, 1))}
        aria-label="Seek"
        onPointerDown={() => {
          isDraggingRef.current = true;
        }}
        onPointerUp={() => {
          isDraggingRef.current = false;
        }}
        onChange={(event) => {
          const val = Number(event.target.value);
          const pct = duration > 0 ? Math.min(100, Math.max(0, (val / duration) * 100)) : 0;
          if (fillRef.current) fillRef.current.style.width = `${pct}%`;
          if (thumbRef.current) thumbRef.current.style.left = `${pct}%`;
          seek(val);
        }}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0 z-10"
      />
    </div>
  );
}

export function CompactPlayerButton() {
  const { currentTrack, progress, duration, setFullPlayerOpen, clearPlayer, isPlaying, getCurrentTime } = usePlugg();
  const startY = useRef<number | null>(null);
  const [dragY, setDragY] = useState(0);
  const ringRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isPlaying || duration <= 0) {
      const pct = duration > 0 ? Math.min(100, Math.max(0, (progress / duration) * 100)) : 0;
      if (ringRef.current) {
        ringRef.current.style.background = `conic-gradient(var(--foreground) ${pct}%, var(--border-strong) ${pct}%)`;
      }
      return;
    }
    let animId: number;
    const tick = () => {
      const cur = getCurrentTime();
      const pct = duration > 0 ? Math.min(100, Math.max(0, (cur / duration) * 100)) : 0;
      if (ringRef.current) {
        ringRef.current.style.background = `conic-gradient(var(--foreground) ${pct}%, var(--border-strong) ${pct}%)`;
      }
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, duration, getCurrentTime, progress]);

  if (!currentTrack) return <span className="h-14 w-14 shrink-0" aria-hidden="true" />;

  const initialPercent = duration > 0 ? Math.min(100, Math.max(0, (progress / duration) * 100)) : 0;
  const ring = `conic-gradient(var(--foreground) ${initialPercent}%, var(--border-strong) ${initialPercent}%)`;
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
        ref={ringRef}
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

  const prevVolumeRef = useRef(volume > 0 ? volume : 0.8);
  useEffect(() => {
    if (volume > 0) {
      prevVolumeRef.current = volume;
    }
  }, [volume]);

  const toggleMute = () => {
    if (volume > 0) {
      prevVolumeRef.current = volume;
      setVolume(0);
    } else {
      setVolume(prevVolumeRef.current > 0 ? prevVolumeRef.current : 0.8);
    }
  };

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
                className={cn(
                  "group/like h-8 w-8 shrink-0 text-foreground hover:bg-accent hover:text-accent-foreground transition-colors",
                  isLiked(currentTrack.id) && "text-primary"
                )}
                title={isLiked(currentTrack.id) ? "Unlike" : "Like"}
              >
                <Heart
                  size={16}
                  className={cn(
                    "transition-colors",
                    isLiked(currentTrack.id)
                      ? "fill-current group-hover/like:fill-accent-foreground group-hover/like:text-accent-foreground"
                      : "group-hover/like:text-accent-foreground"
                  )}
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
                  "group/shuffle relative h-8 w-8 text-foreground hover:bg-accent hover:text-accent-foreground transition-colors",
                  shuffle && "text-primary",
                  !hasTrack && "pointer-events-none opacity-30"
                )}
                title={shuffle ? "Disable shuffle" : "Enable shuffle"}
              >
                <Shuffle size={15} className="transition-colors group-hover/shuffle:text-accent-foreground" />
                {shuffle && (
                  <span className="absolute bottom-1 h-0.5 w-0.5 rounded-full bg-primary group-hover/shuffle:bg-accent-foreground" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={previous}
                aria-label="Previous song"
                disabled={!hasTrack}
                className={cn(
                  "group/prev h-8 w-8 text-foreground hover:bg-accent hover:text-accent-foreground transition-colors",
                  !hasTrack && "pointer-events-none opacity-30"
                )}
                title="Previous"
              >
                <SkipBack size={18} fill="currentColor" className="transition-colors group-hover/prev:text-accent-foreground" />
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
                className={cn(
                  "group/next h-8 w-8 text-foreground hover:bg-accent hover:text-accent-foreground transition-colors",
                  !hasTrack && "pointer-events-none opacity-30"
                )}
                title="Next"
              >
                <SkipForward size={18} fill="currentColor" className="transition-colors group-hover/next:text-accent-foreground" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={cycleRepeat}
                aria-label="Repeat"
                disabled={!hasTrack}
                className={cn(
                  "group/repeat relative h-8 w-8 text-foreground hover:bg-accent hover:text-accent-foreground transition-colors",
                  repeatMode !== "off" && "text-primary",
                  !hasTrack && "pointer-events-none opacity-30"
                )}
                title={repeatMode === "one" ? "Repeat: Current Track" : repeatMode === "all" ? "Repeat: All" : "Repeat: Off"}
              >
                {repeatMode === "one" ? (
                  <Repeat1 size={15} className="transition-colors group-hover/repeat:text-accent-foreground" />
                ) : (
                  <Repeat size={15} className="transition-colors group-hover/repeat:text-accent-foreground" />
                )}
                {repeatMode !== "off" && (
                  <span className="absolute bottom-1 h-0.5 w-0.5 rounded-full bg-primary group-hover/repeat:bg-accent-foreground" />
                )}
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
              className={cn(
                "group/expand h-8 w-8 text-foreground hover:bg-accent hover:text-accent-foreground transition-colors",
                fullPlayerOpen && "bg-secondary/60 text-foreground",
                !hasTrack && "pointer-events-none opacity-30"
              )}
              title={fullPlayerOpen ? "Collapse full screen" : "Full screen"}
            >
              {fullPlayerOpen ? (
                <Minimize2 size={16} className="transition-colors group-hover/expand:text-accent-foreground" />
              ) : (
                <Maximize2 size={16} className="transition-colors group-hover/expand:text-accent-foreground" />
              )}
            </Button>

            <div className="flex items-center gap-1 pl-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMute}
                aria-label={volume === 0 ? "Unmute" : "Mute"}
                disabled={!hasTrack}
                className={cn(
                  "group/vol h-8 w-8 text-foreground hover:bg-accent hover:text-accent-foreground transition-colors",
                  !hasTrack && "pointer-events-none opacity-30"
                )}
                title={volume === 0 ? "Unmute" : "Mute"}
              >
                {volume === 0 ? (
                  <VolumeX size={17} className="transition-colors group-hover/vol:text-accent-foreground" />
                ) : volume < 0.5 ? (
                  <Volume1 size={17} className="transition-colors group-hover/vol:text-accent-foreground" />
                ) : (
                  <Volume2 size={17} className="transition-colors group-hover/vol:text-accent-foreground" />
                )}
              </Button>
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
                className="group/close h-8 w-8 text-foreground hover:bg-accent hover:text-accent-foreground transition-colors ml-1"
                title="Dismiss player"
              >
                <X size={15} className="transition-colors group-hover/close:text-accent-foreground" />
              </Button>
            ) : null}
          </div>
        </div>
      </div>

    </>
  );
}

function MiniPlayerProgress() {
  const { duration, isPlaying, getCurrentTime, progress } = usePlugg();
  const barRef = useRef<HTMLDivElement | null>(null);

  const initialPercent = duration > 0 ? Math.min(100, Math.max(0, (progress / duration) * 100)) : 0;

  useEffect(() => {
    if (!isPlaying || duration <= 0) {
      const pct = duration > 0 ? Math.min(100, Math.max(0, (progress / duration) * 100)) : 0;
      if (barRef.current) barRef.current.style.width = `${pct}%`;
      return;
    }

    let animId: number;
    const tick = () => {
      const cur = getCurrentTime();
      const pct = duration > 0 ? Math.min(100, Math.max(0, (cur / duration) * 100)) : 0;
      if (barRef.current) barRef.current.style.width = `${pct}%`;
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, duration, getCurrentTime, progress]);

  return (
    <div className="absolute bottom-0 inset-x-0 h-1 bg-white/20 overflow-hidden pointer-events-none">
      <div
        ref={barRef}
        className="h-full bg-primary will-change-[width] shadow-[0_0_8px_rgba(204,255,0,0.6)]"
        style={{ width: `${initialPercent}%` }}
      />
    </div>
  );
}

export function MobilePlayerBar() {
  const { currentTrack, isPlaying, togglePlay, setFullPlayerOpen, artists, clearPlayer } = usePlugg();
  const artist = currentTrack ? artists.find((item) => item.id === currentTrack.artistId) : null;
  if (!currentTrack) return null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => setFullPlayerOpen(true)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") setFullPlayerOpen(true);
      }}
      className="pointer-events-auto relative flex w-full max-w-[360px] cursor-pointer items-center justify-between gap-3 overflow-hidden rounded-2xl bg-surface/90 backdrop-blur-2xl p-2.5 shadow-[0_12px_36px_rgba(0,0,0,0.65)] transition-all duration-200 active:scale-[0.99] animate-in slide-in-from-bottom-2"
    >
      {/* Cancel (cross) button at the edge top right */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          clearPlayer();
        }}
        className="absolute top-2 right-2.5 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-muted-foreground hover:bg-white/25 hover:text-foreground transition-all active:scale-90 shadow-xs"
        title="Stop and close player"
        aria-label="Stop and close player"
      >
        <X size={12} strokeWidth={2.5} />
      </button>

      <div className="flex min-w-0 items-center gap-3">
        <img
          src={art(currentTrack.coverUrl)}
          alt=""
          className="h-11 w-11 shrink-0 rounded-xl object-cover shadow-sm"
        />
        <div className="min-w-0">
          <span className="block truncate text-sm font-semibold text-foreground">
            {currentTrack.title}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {artist?.displayName ?? "Unknown artist"}
          </span>
        </div>
      </div>

      {/* Play button adjusted leftward so top-right cancel button has clear visual space */}
      <div className="shrink-0 mr-8" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={togglePlay}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform active:scale-90"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause size={16} className="fill-current" />
          ) : (
            <Play size={16} className="fill-current ml-0.5" />
          )}
        </button>
      </div>

      {/* Real-time mini timer progress line running along the bottom */}
      <MiniPlayerProgress />
    </div>
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
    isPlaying,
    togglePlay,
    next,
    previous,
    shuffle,
    toggleShuffle,
    repeatMode,
    cycleRepeat,
    isLiked,
    toggleLike,
  } = usePlugg();

  const [activeTab, setActiveTab] = useState<InfoTab>("lyrics");

  // Lock body and html scrolling when full player is active
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
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-background md:bottom-[76px] md:overflow-hidden animate-in fade-in duration-200"
      role="region"
      aria-label="Full screen player"
    >
      {/* Immersive blurred ambient backdrop */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden md:bottom-[76px]">
        <img
          src={art(currentTrack.coverUrl)}
          alt=""
          className="h-full w-full scale-125 object-cover opacity-20 blur-3xl filter transition-all duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/90 to-background" />
      </div>

      <div className="relative mx-auto flex min-h-full w-full max-w-7xl flex-col justify-between px-5 py-4 sm:px-10 lg:px-14 pb-16 md:pb-4">
        {/* Top Header Bar: Clean collapse button, Plugg branding, Like button */}
        <header className="flex shrink-0 items-center justify-between py-3 sm:py-4">
          <button
            type="button"
            onClick={() => setFullPlayerOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-surface/60 hover:bg-surface text-muted-foreground hover:text-foreground transition-colors shadow-xs"
            title="Collapse player"
            aria-label="Collapse player"
          >
            <ChevronDown size={22} />
          </button>

          <div className="flex items-center gap-2.5">
            <img src={logoImg} alt="Plugg" className="h-7 w-7 sm:h-8 sm:w-8 object-contain drop-shadow" />
            <span className="font-display text-base sm:text-lg font-bold tracking-wide text-foreground">
              plugg<span className="text-muted-foreground">.</span>
            </span>
          </div>

          <button
            type="button"
            onClick={() => toggleLike(currentTrack.id)}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full bg-surface/60 hover:bg-surface transition-colors shadow-xs",
              isLiked(currentTrack.id) ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
            title={isLiked(currentTrack.id) ? "Unlike song" : "Like song"}
            aria-label={isLiked(currentTrack.id) ? "Unlike song" : "Like song"}
          >
            <Heart size={18} className={isLiked(currentTrack.id) ? "fill-current text-primary" : ""} />
          </button>
        </header>

        {/* Main Content Area: 45% Artwork (Left) / 55% Information (Right) */}
        <div className="my-auto grid w-full flex-1 grid-cols-1 items-center gap-8 py-2 lg:grid-cols-[minmax(0,9fr)_minmax(0,11fr)] lg:gap-14">
          {/* Left Column: Visual Identity (Artwork, Title, Artist) + Mobile Playback Controls */}
          <div className="flex min-w-0 flex-col items-center lg:items-start justify-center">
            <div className="relative aspect-square w-full max-w-[320px] sm:max-w-[420px] overflow-hidden rounded-2xl shadow-[0_24px_60px_-12px_rgba(0,0,0,0.85)] group transition-all duration-300">
              <img
                src={art(currentTrack.coverUrl)}
                alt={`${currentTrack.title} cover art`}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>

            <div className="mt-5 w-full max-w-[320px] sm:max-w-[420px] text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start gap-2">
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
              <div className="mt-1.5 flex flex-wrap items-center justify-center lg:justify-start gap-2 text-sm text-muted-foreground">
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

            {/* Mobile Playback Controls: Scrubber & Control Buttons */}
            <div className="mt-6 w-full max-w-[320px] sm:max-w-[420px] space-y-4 lg:hidden">
              <div className="space-y-1.5">
                <Scrubber className="w-full" />
                <div className="flex justify-between text-xs tabular-nums text-muted-foreground px-0.5">
                  <PlayerTime current />
                  <PlayerTime />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 px-1">
                <button
                  type="button"
                  onClick={toggleShuffle}
                  className={cn("p-2.5 transition-colors", shuffle ? "text-primary" : "text-muted-foreground hover:text-foreground")}
                  title={shuffle ? "Disable shuffle" : "Enable shuffle"}
                >
                  <Shuffle size={18} />
                </button>
                <button
                  type="button"
                  onClick={previous}
                  className="p-2.5 text-foreground hover:text-primary transition-colors"
                  title="Previous track"
                >
                  <SkipBack size={22} />
                </button>
                <button
                  type="button"
                  onClick={togglePlay}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 active:scale-95 transition-all"
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? (
                    <Pause size={24} className="fill-current" />
                  ) : (
                    <Play size={24} className="fill-current ml-0.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={next}
                  className="p-2.5 text-foreground hover:text-primary transition-colors"
                  title="Next track"
                >
                  <SkipForward size={22} />
                </button>
                <button
                  type="button"
                  onClick={cycleRepeat}
                  className={cn("p-2.5 transition-colors", repeatMode !== "off" ? "text-primary" : "text-muted-foreground hover:text-foreground")}
                  title={`Repeat: ${repeatMode}`}
                >
                  {repeatMode === "one" ? <Repeat1 size={18} /> : <Repeat size={18} />}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Information Layer (Lyrics | About | Credits) */}
          <div className="flex w-full min-w-0 flex-col justify-center">
            {/* Tabs Header */}
            <div className="flex items-center gap-8 border-b border-border/40 pb-3 justify-center lg:justify-start">
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

            {/* Tab Content Container */}
            <div className="mt-5 min-h-[260px] md:h-[380px] lg:h-[450px] w-full">
              {/* Lyrics Tab */}
              {activeTab === "lyrics" ? (
                <div className="h-full max-h-[500px] overflow-y-auto pr-4 scrollbar-thin space-y-4">
                  {currentTrack.lyrics?.trim() ? (
                    <p className="whitespace-pre-line text-lg sm:text-xl font-medium leading-relaxed sm:leading-loose text-foreground/90 selection:bg-primary/25">
                      {currentTrack.lyrics}
                    </p>
                  ) : (
                    <div className="flex min-h-[200px] flex-col items-center justify-center text-center p-6 text-muted-foreground space-y-3">
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
                        <div className="flex items-center gap-4 min-w-0">
                          <img
                            src={art(artist.avatarUrl)}
                            alt={artist.displayName}
                            className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-border shadow-md"
                          />
                          <div className="min-w-0">
                            <h3 className="text-lg font-bold text-foreground truncate">
                              {artist.displayName}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {formatCount(artist.monthlyListeners)} monthly listeners
                            </p>
                          </div>
                        </div>

                        <Link
                          to="/artist/$username"
                          params={{ username: artist.username }}
                          onClick={() => setFullPlayerOpen(false)}
                          className="shrink-0 rounded-full bg-elevated px-4 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
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
                        <div className="min-w-0">
                          <span className="text-muted-foreground block">Verified Artist</span>
                          <span className="font-medium text-foreground mt-0.5 block truncate">Plugg Artist</span>
                        </div>
                        {release ? (
                          <div className="min-w-0">
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
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-medium text-foreground truncate">{release.title}</span>
                            <span className="shrink-0 rounded bg-elevated px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
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