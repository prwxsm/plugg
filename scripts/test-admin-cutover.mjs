import { handleAdminRequest } from "../src/server/api/admin.ts";
import { retryAudio } from "../src/server/admin-retry.ts";
import bcrypt from "bcrypt";
import { administer } from "../src/server/admin-operations.ts";
import { publishScheduled } from "../src/server/publication.ts";
import { canReadAudio } from "../src/server/media-access.ts";
import assert from "node:assert/strict";
import { readAdminSnapshot } from "../src/server/admin-data.ts";
import { reviewRelease, futureMidnight } from "../src/server/admin-review.ts";
import { requirePermission } from "../src/server/admin-rbac.ts";
export async function testRuntime(sql) {
  const prefix = "isolated-cutover-";
  for (const role of ["super_admin", "admin", "moderator", "ordinary"]) {
    await sql`INSERT INTO users(id,name,email,account_type,is_mock) VALUES(${prefix + role},'Isolated fixture',${prefix + role + "@invalid.example"},'listener',false)`;
    await sql`INSERT INTO sessions(id,user_id,expires_at) VALUES(${prefix + role},${prefix + role},now()+interval '1 hour')`;
    if (role !== "ordinary")
      await sql`INSERT INTO admin_memberships(user_id,role) VALUES(${prefix + role},${role})`;
  }
  await sql`INSERT INTO sessions(id,user_id,expires_at) VALUES(${prefix + "expired"},${prefix + "super_admin"},now()-interval '1 hour')`;
  for (const token of [undefined, "invalid", prefix + "expired"])
    assert.equal((await readAdminSnapshot(token, sql)).status, "unauthenticated");
  assert.equal((await readAdminSnapshot(prefix + "ordinary", sql)).status, "forbidden");
  for (const role of ["super_admin", "admin", "moderator"]) {
    const result = await readAdminSnapshot(prefix + role, sql);
    assert.equal(result.status, "ok");
    assert.equal(result.data.currentUser.role, role);
    if (role !== "super_admin") assert.deepEqual(result.data.users, []);
    if (role === "moderator") {
      for (const field of ["artists", "genres", "plays", "files", "dailyPlays"])
        assert.deepEqual(result.data[field], []);
      assert.ok(
        result.data.releases.every((r) => ["under_review", "changes_required"].includes(r.status)),
      );
    }
  }
  for (const role of ["admin", "moderator", "ordinary"])
    await assert.rejects(
      sql.begin("read only", (tx) => requirePermission(tx, prefix + role, "staff.manage")),
    );
  const artist = prefix + "artist",
    release = prefix + "release",
    track = prefix + "track";
  await sql`INSERT INTO artists(id,username,display_name,is_mock) VALUES(${artist},${artist},'Isolated artist',false)`;
  await sql`INSERT INTO releases(id,artist_id,title,slug,release_date,status,audio_processing_status,is_mock) VALUES(${release},${artist},'Isolated release',${release},'2099-01-01','under_review','completed',false)`;
  await sql`INSERT INTO tracks(id,plugg_track_id,artist_id,release_id,title,slug,release_date,published,audio_processing_status,audio_variants,is_mock) VALUES(${track},${track},${artist},${release},'Isolated track',${track},'2099-01-01',false,'completed',${sql.json({ stream: { format: "opus" } })},false)`;
  assert.throws(() => futureMidnight("2026-02-30", new Date()), /Invalid/);
  await assert.rejects(
    reviewRelease(prefix + "ordinary", { action: "approve", releaseId: release }, sql),
  );
  await assert.rejects(
    reviewRelease(
      prefix + "moderator",
      { action: "request_changes", releaseId: release, feedback: " " },
      sql,
    ),
    /feedback/,
  );
  await assert.rejects(
    reviewRelease(
      prefix + "moderator",
      { action: "approve", releaseId: release, date: "2020-01-01" },
      sql,
    ),
    /future/,
  );
  await sql`UPDATE tracks SET audio_processing_status='failed' WHERE id=${track}`;
  await assert.rejects(
    reviewRelease(prefix + "moderator", { action: "approve", releaseId: release }, sql),
    /completed/,
  );
  await sql`UPDATE tracks SET audio_processing_status='completed' WHERE id=${track}`;
  const approvals = await Promise.allSettled([
    reviewRelease(prefix + "moderator", { action: "approve", releaseId: release }, sql),
    reviewRelease(prefix + "admin", { action: "approve", releaseId: release }, sql),
  ]);
  assert.equal(approvals.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(
    (await sql`SELECT count(*)::int AS n FROM admin_audit_log WHERE target_id=${release}`)[0].n,
    1,
  );
  assert.equal((await sql`SELECT published FROM tracks WHERE id=${track}`)[0].published, false);
  await sql`UPDATE releases SET status='under_review' WHERE id=${release}`;
  await reviewRelease(
    prefix + "moderator",
    { action: "request_changes", releaseId: release, feedback: "Please correct the metadata." },
    sql,
  );
  assert.equal(
    (await sql`SELECT status FROM releases WHERE id=${release}`)[0].status,
    "changes_required",
  );
  console.log(
    "PASS: transactional review authorization, invalid date/audio/status rejection, concurrent duplicate approval prevention, corrections and audit parity.",
  );
  const base = { targetId: release, reason: "Isolated test reason", confirmed: true };
  await assert.rejects(administer(prefix + "moderator", { ...base, action: "takedown" }, sql));
  await administer(prefix + "admin", { ...base, action: "takedown" }, sql);
  await sql`UPDATE releases SET status='scheduled',go_live_at=now()-interval '1 hour',reviewer_id=${prefix + "admin"} WHERE id=${release}`;
  await publishScheduled(sql, release);
  assert.equal((await sql`SELECT published FROM tracks WHERE id=${track}`)[0].published, false);
  await administer(prefix + "admin", { ...base, action: "reinstate" }, sql);
  assert.equal(
    (await sql`SELECT status FROM releases WHERE id=${release}`)[0].status,
    "under_review",
  );
  await reviewRelease(prefix + "moderator", { action: "approve", releaseId: release }, sql);
  await administer(prefix + "admin", { ...base, action: "reschedule", date: "2099-02-01" }, sql);
  await sql`UPDATE releases SET go_live_at=now()-interval '1 hour' WHERE id=${release}`;
  await publishScheduled(sql, release);
  assert.equal((await sql`SELECT published FROM tracks WHERE id=${track}`)[0].published, true);
  await sql`UPDATE tracks SET audio_url='/api/stream/isolated-fixture.wav' WHERE id=${track}`;
  const req = (role) =>
    new Request(
      "http://localhost/api/stream/isolated-fixture.wav",
      role ? { headers: { cookie: "plugg_session=" + prefix + role } } : {},
    );
  assert.equal(await canReadAudio(req(), "isolated-fixture.wav", sql), true);
  await administer(prefix + "admin", { ...base, action: "takedown" }, sql);
  assert.equal(await canReadAudio(req(), "isolated-fixture.wav", sql), false);
  assert.equal(await canReadAudio(req("ordinary"), "isolated-fixture.wav", sql), false);
  assert.equal(await canReadAudio(req("moderator"), "isolated-fixture.wav", sql), false);
  assert.equal(await canReadAudio(req("admin"), "isolated-fixture.wav", sql), true);
  await administer(
    prefix + "admin",
    { ...base, targetId: artist, action: "verify_artist", verified: true },
    sql,
  );
  await administer(
    prefix + "admin",
    { ...base, targetId: artist, action: "edit_artist", name: "Updated isolated artist" },
    sql,
  );
  const genre = await administer(
    prefix + "admin",
    {
      ...base,
      targetId: "new",
      action: "create_genre",
      name: "Isolated unique genre",
      slug: "isolated-unique-genre",
    },
    sql,
  );
  await administer(
    prefix + "admin",
    { ...base, targetId: genre.targetId, action: "edit_genre", image: "/fixture.png" },
    sql,
  );
  await sql`UPDATE tracks SET genre='Isolated unique genre' WHERE id=${track}`;
  await assert.rejects(
    administer(
      prefix + "admin",
      { ...base, targetId: genre.targetId, action: "delete_genre" },
      sql,
    ),
    /referenced/,
  );
  await sql`UPDATE tracks SET genre='' WHERE id=${track}`;
  await administer(
    prefix + "admin",
    { ...base, targetId: genre.targetId, action: "delete_genre" },
    sql,
  );
  const pw = "isolated-fixture-password";
  const hash = await bcrypt.hash(pw, 4);
  await sql`UPDATE users SET password_hash=${hash} WHERE id IN (${prefix + "super_admin"},${prefix + "ordinary"})`;
  const apiRequest = (path, data, cookie = "") =>
    new Request("http://localhost:3000/api/admin/v1/" + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Plugg-Admin": "1",
        Origin: "http://localhost:3000",
        Cookie: cookie,
      },
      body: JSON.stringify(data),
    });
  const signIn = await handleAdminRequest(
    apiRequest("login", { identifier: prefix + "super_admin@invalid.example", password: pw }),
    sql,
  );
  assert.equal(signIn.status, 200);
  const cookie = signIn.headers.get("set-cookie");
  assert.ok(cookie.includes("HttpOnly") && cookie.includes("SameSite=Lax"));
  const sessionCookie = cookie.split(";")[0];
  const apiSnapshot = await handleAdminRequest(
    new Request("http://localhost:3000/api/admin/v1/snapshot", {
      headers: { Cookie: sessionCookie },
    }),
    sql,
  );
  assert.equal((await apiSnapshot.json()).data.currentUser.role, "super_admin");
  assert.equal(
    (
      await handleAdminRequest(
        apiRequest("login", { identifier: prefix + "ordinary@invalid.example", password: pw }),
        sql,
      )
    ).status,
    403,
  );
  assert.equal(
    (await handleAdminRequest(apiRequest("logout", {}, sessionCookie), sql)).status,
    200,
  );
  const afterLogout = await handleAdminRequest(
    new Request("http://localhost:3000/api/admin/v1/snapshot", {
      headers: { Cookie: sessionCookie },
    }),
    sql,
  );
  assert.equal((await afterLogout.json()).status, "unauthenticated");
  console.log(
    "PASS: standalone REST login, HttpOnly session cookie, active-membership enforcement and logout on isolated copy.",
  );
  const staff = {
    ...base,
    targetId: prefix + "ordinary",
    action: "staff_role",
    role: "moderator",
    password: pw,
  };
  await assert.rejects(administer(prefix + "admin", staff, sql));
  await assert.rejects(
    administer(prefix + "super_admin", { ...staff, password: "incorrect" }, sql),
    /password/,
  );
  await assert.rejects(
    administer(prefix + "super_admin", { ...staff, targetId: prefix + "super_admin" }, sql),
    /own staff/,
  );
  await administer(prefix + "super_admin", staff, sql);
  assert.equal((await readAdminSnapshot(prefix + "ordinary", sql)).status, "ok");
  await administer(prefix + "super_admin", { ...staff, role: "none" }, sql);
  assert.equal((await readAdminSnapshot(prefix + "ordinary", sql)).status, "forbidden");
  const createStaff = {
    ...base,
    action: "create_staff",
    targetId: "new",
    name: "Isolated staff",
    username: "isolated-new-staff",
    email: "isolated-new-staff@invalid.example",
    role: "admin",
    password: pw,
    initialPassword: "isolated-new-password",
  };
  for (const role of ["admin", "moderator", "ordinary"])
    await assert.rejects(administer(prefix + role, createStaff, sql));
  await assert.rejects(
    administer(prefix + "super_admin", { ...createStaff, role: "super_admin" }, sql),
  );
  await assert.rejects(administer(prefix + "super_admin", { ...staff, role: "super_admin" }, sql));
  await assert.rejects(
    administer(prefix + "super_admin", { ...createStaff, initialPassword: "short" }, sql),
  );
  await assert.rejects(
    administer(prefix + "super_admin", { ...createStaff, password: "wrong" }, sql),
  );
  const created = await administer(prefix + "super_admin", createStaff, sql);
  const [createdUser] =
    await sql`SELECT password_hash,is_admin FROM users WHERE id=${created.targetId}`;
  assert.equal(createdUser.isAdmin, false);
  assert.ok(await bcrypt.compare(createStaff.initialPassword, createdUser.passwordHash));
  const editStaff = {
    ...base,
    action: "edit_staff",
    targetId: created.targetId,
    name: "Updated isolated staff",
    username: "isolated-updated-staff",
    email: "isolated-updated-staff@invalid.example",
    password: pw,
  };
  for (const role of ["admin", "moderator", "ordinary"])
    await assert.rejects(administer(prefix + role, editStaff, sql));
  await administer(prefix + "super_admin", editStaff, sql);
  assert.equal(
    (await sql`SELECT name FROM users WHERE id=${created.targetId}`)[0].name,
    editStaff.name,
  );
  await assert.rejects(
    administer(prefix + "super_admin", { ...createStaff, email: editStaff.email }, sql),
    /already in use/,
  );
  await assert.rejects(
    administer(prefix + "super_admin", { ...editStaff, targetId: prefix + "super_admin" }, sql),
    /Only Admin and Moderator/,
  );
  await sql`UPDATE admin_memberships SET role='super_admin' WHERE user_id=${created.targetId}`;
  await assert.rejects(
    administer(prefix + "super_admin", { ...staff, targetId: created.targetId, role: "none" }, sql),
    /Super Admin accounts/,
  );
  const creationAudit =
    await sql`SELECT before_state,after_state FROM admin_audit_log WHERE target_id=${created.targetId}`;
  assert.ok(!JSON.stringify(creationAudit).includes(createStaff.initialPassword));
  assert.ok(!JSON.stringify(creationAudit).includes(createdUser.passwordHash));
  assert.equal((await readAdminSnapshot(prefix + "expired", sql)).reason, "session_expired");
  console.log(
    "PASS: lower-staff creation/editing, password hashing, uniqueness, Super Admin protection and server-side hierarchy enforcement.",
  );
  const audit =
    await sql`SELECT before_state,after_state FROM admin_audit_log WHERE target_id LIKE ${prefix + "%"}`;
  assert.ok(audit.length > 5);
  assert.ok(!JSON.stringify(audit).includes(pw));
  console.log(
    "PASS: content/schedule safety, media authorization, artist edits, genre references, staff reauthentication and revocation, self-lockout and credential-free audit records.",
  );
  await sql`UPDATE tracks SET audio_processing_status='failed' WHERE id=${track}`;
  let unblock;
  const pending = new Promise((resolve) => {
    unblock = resolve;
  });
  let started;
  const entered = new Promise((resolve) => {
    started = resolve;
  });
  const retry = retryAudio(prefix + "admin", track, false, sql, async () => {
    started();
    await pending;
    return { success: true, variants: { stream: { format: "opus" } }, technicalValidation: {} };
  });
  await entered;
  await assert.rejects(
    retryAudio(prefix + "admin", track, false, sql, async () => ({
      success: true,
      variants: {},
      technicalValidation: {},
    })),
    /Only failed/,
  );
  unblock();
  await retry;
  assert.equal(
    (await sql`SELECT audio_processing_status FROM tracks WHERE id=${track}`)[0]
      .audioProcessingStatus,
    "completed",
  );
  await assert.rejects(retryAudio(prefix + "moderator", track, false, sql));
  console.log(
    "PASS: audio retry authorization, concurrent retry prevention and transactional result/audit persistence using an injected processor on fixture tracks.",
  );
  // Only the restored disposable database is mutated by this suite.
  await sql`UPDATE admin_memberships SET active=false WHERE role='super_admin' AND user_id<>${prefix + "super_admin"}`;
  for (const mutation of [
    () => sql`UPDATE admin_memberships SET role='admin' WHERE user_id=${prefix + "super_admin"}`,
    () => sql`UPDATE admin_memberships SET active=false WHERE user_id=${prefix + "super_admin"}`,
    () => sql`DELETE FROM admin_memberships WHERE user_id=${prefix + "super_admin"}`,
    () => sql`DELETE FROM users WHERE id=${prefix + "super_admin"}`,
  ])
    await assert.rejects(mutation());
  console.log(
    "PASS: database blocks demotion, revocation and deletion of the final active Super Admin.",
  );
  console.log(
    "PASS: runtime snapshot authorization, expired/invalid/ordinary-user denial and role-specific DTO redaction on restored copy.",
  );
}
