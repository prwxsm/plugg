import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  hasPermission,
  requirePermission,
  requireAdminSession,
  requireRole,
} from "../src/server/admin-rbac.ts";
export async function testMigration(sql) {
  const up = await readFile(
    new URL("../db/migrations/001-admin-rbac.sql", import.meta.url),
    "utf8",
  );
  const down = await readFile(
    new URL("../db/migrations/001-admin-rbac.rollback.sql", import.meta.url),
    "utf8",
  );
  const prefix = "isolated-rbac-fixture-";
  const original = await sql`SELECT id,is_admin FROM users ORDER BY id`;
  await assert.rejects(
    sql.begin(async (tx) => tx.unsafe(up)),
    /Select and approve/,
  );
  assert.equal((await sql`SELECT to_regclass('public.admin_memberships') AS t`)[0].t, null);
  for (const role of ["super_admin", "admin", "moderator", "ordinary"]) {
    await sql`INSERT INTO users(id,name,email,account_type,is_mock,password_hash) VALUES(${prefix + role},'Isolated test fixture',${role + "@invalid.example"},'listener',false,'not-a-real-password-hash')`;
    await sql`INSERT INTO sessions(id,user_id,expires_at) VALUES(${prefix + role},${prefix + role},now()+interval '1 hour')`;
  }
  await sql`INSERT INTO sessions(id,user_id,expires_at) VALUES(${prefix + "expired"},${prefix + "super_admin"},now()-interval '1 hour')`;
  await sql.begin(async (tx) => {
    await tx`SELECT set_config('plugg.bootstrap_user_id',${prefix + "super_admin"},true)`;
    await tx.unsafe(up);
  });
  assert.equal((await sql`SELECT count(*)::int AS n FROM users WHERE is_admin`)[0].n, 0);
  assert.deepEqual((await sql`SELECT user_id,role FROM admin_memberships`)[0], {
    user_id: prefix + "super_admin",
    role: "super_admin",
  });
  const stop = new Error("rollback test-only role fixtures");
  try {
    await sql.begin(async (tx) => {
      for (const role of ["admin", "moderator"])
        await tx`INSERT INTO admin_memberships(user_id,role) VALUES(${prefix + role},${role})`;
      for (const session of [undefined, "invalid", prefix + "expired"])
        await assert.rejects(requireAdminSession(tx, session), (e) => e.status === 401);
      await assert.rejects(requireAdminSession(tx, prefix + "ordinary"), (e) => e.status === 403);
      await assert.rejects(
        requirePermission(tx, prefix + "moderator", "staff.manage"),
        (e) => e.status === 403,
      );
      await assert.rejects(
        requirePermission(tx, prefix + "admin", "staff.manage"),
        (e) => e.status === 403,
      );
      await assert.rejects(
        requireRole(tx, prefix + "admin", "super_admin"),
        (e) => e.status === 403,
      );
      assert.equal(
        (await requirePermission(tx, prefix + "super_admin", "staff.manage")).role,
        "super_admin",
      );
      assert.equal(
        (await requirePermission(tx, prefix + "moderator", "review.write")).role,
        "moderator",
      );
      assert.equal(hasPermission("moderator", "users.read"), false);
      assert.equal(hasPermission("admin", "settings.write"), false);
      assert.equal(hasPermission("toString", "review.write"), false);
      // Deliberately change deprecated flags: authority must remain solely membership based.
      await tx`UPDATE users SET is_admin=true WHERE id=${prefix + "ordinary"}`;
      await assert.rejects(requireAdminSession(tx, prefix + "ordinary"), (e) => e.status === 403);
      throw stop;
    });
  } catch (e) {
    if (e !== stop) throw e;
  }
  for (const query of [
    "UPDATE admin_memberships SET active=false WHERE role='super_admin'",
    "UPDATE admin_memberships SET role='admin' WHERE role='super_admin'",
    "DELETE FROM admin_memberships WHERE role='super_admin'",
  ])
    await assert.rejects(
      sql.begin((tx) => tx.unsafe(query)),
      /final active Super Admin/,
    );
  await assert.rejects(
    sql.begin((tx) => tx.unsafe("TRUNCATE admin_memberships")),
    /cannot be truncated/,
  );
  for (const query of [
    "DELETE FROM admin_audit_log",
    "UPDATE admin_audit_log SET reason='changed'",
    "TRUNCATE admin_audit_log",
  ])
    await assert.rejects(
      sql.begin((tx) => tx.unsafe(query)),
      /append-only/,
    );
  await assert.rejects(
    sql.begin(async (tx) => {
      await tx`INSERT INTO admin_memberships(user_id,role) VALUES(${prefix + "admin"},'admin')`;
      await tx.unsafe(down);
    }),
    /Post-bootstrap changes/,
  );
  await sql.begin((tx) => tx.unsafe(down));
  assert.equal((await sql`SELECT to_regclass('public.admin_memberships') AS t`)[0].t, null);
  assert.deepEqual(
    await sql`SELECT id,is_admin FROM users WHERE id NOT LIKE ${prefix + "%"} ORDER BY id`,
    original,
  );
  console.log(
    "PASS: staged migration, bootstrap validation, session/role/permission matrix, legacy flag rejection, final-Super-Admin protection, audit immutability and pre-activation rollback. Live database unchanged.",
  );
}
