/** Read-only live backup; restore verification runs in a private, socket-only temporary cluster. */
import "dotenv/config";
import postgres from "postgres";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, chmod, writeFile, readFile, rm } from "node:fs/promises";
import { homedir, tmpdir, userInfo } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
const dir = join(
  homedir(),
  ".local/state/plugg/backups",
  new Date().toISOString().replace(/[:.]/g, "-"),
);
await mkdir(dir, { recursive: true, mode: 0o700 });
await chmod(dir, 0o700);
const source = new URL(process.env.DATABASE_URL);
const env = {
  ...process.env,
  PGHOST: source.hostname,
  PGPORT: source.port || "5432",
  PGUSER: decodeURIComponent(source.username),
  PGPASSWORD: decodeURIComponent(source.password),
  PGDATABASE: source.pathname.slice(1),
};
function run(command, args, extraEnv = env) {
  const r = spawnSync(command, args, { env: extraEnv, encoding: "utf8" });
  if (r.status !== 0) throw new Error(`${command} failed: ${r.stderr}`);
  return r.stdout;
}
const sql = postgres(process.env.DATABASE_URL, { max: 2 });
const isolated = await mkdtemp(join(tmpdir(), "plugg-restore-"));
await chmod(isolated, 0o700);
let copy;
let started = false;
async function fingerprints(tx) {
  const tables =
    await tx`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`;
  const result = {};
  for (const { tablename } of tables) {
    const [r] =
      await tx`SELECT count(*)::int AS rows,md5(coalesce(string_agg(hash,'' ORDER BY hash),'')) AS checksum FROM (SELECT md5(row_to_json(r)::text) AS hash FROM ${tx(tablename)} r) h`;
    result[tablename] = r;
  }
  return result;
}
try {
  const original = await sql.begin("isolation level repeatable read read only", async (tx) => {
    const [{ snapshot }] = await tx`SELECT pg_export_snapshot() AS snapshot`;
    run("pg_dump", [
      "--format=custom",
      "--no-owner",
      "--no-privileges",
      `--snapshot=${snapshot}`,
      `--file=${dir}/plugg.dump`,
    ]);
    await chmod(`${dir}/plugg.dump`, 0o600);
    const accounts =
      await tx`SELECT id,name,username,email,account_type,is_mock,is_admin,password_hash IS NOT NULL AS has_password FROM users ORDER BY is_mock,name`;
    await writeFile(`${dir}/accounts.json`, JSON.stringify(accounts, null, 2), { mode: 0o600 });
    return fingerprints(tx);
  });
  run("initdb", ["-D", `${isolated}/data`, "--auth=trust", "--no-locale", "--encoding=UTF8"]);
  run("pg_ctl", [
    "-D",
    `${isolated}/data`,
    "-l",
    `${isolated}/postgres.log`,
    "-o",
    `-k ${isolated} -h '' -p 55439`,
    "-w",
    "start",
  ]);
  started = true;
  const testEnv = {
    ...process.env,
    PGHOST: isolated,
    PGPORT: "55439",
    PGUSER: userInfo().username,
    PGDATABASE: "postgres",
    PGPASSWORD: "",
  };
  run("createdb", ["plugg_restore_test"], testEnv);
  run(
    "pg_restore",
    [
      "--exit-on-error",
      "--no-owner",
      "--no-privileges",
      "--dbname=plugg_restore_test",
      `${dir}/plugg.dump`,
    ],
    testEnv,
  );
  copy = postgres({
    host: isolated,
    port: 55439,
    user: userInfo().username,
    database: "plugg_restore_test",
    max: 1,
  });
  const restored = await copy.begin("read only", fingerprints);
  assert.deepEqual(restored, original, "Restored database differs from snapshot");
  const report = {
    createdAt: new Date().toISOString(),
    source: { host: source.hostname, port: source.port, database: source.pathname.slice(1) },
    backupSha256: createHash("sha256")
      .update(await readFile(`${dir}/plugg.dump`))
      .digest("hex"),
    restored: true,
    tables: restored,
  };
  await writeFile(`${dir}/verification.json`, JSON.stringify(report, null, 2), { mode: 0o600 });
  // Optional staged migration test, executed only against the disposable copy.
  if (process.argv.includes("--test-migration")) {
    const { testMigration } = await import("./test-admin-rbac.mjs");
    await testMigration(copy);
    report.migrationTestsPassed = true;
    await writeFile(`${dir}/verification.json`, JSON.stringify(report, null, 2), { mode: 0o600 });
  }
  if (process.argv.includes("--test-runtime")) {
    const runtimeCopy = postgres({
      host: isolated,
      port: 55439,
      user: userInfo().username,
      database: "plugg_restore_test",
      max: 3,
      transform: postgres.camel,
    });
    try {
      const { testRuntime } = await import("./test-admin-cutover.mjs");
      await testRuntime(runtimeCopy);
    } finally {
      await runtimeCopy.end();
    }
  }
  console.log(`Backup: ${dir}/plugg.dump`);
  console.log(
    `PASS: restored and verified ${Object.keys(restored).length} table fingerprints in an isolated socket-only cluster.`,
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (copy) await copy.end();
  await sql.end();
  if (started) run("pg_ctl", ["-D", `${isolated}/data`, "-m", "fast", "-w", "stop"]);
  await rm(isolated, { recursive: true, force: true });
}
