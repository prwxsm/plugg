import { X, Play, Pause, Copy, Check, Share2 } from "lucide-react";
import { useState } from "react";
import { usePlugg } from "@/state/plugg-store";
import { formatDuration } from "@/lib/plugg";
import { art } from "@/data/covers";
import logoUrl from "@/assets/logo.png";
import { toast } from "sonner";

interface ShareModalProps {
  trackId: string;
  onClose: () => void;
}

export function ShareModal({ trackId, onClose }: ShareModalProps) {
  const { tracks, artists, playTrack, togglePlay, currentTrack, isPlaying } = usePlugg();
  const track = tracks.find((t) => t.id === trackId);
  const artist = artists.find((a) => a.id === track?.artistId);
  const [copied, setCopied] = useState(false);

  if (!track || !artist) return null;

  const isCurrent = currentTrack?.id === track.id;
  const isPlayingThis = isCurrent && isPlaying;

  const origin = typeof window !== "undefined" ? window.location.origin : "https://plugg.app";
  const shareUrl = `${origin}/track/${track.id}`;

  const shareTitle = `${track.title} — ${artist.displayName}`;
  const shareText = `Stream "${track.title}" by ${artist.displayName}${track.features ? ` ft. ${track.features}` : ""} on Plugg:\n${shareUrl}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Stream link copied! Paste anywhere to share artwork & details");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    // If mobile or desktop browser supports native share sheet
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: shareTitle,
          text: `Stream "${track.title}" by ${artist.displayName} on Plugg`,
          url: shareUrl,
        });
        return;
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          return; // user dismissed share dialog
        }
      }
    }
    // Fallback if native share not supported or cancelled
    handleCopyLink();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Compact card fitting snugly around the artwork and content */}
      <div
        className="w-full max-w-[390px] overflow-hidden rounded-2xl bg-[#181818] border border-white/10 shadow-2xl p-4 sm:p-5 relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: Plugg logo and close button */}
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <img src={logoUrl} alt="Plugg" className="h-5 w-auto object-contain opacity-95" />
            <span className="text-xs font-semibold tracking-wider uppercase text-white/50">Share Song</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Artwork: covers most of the upper area with snug border */}
        <div className="relative w-full aspect-square rounded-xl overflow-hidden shadow-2xl bg-black/40 border border-white/10 group">
          <img
            src={art(track.coverUrl)}
            alt={track.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />

          {/* Bottom Gradient Overlay for contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

          {/* Floating Play / Preview Button */}
          <button
            onClick={() => {
              if (isCurrent) togglePlay();
              else playTrack(track.id, [track.id]);
            }}
            aria-label={isPlayingThis ? "Pause preview" : "Play preview"}
            className="absolute bottom-3 right-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-black shadow-2xl hover:scale-110 active:scale-95 transition-all"
          >
            {isPlayingThis ? (
              <Pause size={20} fill="currentColor" />
            ) : (
              <Play size={20} fill="currentColor" className="ml-0.5" />
            )}
          </button>

          {/* Corner duration tag */}
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-md px-2.5 py-1 text-xs font-semibold text-white/90 border border-white/10">
            <span>{formatDuration(track.durationSeconds)}</span>
          </div>
        </div>

        {/* Song Info */}
        <div className="mt-3.5 space-y-1">
          <h3 className="text-lg font-bold text-white tracking-tight line-clamp-1">
            {track.title}
          </h3>
          <div className="flex items-center gap-2 text-sm text-white/70">
            <span className="font-semibold text-white/90 truncate">{artist.displayName}</span>
            {track.features ? (
              <span className="text-xs text-white/50 truncate">feat. {track.features}</span>
            ) : null}
            <span className="text-white/30">•</span>
            <span className="text-xs text-white/50 capitalize truncate">{track.genre}</span>
          </div>
        </div>

        {/* Stream URL Box */}
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-3 py-2">
          <span className="text-xs text-white/60 truncate flex-1 font-mono select-all">
            {shareUrl}
          </span>
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1 text-xs font-bold text-white hover:text-primary transition-colors shrink-0"
          >
            {copied ? (
              <>
                <Check size={14} className="text-primary" />
                <span className="text-primary">Copied</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Action Buttons: Unified "Share" button for all displays + Copy Link */}
        <div className="mt-3.5 flex items-center gap-2.5">
          {/* Primary Share Button: invokes native mobile share sheet (or copies on desktop) */}
          <button
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-white text-black hover:bg-white/90 font-bold text-sm py-2.5 px-4 shadow-lg transition-all active:scale-[0.98]"
          >
            <Share2 size={16} />
            <span>Share</span>
          </button>

          {/* Secondary Copy Button */}
          <button
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm py-2.5 px-4 border border-white/10 transition-all active:scale-[0.98]"
          >
            {copied ? <Check size={15} className="text-primary" /> : <Copy size={15} />}
            <span>{copied ? "Copied" : "Copy Link"}</span>
          </button>
        </div>

        {/* Footnote about social platform link preview */}
        <p className="mt-3 text-[11px] text-center text-white/40 leading-tight">
          When shared, social platforms embed the artwork, song details & stream link.
        </p>
      </div>
    </div>
  );
}
