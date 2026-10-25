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

// Crisp inline WhatsApp SVG icon
function WhatsAppIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      stroke="currentColor"
      fill="currentColor"
      strokeWidth="0"
      className={className}
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
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

  const shareText = `🎵 *${track.title}* — ${artist.displayName}${track.features ? ` (feat. ${track.features})` : ""}\n\nStream now on Plugg:\n${shareUrl}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Stream link copied! Paste in WhatsApp to share artwork & details");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${track.title} — ${artist.displayName}`,
          text: `Stream "${track.title}" by ${artist.displayName} on Plugg`,
          url: shareUrl,
        });
      } catch {
        // User cancelled or failed
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Compact card fitting snugly around the artwork and content, no redundant brown or huge borders */}
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

        {/* Share Action Buttons */}
        <div className="mt-3.5 space-y-2">
          {/* WhatsApp Direct Share Button */}
          <button
            onClick={handleWhatsAppShare}
            className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-black font-bold text-sm py-2.5 px-4 shadow-lg shadow-[#25D366]/20 transition-all active:scale-[0.98]"
          >
            <WhatsAppIcon className="w-5 h-5 fill-black" />
            <span>Share on WhatsApp</span>
          </button>

          {/* Secondary Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs py-2.5 px-3 border border-white/10 transition-all active:scale-[0.98]"
            >
              {copied ? <Check size={14} className="text-primary" /> : <Copy size={14} />}
              <span>{copied ? "Link Copied" : "Copy Link"}</span>
            </button>

            {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
              <button
                onClick={handleNativeShare}
                aria-label="Native share"
                className="flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/15 text-white p-2.5 border border-white/10 transition-all active:scale-[0.98]"
              >
                <Share2 size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Footnote about WhatsApp link preview */}
        <p className="mt-3 text-[11px] text-center text-white/40 leading-tight">
          When shared, WhatsApp embeds the artwork, song details & stream link.
        </p>
      </div>
    </div>
  );
}
