import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { Heart, Plus } from "lucide-react";
import { useState } from "react";

import { PlayButton, Rail, ReleaseCard, TrackRow } from "@/components/plugg/media";
import { Button, SectionHeader } from "@/components/plugg/primitives";
import { artists as seedArtists } from "@/data/artists";
import { art } from "@/data/covers";
import { releases as seedReleases } from "@/data/releases";
import { formatDate, formatDuration } from "@/lib/plugg";
import { usePlugg } from "@/state/plugg-store";

export const Route = createFileRoute("/release/$slug")({
  head: ({ params }) => {
    const release = seedReleases.find((r) => r.slug === params.slug);
    const artist = seedArtists.find((a) => a.id === release?.artistId);
    const title = release ? `${release.title} — ${artist?.displayName ?? "Plugg"}` : "Release — Plugg";
    const description = release
      ? `Listen to ${release.title}, a ${release.type} by ${artist?.displayName ?? "artist"} on Plugg.`
      : "Listen to African music on Plugg.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: ReleasePage,
});

function ReleasePage() {
  const { slug } = Route.useParams();
  const {
    releases,
    artists,
    tracks,
    playTrack,
    togglePlay,
    currentTrack,
    isPlaying,
    playlists,
    addTrackToPlaylist,
    isLiked,
    toggleLike,
  } = usePlugg();
  const [addedTo, setAddedTo] = useState<string | null>(null);

  const release = releases.find((r) => r.slug === slug);
  if (!release) throw notFound();

  const artist = artists.find((a) => a.id === release.artistId);
  const releaseTracks = tracks.filter((t) => release.trackIds.includes(t.id));
  const ids = releaseTracks.map((t) => t.id);
  const totalSeconds = releaseTracks.reduce((sum, t) => sum + t.durationSeconds, 0);
  const playingHere = currentTrack?.releaseId === release.id && isPlaying;
  const more = releases.filter((r) => r.artistId === release.artistId && r.id !== release.id && r.status === "published");

  return (
    <div className="space-y-10">
      <section className="flex flex-col gap-6 sm:flex-row sm:items-end">
        <img
          src={art(release.coverUrl)}
          alt={`${release.title} cover art`}
          className="h-44 w-44 rounded-2xl object-cover shadow-2xl sm:h-56 sm:w-56"
        />
        <div className="min-w-0 flex-1">
          <p className="text-eyebrow">{release.type}</p>
          <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{release.title}</h1>
          {artist ? (
            <Link
              to="/artist/$username"
              params={{ username: artist.username }}
              className="mt-2 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <img src={art(artist.avatarUrl)} alt="" className="h-6 w-6 rounded-full object-cover" />
              {artist.displayName}
            </Link>
          ) : null}
          <p className="mt-2 text-xs text-muted-foreground">
            {formatDate(release.releaseDate)} · {releaseTracks.length} songs · {formatDuration(totalSeconds)}{release.label ? ` · ${release.label}` : ""}
          </p>
          {release.description ? (
            <p className="mt-3 text-sm text-foreground/80 max-w-2xl whitespace-pre-line leading-relaxed">
              {release.description}
            </p>
          ) : null}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <PlayButton
              label={`Play ${release.title}`}
              active={playingHere}
              onClick={() =>
                releaseTracks[0]
                  ? currentTrack?.releaseId === release.id
                    ? togglePlay()
                    : playTrack(releaseTracks[0].id, ids)
                  : undefined
              }
            />
            {releaseTracks[0] ? (
              <Button variant="outline" onClick={() => toggleLike(releaseTracks[0]!.id)}>
                <Heart size={15} fill={isLiked(releaseTracks[0]!.id) ? "currentColor" : "none"} />
                {isLiked(releaseTracks[0]!.id) ? "Liked" : "Like"}
              </Button>
            ) : null}
            {playlists[0] && releaseTracks[0] ? (
              <Button
                variant="ghost"
                onClick={() => {
                  releaseTracks.forEach((t) => addTrackToPlaylist(playlists[0]!.id, t.id));
                  setAddedTo(playlists[0]!.name);
                }}
              >
                <Plus size={15} /> Add to {playlists[0].name}
              </Button>
            ) : null}
          </div>
          {addedTo ? <p className="mt-3 text-xs text-primary">Added to {addedTo}</p> : null}
        </div>
      </section>

      <section>
        <SectionHeader title="Tracklist" />
        <div className="track-list">
          {releaseTracks.map((t, i) => (
            <TrackRow key={t.id} track={t} index={i} showArtist={false} queueIds={ids} />
          ))}
        </div>
      </section>

      {more.length ? (
        <section>
          <SectionHeader title={`More from ${artist?.displayName ?? "this artist"}`} />
          <Rail>
            {more.map((r) => (
              <ReleaseCard key={r.id} release={r} artist={artist} />
            ))}
          </Rail>
        </section>
      ) : null}
    </div>
  );
}
