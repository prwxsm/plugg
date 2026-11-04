import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import sql from "../src/lib/db.ts";
import {
  startRegistration,
  completeRegistration,
  resendRegistration,
} from "../src/server/email-registration.ts";
import { passwordError } from "../src/lib/password-policy.ts";
import { registrationInput } from "../src/server/registration-input.ts";
const input = {
  name: "Test Person",
  email: "test@example.invalid",
  password: "river lantern forest clouds",
  confirmPassword: "river lantern forest clouds",
  accountType: "listener",
};
assert.ok(passwordError("12345678"));
assert.ok(passwordError("passwordpassword"));
assert.ok(passwordError("😀".repeat(19)));
assert.equal(passwordError(input.password), null);
assert.equal(registrationInput.safeParse({ ...input, email: "bad" }).success, false);
assert.equal(registrationInput.safeParse({ ...input, accountType: "admin" }).success, false);
assert.equal(
  registrationInput.safeParse({ ...input, accountType: "artist", acceptTerms: "true" }).success,
  false,
);
const rollback = new Error("Rollback email verification fixtures");
let delivered;
const send = async (email, code, id) => {
  delivered = { email, code, id };
};
try {
  await assert.rejects(
    sql.begin(async (tx) => {
      await tx`CREATE TEMP TABLE users (LIKE public.users INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES) ON COMMIT DROP`;
      await tx`CREATE TEMP TABLE artists (LIKE public.artists INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES) ON COMMIT DROP`;
      await tx`CREATE TEMP TABLE artist_analytics (LIKE public.artist_analytics INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES) ON COMMIT DROP`;
      let migration = await readFile(
        new URL("../db/migrations/015_email_verification.sql", import.meta.url),
        "utf8",
      );
      await tx.unsafe(migration.replaceAll("CREATE TABLE IF NOT EXISTS", "CREATE TEMP TABLE"));
      const db = Object.assign((...args) => tx(...args), { begin: (fn) => tx.savepoint(fn) });
      let request = await startRegistration(db, input, send);
      assert.equal((await tx`SELECT count(*)::int AS n FROM users`)[0].n, 0);
      const [pending] = await tx`SELECT * FROM pending_registrations`;
      assert.notEqual(pending.codeHash, delivered.code);
      assert.equal(pending.payload.password, undefined);
      assert.equal(JSON.stringify(request).includes(delivered.code), false);
      await assert.rejects(resendRegistration(db, request.id, send), /60 seconds/);
      for (let i = 0; i < 5; i++)
        await assert.rejects(
          completeRegistration(
            db,
            request.id,
            delivered.code === "00000000" ? "11111111" : "00000000",
          ),
          /invalid or expired/,
        );
      await assert.rejects(
        completeRegistration(db, request.id, delivered.code),
        /invalid or expired/,
      );
      await tx`UPDATE pending_registrations SET sent_at=now()-interval '61 seconds'`;
      const oldCode = delivered.code,
        oldId = request.id;
      request = await resendRegistration(db, request.id, send);
      await assert.rejects(completeRegistration(db, oldId, oldCode), /invalid or expired/);
      const result = await completeRegistration(db, request.id, delivered.code);
      assert.equal(result.role, "listener");
      assert.ok((await tx`SELECT email_verified_at FROM users`)[0].emailVerifiedAt);
      assert.equal((await tx`SELECT count(*)::int AS n FROM pending_registrations`)[0].n, 0);
      await assert.rejects(
        completeRegistration(db, request.id, delivered.code),
        /invalid or expired/,
      );
      await assert.rejects(startRegistration(db, input, send), /Try signing in/);
      const artist = {
        ...input,
        email: "artist@example.invalid",
        accountType: "artist",
        artistName: "Test Stage",
        country: "Uganda",
        primaryGenre: "Afrobeats",
        acceptTerms: true,
      };
      request = await startRegistration(db, artist, send);
      const artistResult = await completeRegistration(db, request.id, delivered.code);
      assert.ok(artistResult.artistId);
      assert.equal((await tx`SELECT count(*)::int AS n FROM artists`)[0].n, 1);
      request = await startRegistration(db, { ...input, email: "expired@example.invalid" }, send);
      await tx`UPDATE pending_registrations SET expires_at=now()-interval '1 second' WHERE id=${request.id}`;
      await assert.rejects(
        completeRegistration(db, request.id, delivered.code),
        /invalid or expired/,
      );
      await assert.rejects(
        startRegistration(db, { ...input, email: "failed@example.invalid" }, async () => {
          throw Error("provider unavailable");
        }),
        /provider unavailable/,
      );
      assert.equal(
        (
          await tx`SELECT count(*)::int AS n FROM pending_registrations WHERE email='failed@example.invalid'`
        )[0].n,
        0,
      );
      await tx`UPDATE registration_email_budget SET attempts=90`;
      await assert.rejects(
        startRegistration(db, { ...input, email: "budget@example.invalid" }, send),
        /limit reached/,
      );
      throw rollback;
    }),
    (e) => e === rollback,
  );
  console.log(
    "PASS: password/input validation, no account before verification, hashed secrets, attempt lockout, resend cooldown, expiry, replay prevention, listener/artist creation, provider failures, free-plan budget; fixtures rolled back.",
  );
} finally {
  await sql.end();
}
