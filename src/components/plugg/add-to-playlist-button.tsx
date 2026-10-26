import { useState, useRef, useEffect } from "react";
import { Plus, Check, ListPlus, ChevronLeft } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/plugg/primitives";
import { usePlugg } from "@/state/plugg-store";
import { cn } from "@/lib/utils";

interface AddToPlaylistButtonProps {
  trackIds: string[];
  variant?: "primary" | "outline" | "ghost" | "subtle";
  className?: string;
  size?: "sm" | "default";
  label?: string;
}

export function AddToPlaylistButton({
  trackIds,
  variant = "outline",
  className,
  size = "default",
  label = "Add to Playlist",
}: AddToPlaylistButtonProps) {
  const { playlists, addTrackToPlaylist, createPlaylist, session, showAuthPrompt } = usePlugg();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"list" | "create">("list");
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
        setView("list");
        setNewPlaylistName("");
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleClick = () => {
    if (session === "loggedOut") {
      showAuthPrompt({
        title: "Sign in to save to playlists",
        description: "Create an account or sign in to add songs to playlists.",
      });
      return;
    }
    setOpen((prev) => !prev);
    setView("list");
    setNewPlaylistName("");
  };

  const handleAddToPlaylist = (playlistId: string, playlistName: string) => {
    for (const trackId of trackIds) {
      addTrackToPlaylist(playlistId, trackId);
    }
    toast.success(`Added to ${playlistName}`);
    setOpen(false);
  };

  const handleCreateAndAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newPlaylistName.trim();
    if (!trimmed) return;
    const newPlaylist = createPlaylist(trimmed);
    if (newPlaylist) {
      for (const trackId of trackIds) {
        addTrackToPlaylist(newPlaylist.id, trackId);
      }
      toast.success(`Created & added to ${newPlaylist.name}`);
    }
    setNewPlaylistName("");
    setOpen(false);
    setView("list");
  };

  return (
    <div className="relative inline-block" ref={menuRef}>
      <Button
        variant={variant}
        onClick={handleClick}
        className={cn("rounded-full flex items-center gap-2", className)}
      >
        <Plus size={size === "sm" ? 14 : 16} />
        <span>{label}</span>
      </Button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute left-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-border bg-surface p-2 shadow-2xl animate-scale-in"
        >
          {view === "list" ? (
            <div className="space-y-1">
              <div className="px-3 py-1.5 border-b border-border/40 mb-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Select playlist
                </p>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-0.5">
                {playlists.length === 0 ? (
                  <p className="px-3 py-3 text-xs text-muted-foreground text-center">
                    You don't have any playlists yet.
                  </p>
                ) : (
                  playlists.map((p) => {
                    const allIn = trackIds.length > 0 && trackIds.every((id) => p.trackIds.includes(id));
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleAddToPlaylist(p.id, p.name)}
                        className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-elevated text-foreground transition-colors"
                      >
                        <span className="flex items-center gap-2.5 min-w-0">
                          <ListPlus
                            size={15}
                            className={allIn ? "text-primary" : "text-muted-foreground"}
                          />
                          <span className="truncate">{p.name}</span>
                        </span>
                        {allIn ? (
                          <span className="flex items-center gap-1 text-[11px] font-medium text-primary shrink-0">
                            <Check size={13} /> Added
                          </span>
                        ) : null}
                      </button>
                    );
                  })
                )}
              </div>

              <div className="border-t border-border/40 pt-1 mt-1">
                <button
                  type="button"
                  onClick={() => setView("create")}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-primary hover:bg-elevated transition-colors"
                >
                  <Plus size={14} /> New playlist
                </button>
              </div>
            </div>
          ) : (
            <div className="p-2 space-y-3">
              <button
                type="button"
                onClick={() => setView("list")}
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft size={15} /> Back
              </button>

              <form onSubmit={handleCreateAndAdd} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">
                    Playlist name
                  </label>
                  <input
                    autoFocus
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    placeholder="e.g. My Favorites"
                    className="w-full rounded-lg border border-border bg-elevated px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setView("list")}
                    className="px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newPlaylistName.trim()}
                    className="rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    Create & Add
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
