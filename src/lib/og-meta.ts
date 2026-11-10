import { formatCount, formatDuration } from "@/lib/plugg";

export const DEFAULT_PUBLIC_ORIGIN = "https://plugg.site";

export interface HeaderLookup {
  get(name: string): string | null | undefined;
}

export interface TrackShareMetaInput {
  id: string;
  slug?: string | undefined;
  pluggTrackId?: string | undefined;
  title: string;
  artistName: string;
  features?: string | undefined;
  genre?: string | undefined;
  durationSeconds: number;
  coverUrl?: string | undefined;
  isPublic?: boolean | undefined;
}

export interface ReleaseShareMetaInput {
  id: string;
  slug: string;
  title: string;
  type: "single" | "EP" | "album";
  artistName: string;
  trackCount: number;
  coverUrl?: string | undefined;
  isPublic?: boolean | undefined;
}

export interface ArtistShareMetaInput {
  id: string;
  username: string;
  displayName: string;
  monthlyListeners: number;
  avatarUrl?: string | undefined;
  coverUrl?: string | undefined;
}

export type HeadMetaEntry =
  { title: string } | { name: string; content: string } | { property: string; content: string };

const SOCIAL_CRAWLER_UA_RE =
  /whatsapp|facebookexternalhit|facebot|twitterbot|telegrambot|discordbot|slackbot|linkedinbot|pinterest|vkshare|embedly|signal/i;

export function isSocialCrawlerUserAgent(userAgent?: string | null): boolean {
  if (!userAgent) return false;
  return SOCIAL_CRAWLER_UA_RE.test(userAgent);
}

function readHeader(
  headers: HeaderLookup | Record<string, string | string[] | undefined> | null | undefined,
  key: string,
): string {
  if (!headers) return "";
  if (typeof (headers as HeaderLookup).get === "function") {
    return ((headers as HeaderLookup).get(key) ?? "").trim();
  }
  const record = headers as Record<string, string | string[] | undefined>;
  const val = record[key] ?? record[key.toLowerCase()];
  if (Array.isArray(val)) return (val[0] ?? "").trim();
  return typeof val === "string" ? val.trim() : "";
}

function normalizeHostCandidate(raw: string): string {
  const first = raw.split(",")[0]?.trim() ?? "";
  if (!first || !/^[a-z0-9.-]+(?::\d{1,5})?$/i.test(first)) return "";
  return first;
}

function isLoopbackHost(host: string): boolean {
  return /^(localhost|127\.0\.0\.1)(?::\d{1,5})?$/i.test(host);
}

export function resolveRequestOrigin(
  headers?: HeaderLookup | Record<string, string | string[] | undefined> | null,
  requestUrl?: URL | string | null,
): string {
  const envUrl =
    typeof process !== "undefined"
      ? (process.env["APP_URL"] || process.env["VITE_APP_URL"] || "").trim().replace(/\/+$/, "")
      : "";

  const host =
    normalizeHostCandidate(readHeader(headers, "x-forwarded-host")) ||
    normalizeHostCandidate(readHeader(headers, "host")) ||
    (requestUrl ? normalizeHostCandidate(new URL(String(requestUrl)).host) : "");

  if (host && isLoopbackHost(host)) {
    const xfProto = readHeader(headers, "x-forwarded-proto").split(",")[0]?.trim().toLowerCase();
    const urlProto = requestUrl
      ? new URL(String(requestUrl)).protocol.replace(":", "").toLowerCase()
      : "http";
    const proto = xfProto === "https" || urlProto === "https" ? "https" : "http";
    return `${proto}://${host}`;
  }

  if (envUrl && /^https?:\/\//i.test(envUrl)) {
    return envUrl;
  }

  if (host && !/^0\.0\.0\.0(?::\d+)?$/.test(host)) {
    return `https://${host}`;
  }

  return DEFAULT_PUBLIC_ORIGIN;
}

function buildPublicMediaMeta(params: {
  pageTitle: string;
  ogTitle: string;
  description: string;
  ogType: string;
  pageUrl: string;
  imageUrl: string;
  imageAlt: string;
  extraMeta?: HeadMetaEntry[] | undefined;
}): HeadMetaEntry[] {
  const meta: HeadMetaEntry[] = [
    { title: params.pageTitle },
    { name: "description", content: params.description },
    { property: "og:site_name", content: "Plugg" },
    { property: "og:type", content: params.ogType },
    { property: "og:title", content: params.ogTitle },
    { property: "og:description", content: params.description },
    { property: "og:url", content: params.pageUrl },
    { property: "og:image", content: params.imageUrl },
  ];

  if (params.imageUrl.startsWith("https://")) {
    meta.push({ property: "og:image:secure_url", content: params.imageUrl });
  }

  meta.push(
    { property: "og:image:type", content: "image/jpeg" },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:alt", content: params.imageAlt },
    ...(params.extraMeta ?? []),
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: params.ogTitle },
    { name: "twitter:description", content: params.description },
    { name: "twitter:image", content: params.imageUrl },
  );

  return meta;
}

export function buildTrackHeadMeta(
  track: TrackShareMetaInput | null | undefined,
  paramId: string,
  origin: string,
): { meta: HeadMetaEntry[]; canonicalUrl?: string } {
  if (!track) {
    return {
      meta: [{ title: "Track not found — Plugg" }, { name: "robots", content: "noindex" }],
    };
  }

  const ogTitle = `${track.title} — ${track.artistName}${track.features ? ` (feat. ${track.features})` : ""}`;
  const pageTitle = `${ogTitle} | Plugg`;
  const durationLabel = track.durationSeconds > 0 ? formatDuration(track.durationSeconds) : "";
  const prefix = [track.genre?.trim(), durationLabel].filter(Boolean).join(" · ");
  const description = `${prefix ? `${prefix} · ` : ""}Stream "${track.title}" by ${track.artistName} on Plugg.`;
  const cleanOrigin = origin.replace(/\/+$/, "");
  const encodedParam = encodeURIComponent(paramId);
  const pageUrl = `${cleanOrigin}/track/${encodedParam}`;

  if (track.isPublic === false) {
    return {
      canonicalUrl: pageUrl,
      meta: [
        { title: pageTitle },
        { name: "robots", content: "noindex" },
        { name: "description", content: "Stream African music on Plugg." },
      ],
    };
  }

  const imageUrl = `${cleanOrigin}/api/og/track/${encodedParam}.jpg`;

  return {
    canonicalUrl: pageUrl,
    meta: buildPublicMediaMeta({
      pageTitle,
      ogTitle,
      description,
      ogType: "music.song",
      pageUrl,
      imageUrl,
      imageAlt: `${track.title} by ${track.artistName} cover art`,
      extraMeta: [
        { property: "music:duration", content: String(track.durationSeconds || 0) },
        { property: "music:musician", content: track.artistName },
      ],
    }),
  };
}

export function buildReleaseHeadMeta(
  release: ReleaseShareMetaInput | null | undefined,
  paramSlug: string,
  origin: string,
): { meta: HeadMetaEntry[]; canonicalUrl?: string } {
  if (!release) {
    return {
      meta: [{ title: "Release — Plugg" }, { name: "robots", content: "noindex" }],
    };
  }

  const ogTitle = `${release.title} — ${release.artistName}`;
  const pageTitle = `${ogTitle} | Plugg`;
  const kindLabel = release.type === "EP" ? "EP" : release.type === "album" ? "Album" : "Single";
  const countLabel =
    release.trackCount > 0
      ? `${release.trackCount} ${release.trackCount === 1 ? "song" : "songs"}`
      : "";
  const prefix = [kindLabel, countLabel].filter(Boolean).join(" · ");
  const description = `${prefix} · Listen to "${release.title}" by ${release.artistName} on Plugg.`;
  const cleanOrigin = origin.replace(/\/+$/, "");
  const encodedParam = encodeURIComponent(paramSlug);
  const pageUrl = `${cleanOrigin}/release/${encodedParam}`;

  if (release.isPublic === false) {
    return {
      canonicalUrl: pageUrl,
      meta: [
        { title: pageTitle },
        { name: "robots", content: "noindex" },
        { name: "description", content: "Listen to African music on Plugg." },
      ],
    };
  }

  const imageUrl = `${cleanOrigin}/api/og/release/${encodedParam}.jpg`;

  return {
    canonicalUrl: pageUrl,
    meta: buildPublicMediaMeta({
      pageTitle,
      ogTitle,
      description,
      ogType: "music.album",
      pageUrl,
      imageUrl,
      imageAlt: `${release.title} by ${release.artistName} cover art`,
      extraMeta: [{ property: "music:musician", content: release.artistName }],
    }),
  };
}

export function buildArtistHeadMeta(
  artist: ArtistShareMetaInput | null | undefined,
  paramUsername: string,
  origin: string,
): { meta: HeadMetaEntry[]; canonicalUrl?: string } {
  if (!artist) {
    return {
      meta: [{ title: "Artist — Plugg" }, { name: "robots", content: "noindex" }],
    };
  }

  const ogTitle = `${artist.displayName} — Plugg`;
  const description = `Listen to ${artist.displayName} on Plugg · ${formatCount(artist.monthlyListeners)} monthly listeners.`;
  const cleanOrigin = origin.replace(/\/+$/, "");
  const encodedParam = encodeURIComponent(paramUsername);
  const pageUrl = `${cleanOrigin}/artist/${encodedParam}`;
  const imageUrl = `${cleanOrigin}/api/og/artist/${encodedParam}.jpg`;

  return {
    canonicalUrl: pageUrl,
    meta: buildPublicMediaMeta({
      pageTitle: ogTitle,
      ogTitle,
      description,
      ogType: "profile",
      pageUrl,
      imageUrl,
      imageAlt: `${artist.displayName} on Plugg`,
    }),
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderCrawlerHtml(result: {
  meta: HeadMetaEntry[];
  canonicalUrl?: string;
}): string {
  let title = "Plugg";
  const tags: string[] = [];
  let description = "";

  for (const entry of result.meta) {
    if ("title" in entry) {
      title = entry.title;
    } else if ("name" in entry) {
      if (entry.name === "description") description = entry.content;
      tags.push(`<meta name="${escapeHtml(entry.name)}" content="${escapeHtml(entry.content)}" />`);
    } else if ("property" in entry) {
      tags.push(
        `<meta property="${escapeHtml(entry.property)}" content="${escapeHtml(entry.content)}" />`,
      );
    }
  }

  const canonicalTag = result.canonicalUrl
    ? `<link rel="canonical" href="${escapeHtml(result.canonicalUrl)}" />`
    : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    ${canonicalTag}
    ${tags.join("\n    ")}
    <link rel="icon" href="/favicon.png" type="image/png" />
  </head>
  <body>
    <main>
      <h1>${escapeHtml(title)}</h1>
      ${description ? `<p>${escapeHtml(description)}</p>` : ""}
      ${result.canonicalUrl ? `<p><a href="${escapeHtml(result.canonicalUrl)}">Open on Plugg</a></p>` : ""}
    </main>
  </body>
</html>`;
}
