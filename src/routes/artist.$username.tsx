import { createFileRoute, notFound } from "@tanstack/react-router";

import { Rail, PlayButton, ReleaseCard, TrackRow } from "@/components/plugg/media";
import { Button, EmptyState, SectionHeader, VerifiedBadge } from "@/components/plugg/primitives";
import { artists as seedArtists } from "@/data/artists";
import { art } from "@/data/covers";
import { formatCount } from "@/lib/plugg";
import { usePlugg } from "@/state/plugg-store";
import { SocialIconsList } from "@/components/plugg/social-icons";

export const Route = createFileRoute("/artist/$username")({
  head: ({ params }) => {
    const artist = seedArtists.find((a) => a.username === params.username);
    const title = artist ? `${artist.displayName} — Plugg` : "Artist — Plugg";
    const description = artist
      ? `${artist.displayName} · ${formatCount(artist.monthlyListeners)} monthly listeners on Plugg.`
      : "Artist profile on Plugg.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: ArtistPage,
});

function ArtistPage() {
  const { username } = Route.useParams();
  const { artists, tracks, releases, isFollowing, toggleFollow, playTrack, currentTrack, isPlaying, togglePlay } =
    usePlugg();

  const artist = artists.find((a) => a.username === username);
  if (!artist) throw notFound();

  const artistTracks = tracks.filter((t) => t.artistId === artist.id && t.published);
  const popular = [...artistTracks].sort((a, b) => b.playCount - a.playCount).slice(0, 5);
  const artistReleases = releases.filter((r) => r.artistId === artist.id && r.status === "published");
  const following = isFollowing(artist.id);
  const playingHere = currentTrack?.artistId === artist.id && isPlaying;

  return (
    <div className="space-y-10">
      <section className="relative -mx-4 overflow-hidden sm:-mx-6 sm:rounded-2xl">
        <img src={art(artist.coverUrl)} alt="" className="h-[360px] w-full object-cover sm:h-72" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-4 p-5 pt-14 sm:flex-row sm:items-end sm:p-8">
          <img
            src={art(artist.avatarUrl)}
            alt={artist.displayName}
            className="h-24 w-24 rounded-full object-cover ring-4 ring-background sm:h-32 sm:w-32"
          />
          <div className="min-w-0 flex-1">
            <p className="text-eyebrow">{artist.verified ? "Verified Plugg Artist" : "Artist"}</p>
            <div className="mt-1 flex items-center gap-2 min-w-0">
              <h1 className="truncate text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {artist.displayName}
              </h1>
              {artist.verified ? <VerifiedBadge size="lg" /> : null}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatCount(artist.monthlyListeners)} monthly listeners
            </p>
          </div>
          <div className="flex items-center gap-3">
            <PlayButton
              label={`Play ${artist.displayName}`}
              active={playingHere}
              onClick={() =>
                popular[0]
                  ? currentTrack?.artistId === artist.id
                    ? togglePlay()
                    : playTrack(popular[0].id, popular.map((t) => t.id))
                  : undefined
              }
            />
            <Button variant={following ? "outline" : "subtle"} onClick={() => toggleFollow(artist.id)}>
              {following ? "Following" : "Follow"}
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionHeader title="Popular" />
          {popular.length ? (
            <div className="track-list">
              {popular.map((t, i) => (
                <TrackRow key={t.id} track={t} index={i} showArtist={false} queueIds={popular.map((x) => x.id)} />
              ))}
            </div>
          ) : (
            <EmptyState title="No songs yet" description="This artist hasn't published any music on Plugg." />
          )}
        </div>
        <aside className="surface-card p-5">
          <p className="text-eyebrow">About</p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{artist.bio}</p>
          <dl className="mt-5 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Fans</dt>
              <dd className="tabular-nums">{formatCount(artist.fans)}</dd>
            </div>
          </dl>
          <SocialIconsList socialLinks={artist.socialLinks} className="mt-5" />
        </aside>
      </section>

      <section>
        <SectionHeader title="Releases" subtitle={`${artistReleases.length} on Plugg`} />
        {artistReleases.length ? (
          <Rail>
            {artistReleases.map((r) => (
              <ReleaseCard key={r.id} release={r} artist={artist} />
            ))}
          </Rail>
        ) : (
          <EmptyState title="No releases yet" />
        )}
      </section>
    </div>
  );
}
