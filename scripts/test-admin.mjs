import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  decodeJson,
  jsonObject,
  reviewHistory,
  safeMediaUrl,
  pendingHours,
  kampala,
} from "../src/components/admin/model.ts";
import { hasPermission } from "../src/server/admin-rbac.ts";
const isDatabaseAdministrator = (identity) => hasPermission(identity?.role, "review.read");

assert.deepEqual(decodeJson(JSON.stringify(JSON.stringify({ format: "WAV" }))), { format: "WAV" });
assert.deepEqual(jsonObject("not json"), {});
assert.deepEqual(jsonObject("[]"), {});
assert.deepEqual(reviewHistory(null), []);
assert.deepEqual(
  reviewHistory(
    JSON.stringify([
      { timestamp: "2026-10-28T19:20:53Z", action: "submitted", actorName: "Artist" },
    ]),
  ),
  [
    {
      timestamp: "2026-10-28T19:20:53Z",
      action: "submitted",
      actorName: "Artist",
      feedback: null,
      notes: null,
    },
  ],
);
assert.equal(pendingHours({ reviewSubmittedAt: null }, Date.now()), null);
assert.equal(pendingHours({ reviewSubmittedAt: "invalid" }, Date.now()), null);
assert.equal(
  pendingHours({ reviewSubmittedAt: "2026-10-28T09:00:00Z" }, Date.parse("2026-10-29T09:00:00Z")),
  24,
);
assert.match(kampala("2026-10-29T21:00:00Z"), /30 Oct 2026, 00:00/);
for (const url of [
  "javascript:alert(1)",
  "//other.example/file",
  "/\\other.example/file",
  "https://user:secret@example.com/file",
  "data:text/html,test",
])
  assert.equal(safeMediaUrl(url), null);
assert.equal(safeMediaUrl("/api/stream/test.wav"), "/api/stream/test.wav");
assert.equal(safeMediaUrl("https://example.com/image.jpg"), "https://example.com/image.jpg");
for (const identity of [
  undefined,
  null,
  {},
  { isAdmin: false },
  { isAdmin: "true" },
  { isAdmin: 1 },
  { email: "admin@plugg.fm" },
  { email: "zuri@plugg.fm", isAdmin: false },
])
  assert.equal(isDatabaseAdministrator(identity), false);
assert.equal(isDatabaseAdministrator({ role: "super_admin" }), true);
const reader = await readFile(new URL("../src/server/admin-data.ts", import.meta.url), "utf8");
assert.ok(reader.includes("repeatable read read only"));
assert.ok(reader.includes("requireAdminSession(tx, sessionId)"));
assert.doesNotMatch(
  reader,
  /\b(?:INSERT\s+INTO|UPDATE\s+(?:users|releases|tracks)|DELETE\s+FROM|ALTER\s+TABLE|CREATE\s+TABLE)\b/i,
);
console.log(
  "PASS: JSON normalization, SLA nulls/boundaries, Kampala conversion, media URLs and strict DB-role authorization.",
);

if (process.argv.includes("--database")) {
  const { default: sql } = await import("../src/lib/db.ts");
  const { readAdminSnapshot } = await import("../src/server/admin-data.ts");
  async function fingerprints() {
    return sql.begin("isolation level repeatable read read only", async (tx) => {
      const tables =
        await tx`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name`;
      const result = {};
      for (const { tableName } of tables) {
        const [summary] =
          await tx`SELECT count(*)::int AS rows,md5(coalesce(string_agg(row_hash,'' ORDER BY row_hash),'')) AS checksum FROM (SELECT md5(row_to_json(record)::text) AS row_hash FROM ${tx(tableName)} AS record) hashes`;
        result[tableName] = summary;
      }
      return result;
    });
  }
  try {
    const before = await fingerprints();
    const setup = await sql.begin("read only", async (tx) => {
      const [mode] = await tx`SELECT current_setting('transaction_read_only') AS mode`;
      assert.equal(mode.mode, "on");
      const [session] =
        await tx`SELECT s.id FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.expires_at>now() AND EXISTS(SELECT 1 FROM admin_memberships m WHERE m.user_id=u.id AND m.active) AND NOT u.is_mock ORDER BY s.expires_at DESC LIMIT 1`;
      const [expired] = await tx`SELECT id FROM sessions WHERE expires_at<=now() LIMIT 1`;
      const [expected] =
        await tx`SELECT (SELECT count(*)::int FROM releases WHERE NOT is_mock) AS releases,(SELECT count(*)::int FROM tracks t JOIN releases r ON r.id=t.release_id WHERE NOT t.is_mock AND NOT r.is_mock) AS tracks,(SELECT count(*)::int FROM artists WHERE NOT is_mock) AS artists,(SELECT count(*)::int FROM users WHERE NOT is_mock) AS users`;
      return { session: session?.id, expired: expired?.id, expected };
    });
    assert.equal((await readAdminSnapshot(undefined)).status, "unauthenticated");
    assert.equal(
      (await readAdminSnapshot("invalid-readonly-test-session")).status,
      "unauthenticated",
    );
    if (setup.expired)
      assert.equal((await readAdminSnapshot(setup.expired)).status, "unauthenticated");
    assert.ok(
      setup.session,
      "No existing active admin session; sign in normally before running the authorized integration test. This test never creates sessions.",
    );
    const result = await readAdminSnapshot(setup.session);
    assert.equal(result.status, "ok");
    const { data } = result;
    for (const key of ["releases", "tracks", "artists", "users"]) {
      assert.equal(data.metrics[key], setup.expected[key]);
      assert.equal(data[key].length, Math.min(setup.expected[key], data.limits.records));
    }
    for (const r of data.releases)
      for (const id of r.trackIds)
        assert.ok(data.tracks.some((t) => t.id === id && t.releaseId === r.id));
    const mine = data.tracks.find((t) => t.title === "Mine");
    if (mine) {
      assert.equal(mine.technicalValidation["format"], "WAV");
      assert.equal(mine.audioVariants.length, 7);
    }
    const serialized = JSON.stringify(data);
    assert.ok(!serialized.includes(setup.session));
    for (const secretField of ["passwordHash", "password_hash", "storageKey", "DATABASE_URL"])
      assert.ok(!serialized.includes(secretField));
    const after = await fingerprints();
    assert.deepEqual(
      after,
      before,
      "Database changed during the test; investigate concurrent application activity.",
    );
    console.log(
      "PASS: existing-session authorized reads, missing/invalid/expired session denial, SQL-count parity, real metadata and credential-free DTOs.",
    );
    console.log(
      `PASS: ${Object.keys(before).length} table fingerprints unchanged. No schema changes, sessions created or records modified.`,
    );
    console.log("Verified non-seed counts:", JSON.stringify(setup.expected));
  } finally {
    await sql.end();
  }
}
