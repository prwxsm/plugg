import { S3Client, PutObjectCommand, HeadObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'node:stream';
import type { StorageProvider } from './types.ts';
import { storageMimeType, storageUrl, validateStorageKey } from './media-key.ts';

/** Server-only S3 access to a PRIVATE R2 bucket; never return bucket URLs or credentials. */
export class R2StorageProvider implements StorageProvider {
  private client: S3Client;
  private bucket: string;
  constructor(client: S3Client, bucket: string) {
    this.client = client;
    this.bucket = bucket;
    if (!bucket) throw new Error('R2_BUCKET is required');
  }
  static fromEnvironment(): R2StorageProvider {
    const account = process.env['R2_ACCOUNT_ID'];
    const bucket = process.env['R2_BUCKET'];
    const accessKeyId = process.env['R2_ACCESS_KEY_ID'];
    const secretAccessKey = process.env['R2_SECRET_ACCESS_KEY'];
    if (!account || !/^[a-f0-9]{32}$/.test(account) || !bucket || !accessKeyId || !secretAccessKey) {
      throw new Error('R2 requires R2_ACCOUNT_ID, R2_BUCKET, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY in the server environment. No local fallback is used.');
    }
    return new R2StorageProvider(new S3Client({
      region: 'auto', endpoint: `https://${account}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey }, maxAttempts: 3,
    }), bucket);
  }
  async saveFile(key: string, data: Buffer | Uint8Array, mimeType: string): Promise<string> {
    validateStorageKey(key);
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: data,
      ContentType: mimeType || storageMimeType(key), CacheControl: 'private, no-store', StorageClass: 'STANDARD' }));
    return key;
  }
  async headFile(key: string) {
    validateStorageKey(key);
    try {
      const result = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return { key, size: result.ContentLength ?? 0, mimeType: result.ContentType || storageMimeType(key) };
    } catch (error) { if (isMissing(error)) return null; throw error; }
  }
  async getFile(key: string, options?: { start?: number; end?: number }) {
    validateStorageKey(key);
    const range = options?.start !== undefined ? `bytes=${options.start}-${options.end ?? ''}` : undefined;
    try {
      const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key, ...(range ? { Range: range } : {}) }));
      if (!result.Body) throw new Error('R2 returned an empty response body');
      const stream = result.Body instanceof Readable ? result.Body : Readable.fromWeb(result.Body.transformToWebStream() as never);
      return { stream, size: result.ContentLength ?? 0, mimeType: result.ContentType || storageMimeType(key) };
    } catch (error) { if (isMissing(error)) return null; throw error; }
  }
  async getFileBuffer(key: string) {
    const file = await this.getFile(key);
    if (!file) return null;
    const parts: Buffer[] = [];
    for await (const chunk of file.stream) parts.push(Buffer.from(chunk));
    const buffer = Buffer.concat(parts);
    return { buffer, size: buffer.length, mimeType: file.mimeType };
  }
  async deleteFile(key: string): Promise<boolean> {
    validateStorageKey(key);
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    return true;
  }
  getUrl(key: string): string { return storageUrl(key); }
}
function isMissing(error: unknown): boolean {
  return !!error && typeof error === 'object' && '$metadata' in error &&
    (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404;
}
