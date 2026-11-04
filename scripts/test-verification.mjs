import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import sql from "../src/lib/db.ts";
import {
  verificationInput,
  submitVerificationApplication,
} from "../src/server/artist-verification.ts";
import { administer } from "../src/server/admin-operations.ts";
const input = {
  legalName: "Test Artist",
  contactEmail: "artist@example.invalid",
  supportingLinks: ["https://example.invalid/artist"],
  accuracyConfirmed: true,
};
for (const bad of [
  { accuracyConfirmed: "true" },
  { supportingLinks: ["javascript:alert(1)"] },
  { supportingLinks: ["broken"] },
  { supportingLinks: ["https://user:password@example.invalid"] },
  { supportingLinks: [] },
  { contactEmail: "broken" },
  { legalName: "x" },
  { note: "x".repeat(3001) },
]) {
  assert.equal(verificationInput.safeParse({ ...input, ...bad }).success, false);
}
const rollback = new Error("ROLLBACK isolated verification test");
try {
  await assert.rejects(
    sql.begin(async (tx) => {
      // All fixtures shadow real tables only within this transaction and are rolled back.
      await tx`CREATE TEMP TABLE artists(id text PRIMARY KEY, display_name text, verified boolean DEFAULT false, updated_at timestamptz DEFAULT now()) ON COMMIT DROP`;
      await tx`CREATE TEMP TABLE users(id text PRIMARY KEY, name text) ON COMMIT DROP`;
      await tx`CREATE TEMP TABLE sessions(id text, user_id text, expires_at timestamptz) ON COMMIT DROP`;
      await tx`CREATE TEMP TABLE admin_memberships(user_id text, role text, active boolean) ON COMMIT DROP`;
      await tx`CREATE TEMP TABLE admin_audit_log(actor_user_id text,actor_role text,action text,target_type text,target_id text,reason text,before_state jsonb,after_state jsonb,result text) ON COMMIT DROP`;
      const migration = await readFile(
        new URL("../db/migrations/014_artist_verification_applications.sql", import.meta.url),
        "utf8",
      );
      // Temp table creation means migration never touches the real applications table.
      await tx.unsafe(
        migration.replace(
          "CREATE TABLE IF NOT EXISTS artist_verification_applications",
          "CREATE TEMP TABLE artist_verification_applications",
        ),
      );
      await tx`INSERT INTO artists(id,display_name) VALUES('test-artist','Test Artist')`;
      await tx`INSERT INTO users VALUES('owner','Owner'),('admin','Admin'),('moderator','Moderator')`;
      await tx`INSERT INTO sessions VALUES('admin','admin',now()+interval '1 hour'),('moderator','moderator',now()+interval '1 hour'),('ordinary','owner',now()+interval '1 hour')`;
      await tx`INSERT INTO admin_memberships VALUES('admin','admin',true),('moderator','moderator',true)`;
      const owner = { id: "owner", artistId: "test-artist", accountType: "artist" };
      await assert.rejects(submitVerificationApplication(tx, null, input), /Unauthorized/);
      const first = await submitVerificationApplication(tx, owner, input);
      const id = first.application.id;
      await assert.rejects(submitVerificationApplication(tx, owner, input), /already pending/);
      const connection = { begin: (fn) => tx.savepoint(fn) };
      const review = (status, feedback, session = "admin") =>
        administer(
          session,
          {
            action: "review_verification",
            targetId: id,
            verificationStatus: status,
            feedback,
            reason: "Test review",
            confirmed: true,
          },
          connection,
        );
      for (const session of ["moderator", "ordinary", null])
        await assert.rejects(review("approved", "", session), /permission|Authentication/);
      await assert.rejects(review("rejected", "  "), /feedback/);
      await review("more_info_required", "Please provide an official artist profile.");
      assert.equal(
        (await tx`SELECT admin_feedback FROM artist_verification_applications WHERE id=${id}`)[0]
          .adminFeedback,
        "Please provide an official artist profile.",
      );
      await assert.rejects(review("approved", ""), /already been reviewed/);
      assert.equal((await submitVerificationApplication(tx, owner, input)).application.id, id);
      await review("rejected", "The supplied profile does not establish artist identity.");
      assert.equal((await tx`SELECT verified FROM artists`)[0].verified, false);
      await submitVerificationApplication(tx, owner, input);
      await review("approved", "Identity confirmed.");
      assert.equal((await tx`SELECT verified FROM artists`)[0].verified, true);
      await assert.rejects(submitVerificationApplication(tx, owner, input), /already verified/);
      await assert.rejects(
        review("rejected", "Cannot overwrite an approval."),
        /already been reviewed/,
      );
      const audits = await tx`SELECT after_state FROM admin_audit_log`;
      assert.equal(audits.length, 3);
      assert.equal(
        audits[0].afterState.adminFeedback,
        "Please provide an official artist profile.",
      );
      throw rollback;
    }),
    (e) => e === rollback,
  );
  console.log(
    "PASS: validation, duplicate prevention, authorization, feedback, resubmission, approval badge, stale-review protection, and audit trail; all test records rolled back.",
  );
} finally {
  await sql.end();
}
