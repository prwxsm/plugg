import type sql from '../lib/db.ts';
import { validateStorageKey } from '../lib/storage/media-key.ts';
export async function ownedUpload(connection: typeof sql, url: string, ownerId: string, category: string, provider: string) {
  const prefix = category === 'audio' ? '/api/stream/' : '/api/file/';
  if (typeof url !== 'string' || !url.startsWith(prefix)) throw new Error(`Upload your own ${category} before submitting.`);
  const key = validateStorageKey(decodeURIComponent(url.slice(prefix.length)));
  const [file] = await connection`SELECT id,file_hash FROM files WHERE storage_key=${key} AND owner_id=${ownerId} AND category=${category} AND storage_provider=${provider} AND upload_status='ready'`;
  if (!file) throw new Error(`The ${category} upload is missing or belongs to another account.`);
  return { id: file['id'] as string, fileHash: file['fileHash'] as string | null };
}
