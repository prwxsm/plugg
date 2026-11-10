import { inspectAudioHeader } from '../lib/audio-validation.ts';

export const AUDIO_UPLOAD_LIMIT = 50 * 1024 * 1024;
export const IMAGE_UPLOAD_LIMIT = 5 * 1024 * 1024;
export const REQUEST_UPLOAD_LIMIT = AUDIO_UPLOAD_LIMIT + 1024 * 1024;
export class UploadError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}
export async function boundedUploadBody(request: Request): Promise<ArrayBuffer> {
  const length = Number(request.headers.get('content-length'));
  if (length > REQUEST_UPLOAD_LIMIT) throw new UploadError('Audio files must be 50 MB or smaller.', 413);
  if (!request.body) throw new UploadError('No file provided');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.length;
      if (size > REQUEST_UPLOAD_LIMIT) { await reader.cancel(); throw new UploadError('Upload exceeds 50 MB.', 413); }
      chunks.push(next.value);
    }
  } finally { reader.releaseLock(); }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.length; }
  return body.buffer;
}
export function inspectUpload(category: string, bytes: Uint8Array) {
  if (!['audio', 'cover', 'avatar'].includes(category)) throw new UploadError('Unsupported upload category');
  if (!bytes.length || bytes.length > (category === 'audio' ? AUDIO_UPLOAD_LIMIT : IMAGE_UPLOAD_LIMIT))
    throw new UploadError(category === 'audio' ? 'Audio must be between 1 byte and 50 MB.' : 'Images must be 5 MB or smaller.', 413);
  if (category === 'audio') {
    const validation = inspectAudioHeader(bytes);
    if (!validation.valid) throw new UploadError(validation.error || 'Invalid audio');
    const signature = String.fromCharCode(...bytes.slice(0, 4));
    const extension = signature === 'RIFF' ? 'wav' : signature === 'fLaC' ? 'flac' : 'mp3';
    return { extension, mimeType: extension === 'mp3' ? 'audio/mpeg' : `audio/${extension}`, validation: validation.properties };
  }
  const starts = (pattern: number[]) => pattern.every((v, i) => bytes[i] === v);
  if (starts([137,80,78,71,13,10,26,10])) return { extension: 'png', mimeType: 'image/png', validation: null };
  if (starts([255,216,255])) return { extension: 'jpg', mimeType: 'image/jpeg', validation: null };
  if (String.fromCharCode(...bytes.slice(0,4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8,12)) === 'WEBP')
    return { extension: 'webp', mimeType: 'image/webp', validation: null };
  throw new UploadError('Choose a PNG, JPEG, or WebP image.');
}

/** Render terminates TLS before Node; use a configured public origin, never forwarded headers. */
export function uploadOriginAllowed(request: Request): boolean {
  const expected = process.env["NODE_ENV"] === "production"
    ? (process.env["PLUGG_PUBLIC_ORIGIN"] || "https://plugg.site")
    : new URL(request.url).origin;
  return request.headers.get("origin") === expected;
}
