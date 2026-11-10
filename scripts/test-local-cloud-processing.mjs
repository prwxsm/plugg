import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp,mkdir,rm,stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const dir=await mkdtemp(join(tmpdir(),'plugg-audio-test-'));
process.env.STORAGE_DIR=dir;process.env.STORAGE_PROVIDER='local';process.env.PLUGG_AUDIO_PROCESSING='local';
const {processMasterAudio}=await import('../src/server/audio-processor.ts');
try {
 await mkdir(join(dir,'audio'));
 execFileSync(process.env.FFMPEG_PATH || 'ffmpeg',['-v','error','-f','lavfi','-i','sine=frequency=440:duration=2','-ar','44100','-ac','2',join(dir,'audio/test.wav')]);
 const r=await processMasterAudio('audio/test.wav','test-track/test-run',false);
 assert.equal(r.success,true,r.error);assert.equal(Object.keys(r.variants).length,7);
 for(const v of Object.values(r.variants)){assert.ok((await stat(join(dir,v.storageKey))).size>0);assert.ok(v.url.startsWith('/api/stream/'));}
 console.log('Real FFprobe/FFmpeg: stereo master validated and all 7 variant entries generated without database writes.');
}finally{await rm(dir,{recursive:true,force:true});}
