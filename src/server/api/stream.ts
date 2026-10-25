import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";

export async function handleStreamRequest(request: Request, key: string): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed", { status: 405 });
  }

  const baseDir = path.resolve(
    process.cwd(),
    process.env["STORAGE_DIR"] || ".storage/uploads"
  );

  // Normalize key and prevent directory traversal
  const normalizedKey = path.normalize(decodeURIComponent(key)).replace(/^(\.\.(\/|\\|$))+/, "");
  const filePath = path.join(baseDir, normalizedKey);

  if (!filePath.startsWith(baseDir)) {
    return new Response("Forbidden", { status: 403 });
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
        "Content-Disposition": disposition,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  const nodeStream = fs.createReadStream(filePath);
  const webStream = Readable.toWeb(nodeStream);

  const url = new URL(request.url);
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
      "Content-Disposition": disposition,
      "Cache-Control": "public, max-age=31536000, immutable",
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
      return "audio/ogg";
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
