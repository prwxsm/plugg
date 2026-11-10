import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  PhotonImage,
  SamplingFilter,
  crop,
  darken_hsl,
  gaussian_blur,
  resize,
  watermark,
} from "@cf-wasm/photon";

import { art } from "@/data/covers";
import { resolveRequestOrigin } from "@/lib/og-meta";
import { getStorageProvider } from "@/lib/storage";
import { validateStorageKey } from "@/lib/storage/media-key";
import {
  fetchArtistShareRecord,
  fetchReleaseShareRecord,
  fetchTrackShareRecord,
} from "@/server/og-share-lookup";

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const FG_MAX_SIZE = 540;
const MAX_CACHE_ENTRIES = 48;
const CACHE_TTL_MS = 15 * 60 * 1000;
const WHATSAPP_TARGET_MAX_BYTES = 280 * 1024;
const WHATSAPP_HARD_MAX_BYTES = 450 * 1024;

interface CacheEntry {
  bytes: Uint8Array;
  expiresAt: number;
}

const ogImageCache = new Map<string, CacheEntry>();
const ogInFlight = new Map<string, Promise<Uint8Array | null>>();

const SEED_ASSET_FILES: Record<string, string> = {
  c1: "cover-1.jpg",
  c2: "cover-2.jpg",
  c3: "cover-3.jpg",
  c4: "cover-4.jpg",
  c5: "cover-5.jpg",
  c6: "cover-6.jpg",
  c7: "cover-7.jpg",
  c8: "cover-8.jpg",
  b1: "banner-1.jpg",
  b2: "banner-2.jpg",
  logo: "logo.png",
  default_playlist: "logo.png",
  plugg_logo: "logo.png",
  genre_afrobeats: "01_afrobeats.png",
  afrobeats: "01_afrobeats.png",
  genre_dancehall: "02_dancehall.png",
  dancehall: "02_dancehall.png",
  genre_dj: "03_dj.png",
  dj: "03_dj.png",
  genre_gospel: "04_gospel.png",
  gospel: "04_gospel.png",
  genre_hiphop: "06_hiphop.png",
  "hip-hop": "06_hiphop.png",
  hiphop: "06_hiphop.png",
  genre_rnb: "05_rnb.png",
  rnb: "05_rnb.png",
};

function getCachedOgBytes(cacheKey: string): Uint8Array | null {
  const entry = ogImageCache.get(cacheKey);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    ogImageCache.delete(cacheKey);
    return null;
  }
  // Refresh LRU order
  ogImageCache.delete(cacheKey);
  ogImageCache.set(cacheKey, entry);
  return entry.bytes;
}

function setCachedOgBytes(cacheKey: string, bytes: Uint8Array): void {
  if (ogImageCache.has(cacheKey)) {
    ogImageCache.delete(cacheKey);
  }
  while (ogImageCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = ogImageCache.keys().next().value;
    if (oldestKey === undefined) break;
    ogImageCache.delete(oldestKey);
  }
  ogImageCache.set(cacheKey, {
    bytes,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

function decodeImageDataUri(dataUri: string): Uint8Array | null {
  const commaIdx = dataUri.indexOf(",");
  if (commaIdx === -1) return null;
  const header = dataUri.slice(0, commaIdx);
  const payload = dataUri.slice(commaIdx + 1);
  if (header.includes(";base64")) {
    return new Uint8Array(Buffer.from(payload, "base64"));
  }
  return new Uint8Array(Buffer.from(decodeURIComponent(payload), "utf8"));
}

function isSafePathWithin(root: string, candidate: string): boolean {
  const resolvedRoot = path.resolve(root);
  const resolvedCandidate = path.resolve(candidate);
  return (
    resolvedCandidate === resolvedRoot || resolvedCandidate.startsWith(resolvedRoot + path.sep)
  );
}

async function readBuiltinAssetBytes(coverKey: string, origin: string): Promise<Uint8Array | null> {
  const resolved = art(coverKey);
  if (resolved.startsWith("data:image/")) {
    return decodeImageDataUri(resolved);
  }

  let hereDir = "";
  try {
    hereDir = path.dirname(fileURLToPath(import.meta.url));
  } catch {
    hereDir = process.cwd();
  }

  const candidatePaths: string[] = [];
  if (resolved.startsWith("/")) {
    const cleanRel = resolved.split("?")[0]!.split("#")[0]!.replace(/^\/+/, "");
    const roots = [
      path.resolve(process.cwd(), ".output/public"),
      path.resolve(process.cwd(), "public"),
      process.cwd(),
      path.resolve(hereDir, "../public"),
    ];
    for (const root of roots) {
      const candidate = path.resolve(root, cleanRel);
      if (isSafePathWithin(root, candidate)) {
        candidatePaths.push(candidate);
      }
    }
  }

  const seedFile = SEED_ASSET_FILES[coverKey];
  if (seedFile) {
    const assetsRoot = path.resolve(process.cwd(), "src/assets");
    const directAsset = path.resolve(assetsRoot, seedFile);
    if (isSafePathWithin(assetsRoot, directAsset)) {
      candidatePaths.push(directAsset);
    }
  }

  for (const filePath of candidatePaths) {
    try {
      const data = await fs.promises.readFile(filePath);
      if (data.length > 0) return new Uint8Array(data);
    } catch {
      // Try next candidate
    }
  }

  // Fallback for Workers / edge runtimes where static assets are fetched over same-origin HTTP
  if (resolved.startsWith("/") && !resolved.startsWith("/api/")) {
    try {
      const res = await fetch(new URL(resolved, origin));
      if (res.ok) {
        return new Uint8Array(await res.arrayBuffer());
      }
    } catch {
      // Ignore asset fetch failure
    }
  }

  return null;
}

async function loadSourceCoverBytes(coverKey: string, origin: string): Promise<Uint8Array | null> {
  if (coverKey.startsWith("/api/file/")) {
    const rawPart = coverKey.slice("/api/file/".length).split("?")[0] ?? "";
    try {
      const storageKey = decodeURIComponent(rawPart);
      validateStorageKey(storageKey);
      if (/\.(png|jpe?g|webp|gif)$/i.test(storageKey)) {
        const stored = await getStorageProvider().getFileBuffer(storageKey);
        if (stored?.buffer?.length) {
          return new Uint8Array(stored.buffer);
        }
      }
    } catch (error) {
      console.warn("OG image storage read fallback for key:", coverKey, error);
    }
    return readBuiltinAssetBytes("c1", origin);
  }

  const primary = await readBuiltinAssetBytes(coverKey, origin);
  if (primary?.length) return primary;

  if (coverKey !== "logo") {
    return readBuiltinAssetBytes("logo", origin);
  }
  return null;
}

function makeSolidCanvasPixels(
  width: number,
  height: number,
  r: number,
  g: number,
  b: number,
): Uint8Array {
  const raw = new Uint8Array(width * height * 4);
  for (let i = 0; i < raw.length; i += 4) {
    raw[i] = r;
    raw[i + 1] = g;
    raw[i + 2] = b;
    raw[i + 3] = 255;
  }
  return raw;
}

function paintCardBackplateAndFrame(
  raw: Uint8Array,
  canvasWidth: number,
  canvasHeight: number,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
): void {
  const borderWidth = 2;
  const minX = Math.max(0, boxX - borderWidth);
  const maxX = Math.min(canvasWidth - 1, boxX + boxW + borderWidth - 1);
  const minY = Math.max(0, boxY - borderWidth);
  const maxY = Math.min(canvasHeight - 1, boxY + boxH + borderWidth - 1);

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const idx = (y * canvasWidth + x) * 4;
      const inInterior = x >= boxX && x < boxX + boxW && y >= boxY && y < boxY + boxH;
      if (inInterior) {
        // Dark surface backing so transparent PNG logos have crisp contrast
        raw[idx] = 20;
        raw[idx + 1] = 20;
        raw[idx + 2] = 24;
        raw[idx + 3] = 255;
      } else {
        // Subtle light edge highlight (18% white over existing pixel)
        const r = raw[idx] ?? 18;
        const g = raw[idx + 1] ?? 18;
        const b = raw[idx + 2] ?? 20;
        raw[idx] = Math.round(r * 0.82 + 255 * 0.18);
        raw[idx + 1] = Math.round(g * 0.82 + 255 * 0.18);
        raw[idx + 2] = Math.round(b * 0.82 + 255 * 0.18);
        raw[idx + 3] = 255;
      }
    }
  }
}

function encodeBoundedJpeg(image: PhotonImage): Uint8Array {
  let bytes = image.get_bytes_jpeg(84);
  if (bytes.length > WHATSAPP_TARGET_MAX_BYTES) {
    bytes = image.get_bytes_jpeg(72);
  }
  if (bytes.length > WHATSAPP_HARD_MAX_BYTES) {
    bytes = image.get_bytes_jpeg(58);
  }
  return new Uint8Array(bytes);
}

function renderOgCardJpeg(sourceBytes: Uint8Array): Uint8Array {
  let src: PhotonImage | null = null;
  let smallBg: PhotonImage | null = null;
  let upscaledBg: PhotonImage | null = null;
  let canvas: PhotonImage | null = null;
  let framedCanvas: PhotonImage | null = null;
  let fg: PhotonImage | null = null;
  let fgCropped: PhotonImage | null = null;

  try {
    src = PhotonImage.new_from_byteslice(sourceBytes);
    const w = src.get_width();
    const h = src.get_height();
    if (!w || !h) {
      throw new Error("Source image has invalid dimensions");
    }

    const basePixels = makeSolidCanvasPixels(OG_WIDTH, OG_HEIGHT, 18, 18, 20);
    canvas = new PhotonImage(basePixels, OG_WIDTH, OG_HEIGHT);

    if (w / h >= 1.45) {
      // Landscape artwork/banner: scale to cover 1200x630 and center crop
      const scale = Math.max(OG_WIDTH / w, OG_HEIGHT / h);
      const scaledW = Math.max(OG_WIDTH, Math.round(w * scale));
      const scaledH = Math.max(OG_HEIGHT, Math.round(h * scale));
      fg = resize(src, scaledW, scaledH, SamplingFilter.Lanczos3);

      const x1 = Math.max(0, Math.floor((scaledW - OG_WIDTH) / 2));
      const y1 = Math.max(0, Math.floor((scaledH - OG_HEIGHT) / 2));
      const x2 = Math.min(scaledW, x1 + OG_WIDTH);
      const y2 = Math.min(scaledH, y1 + OG_HEIGHT);
      fgCropped = crop(fg, x1, y1, x2, y2);

      watermark(canvas, fgCropped, 0n, 0n);
      return encodeBoundedJpeg(canvas);
    }

    // Square or portrait cover art: ambient blurred backdrop + framed centered artwork
    smallBg = resize(src, 240, 126, SamplingFilter.Triangle);
    gaussian_blur(smallBg, 8);
    darken_hsl(smallBg, 0.42);
    upscaledBg = resize(smallBg, OG_WIDTH, OG_HEIGHT, SamplingFilter.Triangle);
    watermark(canvas, upscaledBg, 0n, 0n);

    const scale = Math.min(FG_MAX_SIZE / w, FG_MAX_SIZE / h);
    const fgW = Math.max(1, Math.round(w * scale));
    const fgH = Math.max(1, Math.round(h * scale));
    const fgX = Math.floor((OG_WIDTH - fgW) / 2);
    const fgY = Math.floor((OG_HEIGHT - fgH) / 2);

    const framedRaw = canvas.get_raw_pixels();
    paintCardBackplateAndFrame(framedRaw, OG_WIDTH, OG_HEIGHT, fgX, fgY, fgW, fgH);
    framedCanvas = new PhotonImage(framedRaw, OG_WIDTH, OG_HEIGHT);

    fg = resize(src, fgW, fgH, SamplingFilter.Lanczos3);
    watermark(framedCanvas, fg, BigInt(fgX), BigInt(fgY));

    return encodeBoundedJpeg(framedCanvas);
  } finally {
    fgCropped?.free();
    fg?.free();
    framedCanvas?.free();
    canvas?.free();
    upscaledBg?.free();
    smallBg?.free();
    src?.free();
  }
}

async function getOrRenderOgCard(coverKey: string, origin: string): Promise<Uint8Array | null> {
  const cacheKey = coverKey || "c1";
  const cached = getCachedOgBytes(cacheKey);
  if (cached) return cached;

  const pending = ogInFlight.get(cacheKey);
  if (pending) return pending;

  const job = (async (): Promise<Uint8Array | null> => {
    const sourceBytes = await loadSourceCoverBytes(cacheKey, origin);
    if (!sourceBytes) return null;

    try {
      const rendered = renderOgCardJpeg(sourceBytes);
      setCachedOgBytes(cacheKey, rendered);
      return rendered;
    } catch (error) {
      console.error("Failed rendering primary OG artwork, trying logo fallback:", cacheKey, error);
      const fallbackBytes = await readBuiltinAssetBytes("logo", origin);
      if (!fallbackBytes) return null;
      const renderedFallback = renderOgCardJpeg(fallbackBytes);
      setCachedOgBytes(cacheKey, renderedFallback);
      return renderedFallback;
    }
  })();

  ogInFlight.set(cacheKey, job);
  try {
    return await job;
  } finally {
    ogInFlight.delete(cacheKey);
  }
}

export async function handleOgImageRequest(request: Request, pathname: string): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed", { status: 405 });
  }

  const match = /^\/api\/og\/(track|release|artist)\/([^/]+)$/.exec(pathname);
  if (!match) {
    return new Response("Not found", { status: 404 });
  }

  const kind = match[1] as "track" | "release" | "artist";
  const rawParam = (match[2] ?? "").replace(/\.jpe?g$/i, "");
  let ref = "";
  try {
    ref = decodeURIComponent(rawParam).trim();
  } catch {
    return new Response("Invalid identifier", { status: 400 });
  }

  if (!ref) {
    return new Response("Not found", { status: 404 });
  }

  let coverKey: string | null = null;

  if (kind === "track") {
    const track = await fetchTrackShareRecord(ref);
    if (!track || !track.isPublic) {
      return new Response("Unavailable", { status: 404 });
    }
    coverKey = track.coverUrl || "c1";
  } else if (kind === "release") {
    const release = await fetchReleaseShareRecord(ref);
    if (!release || !release.isPublic) {
      return new Response("Unavailable", { status: 404 });
    }
    coverKey = release.coverUrl || "c1";
  } else {
    const artist = await fetchArtistShareRecord(ref);
    if (!artist) {
      return new Response("Unavailable", { status: 404 });
    }
    coverKey = artist.coverUrl || artist.avatarUrl || "logo";
  }

  const origin = resolveRequestOrigin(request.headers, request.url);
  const jpegBytes = await getOrRenderOgCard(coverKey, origin);
  if (!jpegBytes) {
    return new Response("Unavailable", { status: 404 });
  }

  const headers = new Headers({
    "Content-Type": "image/jpeg",
    "Content-Length": String(jpegBytes.length),
    "Cache-Control": "public, max-age=3600, s-maxage=14400, stale-while-revalidate=86400",
    "X-Content-Type-Options": "nosniff",
    "Cross-Origin-Resource-Policy": "cross-origin",
  });

  if (request.method === "HEAD") {
    return new Response(null, { status: 200, headers });
  }

  return new Response(Buffer.from(jpegBytes), { status: 200, headers });
}
