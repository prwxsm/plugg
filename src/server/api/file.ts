import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";

export async function handleFileRequest(request: Request, key: string): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed", { status: 405 });
  }

  const baseDir = path.resolve(
    process.cwd(),
    process.env["STORAGE_DIR"] || ".storage/uploads"
  );

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

  const mimeType = getImageOrGeneralMimeType(filePath);
  const nodeStream = fs.createReadStream(filePath);
  const webStream = Readable.toWeb(nodeStream);

  return new Response(webStream as ReadableStream, {
    status: 200,
    headers: {
      "Content-Length": String(stat.size),
      "Content-Type": mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

function getImageOrGeneralMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}
