import { canReadAudio } from "../media-access";
import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";

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
  const baseDir = path.resolve(process.cwd(), process.env["STORAGE_DIR"] || ".storage/uploads");

  // Normalize key and prevent directory traversal
  const normalizedKey = path.normalize(decodeURIComponent(key)).replace(/^(\.\.(\/|\\|$))+/, "");
  let filePath = path.join(baseDir, normalizedKey);

  if (!filePath.startsWith(baseDir + path.sep)) {
    return new Response("Forbidden", { status: 403 });
  }

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
        path.join(path.dirname(filePath), vName),
        path.join(baseDir, "variants", fileBase, vName),
        path.join(baseDir, "variants", path.basename(path.dirname(filePath)), vName),
      ];
      if (dbTrackId) {
        candidates.unshift(path.join(baseDir, "variants", dbTrackId, vName));
      }
      const match = candidates.find((c) => fs.existsSync(c));
      if (match) {
        filePath = match;
        break;
      }
    }
  }

  let stat: fs.Stats;
  try {
    stat = await fs.promises.stat(filePath);
  } catch {
    return new Response("File not found", { status: 404 });
  }

  const fileSize = stat.size;
  const mimeType = getAudioMimeType(filePath);

  const range = request.headers.get("range");

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const firstPart = parts[0] ?? "";
    const secondPart = parts[1];
    const start = parseInt(firstPart, 10);
    const end = secondPart ? parseInt(secondPart, 10) : fileSize - 1;

    if (isNaN(start) || start >= fileSize || (parts[1] && end < start)) {
      return new Response("Requested range not satisfiable", {
        status: 416,
        headers: { "Content-Range": `bytes */${fileSize}` },
      });
    }

    const safeEnd = Math.min(end, fileSize - 1);
    const chunkSize = safeEnd - start + 1;
    const nodeStream = fs.createReadStream(filePath, { start, end: safeEnd });
    const webStream = Readable.toWeb(nodeStream);

    const url = new URL(request.url);
    const downloadName = url.searchParams.get("filename") || url.searchParams.get("download");
    const disposition = downloadName
      ? `attachment; filename="${downloadName.replace(/"/g, "")}"; filename*=UTF-8''${encodeURIComponent(downloadName)}`
      : "inline";

    return new Response(webStream as ReadableStream, {
      status: 206,
      headers: {
        "Content-Range": `bytes ${start}-${safeEnd}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": String(chunkSize),
        "Content-Type": mimeType,
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": disposition,
        "Cache-Control": "private, no-store",
      },
    });
  }

  const nodeStream = fs.createReadStream(filePath);
  const webStream = Readable.toWeb(nodeStream);

  const downloadName = url.searchParams.get("filename") || url.searchParams.get("download");
  const disposition = downloadName
    ? `attachment; filename="${downloadName.replace(/"/g, "")}"; filename*=UTF-8''${encodeURIComponent(downloadName)}`
    : "inline";

  return new Response(webStream as ReadableStream, {
    status: 200,
    headers: {
      "Accept-Ranges": "bytes",
      "Content-Length": String(fileSize),
      "Content-Type": mimeType,
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": disposition,
      "Cache-Control": "private, no-store",
    },
  });
}

function getAudioMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".mp3":
      return "audio/mpeg";
    case ".wav":
      return "audio/wav";
    case ".ogg":
    case ".opus":
      return "audio/ogg";
    case ".webm":
      return "audio/webm";
    case ".m4a":
      return "audio/mp4";
    case ".aac":
      return "audio/aac";
    case ".flac":
      return "audio/flac";
    default:
      return "audio/mpeg";
  }
}
