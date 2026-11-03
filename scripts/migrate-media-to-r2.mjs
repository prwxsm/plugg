import 'dotenv/config';
import { readdir, lstat, readFile } from 'node:fs/promises';
import { resolve, join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { storageMimeType, validateStorageKey } from '../src/lib/storage/media-key.ts';

const apply = process.argv.includes('--apply');
if (process.argv.slice(2).some(arg => arg !== '--apply')) throw Error('Usage: node scripts/migrate-media-to-r2.mjs [--apply]');
const base = resolve(process.env.STORAGE_DIR || '.storage/uploads');
const files = [];
async function scan(dir) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, item.name);
    if (item.isSymbolicLink()) throw Error('Migration refuses symbolic links');
    if (item.isDirectory()) await scan(full);
    else if (item.isFile()) {
      const key = validateStorageKey(relative(base, full).split('\\').join('/'));
      const stat = await lstat(full);
      files.push({ full, key, size: stat.size });
    }
  }
}
await scan(base);
const bytes = files.reduce((sum, f) => sum + f.size, 0);
console.log(JSON.stringify({ mode: apply ? 'apply' : 'preview', bucket: 'plugg-private-media', files: files.length, bytes, gib: +(bytes / 1024 ** 3).toFixed(3) }));
if (!apply) {
  console.log('Preview only. No network requests, uploads, deletes, or database changes.');
} else {
  const { R2_ACCOUNT_ID: account, R2_BUCKET: bucket, R2_ACCESS_KEY_ID: accessKeyId, R2_SECRET_ACCESS_KEY: secretAccessKey } = process.env;
  if (!account || !/^[a-f0-9]{32}$/.test(account) || bucket !== 'plugg-private-media' || !accessKeyId || !secretAccessKey)
    throw Error('Configure server-only R2 credentials and R2_BUCKET=plugg-private-media first.');
  const client = new S3Client({ region: 'auto', endpoint: `https://${account}.r2.cloudflarestorage.com`, credentials: { accessKeyId, secretAccessKey }, maxAttempts: 3, requestHandler: { connectionTimeout: 10000, requestTimeout: 60000 } });
  let copied = 0, unchanged = 0;
  const digest = data => createHash('sha256').update(data).digest('hex');
  for (const file of files) {
    const data = await readFile(file.full);
    const hash = digest(data);
    let existing;
    try {
      existing = await client.send(new GetObjectCommand({ Bucket: bucket, Key: file.key }));
    } catch (error) { if (error?.$metadata?.httpStatusCode !== 404) throw error; }
    if (existing) {
      const remote = await existing.Body.transformToByteArray();
      if (digest(remote) !== hash) throw Error('Existing object differs from local file. Stopping without overwriting it.');
      unchanged++;
      continue;
    }
    // Conditional create prevents a race from overwriting another upload.
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: file.key, Body: data,
      IfNoneMatch: '*', StorageClass: 'STANDARD', ContentType: storageMimeType(file.key),
      CacheControl: 'private, no-store', Metadata: { sha256: hash } }));
    const verification = await client.send(new GetObjectCommand({ Bucket: bucket, Key: file.key }));
    if (digest(await verification.Body.transformToByteArray()) !== hash) throw Error('Uploaded object verification failed.');
    copied++;
    console.log(JSON.stringify({ copied, unchanged, verified: copied + unchanged, total: files.length }));
  }
  console.log(JSON.stringify({ copied, unchanged, verified: copied + unchanged, localFilesDeleted: 0, databaseChanges: 0 }));
}
