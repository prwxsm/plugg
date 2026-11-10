import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { useState } from "react";

import { PlayButton, Rail, ReleaseCard, TrackRow } from "@/components/plugg/media";
import { Button, SectionHeader } from "@/components/plugg/primitives";
import { AddToPlaylistButton } from "@/components/plugg/add-to-playlist-button";
import { art } from "@/data/covers";
import { buildReleaseHeadMeta, DEFAULT_PUBLIC_ORIGIN } from "@/lib/og-meta";
import { formatDate, formatDuration } from "@/lib/plugg";
import { getReleaseShareData } from "@/server-fns/data-functions";
import { usePlugg } from "@/state/plugg-store";

export const Route = createFileRoute("/release/$slug")({
  loader: async ({ params }) => {
    const data = await getReleaseShareData({ data: params.slug });
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData, params }) => {
    const origin =
      loaderData?.origin ||
      (typeof window !== "undefined" ? window.location.origin : DEFAULT_PUBLIC_ORIGIN);
    return buildReleaseHeadMeta(loaderData, params.slug, origin);
  },
  component: ReleasePage,
});

function ReleasePage() {
  const loaderData = Route.useLoaderData();
  const { slug } = Route.useParams();
  const {
    releases,
    artists,
    tracks,
    playTrack,
    togglePlay,
    currentTrack,
    isPlaying,
    isLiked,
    toggleLike,
  } = usePlugg();

  const release = releases.find((r) => r.id === loaderData.id || r.slug === slug);
  if (!release) throw notFound();

  const artist = artists.find((a) => a.id === release.artistId);
  const releaseTracks = tracks.filter((t) => release.trackIds.includes(t.id));
  const ids = releaseTracks.map((t) => t.id);
  const totalSeconds = releaseTracks.reduce((sum, t) => sum + t.durationSeconds, 0);
  const playingHere = currentTrack?.releaseId === release.id && isPlaying;
  const more = releases.filter((r) => r.artistId === release.artistId && r.id !== release.id && r.status === "published");

  return (
    <div className="space-y-10 pt-14 md:pt-0">
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
            {releaseTracks.length > 0 ? (
              <AddToPlaylistButton
                trackIds={ids}
                variant="outline"
                label="Add to Playlist"
              />
            ) : null}
          </div>
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
