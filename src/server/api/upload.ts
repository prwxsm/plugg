import { createHash, randomUUID } from 'node:crypto';
import defaultSql from '../../lib/db.ts';
import { getStorageProvider } from '../../lib/storage/index.ts';
import { localAudioProcessingEnabled } from '../processing-mode.ts';
import { boundedUploadBody, inspectUpload, UploadError, uploadOriginAllowed } from '../upload-policy.ts';

// Keep multipart buffering bounded on the small free instance.
let activeUploads = 0;
export async function handleUploadRequest(request: Request, sql = defaultSql, storage = getStorageProvider()): Promise<Response> {
  const reply = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
  if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  if (!uploadOriginAllowed(request)) return reply({ error: 'Upload from the Plugg website.' }, 403);
  const session = request.headers.get('cookie')?.split(';').map(v => v.trim()).find(v => v.startsWith('plugg_session='))?.slice(14);
  if (!session) return reply({ error: 'Sign in before uploading.' }, 401);
  const [user] = await sql`SELECT u.id,u.artist_id,u.account_type FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=${session} AND s.expires_at>now()`;
  if (!user) return reply({ error: 'Your session expired. Sign in again.' }, 401);
  if (activeUploads >= 1) return reply({ error: 'Another upload is in progress. Please retry shortly.' }, 429);
  const mode = process.env['STORAGE_PROVIDER'] || 'local';
  if (mode !== 'r2' && !localAudioProcessingEnabled()) return reply({ error: 'Uploads are temporarily unavailable.' }, 503);
  activeUploads++;
  let savedKey: string | undefined;
  let committed = false;
  try {
    const body = await boundedUploadBody(request);
    const form = await new Request(request.url, { method: 'POST', headers: { 'content-type': request.headers.get('content-type') || '' }, body }).formData();
    const file = form.get('file');
    const requestedCategory = String(form.get('category') || 'audio');
    const category = requestedCategory === 'image' ? 'avatar' : requestedCategory;
    if (!(file instanceof File)) throw new UploadError('No file provided');
    if (category !== 'avatar' && (user['accountType'] !== 'artist' || !user['artistId'])) throw new UploadError('Artist account required.', 403);
    const bytes = Buffer.from(await file.arrayBuffer());
    const info = inspectUpload(category, bytes);
    const hash = createHash('sha256').update(bytes).digest('hex');
    const fileId = randomUUID();
    const key = `${category}/${randomUUID()}.${info.extension}`;
    await sql.begin(async tx => {
      // Serializes quota checks across server processes; ownership always comes from the session.
      await tx`SELECT pg_advisory_xact_lock(734821,2)`;
      const [quota] = await tx`SELECT coalesce(sum(size) FILTER (WHERE owner_id=${user['id']}),0)::bigint AS personal, coalesce(sum(size),0)::bigint AS total, count(*) FILTER (WHERE owner_id=${user['id']})::int AS count FROM files WHERE created_at>now()-interval '24 hours'`;
      if (Number(quota?.['personal']) + bytes.length > 250 * 1024 * 1024 || Number(quota?.['count']) >= 30 || Number(quota?.['total']) + bytes.length > 1024 * 1024 * 1024)
        throw new UploadError('Daily upload limit reached. Please try again tomorrow.', 429);
      await storage.saveFile(key, bytes, info.mimeType);
      savedKey = key;
      if (category === 'audio' && localAudioProcessingEnabled()) {
        const { probeAndValidateAudio } = await import('../audio-processor');
        const { resolve } = await import('node:path');
        const validation = await probeAndValidateAudio(resolve(process.env['STORAGE_DIR'] || '.storage/uploads', key));
        if (!validation.valid) throw new UploadError(validation.error || 'Audio validation failed');
      }
      await tx`INSERT INTO files (id,owner_id,original_filename,storage_key,mime_type,size,category,storage_provider,upload_status,file_hash)
        VALUES (${fileId},${user['id']},${file.name.slice(0,255)},${key},${info.mimeType},${bytes.length},${category},${mode},'ready',${hash})`;
    });
    committed = true;
    return reply({ success: true, fileId, storageKey: key, url: storage.getUrl(key), size: bytes.length, mimeType: info.mimeType, fileHash: hash, technicalValidation: info.validation, processingStatus: category === 'audio' ? 'pending' : 'ready' });
  } catch (error) {
    if (savedKey && !committed) await storage.deleteFile(savedKey).catch(() => console.error('Failed to clean up incomplete upload'));
    if (error instanceof UploadError) return reply({ error: error.message }, error.status);
    console.error('Upload failed', error instanceof Error ? error.name : 'Unknown error');
    return reply({ error: 'Upload failed. Please retry; your release has not been submitted.' }, 500);
  } finally { activeUploads--; }
}
