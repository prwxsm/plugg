import { Readable } from 'node:stream';
import type { StorageProvider } from '../../lib/storage/types.ts';

/** Serve bytes without buffering an entire song; HEAD never downloads the body. */
export async function storedResponse(request: Request, key: string, storage: StorageProvider): Promise<Response> {
  const metadata = await storage.headFile(key);
  if (!metadata) return new Response('File not found', { status: 404 });
  const size = metadata.size;
  const headers = new Headers({
    'Content-Type': metadata.mimeType, 'Content-Length': String(size), 'Accept-Ranges': 'bytes',
    'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "sandbox; default-src 'none'",
  });
  const url = new URL(request.url);
  const downloadName = url.searchParams.get('filename') || url.searchParams.get('download');
  if (downloadName) {
    const safe = downloadName.replace(/[\x00-\x1f\x7f"\\]/g, '_');
    const ascii = safe.replace(/[^\x20-\x7e]/g, '_');
    headers.set('Content-Disposition', `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(safe)}`);
  }
  let range: { start: number; end: number } | undefined;
  // HTTP Range is defined for GET, not HEAD.
  const raw = request.method === 'GET' ? request.headers.get('range') : null;
  if (raw) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(raw);
    const first = match?.[1] || '';
    const last = match?.[2] || '';
    const start = first ? Number(first) : Math.max(0, size - Number(last));
    const end = first && last ? Math.min(Number(last), size - 1) : size - 1;
    if (!match || (!first && !last) || (!first && Number(last) === 0) ||
      !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= size) {
      return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}`, 'Cache-Control': 'private, no-store' } });
    }
    range = { start, end };
    headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
    headers.set('Content-Length', String(end - start + 1));
  }
  if (request.method === 'HEAD') return new Response(null, { headers });
  const file = await storage.getFile(key, range);
  if (!file) return new Response('File not found', { status: 404 });
  return new Response(Readable.toWeb(file.stream as Readable) as ReadableStream, { status: range ? 206 : 200, headers });
}
