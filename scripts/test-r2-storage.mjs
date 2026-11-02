import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Readable } from 'node:stream';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { R2StorageProvider } from '../src/lib/storage/r2-storage.ts';
import { LocalStorageProvider } from '../src/lib/storage/local-storage.ts';
import { storedResponse } from '../src/server/api/stored-response.ts';
const request = (method = 'GET', range) => new Request('https://plugg.site/api/stream/audio%2Ftest.opus', { method, headers: range ? { Range: range } : {} });

test('R2 keeps URLs internal, uses Standard storage and passes inclusive byte ranges', async () => {
  const calls = [];
  const client = { async send(command) {
    calls.push(command);
    if (command.constructor.name === 'GetObjectCommand') return { Body: Readable.from([Buffer.from('bcd')]), ContentLength: 3, ContentType: 'audio/ogg' };
    if (command.constructor.name === 'HeadObjectCommand') return { ContentLength: 9, ContentType: 'audio/ogg' };
    return {};
  } };
  const storage = new R2StorageProvider(client, 'private');
  assert.equal(storage.getUrl('audio/test.opus'), '/api/stream/audio%2Ftest.opus');
  await storage.saveFile('audio/test.opus', Buffer.from('abcdefghi'), 'audio/ogg');
  assert.equal(calls[0].input.StorageClass, 'STANDARD');
  assert.equal(calls[0].input.CacheControl, 'private, no-store');
  const response = await storedResponse(request('GET', 'bytes=1-3'), 'audio/test.opus', storage);
  assert.equal(response.status, 206);
  assert.equal(await response.text(), 'bcd');
  assert.equal(response.headers.get('content-range'), 'bytes 1-3/9');
  assert.equal(calls.at(-1).input.Range, 'bytes=1-3');
  assert.equal(calls.at(-1).input.Bucket, 'private');
  const count = calls.length;
  const head = await storedResponse(request('HEAD'), 'audio/test.opus', storage);
  assert.equal(await head.text(), '');
  assert.equal(calls.length, count + 1);
  assert.equal(calls.at(-1).constructor.name, 'HeadObjectCommand');
  await assert.rejects(storage.headFile('../secret'), /Invalid storage key/);
});

test('R2 only treats missing objects as absent; access/network failures are visible', async () => {
  for (const status of [403, 500]) {
    const provider = new R2StorageProvider({ send: async () => { throw { $metadata: { httpStatusCode: status } }; } }, 'private');
    await assert.rejects(provider.headFile('file.txt'));
  }
  const missing = new R2StorageProvider({ send: async () => { throw { $metadata: { httpStatusCode: 404 } }; } }, 'private');
  assert.equal(await missing.headFile('file.txt'), null);
});

test('local and R2 serving share range semantics; HEAD and invalid ranges do not read a body', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'plugg-storage-'));
  try {
    const storage = new LocalStorageProvider(dir);
    await storage.saveFile('audio/test.opus', Buffer.from('abcdefghi'), 'audio/ogg');
    const suffix = await storedResponse(request('GET', 'bytes=-3'), 'audio/test.opus', storage);
    assert.equal(await suffix.text(), 'ghi');
    const open = await storedResponse(request('GET', 'bytes=7-'), 'audio/test.opus', storage);
    assert.equal(await open.text(), 'hi');
    const full = await storedResponse(request(), 'audio/test.opus', storage);
    assert.equal(await full.text(), 'abcdefghi');
    assert.equal(full.headers.get('content-type'), 'audio/ogg');
    for (const range of ['bytes=10-', 'bytes=-0', 'bytes=5-2', 'bytes=0-1,3-4', 'items=0-1']) {
      assert.equal((await storedResponse(request('GET', range), 'audio/test.opus', storage)).status, 416);
    }
    assert.equal((await storedResponse(request(), 'missing.opus', storage)).status, 404);
    await assert.rejects(storage.headFile('/etc/passwd'), /Invalid storage key/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
