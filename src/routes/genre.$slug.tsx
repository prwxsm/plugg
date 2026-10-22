import { createFileRoute, notFound } from "@tanstack/react-router";
import { useMemo } from "react";

import { ArtistCard, PlayButton, Rail, ReleaseCard, TrackRow } from "@/components/plugg/media";
import { EmptyState, SectionHeader } from "@/components/plugg/primitives";
import { art } from "@/data/covers";
import { genres } from "@/data/genres";
import { formatCount } from "@/lib/plugg";
import { usePlugg } from "@/state/plugg-store";

export const Route = createFileRoute("/genre/$slug")({
  loader: ({ params }) => {
    const genre = genres.find((g) => g.slug === params.slug);
    if (!genre) throw notFound();
    return { genre };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Genre not found — Plugg" }, { name: "robots", content: "noindex" }] };
    }
    const title = `${loaderData.genre.name} songs and artists — Plugg`;
    const description = `Stream the best ${loaderData.genre.name} songs, releases and artists on Plugg.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  notFoundComponent: () => (
    <EmptyState
      title="Genre not found"
      description="That genre isn't on Plugg."
      ctaLabel="Browse music"
      ctaTo="/discover"
    />
  ),
  component: GenrePage,
});

function GenrePage() {
  const { genre } = Route.useLoaderData();
  const { tracks, artists, releases, playTrack, currentTrack, isPlaying, togglePlay } = usePlugg();

  const genreTracks = useMemo(
    () =>
      tracks.filter((t) => {
        if (!t.published) return false;
        const normalizedTarget = genre.name.toLowerCase();
        const songGenres = t.genre
          .toLowerCase()
          .split(",")
          .map((s) => s.trim());
        return songGenres.includes(normalizedTarget);
      }),
    [tracks, genre.name],
  );
  const queueIds = genreTracks.map((t) => t.id);
  const artistIds = [...new Set(genreTracks.map((t) => t.artistId))];
  const genreArtists = artists.filter((a) => artistIds.includes(a.id));
  const genreReleases = releases.filter(
    (r) => r.status === "published" && r.trackIds.some((id) => queueIds.includes(id)),
  );
  const playingHere = !!currentTrack && queueIds.includes(currentTrack.id) && isPlaying;
  const totalPlays = genreTracks.reduce((sum, t) => sum + t.playCount, 0);

  return (
    <div className="space-y-10">
      <header className="relative overflow-hidden rounded-2xl [mask-image:radial-gradient(white,black)] [-webkit-mask-image:-webkit-radial-gradient(white,black)] [transform:translateZ(0)]">
        <img src={art(genre.image)} alt="" className="absolute inset-0 h-full w-full rounded-2xl object-cover" />
        <span className="absolute inset-0 bg-gradient-to-r from-black from-5% via-black/75 to-black/30" />
        <div className="relative flex flex-col gap-4 px-6 py-12 sm:px-10 sm:py-16">
          <p className="text-xs uppercase tracking-[0.18em] text-white/70">Genre</p>
          <h1 className="font-display text-3xl font-bold text-white sm:text-5xl">{genre.name}</h1>
          <p className="text-sm text-white/70">
            {genreTracks.length} {genreTracks.length === 1 ? "song" : "songs"} · {formatCount(totalPlays)} plays
          </p>
          {genreTracks.length ? (
            <div className="mt-2">
              <PlayButton
                size="lg"
                label={playingHere ? `Pause ${genre.name}` : `Play ${genre.name}`}
                active={playingHere}
                onClick={() => {
                  if (currentTrack && queueIds.includes(currentTrack.id)) togglePlay();
                  else if (queueIds[0]) playTrack(queueIds[0], queueIds);
                }}
              />
            </div>
          ) : null}
        </div>
      </header>

      {genreTracks.length ? (
        <section>
          <SectionHeader title="Songs" subtitle={`Top ${genre.name} on Plugg`} />
          <div className="track-list">
            {genreTracks.map((t, i) => (
              <TrackRow key={t.id} track={t} index={i} queueIds={queueIds} />
            ))}
          </div>
        </section>
      ) : (
        <EmptyState
          title="Nothing here yet"
          description={`No ${genre.name} songs on Plugg right now.`}
          ctaLabel="Browse music"
          ctaTo="/discover"
        />
      )}

      {genreReleases.length ? (
        <section>
          <SectionHeader title="Releases" />
          <Rail>
            {genreReleases.map((r) => (
              <ReleaseCard key={r.id} release={r} artist={artists.find((a) => a.id === r.artistId)} />
            ))}
          </Rail>
        </section>
      ) : null}

      {genreArtists.length ? (
        <section>
          <SectionHeader title="Artists" />
          <Rail>
            {genreArtists.map((a) => (
              <ArtistCard key={a.id} artist={a} />
            ))}
          </Rail>
        </section>
      ) : null}
    </div>
  );
}
