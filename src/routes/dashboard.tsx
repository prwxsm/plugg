import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
  X,
  TrendingUp,
  Download,
  Heart,
  Clock,
  Calendar,
  ArrowDownAZ,
  Check,
  ChevronDown,
  Layers,
  Disc3,
  FileText,
  Hash,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { TrackRow } from "@/components/plugg/media";
import { ArtistMobileTabs } from "@/components/plugg/artist-mobile-tabs";
import {
  Button,
  EmptyState,
  Field,
  SectionHeader,
  StatCard,
  inputClass,
} from "@/components/plugg/primitives";
import { art } from "@/data/covers";
import { formatCount, formatDate, formatDateTime, formatDuration, goLiveAt } from "@/lib/plugg";
import { usePlugg } from "@/state/plugg-store";
import { cn } from "@/lib/utils";

type DashboardTab = "overview" | "releases";

type SongFilter =
  | "streams"
  | "downloads"
  | "favorites"
  | "length"
  | "released-new"
  | "released-old"
  | "alphabetical";

function FilterDropdown<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: {
    id: T;
    label: string;
    icon?: React.ComponentType<{ size?: number; className?: string }>;
  }[];
  onChange: (value: T) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const current = options.find((o) => o.id === value) ?? options[0];
  const CurrentIcon = current?.icon;

  return (
    <div ref={containerRef} className={cn("relative inline-block text-left", className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors select-none cursor-pointer",
          open
            ? "bg-secondary text-foreground shadow-sm"
            : "bg-elevated/80 text-foreground hover:bg-secondary",
        )}
      >
        {CurrentIcon && <CurrentIcon size={13} className="text-primary shrink-0" />}
        <span>{current?.label}</span>
        <ChevronDown
          size={13}
          className={cn(
            "text-muted-foreground transition-transform duration-200 shrink-0",
            open && "rotate-180 text-foreground",
          )}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-full z-50 mt-1.5 min-w-[210px] overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-2xl animate-scale-in"
        >
          {options.map((option) => {
            const isSelected = option.id === value;
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-xs transition-colors cursor-pointer",
                  isSelected
                    ? "bg-elevated text-foreground font-medium"
                    : "text-muted-foreground hover:bg-elevated/70 hover:text-foreground",
                )}
              >
                <div className="flex items-center gap-2 truncate">
                  {Icon && (
                    <Icon
                      size={13}
                      className={
                        isSelected ? "text-primary shrink-0" : "text-muted-foreground shrink-0"
                      }
                    />
                  )}
                  <span className="truncate">{option.label}</span>
                </div>
                {isSelected && <Check size={13} className="text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/dashboard")({
  validateSearch: (search: Record<string, unknown>): { tab?: DashboardTab } => {
    const t = search["tab"];
    if (t === "releases" || t === "scheduled") return { tab: "releases" };
    return {};
  },
  head: () => ({
    meta: [
      { title: "Artist dashboard — Plugg" },
      {
        name: "description",
        content:
          "Track plays, downloads, monthly listeners, fan growth and release performance for your music on Plugg.",
      },
      { property: "og:title", content: "Artist dashboard — Plugg" },
      {
        property: "og:description",
        content: "Plays, downloads, listeners and release performance for your music.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { session, currentArtist, analytics, tracks, releases } = usePlugg();
  const { tab = "overview" } = Route.useSearch();
  const navigate = useNavigate();

  const [songFilter, setSongFilter] = useState<SongFilter>("streams");
  const [showAllTracks, setShowAllTracks] = useState(false);

  useEffect(() => {
    if (session === "loggedOut") {
      window.location.href = "/auth?returnTo=/dashboard";
    }
  }, [session]);

  if (session === "loggedOut") {
    return (
      <EmptyState
        title="Sign in to access Artist Dashboard"
        description="You need an artist account to access artist tools. Sign in or register as an artist to view your analytics and music performance."
        ctaLabel="Sign in or register"
        ctaTo="/auth"
      />
    );
  }

  if (session === "loggedInListener" || !currentArtist) {
    return (
      <EmptyState
        title="Artist Account Required"
        description="The artist dashboard is only available to Artist accounts. Sign in with an Artist account or create one to view analytics and manage releases."
        ctaLabel="Explore music"
        ctaTo="/discover"
      />
    );
  }

  const artistTracks = useMemo(
    () => tracks.filter((t) => t.artistId === currentArtist.id),
    [tracks, currentArtist.id],
  );

  const totalDownloads =
    analytics.totalDownloads ?? artistTracks.reduce((sum, t) => sum + (t.downloadCount || 0), 0);

  const filterOptions: {
    id: SongFilter;
    label: string;
    icon: typeof TrendingUp;
  }[] = [
    { id: "streams", label: "Streams", icon: TrendingUp },
    { id: "downloads", label: "Downloads", icon: Download },
    { id: "favorites", label: "Favorites", icon: Heart },
    { id: "length", label: "Length", icon: Clock },
    { id: "released-new", label: "Releases (New → Old)", icon: Calendar },
    { id: "released-old", label: "Releases (Old → New)", icon: Calendar },
    { id: "alphabetical", label: "A — Z", icon: ArrowDownAZ },
  ];

  const sortedTracks = useMemo(() => {
    const list = [...artistTracks];
    switch (songFilter) {
      case "streams":
        return list.sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
      case "downloads":
        return list.sort((a, b) => (b.downloadCount || 0) - (a.downloadCount || 0));
      case "favorites":
        return list.sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
      case "length":
        return list.sort((a, b) => (b.durationSeconds || 0) - (a.durationSeconds || 0));
      case "released-new":
        return list.sort(
          (a, b) => new Date(b.releaseDate || 0).getTime() - new Date(a.releaseDate || 0).getTime(),
        );
      case "released-old":
        return list.sort(
          (a, b) => new Date(a.releaseDate || 0).getTime() - new Date(b.releaseDate || 0).getTime(),
        );
      case "alphabetical":
        return list.sort((a, b) => a.title.localeCompare(b.title));
      default:
        return list;
    }
  }, [artistTracks, songFilter]);

  const displayedTracks = showAllTracks ? sortedTracks : sortedTracks.slice(0, 10);
  const myReleases = releases.filter((r) => r.artistId === currentArtist.id);

  const tabs: { value: DashboardTab; label: string }[] = [
    { value: "overview", label: "Overview" },
    {
      value: "releases",
      label: `Your Releases${myReleases.length ? ` (${myReleases.length})` : ""}`,
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-10 pt-14 md:pt-0">
      <ArtistMobileTabs />
      <div className="hidden md:flex flex-wrap items-end justify-end gap-4 mt-4">
        <Link
          to="/upload"
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Upload music
        </Link>
      </div>

      <div className="inline-flex rounded-full bg-elevated p-1">
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() =>
              navigate({
                to: "/dashboard",
                search: t.value === "releases" ? { tab: "releases" } : {},
              })
            }
            className={cn(
              "rounded-full px-5 py-2 text-sm font-medium transition-colors cursor-pointer",
              tab === t.value
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "releases" ? <YourReleasesTab /> : null}

      {tab === "overview" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <StatCard label="Total plays" value={formatCount(analytics.totalPlays)} />
            <StatCard label="Total downloads" value={formatCount(totalDownloads)} />
            <StatCard
              label="Monthly listeners"
              value={formatCount(analytics.monthlyListeners)}
              delta={`+${analytics.growthPercent}% this month`}
            />
            <StatCard label="Fans" value={formatCount(analytics.fans)} />
            <StatCard label="Releases" value={String(myReleases.length)} />
          </div>

          <section>
            <SectionHeader title="Plays over time" subtitle="Last 7 months" />
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.timeline} margin={{ left: -18, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="playsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.55} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                    tickFormatter={(v: number) => formatCount(v)}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--elevated)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      color: "var(--foreground)",
                      fontSize: 12,
                    }}
                    formatter={(v: number | string) => formatCount(Number(v))}
                  />
                  <Area
                    type="monotone"
                    dataKey="plays"
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    fill="url(#playsFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="space-y-4">
            <div className="space-y-3">
              <SectionHeader
                title="Top songs"
                subtitle={`Filtered by ${filterOptions.find((o) => o.id === songFilter)?.label || "Streams"}`}
              />
              <div>
                <FilterDropdown
                  value={songFilter}
                  options={filterOptions}
                  onChange={setSongFilter}
                />
              </div>
            </div>

            {sortedTracks.length ? (
              <>
                <div className="track-list">
                  {displayedTracks.map((t, i) => (
                    <TrackRow
                      key={t.id}
                      track={t}
                      index={i}
                      showArtist={false}
                      queueIds={sortedTracks.map((x) => x.id)}
                      customStatMobile={
                        <div className="flex w-14 shrink-0 items-center justify-start text-xs tabular-nums">
                          {songFilter === "downloads" ? (
                            <span className="flex items-center gap-1 font-semibold text-foreground">
                              <Download size={13} className="shrink-0 text-primary" />
                              {formatCount(t.downloadCount || 0)}
                            </span>
                          ) : songFilter === "favorites" ? (
                            <span className="flex items-center gap-1 font-semibold text-foreground">
                              <Heart
                                size={13}
                                fill="currentColor"
                                className="shrink-0 text-primary"
                              />
                              {formatCount(t.likeCount || 0)}
                            </span>
                          ) : songFilter === "length" ? (
                            <span className="flex items-center gap-1 font-semibold text-primary">
                              <Clock size={13} className="shrink-0 text-primary" />
                              {formatDuration(t.durationSeconds)}
                            </span>
                          ) : songFilter === "released-new" || songFilter === "released-old" ? (
                            <span className="flex items-center gap-1 text-muted-foreground truncate">
                              <Calendar size={13} className="shrink-0 text-muted-foreground" />
                              <span className="truncate">{formatDate(t.releaseDate)}</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 font-semibold text-foreground">
                              <TrendingUp size={13} className="shrink-0 text-primary" />
                              {formatCount(t.playCount)}
                            </span>
                          )}
                        </div>
                      }
                      customStat={
                        <div className="flex w-44 shrink-0 items-center justify-between text-xs tabular-nums">
                          <span
                            className={cn(
                              "flex w-[50px] shrink-0 items-center gap-1 transition-colors",
                              songFilter === "streams"
                                ? "font-semibold text-foreground"
                                : "text-muted-foreground",
                            )}
                          >
                            <TrendingUp
                              size={13}
                              className={cn(
                                "shrink-0",
                                songFilter === "streams" ? "text-primary" : "text-muted-foreground",
                              )}
                            />
                            <span className="truncate">{formatCount(t.playCount)}</span>
                          </span>
                          <span className="shrink-0 text-muted-foreground/40">·</span>
                          <span
                            className={cn(
                              "flex w-[50px] shrink-0 items-center gap-1 transition-colors",
                              songFilter === "downloads"
                                ? "font-semibold text-foreground"
                                : "text-muted-foreground",
                            )}
                          >
                            <Download
                              size={13}
                              className={cn(
                                "shrink-0",
                                songFilter === "downloads"
                                  ? "text-primary"
                                  : "text-muted-foreground",
                              )}
                            />
                            <span className="truncate">{formatCount(t.downloadCount || 0)}</span>
                          </span>
                          <span className="shrink-0 text-muted-foreground/40">·</span>
                          <span
                            className={cn(
                              "flex w-[50px] shrink-0 items-center gap-1 transition-colors",
                              songFilter === "favorites"
                                ? "font-semibold text-foreground"
                                : "text-muted-foreground",
                            )}
                          >
                            <Heart
                              size={13}
                              fill={songFilter === "favorites" ? "currentColor" : "none"}
                              className={cn(
                                "shrink-0",
                                songFilter === "favorites"
                                  ? "text-primary"
                                  : "text-muted-foreground",
                              )}
                            />
                            <span className="truncate">{formatCount(t.likeCount || 0)}</span>
                          </span>
                        </div>
                      }
                    />
                  ))}
                </div>
                {sortedTracks.length > 10 && (
                  <div className="pt-2 text-center">
                    <button
                      onClick={() => setShowAllTracks((v) => !v)}
                      className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors underline"
                    >
                      {showAllTracks
                        ? "Show top 10 songs"
                        : `Show all ${sortedTracks.length} songs`}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <EmptyState
                title="No plays yet"
                description="Publish a release and your top songs will appear here."
                ctaLabel="Upload music"
                ctaTo="/upload"
              />
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
function YourReleasesTab() {
  const { currentArtist, releases, tracks, deleteRelease, uploadDraft, analytics } = usePlugg();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "scheduled" | "draft">(
    "all",
  );

  useEffect(() => {
    if (!activeMenuId) return;
    const handleDocClick = () => setActiveMenuId(null);
    window.addEventListener("click", handleDocClick);
    return () => window.removeEventListener("click", handleDocClick);
  }, [activeMenuId]);

  useEffect(() => {
    if (!deleteTarget) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDeleteTarget(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleteTarget]);

  if (!currentArtist) return null;

  const myReleases = releases.filter((r) => r.artistId === currentArtist.id);
  const scheduledCount = myReleases.filter((r) => r.status === "scheduled").length;
  const publishedCount = myReleases.filter((r) => r.status === "published").length;
  const draftCount = myReleases.filter((r) => r.status === "draft").length;

  const filteredReleases = myReleases.filter((r) => {
    if (statusFilter === "all") return true;
    return r.status === statusFilter;
  });

  const filterOptions = [
    { id: "all" as const, label: `All (${myReleases.length})`, icon: Layers },
    { id: "published" as const, label: `Published (${publishedCount})`, icon: Disc3 },
    { id: "scheduled" as const, label: `Scheduled (${scheduledCount})`, icon: Clock },
    ...(draftCount > 0
      ? [{ id: "draft" as const, label: `Drafts (${draftCount})`, icon: FileText }]
      : []),
  ];

  return (
    <div className="space-y-8">
      {uploadDraft ? (
        <section className="rounded-xl bg-surface/80 p-4">
          <p className="text-eyebrow">Release in progress</p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">{uploadDraft.title || "Untitled release"}</p>
              <p className="mt-1 text-xs capitalize text-muted-foreground">
                {uploadDraft.type} · saved {formatDateTime(uploadDraft.savedAt)}
              </p>
            </div>
            <Link
              to="/upload"
              className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Continue where you stopped
            </Link>
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        <div className="space-y-3">
          <SectionHeader title="Your releases" subtitle="Published, scheduled and drafts" />
          {myReleases.length > 0 && (
            <div>
              <FilterDropdown
                value={statusFilter}
                options={filterOptions}
                onChange={setStatusFilter}
              />
            </div>
          )}
        </div>

        {myReleases.length === 0 ? (
          <EmptyState
            title="No releases yet"
            description="Upload your music to create singles, EPs, or albums."
            ctaLabel="Upload music"
            ctaTo="/upload"
          />
        ) : filteredReleases.length === 0 ? (
          <EmptyState
            title={`No ${statusFilter} releases`}
            description={`You have no releases with status "${statusFilter}".`}
          />
        ) : (
          <div className="track-list">
            {filteredReleases.map((release) => {
              const performance = analytics.releasePerformance.find(
                (p) => p.releaseId === release.id,
              );
              const isScheduled = release.status === "scheduled";
              const isDraft = release.status === "draft";
              const isPublished = release.status === "published";
              const open = editingId === release.id;
              const menuOpen = activeMenuId === release.id;

              return (
                <div key={release.id} className="p-4 border-b border-border/40 last:border-b-0">
                  <div className="flex items-center gap-4">
                    <img
                      src={art(release.coverUrl)}
                      alt=""
                      className="h-12 w-12 sm:h-14 sm:w-14 rounded-md object-cover shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      {isPublished ? (
                        <Link
                          to="/release/$slug"
                          params={{ slug: release.slug }}
                          className="truncate text-sm font-medium hover:underline block"
                        >
                          {release.title}
                        </Link>
                      ) : (
                        <p className="truncate text-sm font-medium">{release.title}</p>
                      )}
                      <p className="mt-0.5 text-xs capitalize text-muted-foreground">
                        {release.type} · {formatDate(release.releaseDate)}
                        {isScheduled ? (
                          <>
                            {" "}
                            · goes live{" "}
                            <span className="text-foreground/80 font-medium">
                              {formatDateTime(release.goLiveAt ?? goLiveAt(release.releaseDate))}
                            </span>
                          </>
                        ) : null}
                      </p>
                      {release.description ? (
                        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                          {release.description}
                        </p>
                      ) : null}
                    </div>

                    <span className="hidden w-16 shrink-0 items-center gap-1 text-xs tabular-nums text-muted-foreground sm:inline-flex">
                      <TrendingUp size={13} className="shrink-0" />
                      <span className="truncate">{formatCount(performance?.plays ?? 0)}</span>
                    </span>

                    <span
                      className={cn(
                        "inline-flex items-center justify-center w-[88px] shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium capitalize text-center",
                        isPublished
                          ? "bg-primary/15 text-primary"
                          : isScheduled
                            ? "bg-elevated text-foreground"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      {release.status}
                    </span>

                    <div className="relative shrink-0 flex items-center gap-2">
                      {open ? (
                        <Button
                          variant="subtle"
                          onClick={() => setEditingId(null)}
                          className="font-medium px-3 text-xs h-8"
                        >
                          Save
                        </Button>
                      ) : null}

                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId((prev) => (prev === release.id ? null : release.id));
                          }}
                          aria-label="Release options"
                          aria-expanded={menuOpen}
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-xl bg-elevated text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                            menuOpen && "text-foreground bg-secondary",
                          )}
                        >
                          <MoreVertical size={15} />
                        </button>

                        {menuOpen ? (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 z-50 mt-1.5 w-44 overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-2xl animate-scale-in"
                          >
                            {isScheduled ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  setEditingId(open ? null : release.id);
                                }}
                                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-elevated transition-colors"
                              >
                                <Pencil size={14} className="text-muted-foreground" />
                                {open ? "Close editor" : "Edit details"}
                              </button>
                            ) : null}

                            {isDraft ? (
                              <Link
                                to="/upload"
                                onClick={() => setActiveMenuId(null)}
                                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-elevated transition-colors"
                              >
                                <Pencil size={14} className="text-muted-foreground" />
                                Continue editing
                              </Link>
                            ) : null}

                            {isPublished ? (
                              <Link
                                to="/release/$slug"
                                params={{ slug: release.slug }}
                                onClick={() => setActiveMenuId(null)}
                                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-elevated transition-colors"
                              >
                                <Pencil size={14} className="text-muted-foreground" />
                                View release
                              </Link>
                            ) : null}

                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                setDeleteTarget({ id: release.id, title: release.title });
                              }}
                              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10 transition-colors"
                            >
                              <Trash2 size={14} />
                              Delete project
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  {open ? <ScheduledEditor releaseId={release.id} /> : null}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Custom Confirmation Card Modal */}
      {deleteTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm rounded-2xl bg-surface p-5 shadow-2xl animate-in zoom-in-95 duration-150 space-y-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
          >
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/15 text-destructive">
                <Trash2 size={20} />
              </div>
              <div className="space-y-1">
                <h3 id="delete-dialog-title" className="text-base font-semibold text-foreground">
                  Delete project?
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Are you sure you want to delete{" "}
                  <span className="font-medium text-foreground">"{deleteTarget.title}"</span>? This
                  project will be permanently removed.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl bg-elevated px-4 py-2 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetId = deleteTarget.id;
                  setDeleteTarget(null);
                  if (editingId === targetId) setEditingId(null);
                  deleteRelease(targetId);
                }}
                className="rounded-xl bg-destructive px-4 py-2 text-xs font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors shadow-sm"
              >
                Delete project
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CollaboratorField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value?: string | null | undefined;
  onChange: (val: string) => void;
  placeholder: string;
}) {
  const parseList = (str?: string | null | undefined): string[] => {
    if (!str || !str.trim()) return [""];
    const parts = str.split(",").map((s) => s.trim());
    return parts.length > 0 ? parts : [""];
  };

  const [items, setItems] = useState<string[]>(() => parseList(value));

  // Sync if value changes externally
  useEffect(() => {
    const currentJoined = items
      .map((s) => s.trim())
      .filter(Boolean)
      .join(", ");
    const externalJoined = (value || "").trim();
    if (currentJoined !== externalJoined && !items.some((it) => !it.trim())) {
      setItems(parseList(value));
    }
  }, [value]);

  const updateItem = (index: number, val: string) => {
    const next = [...items];
    next[index] = val;
    setItems(next);
    const joined = next
      .map((s) => s.trim())
      .filter(Boolean)
      .join(", ");
    onChange(joined);
  };

  const addItem = () => {
    setItems((prev) => [...prev, ""]);
  };

  const removeItem = (index: number) => {
    const next = items.filter((_, i) => i !== index);
    const finalItems = next.length > 0 ? next : [""];
    setItems(finalItems);
    const joined = finalItems
      .map((s) => s.trim())
      .filter(Boolean)
      .join(", ");
    onChange(joined);
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="space-y-2">
        {items.map((item, idx) => {
          const basePrefix = placeholder.replace(/\s*\d+$/, "");
          const currentPlaceholder = idx === 0 ? placeholder : `${basePrefix} ${idx + 1}`;
          return (
            <div key={idx} className="flex items-center gap-2">
              <input
                value={item}
                onChange={(e) => updateItem(idx, e.target.value)}
                className={inputClass}
                placeholder={currentPlaceholder}
                aria-label={`${label} ${idx + 1}`}
              />
              {idx === items.length - 1 ? (
                <button
                  type="button"
                  onClick={addItem}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-elevated text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  title={`Add another ${label.toLowerCase().replace(/s$/, "")}`}
                >
                  <Plus size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-elevated text-muted-foreground hover:text-destructive hover:bg-secondary transition-colors"
                  title="Remove"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScheduledEditor({ releaseId }: { releaseId: string }) {
  const { releases, tracks, updateRelease, updateTrack } = usePlugg();
  const release = releases.find((r) => r.id === releaseId);
  const releaseTracks = tracks.filter((t) => t.releaseId === releaseId);
  if (!release) return null;

  return (
    <div className="mt-4 space-y-5 rounded-xl bg-surface/80 p-4">
      <p className="text-xs text-muted-foreground">
        Title, audio, genre and artwork are locked once scheduled. You can still refine the optional
        details.
      </p>
      <Field label="Description">
        <textarea
          value={release.description ?? ""}
          onChange={(e) => updateRelease(releaseId, { description: e.target.value })}
          rows={3}
          className={inputClass}
          placeholder="Tell listeners the story behind this release."
        />
      </Field>
      {releaseTracks.map((track) => (
        <div key={track.id} className="space-y-4 border-t border-border pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">{track.title}</p>
            {track.pluggTrackId ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] font-mono text-muted-foreground tracking-wide" title="Plugg Track ID">
                <Hash size={9} className="text-primary" />
                {track.pluggTrackId}
              </span>
            ) : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <CollaboratorField
              label="Featured artists"
              value={track.features}
              onChange={(features) => updateTrack(track.id, { features })}
              placeholder="Artist 1"
            />
            <CollaboratorField
              label="Producers"
              value={track.producers}
              onChange={(producers) => updateTrack(track.id, { producers })}
              placeholder="Producer 1"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Lyrics</label>
            <textarea
              value={track.lyrics ?? ""}
              onChange={(e) => updateTrack(track.id, { lyrics: e.target.value })}
              rows={4}
              className={inputClass}
              placeholder="Let the listeners sing along..."
              aria-label={`Lyrics for ${track.title}`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
