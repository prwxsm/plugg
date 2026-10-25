import { createFileRoute } from "@tanstack/react-router";
import { Search as SearchIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { ArtistCard, GenreTile, Rail, ReleaseCard, TrackRow } from "@/components/plugg/media";
import { EmptyState, SectionHeader, inputClass } from "@/components/plugg/primitives";
import { search } from "@/lib/plugg";
import { usePlugg } from "@/state/plugg-store";

export const Route = createFileRoute("/discover")({
  head: () => ({
    meta: [
      { title: "Discover new African music — Plugg" },
      {
        name: "description",
        content:
          "Search songs, artists and releases, or browse Afrobeats, Amapiano, Bongo Flava and more on Plugg.",
      },
      { property: "og:title", content: "Discover new African music — Plugg" },
      {
        property: "og:description",
        content: "Search songs, artists and releases by genre on Plugg.",
      },
    ],
  }),
  component: Discover,
});

export function Discover() {
  const { tracks, artists, releases, genres } = usePlugg();
  const [query, setQuery] = useState("");

  const results = useMemo(
    () => search(query, { tracks, artists, releases }),
    [query, tracks, artists, releases],
  );
  const hasQuery = query.trim().length > 0;
  const nothing =
    hasQuery && !results.tracks.length && !results.artists.length && !results.releases.length;

  const topTracks = useMemo(
    () =>
      tracks
        .filter((t) => t.published)
        .sort((a, b) => b.playCount - a.playCount)
        .slice(0, 8),
    [tracks],
  );

  const risingArtists = useMemo(() => {
    return [...artists].sort((a, b) => {
      const aGrowth = a.growthRate ?? Math.round((a.monthlyListeners / Math.max(a.fans, 1)) * 5);
      const bGrowth = b.growthRate ?? Math.round((b.monthlyListeners / Math.max(b.fans, 1)) * 5);
      return bGrowth - aGrowth || b.monthlyListeners - a.monthlyListeners;
    });
  }, [artists]);
  const [showAllRisingArtists, setShowAllRisingArtists] = useState(false);
  const visibleRisingArtists = showAllRisingArtists ? risingArtists : risingArtists.slice(0, 6);

  return (
    <div className="space-y-10 pt-14 md:pt-0">
      <div>
        <div className="relative mt-6">
          <SearchIcon
            size={17}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search songs, artists, releases"
            aria-label="Search Plugg"
            className={`${inputClass} pl-10`}
          />
        </div>
      </div>

      {hasQuery ? (
        nothing ? (
          <EmptyState
            title="No results"
            description={`Nothing matched "${query}". Try another artist, song or genre.`}
          />
        ) : (
          <div className="space-y-10">
            {results.tracks.length > 0 ? (
              <section>
                <SectionHeader title="Songs" />
                <div className="track-list">
                  {results.tracks.slice(0, 8).map((t, i) => (
                    <TrackRow
                      key={t.id}
                      track={t}
                      index={i}
                      queueIds={results.tracks.map((x) => x.id)}
                    />
                  ))}
                </div>
              </section>
            ) : null}
            {results.artists.length > 0 ? (
              <section>
                <SectionHeader title="Artists" />
                <Rail>
                  {results.artists.map((a) => (
                    <ArtistCard key={a.id} artist={a} />
                  ))}
                </Rail>
              </section>
            ) : null}
            {results.releases.length > 0 ? (
              <section>
                <SectionHeader title="Releases" />
                <Rail>
                  {results.releases.map((r) => (
                    <ReleaseCard
                      key={r.id}
                      release={r}
                      artist={artists.find((a) => a.id === r.artistId)}
                    />
                  ))}
                </Rail>
              </section>
            ) : null}
          </div>
        )
      ) : (
        <>
          <section>
            <SectionHeader title="Browse genres" subtitle="Sounds from across the continent" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:gap-5">
              {genres.map((g) => (
                <GenreTile key={g.id} name={g.name} image={g.image} slug={g.slug} />
              ))}
            </div>
          </section>

          <section id="trending" className="scroll-mt-24">
            <SectionHeader title="Trending songs" subtitle="What listeners have on repeat" />
            <div className="track-list">
              {topTracks.map((t, i) => (
                <TrackRow key={t.id} track={t} index={i} queueIds={topTracks.map((x) => x.id)} />
              ))}
            </div>
          </section>

          <section id="artists" className="scroll-mt-24">
            <SectionHeader
              title="Rising artists"
              subtitle="Fastest growing artists this month"
              action={
                risingArtists.length > 6 ? (
                  <button
                    type="button"
                    onClick={() => setShowAllRisingArtists((prev) => !prev)}
                    className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
                  >
                    {showAllRisingArtists ? "Show less" : "Show all"}
                  </button>
                ) : null
              }
            />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 sm:gap-5">
              {visibleRisingArtists.map((a) => (
                <ArtistCard
                  key={a.id}
                  artist={a}
                  badge={a.growthRate ? `+${a.growthRate}%` : undefined}
                  subtext={a.growthRate ? `+${a.growthRate}% this month` : undefined}
                  className="w-full"
                />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
