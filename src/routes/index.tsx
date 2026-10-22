import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { art } from "@/data/covers";
import { ArtistCard, PlayButton, ReleaseCard } from "@/components/plugg/media";
import { SectionHeader } from "@/components/plugg/primitives";
import { formatCount } from "@/lib/plugg";
import { cn } from "@/lib/utils";
import { usePlugg } from "@/state/plugg-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Plugg — Web Player" },
      {
        name: "description",
        content: "Plugg — Web Player",
      },
      { property: "og:title", content: "Plugg — Web Player" },
      {
        property: "og:description",
        content: "Plugg — Web Player",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const {
    tracks,
    releases,
    artists,
    playTrack,
    currentTrack,
    isPlaying,
    togglePlay,
    recentlyPlayedIds,
    currentUser,
  } = usePlugg();

  const published = tracks.filter((t) => t.published);
  const featured = releases.filter((r) => r.status === "published").slice(0, 5);
  const [featureIndex, setFeatureIndex] = useState(0);

  useEffect(() => {
    if (featured.length < 2) return;
    const id = window.setInterval(() => {
      setFeatureIndex((i) => (i + 1) % featured.length);
    }, 10000);
    return () => window.clearInterval(id);
  }, [featured.length]);

  const feature = featured[Math.min(featureIndex, featured.length - 1)];
  const featureArtist = artists.find((a) => a.id === feature?.artistId);
  const featureTracks = published.filter((t) => t.releaseId === feature?.id);
  const featuredArtists = useMemo(() => {
    return [...artists].sort((a, b) => {
      const aScore = (a.featured ? 100 : 0) + (a.verified ? 20 : 0);
      const bScore = (b.featured ? 100 : 0) + (b.verified ? 20 : 0);
      return bScore - aScore || b.monthlyListeners - a.monthlyListeners;
    });
  }, [artists]);
  const [showAllFeaturedArtists, setShowAllFeaturedArtists] = useState(false);
  const visibleFeaturedArtists = showAllFeaturedArtists
    ? featuredArtists
    : featuredArtists.slice(0, 6);

  const recent = recentlyPlayedIds
    .map((id) => published.find((t) => t.id === id))
    .filter((t): t is (typeof published)[number] => Boolean(t));

  const [showAllRecent, setShowAllRecent] = useState(false);
  const recentItems = useMemo(() => {
    return recent
      .map((t) => {
        const release = releases.find((r) => r.id === t.releaseId);
        return release
          ? { id: t.id, release, artist: artists.find((a) => a.id === t.artistId) }
          : null;
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [recent, releases, artists]);
  const visibleRecent = showAllRecent ? recentItems : recentItems.slice(0, 6);

  const publishedReleases = useMemo(
    () => releases.filter((r) => r.status === "published"),
    [releases],
  );
  const [showAllNewReleases, setShowAllNewReleases] = useState(false);
  const visibleNewReleases = showAllNewReleases ? publishedReleases : publishedReleases.slice(0, 6);

  return (
    <div className="space-y-12">
      {feature && featureArtist ? (
        <section className="relative left-1/2 h-[390px] w-screen -translate-x-1/2 overflow-hidden sm:h-[430px] md:w-[calc(100vw-var(--sidebar-w))] xl:w-[calc(100vw-var(--sidebar-w)-var(--right-sidebar-w))]">
          <img
            key={`bg-${feature.id}`}
            src={art(feature.coverUrl)}
            alt=""
            className="animate-hero-fade absolute inset-0 h-full w-full scale-[1.03] object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/55 to-background/15" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/15 to-background/45" />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-background to-transparent" />
          <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent" />
          <div
            key={feature.id}
            className="animate-hero-fade relative mx-auto flex h-full max-w-6xl flex-col justify-end px-5 pb-14 sm:px-8 sm:pb-16"
          >
            <div className="min-w-0 max-w-2xl">
              <div className="mb-3 flex items-center gap-2">
                <span className="h-px w-8 bg-foreground" />
                <p className="text-eyebrow text-foreground">Featured {feature.type}</p>
              </div>
              <h1 className="text-4xl font-bold uppercase leading-[0.92] sm:text-6xl">
                {feature.title}
              </h1>
              <p className="mt-3 text-sm text-muted-foreground">
                {featureArtist.displayName} · {formatCount(featureArtist.monthlyListeners)} monthly
                listeners
              </p>
              <div className="mt-6 flex items-center gap-3">
                <PlayButton
                  label={`Play ${feature.title}`}
                  active={currentTrack?.releaseId === feature.id && isPlaying}
                  onClick={() =>
                    featureTracks[0]
                      ? currentTrack?.releaseId === feature.id
                        ? togglePlay()
                        : playTrack(
                            featureTracks[0].id,
                            featureTracks.map((t) => t.id),
                          )
                      : undefined
                  }
                />
                <Link
                  to="/release/$slug"
                  params={{ slug: feature.slug }}
                  className="rounded-full bg-elevated/70 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-elevated"
                >
                  View release
                </Link>
              </div>
            </div>
          </div>

          {featured.length > 1 ? (
            <div className="absolute bottom-8 right-5 flex items-center gap-1.5 sm:right-8">
              {featured.map((r, i) => (
                <button
                  key={r.id}
                  onClick={() => setFeatureIndex(i)}
                  aria-label={`Show featured release ${i + 1}`}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    i === featureIndex
                      ? "w-6 bg-foreground"
                      : "w-1.5 bg-foreground/35 hover:bg-foreground/60",
                  )}
                />
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {currentUser && recentItems.length > 0 ? (
        <section>
          <SectionHeader
            title={`Welcome back, ${currentUser.name.split(" ")[0]}`}
            subtitle="Pick up where you left off"
            action={
              recentItems.length > 6 ? (
                <button
                  type="button"
                  onClick={() => setShowAllRecent((prev) => !prev)}
                  className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
                >
                  {showAllRecent ? "Show less" : "Show all"}
                </button>
              ) : null
            }
          />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 sm:gap-5">
            {visibleRecent.map((item) => (
              <ReleaseCard
                key={item.id}
                release={item.release}
                artist={item.artist}
                className="w-full"
              />
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <SectionHeader
          title="New releases"
          subtitle="Fresh from artists"
          action={
            publishedReleases.length > 6 ? (
              <button
                type="button"
                onClick={() => setShowAllNewReleases((prev) => !prev)}
                className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
              >
                {showAllNewReleases ? "Show less" : "Show all"}
              </button>
            ) : null
          }
        />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 sm:gap-5">
          {visibleNewReleases.map((r) => (
            <ReleaseCard
              key={r.id}
              release={r}
              artist={artists.find((a) => a.id === r.artistId)}
              className="w-full"
            />
          ))}
        </div>
      </section>

      <section id="artists" className="scroll-mt-24">
        <SectionHeader
          title="Featured artists"
          subtitle="Curated by Plugg editorial"
          action={
            featuredArtists.length > 6 ? (
              <button
                type="button"
                onClick={() => setShowAllFeaturedArtists((prev) => !prev)}
                className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
              >
                {showAllFeaturedArtists ? "Show less" : "Show all"}
              </button>
            ) : null
          }
        />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 sm:gap-5">
          {visibleFeaturedArtists.map((a) => (
            <ArtistCard
              key={a.id}
              artist={a}
              badge={a.featured ? "Spotlight" : undefined}
              className="w-full"
            />
          ))}
        </div>
      </section>
    </div>
  );
}
