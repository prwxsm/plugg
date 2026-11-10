import { canReadAudio, canReadStoredFile, isPublicStoredImage, isStoredAudio } from "../media-access";
import { getStorageProvider } from "../../lib/storage";
import { validateStorageKey } from "../../lib/storage/media-key";
import { storedResponse } from "./stored-response";

export async function handleFileRequest(request: Request, key: string): Promise<Response> {
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
  const audioAsset =
    /\.(mp3|wav|flac|opus|ogg|aac|m4a)$/i.test(decodedKey) || (await isStoredAudio(decodedKey));
  if (audioAsset && !(await canReadAudio(request, decodedKey)))
    return new Response("Media unavailable", { status: 404 });
  try { validateStorageKey(decodedKey); } catch { return new Response("Forbidden", { status: 403 }); }
  const publicImage = !audioAsset && (await isPublicStoredImage(decodedKey));
  if (!audioAsset && !publicImage && !(await canReadStoredFile(request, decodedKey)))
    return new Response("Media unavailable", { status: 404 });
  return storedResponse(
    request,
    decodedKey,
    getStorageProvider(),
    publicImage
      ? { cacheControl: "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400" }
      : undefined,
  );
}
