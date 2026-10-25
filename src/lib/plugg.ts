import type { Artist, Release, Track } from "@/data/types";

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export function formatCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  return String(value);
}

export function formatDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function todayISO(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

/**
 * Everything goes live at midnight: a release dated today appears at 00:00 the
 * next day, a future date appears at 00:00 on that day.
 */
export function goLiveAt(releaseDate: string): string {
  const base = new Date(`${releaseDate}T00:00:00`);
  if (Number.isNaN(base.getTime())) return new Date().toISOString();
  if (releaseDate <= todayISO()) base.setDate(base.getDate() + 1);
  return base.toISOString();
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Lightweight lookups over whatever collection is supplied (mock today, real later). */
export const select = {
  artist: (all: Artist[], id: string) => all.find((a) => a.id === id),
  artistByUsername: (all: Artist[], username: string) => all.find((a) => a.username === username),
  release: (all: Release[], id: string) => all.find((r) => r.id === id),
  releaseBySlug: (all: Release[], slug: string) => all.find((r) => r.slug === slug),
  track: (all: Track[], id: string) => all.find((t) => t.id === id),
  trackBySlug: (all: Track[], slug: string) => all.find((t) => t.slug === slug),
  tracksOfArtist: (all: Track[], artistId: string) => all.filter((t) => t.artistId === artistId && t.published),
  tracksOfRelease: (all: Track[], releaseId: string) => all.filter((t) => t.releaseId === releaseId),
  releasesOfArtist: (all: Release[], artistId: string) => all.filter((r) => r.artistId === artistId),
  byIds: (all: Track[], ids: string[]) =>
    ids.map((id) => all.find((t) => t.id === id)).filter((t): t is Track => Boolean(t)),
};

export interface SearchResults {
  tracks: Track[];
  artists: Artist[];
  releases: Release[];
}

export function search(
  query: string,
  data: { tracks: Track[]; artists: Artist[]; releases: Release[] },
): SearchResults {
  const q = query.trim().toLowerCase();
  if (!q) return { tracks: [], artists: [], releases: [] };
  return {
    tracks: data.tracks.filter(
      (t) => t.published && (t.title.toLowerCase().includes(q) || t.genre.toLowerCase().includes(q)),
    ),
    artists: data.artists.filter(
      (a) =>
        a.displayName.toLowerCase().includes(q) ||
        a.username.includes(q) ||
        a.location.toLowerCase().includes(q),
    ),
    releases: data.releases.filter((r) => r.status === "published" && r.title.toLowerCase().includes(q)),
  };
}

/** Formats track download filename as: "Title - Artist ft Features [Plugg].ext" */
export function buildTrackDownloadFilename(
  title: string,
  artistName?: string | null,
  features?: string | null,
  ext = "mp3"
): string {
  const cleanTitle = (title || "Untitled").trim();
  const cleanArtist = (artistName || "Unknown Artist").trim();
  const rawFeatures = (features || "")
    .trim()
    .replace(/^(feat\.?|ft\.?)\s+/i, "");
  const featPart = rawFeatures ? ` ft ${rawFeatures}` : "";
  const rawName = `${cleanTitle} - ${cleanArtist}${featPart} [Plugg].${ext}`;
  return rawName.replace(/[/\\?%*:|"<>]/g, "").replace(/\s+/g, " ").trim();
}
