/** Initial migration only: refuses any existing public objects; never cleans a destination. */
import 'dotenv/config';
import postgres from 'postgres';
import { spawn } from 'node:child_process';
import { mkdir, writeFile, readFile, chmod } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { homedir } from 'node:os';

process.umask(0o077);
const apply = process.argv.includes('--apply');
if (process.argv.slice(2).some(arg => arg !== '--apply')) throw Error('Only --apply is supported');
const sourceUrl = new URL(process.env.DATABASE_URL || '');
const targetUrl = new URL(process.env.NEON_DATABASE_URL || '');
if (!['localhost','127.0.0.1','[::1]'].includes(sourceUrl.hostname)) throw Error('Source must be local PostgreSQL');
if (targetUrl.hostname !== 'ep-steep-glitter-aswxuz1z.c-4.eu-central-1.aws.neon.tech' || targetUrl.pathname !== '/neondb')
  throw Error('Destination must be the verified direct connection to the existing Plugg Neon branch');
const source = postgres(sourceUrl.href,{max:1,connect_timeout:20});
const target = postgres(targetUrl.href,{max:1,connect_timeout:20,ssl:{rejectUnauthorized:true}});
const id = new Date().toISOString().replace(/[:.]/g,'-');
const directory = join(homedir(),'.local/state/plugg/backups','neon-'+id);
await mkdir(directory,{recursive:true,mode:0o700});
const excluded = new Set(['sessions','password_resets']);
const quote = name => '"' + name.replaceAll('"','""') + '"';
const digest = value => createHash('sha256').update(value).digest('hex');
function pgEnv(url) {
  return { ...process.env, PGHOST:url.hostname, PGPORT:url.port || '5432', PGDATABASE:decodeURIComponent(url.pathname.slice(1)),
    PGUSER:decodeURIComponent(url.username), PGPASSWORD:decodeURIComponent(url.password), PGCONNECT_TIMEOUT:'20',
    PGSSLMODE:url.hostname.endsWith('.neon.tech') ? 'verify-full' : 'disable', PGSSLROOTCERT:url.hostname.endsWith('.neon.tech') ? 'system' : '' };
}
function command(binary,args,env) {
  return new Promise((resolve,reject)=>{
    const child=spawn(binary,args,{env,stdio:['ignore','pipe','pipe']}); let out='',err='';
    child.stdout.on('data',chunk=>out+=chunk); child.stderr.on('data',chunk=>err+=chunk);
    child.on('error',reject);
    child.on('close',code=>code===0?resolve(out):reject(Error(`${binary} failed (${code}): ${err}`)));
  });
}
async function assertEmptyPublic(sql) {
  const [row]=await sql`SELECT
    (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public') +
    (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public') +
    (SELECT count(*) FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public') AS n`;
  if(Number(row.n)!==0) throw Error('Destination public schema is not empty. Refusing to overwrite or re-import.');
}
async function fingerprint(tx,schema,skipData=new Set()) {
  await tx`SET LOCAL TIME ZONE 'UTC'`;
  await tx`SET LOCAL extra_float_digits = 3`;
  const tables=await tx`SELECT tablename FROM pg_tables WHERE schemaname=${schema} ORDER BY tablename`;
  const result={};
  for(const {tablename} of tables) {
    const rows=skipData.has(tablename)?[]:await tx.unsafe(`SELECT row_to_json(t)::text AS value FROM ${quote(schema)}.${quote(tablename)} t ORDER BY row_to_json(t)::text COLLATE "C"`);
    result[tablename]={rows:rows.length,sha256:digest(rows.map(r=>r.value).join('\n'))};
  }
  return result;
}
async function structure(tx) {
  const constraints=await tx`SELECT c.conname,t.relname,pg_get_constraintdef(c.oid) AS definition FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname='public' ORDER BY t.relname,c.conname`;
  const triggers=await tx`SELECT t.tgname,pg_get_triggerdef(t.oid) AS definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal ORDER BY t.tgname`;
  const indexes=await tx`SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY tablename,indexname`;
  const functions=await tx`SELECT p.proname,pg_get_functiondef(p.oid) AS definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' ORDER BY p.proname`;
  return {constraints,triggers,indexes,functions};
}
try {
  await assertEmptyPublic(target);
  const authBefore=await target.begin('isolation level repeatable read read only',tx=>fingerprint(tx,'neon_auth'));
  if(Object.keys(authBefore).length!==9) throw Error('Neon auth table inventory changed; inspect before migration');
  const fullBackup=join(directory,'local-complete.dump');
  const migration=join(directory,'plugg-cloud.dump');
  let expected,expectedStructure;
  await source.begin('isolation level repeatable read read only',async tx=>{
    const [snapshot]=await tx`SELECT pg_export_snapshot() AS id`;
    const jobs=await Promise.allSettled([
      command('pg_dump',['--format=custom','--no-owner','--no-privileges','--snapshot='+snapshot.id,'--file='+fullBackup],pgEnv(sourceUrl)),
      command('pg_dump',['--format=custom','--schema=public','--no-owner','--no-privileges','--exclude-table-data=public.sessions','--exclude-table-data=public.password_resets','--snapshot='+snapshot.id,'--file='+migration],pgEnv(sourceUrl)),
    ]);
    for(const job of jobs) if(job.status==='rejected') throw job.reason;
    expected=await fingerprint(tx,'public',excluded);
    expectedStructure=await structure(tx);
  });
  await command('pg_dump',['--format=custom','--schema=neon_auth','--no-owner','--no-privileges','--file='+join(directory,'neon-auth-before.dump')],pgEnv(targetUrl));
  const listing=await command('pg_restore',['--list',migration],process.env);
  // public already exists in Neon. Do not modify its ownership, ACLs, or comment.
  const restoreList=listing.split('\n').filter(line=>!/^\d+;.*\bSCHEMA - public\b/.test(line) && !/^\d+;.*COMMENT - SCHEMA public\b/.test(line)).join('\n');
  await writeFile(join(directory,'restore.list'),restoreList+'\n',{mode:0o600});
  await writeFile(join(directory,'manifest.json'),JSON.stringify({createdAt:id,excludedData:[...excluded],tables:expected,structure:expectedStructure,neonAuthBefore:authBefore,dumpSha256:digest(await readFile(migration))},null,2)+'\n',{mode:0o600});
  console.log(JSON.stringify({backupDirectory:directory,mode:apply?'apply':'preview',tables:Object.keys(expected).length,rows:Object.values(expected).reduce((sum,t)=>sum+t.rows,0),excludedData:[...excluded],preservedNeonAuthTables:Object.keys(authBefore).length}));
  if(apply) {
    await assertEmptyPublic(target);
    await command('pg_restore',['--single-transaction','--exit-on-error','--no-owner','--no-privileges','--use-list='+join(directory,'restore.list'),'--dbname=neondb',migration],pgEnv(targetUrl));
    const actual=await target.begin('isolation level repeatable read read only',tx=>fingerprint(tx,'public'));
    const actualStructure=await target.begin('read only',tx=>structure(tx));
    const authAfter=await target.begin('isolation level repeatable read read only',tx=>fingerprint(tx,'neon_auth'));
    if(JSON.stringify(actual)!==JSON.stringify(expected)) throw Error('Restored data verification failed; inspect protected manifests before proceeding');
    if(JSON.stringify(actualStructure)!==JSON.stringify(expectedStructure)) throw Error('Restored constraints/triggers/functions/indexes differ');
    if(JSON.stringify(authAfter)!==JSON.stringify(authBefore)) throw Error('Neon auth data changed during migration; inspect before continuing');
    const result={status:'verified',tables:Object.keys(actual).length,rows:Object.values(actual).reduce((sum,t)=>sum+t.rows,0),constraints:actualStructure.constraints.length,triggers:actualStructure.triggers.length,indexes:actualStructure.indexes.length,functions:actualStructure.functions.length,neonAuthTablesPreserved:Object.keys(authAfter).length,localDatabaseChanged:false,applicationCutover:false};
    await writeFile(join(directory,'verification.json'),JSON.stringify(result,null,2)+'\n',{mode:0o600});
    console.log(JSON.stringify(result));
  } else console.log('Preview complete: backups created, destination unchanged.');
} catch(error) {
  console.error(String(error.message).replace(/postgres(?:ql)?:\/\/\S+/g,'[redacted connection]'));
  process.exitCode=1;
} finally { await Promise.allSettled([source.end(),target.end()]); }
