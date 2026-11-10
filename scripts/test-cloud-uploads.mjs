import assert from 'node:assert/strict';
import { inspectUpload, boundedUploadBody, REQUEST_UPLOAD_LIMIT, uploadOriginAllowed } from '../src/server/upload-policy.ts';
import { handleUploadRequest } from '../src/server/api/upload.ts';
import { ownedUpload } from '../src/server/upload-reference.ts';
import sql from '../src/lib/db.ts';

const png = Buffer.from([137,80,78,71,13,10,26,10,...new Array(40).fill(0)]);
assert.equal(inspectUpload('cover',png).mimeType,'image/png');
assert.throws(()=>inspectUpload('../cover',png),/category/);
assert.throws(()=>inspectUpload('audio',png),/audio|format/i);
assert.throws(()=>inspectUpload('cover',Buffer.from('<svg>bad</svg>')),/PNG/);
await assert.rejects(boundedUploadBody(new Request('https://plugg.test/api/upload',{method:'POST',headers:{'content-length':String(REQUEST_UPLOAD_LIMIT+1)},body:'x'})),/50 MB/);

const oldNodeEnv=process.env.NODE_ENV;
process.env.NODE_ENV='production';
assert.equal(uploadOriginAllowed(new Request('http://localhost:10000/api/upload',{headers:{origin:'https://plugg.site'}})),true);
assert.equal(uploadOriginAllowed(new Request('http://localhost:10000/api/upload',{headers:{origin:'https://evil.test','x-forwarded-host':'evil.test'}})),false);
if(oldNodeEnv===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=oldNodeEnv;
const stop = new Error('rollback');
process.env.STORAGE_PROVIDER='r2';process.env.PLUGG_AUDIO_PROCESSING='manual';
try {
 await assert.rejects(sql.begin(async tx=>{
  await tx`CREATE TEMP TABLE users (id text PRIMARY KEY,artist_id text,account_type text) ON COMMIT DROP`;
  await tx`CREATE TEMP TABLE sessions (id text PRIMARY KEY,user_id text,expires_at timestamptz) ON COMMIT DROP`;
  await tx`CREATE TEMP TABLE files (id text PRIMARY KEY,owner_id text,original_filename text,storage_key text,mime_type text,size bigint,category text,storage_provider text,upload_status text,file_hash text,created_at timestamptz DEFAULT now()) ON COMMIT DROP`;
  await tx`INSERT INTO users VALUES ('artist','art','artist'),('listener',null,'listener')`;
  await tx`INSERT INTO sessions VALUES ('good','artist',now()+interval '1 hour'),('listen','listener',now()+interval '1 hour'),('expired','artist',now()-interval '1 hour')`;
  const db=Object.assign((...args)=>tx(...args),{begin:fn=>tx.savepoint(fn)});
  const objects = new Map();let fail=false;
  const storage={async saveFile(key,bytes){if(fail)throw Error('storage outage');objects.set(key,bytes);},async deleteFile(key){objects.delete(key);},getUrl:key=>'/api/file/'+encodeURIComponent(key)};
  const request=(session='good',category='cover',origin='https://plugg.test')=>{
   const form=new FormData();form.append('file',new Blob([png],{type:'text/html'}),'forged.html');form.append('category',category);form.append('ownerId','someone-else');
   return new Request('https://plugg.test/api/upload',{method:'POST',headers:{cookie:'plugg_session='+session,origin},body:form});
  };
  assert.equal((await handleUploadRequest(request('expired'),db,storage)).status,401);
  assert.equal((await handleUploadRequest(request('good','cover','https://evil.test'),db,storage)).status,403);
  assert.equal((await handleUploadRequest(request('listen'),db,storage)).status,403);
  assert.equal(objects.size,0);
  const result=await handleUploadRequest(request(),db,storage);assert.equal(result.status,200);const data=await result.json();
  const [file]=await tx`SELECT * FROM files`;
  assert.equal(file.ownerId,'artist');assert.equal(file.mimeType,'image/png');assert.equal(file.storageProvider,'r2');assert.equal(Number(file.size),png.length);
  await ownedUpload(db,data.url,'artist','cover','r2');
  await assert.rejects(ownedUpload(db,data.url,'someone-else','cover','r2'),/another account/);
  await assert.rejects(ownedUpload(db,'https://example.com/a.png','artist','cover','r2'),/Upload/);
  fail=true;assert.equal((await handleUploadRequest(request(),db,storage)).status,500);
  assert.equal((await tx`SELECT count(*)::int AS n FROM files`)[0].n,1);
  fail=false;
  await tx`UPDATE files SET size=250*1024*1024`;
  assert.equal((await handleUploadRequest(request(),db,storage)).status,429);
  assert.equal(objects.size,1);
  throw stop;
 }),error=>error===stop);
 console.log('Upload authentication, CSRF, byte limits, MIME detection, ownership, quota, storage failure and database persistence passed (rolled back).');
} finally {await sql.end({timeout:5});}
