/** Explicit operator command: reads R2, runs local FFmpeg, uploads variants, then queues staff review. */
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { R2StorageProvider } from '../src/lib/storage/r2-storage.ts';
import { validateStorageKey, storageMimeType } from '../src/lib/storage/media-key.ts';

const args = process.argv.slice(2);
const value = flag => { const i = args.indexOf(flag); return i < 0 ? undefined : args[i + 1]; };
const releaseId = value('--release');
const actorId = value('--staff');
const apply = args.includes('--apply');
if (args.some((arg, i) => !['--release','--staff','--apply'].includes(arg) && !['--release','--staff'].includes(args[i-1]))) throw Error('Unknown argument');
if (!process.env.NEON_DATABASE_URL) throw Error('Load .env.neon explicitly; local database fallback is not allowed.');
if (apply && (!releaseId || !actorId)) throw Error('Usage: --release RELEASE_ID --staff STAFF_USER_ID --apply');
const remote = R2StorageProvider.fromEnvironment();
const workspace = await mkdtemp(join(tmpdir(), 'plugg-processing-'));
process.env.DATABASE_URL = process.env.NEON_DATABASE_URL;
process.env.STORAGE_PROVIDER = 'local';
process.env.PLUGG_AUDIO_PROCESSING = 'local';
process.env.STORAGE_DIR = workspace;
const { default: sql } = await import('../src/lib/db.ts');
try {
  if (!apply) {
    console.log(await sql`SELECT r.id,r.title,r.audio_processing_status,count(t.id)::int AS tracks FROM releases r JOIN tracks t ON t.release_id=r.id WHERE r.status='processing' AND r.is_mock=false GROUP BY r.id ORDER BY r.created_at`);
    console.log('Read-only queue listing. Use --release ID --staff USER_ID --apply to process one release.');
  } else {
    const { processMasterAudio } = await import('../src/server/audio-processor.ts');
    await sql.begin(async tx => {
      const [actor] = await tx`SELECT user_id,role FROM admin_memberships WHERE user_id=${actorId} AND active AND role IN ('super_admin','admin') FOR SHARE`;
      if (!actor) throw Error('Active Super Admin or Admin required.');
      const [release] = await tx`SELECT id,status,audio_processing_status FROM releases WHERE id=${releaseId} AND is_mock=false FOR UPDATE`;
      if (!release || !(release.status === 'processing' || (release.status === 'under_review' && release.audioProcessingStatus === 'failed'))) throw Error('Release must be awaiting processing; published/reviewed releases cannot be overwritten.');
      const tracks = await tx`SELECT id,audio_url,audio_processing_status,file_hash FROM tracks WHERE release_id=${releaseId} ORDER BY id FOR UPDATE`;
      if (!tracks.length) throw Error('Release has no tracks.');
      for (const track of tracks) {
        if (track.audioProcessingStatus === 'completed') continue;
        if (!/^[a-f0-9-]{36}$/i.test(track.id) || !track.audioUrl?.startsWith('/api/stream/')) throw Error('Invalid track or master reference');
        const key = validateStorageKey(decodeURIComponent(track.audioUrl.slice('/api/stream/'.length)));
        const meta = await remote.headFile(key);
        if (!meta || meta.size > 50 * 1024 * 1024) throw Error('Master missing or exceeds the upload limit.');
        const master = await remote.getFileBuffer(key);
        if (!master) throw Error('Master missing');
        if (!track.fileHash || createHash('sha256').update(master.buffer).digest('hex') !== track.fileHash) throw Error('Master hash mismatch');
        await mkdir(dirname(join(workspace, key)), { recursive: true });
        await writeFile(join(workspace, key), master.buffer);
        // Unique output keys prevent retry from overwriting an earlier run's files.
        const jobPath = `${track.id}/${randomUUID()}`;
        const result = await processMasterAudio(key, jobPath, false);
        if (result.success) {
          for (const outputKey of new Set(Object.values(result.variants).map(v => v.storageKey))) {
            validateStorageKey(outputKey);
            const bytes = await readFile(join(workspace, outputKey));
            await remote.saveFile(outputKey, bytes, storageMimeType(outputKey));
            const check = await remote.getFileBuffer(outputKey);
            if (!check || !createHash('sha256').update(check.buffer).digest().equals(createHash('sha256').update(bytes).digest())) throw Error('R2 variant verification failed');
          }
          const playback = result.variants.stream_160k;
          if (!playback) throw Error('Missing playback variant');
          await tx`UPDATE tracks SET audio_processing_status='completed',audio_url=${playback.url},audio_variants=${tx.json(result.variants)},technical_validation=${tx.json(result.technicalValidation)},duration_seconds=${result.technicalValidation.durationSeconds || 0},updated_at=now() WHERE id=${track.id}`;
        } else {
          await tx`UPDATE tracks SET audio_processing_status='failed',technical_validation=${tx.json({ ...result.technicalValidation, processingError: result.error })},updated_at=now() WHERE id=${track.id}`;
        }
        await tx`INSERT INTO admin_audit_log(actor_user_id,actor_role,action,target_type,target_id,after_state,result) VALUES (${actorId},${actor.role},'processing.local_result','track',${track.id},${tx.json({ status: result.success ? 'completed' : 'failed' })},${result.success ? 'success' : 'failed'})`;
        console.log({ trackId: track.id, processed: result.success });
      }
      const [remaining] = await tx`SELECT count(*)::int AS n FROM tracks WHERE release_id=${releaseId} AND audio_processing_status IS DISTINCT FROM 'completed'`;
      await tx`UPDATE releases SET audio_processing_status=${remaining.n ? 'failed' : 'completed'},status='under_review',updated_at=now() WHERE id=${releaseId}`;
      console.log({ releaseId, readyForReview: remaining.n === 0, published: false });
    });
  }
} finally {
  await sql.end({ timeout: 5 });
  await rm(workspace, { recursive: true, force: true });
}
