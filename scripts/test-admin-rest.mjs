import assert from "node:assert/strict";
import "dotenv/config";
import postgres from "postgres";
const base = process.env.ADMIN_TEST_URL || "http://127.0.0.1:3000";
const endpoint = base + "/api/admin/v1/";
const post = (route, body, extra = {}) =>
  fetch(endpoint + route, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Plugg-Admin": "1",
      Origin: "http://localhost:3001",
      ...extra,
    },
    body: JSON.stringify(body),
  });
assert.equal((await (await fetch(endpoint + "snapshot")).json()).status, "unauthenticated");
assert.equal((await post("operations", {}, { Origin: "https://untrusted.invalid" })).status, 403);
assert.equal((await post("operations", {}, { "X-Plugg-Admin": "" })).status, 403);
assert.equal(
  (
    await post("operations", {
      action: "staff_role",
      targetId: "nonexistent-rest-test",
      role: "admin",
      reason: "authorization test",
      confirmed: true,
    })
  ).status,
  401,
);
assert.equal(
  (await post("review", { action: "approve", releaseId: "nonexistent-rest-test" })).status,
  401,
);
assert.equal((await post("retry-audio", { trackId: "nonexistent-rest-test" })).status, 401);
assert.equal(
  (await post("login", { identifier: "nonexistent-rest-test", password: "not-a-real-password" }))
    .status,
  401,
);
assert.equal(
  (await post("login", { identifier: "x", password: "x", role: "super_admin" })).status,
  400,
);
const sql = postgres(process.env.DATABASE_URL);
try {
  const [row] =
    await sql`SELECT s.id FROM sessions s JOIN admin_memberships m ON m.user_id=s.user_id WHERE s.expires_at>now() AND m.active AND m.role='super_admin' LIMIT 1`;
  assert.ok(row, "An existing admin session is required for read-only parity testing");
  const response = await fetch(endpoint + "snapshot", {
    headers: { Cookie: "plugg_session=" + row.id },
  });
  const body = await response.json();
  assert.equal(body.status, "ok");
  assert.equal(body.data.currentUser.role, "super_admin");
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.ok(!/"(?:passwordHash|password_hash|sessionId|sessionToken)"/.test(JSON.stringify(body)));
  if (row.id !== body.data.currentUser.id) assert.ok(!JSON.stringify(body).includes(row.id));
  console.log(
    "PASS: REST snapshot with existing session; unauthenticated write denial, origin/header protection, login validation and credential-free response. No live record mutations.",
  );
} finally {
  await sql.end();
}
