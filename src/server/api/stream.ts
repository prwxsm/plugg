import { canReadAudio } from "../media-access";
import { getStorageProvider } from "../../lib/storage";
import { validateStorageKey } from "../../lib/storage/media-key";
import { storedResponse } from "./stored-response";
import path from "node:path";


export async function handleStreamRequest(request: Request, key: string): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed", { status: 405 });
  }

  let decodedKey: string;
  try {
    decodedKey = decodeURIComponent(key);
  } catch {
    return new Response("Invalid media key", { status: 400 });
  }
  if (decodedKey.split(/[\\/]/).includes("..") || decodedKey.includes("\0"))
    return new Response("Forbidden", { status: 403 });
  if (!(await canReadAudio(request, decodedKey)))
    return new Response("Media unavailable", { status: 404 });
  try { validateStorageKey(decodedKey); } catch { return new Response("Forbidden", { status: 403 }); }
  const storage = getStorageProvider();
  const normalizedKey = decodedKey;
  let filePath = decodedKey;

  const url = new URL(request.url);
  const quality = url.searchParams.get("quality");
  const variantParam = url.searchParams.get("variant");
  if (
    variantParam &&
    !/^(stream_(64k|96k|160k|256k)|download_(96k|160k|256k)|aac_256k)(\.(opus|m4a|mp3))?$/.test(
      variantParam,
    )
  )
    return new Response("Invalid variant", { status: 400 });
  const isDownload = Boolean(url.searchParams.get("filename") || url.searchParams.get("download"));

  // Check if a specific quality variant is requested and exists
  if (variantParam || quality) {
    let candidateVariantNames: string[] = [];
    if (variantParam) {
      candidateVariantNames = [
        `${variantParam}.opus`,
        `${variantParam}.m4a`,
        `${variantParam}.mp3`,
        variantParam,
      ];
    } else if (quality) {
      if (isDownload) {
        if (quality === "data_saver")
          candidateVariantNames = ["download_96k.m4a", "stream_96k.opus"];
        else if (quality === "very_high")
          candidateVariantNames = ["aac_256k.m4a", "download_256k.m4a"];
        else candidateVariantNames = ["download_160k.m4a", "stream_160k.opus"]; // standard
      } else {
        if (quality === "data_saver")
          candidateVariantNames = ["stream_64k.opus", "download_96k.m4a"];
        else if (quality === "normal")
          candidateVariantNames = ["stream_96k.opus", "download_96k.m4a"];
        else if (quality === "very_high")
          candidateVariantNames = ["aac_256k.m4a", "stream_160k.opus"];
        else candidateVariantNames = ["stream_160k.opus", "aac_256k.m4a"]; // high
      }
    }

    // Look for matching variant file relative to baseDir/variants or alongside current file
    const fileBase = path.basename(filePath, path.extname(filePath));
    const fileName = path.basename(filePath);

    let dbTrackId: string | null = url.searchParams.get("trackId") || null;
    if (!dbTrackId && normalizedKey.startsWith("variants/")) {
      const parts = normalizedKey.split("/");
      if (parts[1]) dbTrackId = parts[1];
    }
    if (!dbTrackId) {
      try {
        const { default: sql } = await import("@/lib/db");
        const [matchedTrack] = await sql<{ id: string }[]>`
          SELECT id FROM tracks WHERE audio_url LIKE '%' || ${fileName} || '%' ORDER BY created_at DESC LIMIT 1
        `;
        if (matchedTrack?.id) {
          dbTrackId = matchedTrack.id;
        }
      } catch {
        // fallback without db lookup
      }
    }

    for (const vName of candidateVariantNames) {
      const candidates = [
        path.posix.join(path.posix.dirname(filePath), vName),
        path.posix.join("variants", fileBase, vName),
        path.posix.join("variants", path.basename(path.dirname(filePath)), vName),
      ];
      if (dbTrackId) {
        candidates.unshift(path.posix.join("variants", dbTrackId, vName));
      }
      let found = false;
      for (const candidate of [...new Set(candidates)]) {
        try { validateStorageKey(candidate); } catch { continue; }
        // Recheck the chosen object, including client-supplied trackId candidates.
        if (!(await canReadAudio(request, candidate))) continue;
        if (await storage.headFile(candidate)) { filePath = candidate; found = true; break; }
      }
      if (found) break;
    }
  }

  return storedResponse(request, filePath, storage);
}
