import assert from 'node:assert/strict';
import { localAudioProcessingEnabled, requireLocalAudioProcessing } from '../src/server/processing-mode.ts';
const original = process.env.PLUGG_AUDIO_PROCESSING;
try {
  delete process.env.PLUGG_AUDIO_PROCESSING;
  assert.equal(localAudioProcessingEnabled(), true);
  process.env.PLUGG_AUDIO_PROCESSING = 'manual';
  assert.equal(localAudioProcessingEnabled(), false);
  assert.throws(requireLocalAudioProcessing, /local-only/);
  const { retryAudio } = await import('../src/server/admin-retry.ts');
  let databaseTouched = false;
  await assert.rejects(retryAudio(undefined, 'test-track', false, {
    begin() { databaseTouched = true; throw Error('Database must not be touched'); },
  }), /local-only/);
  assert.equal(databaseTouched, false);
  process.env.PLUGG_AUDIO_PROCESSING = 'misspelled';
  assert.equal(localAudioProcessingEnabled(), false);
  process.env.PLUGG_AUDIO_PROCESSING = 'local';
  assert.equal(localAudioProcessingEnabled(), true);
  console.log('Manual mode blocks processing/retry before any database mutation; local default preserved.');
} finally {
  if (original === undefined) delete process.env.PLUGG_AUDIO_PROCESSING;
  else process.env.PLUGG_AUDIO_PROCESSING = original;
}
