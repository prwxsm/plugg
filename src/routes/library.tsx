import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, MoreVertical, Pencil, Trash2, X } from "lucide-react";
import { useState, useEffect } from "react";

import { ArtistCard, Rail, TrackRow } from "@/components/plugg/media";
import { Button, EmptyState, SectionHeader, inputClass } from "@/components/plugg/primitives";
import { art, isDefaultPlaylistCover } from "@/data/covers";
import { usePlugg } from "@/state/plugg-store";

export type LibraryTab = "liked" | "playlists" | "following" | "recent";

export interface LibrarySearch {
  tab?: LibraryTab;
}

export const Route = createFileRoute("/library")({
  validateSearch: (search: Record<string, unknown>): LibrarySearch => {
    const raw = typeof search["tab"] === "string" ? search["tab"].toLowerCase() : undefined;
    if (raw === "playlists" || raw === "playlist") return { tab: "playlists" };
    if (raw === "following") return { tab: "following" };
    if (raw === "recent" || raw === "recents") return { tab: "recent" };
    if (raw === "liked" || raw === "liked songs" || raw === "liked-songs") return { tab: "liked" };
    return {};
  },
  head: () => ({
    meta: [
      { title: "Your library — Plugg" },
      {
        name: "description",
        content: "Liked songs, playlists, followed artists and your recent listening on Plugg.",
      },
      { property: "og:title", content: "Your library — Plugg" },
      { property: "og:description", content: "Liked songs, playlists and followed artists on Plugg." },
    ],
  }),
  component: LibraryPage,
});

const tabList: { id: LibraryTab; label: string }[] = [
  { id: "liked", label: "Liked songs" },
  { id: "playlists", label: "Playlists" },
  { id: "following", label: "Following" },
  { id: "recent", label: "Recent" },
];

function LibraryPage() {
  const { tab = "liked" } = Route.useSearch();
  const {
    tracks,
    artists,
    playlists,
    likedTrackIds,
    followingArtistIds,
    recentlyPlayedIds,
    createPlaylist,
    deletePlaylist,
    updatePlaylist,
    session,
  } = usePlugg();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingPlaylist, setEditingPlaylist] = useState<{ id: string; name: string; description: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (!activeMenuId) return;
    const close = () => setActiveMenuId(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [activeMenuId]);

  useEffect(() => {
    if (session === "loggedOut") {
      window.location.href = "/auth?returnTo=/library";
    }
  }, [session]);

  if (session === "loggedOut") {
    return (
      <EmptyState
        title="Sign in to view your library"
        description="Like songs, follow artists, and save playlists once you're signed in."
        ctaLabel="Sign in or create account"
        ctaTo="/auth"
      />
    );
  }

  const liked = likedTrackIds.map((id) => tracks.find((t) => t.id === id)).filter(Boolean) as typeof tracks;
  const recent = recentlyPlayedIds.map((id) => tracks.find((t) => t.id === id)).filter(Boolean) as typeof tracks;
  const following = followingArtistIds.map((id) => artists.find((a) => a.id === id)).filter(Boolean) as typeof artists;

  return (
    <div className="space-y-8 pt-14 md:pt-0">
      <div className="rail-scroll flex gap-2 overflow-x-auto mt-6">
        {tabList.map((t) => (
          <Link
            key={t.id}
            to="/library"
            search={t.id === "liked" ? {} : { tab: t.id }}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
              tab === t.id
                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                : "bg-elevated text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "liked" ? (
        liked.length ? (
          <div className="track-list">
            {liked.map((t, i) => (
              <TrackRow key={t.id} track={t} index={i} queueIds={liked.map((x) => x.id)} context="library" />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No liked songs yet"
            description="Tap the heart on any song and it lands here."
            ctaLabel="Find something"
            ctaTo="/discover"
          />
        )
      ) : null}

      {tab === "playlists" ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2"
            >
              <Plus size={16} /> Add playlist
            </Button>
          </div>

          {playlists.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {playlists.map((p) => (
                <div
                  key={p.id}
                  className="surface-card relative flex items-start gap-4 p-4 transition-colors hover:bg-elevated rounded-xl"
                >
                  <Link
                    to="/playlist/$id"
                    params={{ id: p.id }}
                    className="flex min-w-0 flex-1 items-center gap-4"
                  >
                    <div
                      className={`h-16 w-16 shrink-0 rounded-lg overflow-hidden flex items-center justify-center ${
                        isDefaultPlaylistCover(p.coverUrl)
                          ? "bg-elevated/80 border border-border/40 p-2.5"
                          : "bg-elevated"
                      }`}
                    >
                      <img
                        src={art(p.coverUrl || "default_playlist")}
                        alt=""
                        className={`h-full w-full ${
                          isDefaultPlaylistCover(p.coverUrl)
                            ? "object-contain"
                            : "object-cover"
                        }`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">{p.name}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {p.trackIds.length} {p.trackIds.length === 1 ? "song" : "songs"}
                      </p>
                      {p.description ? (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>
                      ) : null}
                    </div>
                  </Link>

                  {/* 3-dotted icon at top right (uncircled) */}
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setActiveMenuId(activeMenuId === p.id ? null : p.id);
                      }}
                      aria-label={`Options for ${p.name}`}
                      className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-white/10"
                    >
                      <MoreVertical size={16} />
                    </button>

                    {activeMenuId === p.id ? (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-2xl animate-scale-in"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuId(null);
                            setEditingPlaylist({
                              id: p.id,
                              name: p.name,
                              description: p.description || "",
                            });
                          }}
                          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-elevated transition-colors"
                        >
                          <Pencil size={14} className="text-muted-foreground" />
                          Edit details
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuId(null);
                            setDeleteTarget({ id: p.id, name: p.name });
                          }}
                          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 size={14} />
                          Delete playlist
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No playlists yet"
              description="Click 'Add playlist' above to start collecting songs."
            />
          )}

          {/* Create Playlist Modal */}
          {showCreateModal ? (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
              onClick={() => setShowCreateModal(false)}
            >
              <div
                className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-2xl animate-scale-in"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">New playlist</h3>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="rounded-full p-1 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const trimmed = newPlaylistName.trim();
                    if (!trimmed) return;
                    createPlaylist(trimmed);
                    setNewPlaylistName("");
                    setShowCreateModal(false);
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                      Playlist name
                    </label>
                    <input
                      autoFocus
                      value={newPlaylistName}
                      onChange={(e) => setNewPlaylistName(e.target.value)}
                      placeholder="e.g. Afro Chill"
                      className={inputClass}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={!newPlaylistName.trim()}
                    className="w-full"
                  >
                    Save
                  </Button>
                </form>
              </div>
            </div>
          ) : null}

          {/* Edit Playlist Modal */}
          {editingPlaylist ? (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
              onClick={() => setEditingPlaylist(null)}
            >
              <div
                className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-2xl animate-scale-in"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">Edit playlist</h3>
                  <button
                    type="button"
                    onClick={() => setEditingPlaylist(null)}
                    className="rounded-full p-1 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const trimmed = editingPlaylist.name.trim();
                    if (!trimmed) return;
                    updatePlaylist(editingPlaylist.id, {
                      name: trimmed,
                      description: editingPlaylist.description.trim(),
                    });
                    setEditingPlaylist(null);
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                      Playlist name
                    </label>
                    <input
                      autoFocus
                      value={editingPlaylist.name}
                      onChange={(e) =>
                        setEditingPlaylist({ ...editingPlaylist, name: e.target.value })
                      }
                      placeholder="Playlist name"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                      Description (optional)
                    </label>
                    <textarea
                      value={editingPlaylist.description}
                      onChange={(e) =>
                        setEditingPlaylist({ ...editingPlaylist, description: e.target.value })
                      }
                      placeholder="Give your playlist a description"
                      rows={2}
                      className={`${inputClass} resize-none`}
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setEditingPlaylist(null)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={!editingPlaylist.name.trim()}
                      className="flex-1"
                    >
                      Save changes
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          ) : null}

          {/* Delete Playlist Confirmation */}
          {deleteTarget ? (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
              onClick={() => setDeleteTarget(null)}
            >
              <div
                className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-2xl animate-scale-in"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-lg font-semibold text-foreground">Delete playlist?</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Are you sure you want to delete <span className="font-medium text-foreground">"{deleteTarget.name}"</span>? This cannot be undone.
                </p>
                <div className="flex gap-2 mt-6">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setDeleteTarget(null)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      deletePlaylist(deleteTarget.id);
                      setDeleteTarget(null);
                    }}
                    className="flex-1 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 px-4 py-2 text-sm font-medium transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === "following" ? (
        following.length ? (
          <Rail>
            {following.map((a) => (
              <ArtistCard key={a.id} artist={a} />
            ))}
          </Rail>
        ) : (
          <EmptyState
            title="You're not following anyone yet"
            description="Follow artists to keep up with their releases."
            ctaLabel="Discover artists"
            ctaTo="/discover"
          />
        )
      ) : null}

      {tab === "recent" ? (
        recent.length ? (
          <>
            <SectionHeader title="Recently played" />
            <div className="track-list">
              {recent.map((t, i) => (
                <TrackRow key={t.id} track={t} index={i} queueIds={recent.map((x) => x.id)} context="library" />
              ))}
            </div>
          </>
        ) : (
          <EmptyState title="Nothing played yet" description="Your listening history will show up here." ctaLabel="Start listening" ctaTo="/discover" />
        )
      ) : null}
    </div>
  );
}
