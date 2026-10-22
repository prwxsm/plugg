import { X, Play, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { usePlugg } from "@/state/plugg-store";
import { formatDuration } from "@/lib/plugg";
import { art } from "@/data/covers";
import logoUrl from "@/assets/logo.png";

interface ShareModalProps {
  trackId: string;
  onClose: () => void;
}

export function ShareModal({ trackId, onClose }: ShareModalProps) {
  const { tracks, artists } = usePlugg();
  const track = tracks.find((t) => t.id === trackId);
  const artist = artists.find((a) => a.id === track?.artistId);
  const [copied, setCopied] = useState(false);

  if (!track || !artist) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://plugg.app/track/${track.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div className="w-full max-w-3xl overflow-hidden rounded-xl bg-[#282828] shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-50 rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white"
        >
          <X size={24} />
        </button>

        <div className="p-8 pb-4 mt-6">
          <div className="flex gap-8 rounded-xl bg-[#3f2b2b] p-8 shadow-xl relative min-h-[320px]">
            <div className="h-64 w-64 shrink-0 rounded-lg overflow-hidden bg-white/5 shadow-2xl flex items-center justify-center">
              {track.coverUrl ? (
                <img
                  src={art(track.coverUrl)}
                  alt={track.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="text-white/20">No Cover</div>
              )}
            </div>
            
            <div className="flex flex-col flex-1 relative py-2">
              <div className="absolute top-0 right-0 h-8 w-24">
                <img src={logoUrl} alt="plugg" className="h-full w-full object-contain object-right opacity-90" />
              </div>
              
              <div className="mt-16">
                <h3 className="text-4xl font-extrabold text-white mb-2 line-clamp-2">{track.title}</h3>
                <p className="text-xl text-white/80 font-semibold line-clamp-1">{artist.displayName}</p>
              </div>

              <div className="mt-auto flex items-center justify-end gap-6">
                <span className="text-base font-medium text-white/80">{formatDuration(track.durationSeconds)}</span>
                <MoreHorizontal size={24} className="text-white/80" />
                <button className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-black hover:scale-105 transition-transform shadow-xl">
                  <Play size={24} fill="currentColor" className="ml-1" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-8 py-6">
          <p className="text-sm font-medium text-white/50">
            Share this song with your friends on other platforms.
          </p>
          <button
            onClick={handleCopyLink}
            className="rounded-full bg-white px-8 py-3 text-sm font-bold text-black hover:scale-105 transition-transform"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}
