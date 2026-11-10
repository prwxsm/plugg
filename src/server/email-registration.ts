import { randomInt, randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import type postgres from "postgres";
import { registrationInput, type Registration } from "./registration-input.ts";
import { createVerifiedAccount } from "./create-verified-account.ts";
import { requireVerificationEmailConfig, sendVerificationEmail } from "./verification-email.ts";
import { createLoginLimiter } from "./login-rate-limit.ts";
const limit = createLoginLimiter();
type Db = ReturnType<typeof postgres>;
type Delivery = typeof sendVerificationEmail;
const invalid = "That code is invalid or expired. Request a new code and try again.";

// Persist the delivery budget even on provider failure; never exceed the free allowance.
async function reserveDelivery(db: Db) {
  await db.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(734822,1)`;
    await tx`INSERT INTO registration_email_budget(day,attempts) VALUES((now() AT TIME ZONE 'UTC')::date,0) ON CONFLICT DO NOTHING`;
    const [usage] =
      await tx`SELECT coalesce(sum(attempts),0)::int AS month,coalesce(max(attempts) FILTER(WHERE day=(now() AT TIME ZONE 'UTC')::date),0)::int AS today FROM registration_email_budget WHERE day>=date_trunc('month',now() AT TIME ZONE 'UTC')::date`;
    if (usage!["month"] >= 2800 || usage!["today"] >= 90)
      throw new Error("Verification email limit reached. Please try again tomorrow.");
    await tx`UPDATE registration_email_budget SET attempts=attempts+1 WHERE day=(now() AT TIME ZONE 'UTC')::date`;
  });
}
export async function startRegistration(
  db: Db,
  input: unknown,
  send: Delivery = sendVerificationEmail,
) {
  const data = registrationInput.parse(input);
  if (send === sendVerificationEmail) requireVerificationEmailConfig();
  if (limit(data.email)) throw new Error("Too many signup attempts. Please try again later.");
  const { password, confirmPassword, ...payload } = data;
  const hash = await bcrypt.hash(password, 10);
  const id = randomUUID(),
    code = String(randomInt(0, 100_000_000)).padStart(8, "0");
  const codeHash = await bcrypt.hash(code, 10);
  await db.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(hashtext(${data.email}))`;
    if ((await tx`SELECT id FROM users WHERE lower(email)=${data.email}`).length)
      throw new Error("Unable to create this account. Try signing in instead.");
    const [recent] =
      await tx`SELECT id FROM pending_registrations WHERE email=${data.email} AND sent_at>now()-interval '60 seconds'`;
    if (recent) throw new Error("Please wait at least 60 seconds before requesting another code.");
    await tx`DELETE FROM pending_registrations WHERE expires_at<now()-interval '1 day'`;
    await tx`INSERT INTO pending_registrations(id,email,payload,password_hash,code_hash,expires_at) VALUES(${id},${data.email},${tx.json(payload)},${hash},${codeHash},now()+interval '15 minutes') ON CONFLICT(email) DO UPDATE SET id=excluded.id,payload=excluded.payload,password_hash=excluded.password_hash,code_hash=excluded.code_hash,attempts=0,expires_at=excluded.expires_at,sent_at=now()`;
  });
  try {
    await reserveDelivery(db);
    await send(data.email, code, id);
  } catch (e) {
    await db`DELETE FROM pending_registrations WHERE id=${id}`;
    throw e;
  }
  return { success: true, verificationRequired: true, id, email: data.email };
}
export async function resendRegistration(
  db: Db,
  id: string,
  send: Delivery = sendVerificationEmail,
) {
  if (send === sendVerificationEmail) requireVerificationEmailConfig();
  if (limit(id)) throw new Error("Too many resend attempts. Please try again later.");
  const code = String(randomInt(0, 100_000_000)).padStart(8, "0"),
    codeHash = await bcrypt.hash(code, 10);
  const nextId = randomUUID();
  const email = await db.begin(async (tx) => {
    const [row] =
      await tx`SELECT email FROM pending_registrations WHERE id=${id} AND sent_at<=now()-interval '60 seconds' AND expires_at>now()-interval '1 day' FOR UPDATE`;
    if (!row)
      throw new Error("Please wait 60 seconds, or restart signup if this request has expired.");
    await tx`UPDATE pending_registrations SET id=${nextId},code_hash=${codeHash},attempts=0,expires_at=now()+interval '15 minutes',sent_at=now() WHERE id=${id}`;
    return String(row["email"]);
  });
  try {
    await reserveDelivery(db);
    await send(email, code, nextId);
  } catch (e) {
    // Restore the challenge ID so the same signup screen can retry after the cooldown.
    await db`UPDATE pending_registrations SET id=${id},attempts=5 WHERE id=${nextId}`;
    throw e;
  }
  return { success: true, id: nextId, email };
}
export async function completeRegistration(db: Db, id: string, code: string) {
  if (!/^\d{8}$/.test(code)) throw new Error(invalid);
  const result = await db.begin(async (tx) => {
    const [identity] = await tx`SELECT email FROM pending_registrations WHERE id=${id}`;
    if (!identity) return null;
    await tx`SELECT pg_advisory_xact_lock(hashtext(${identity["email"]}))`;
    const [row] =
      await tx`SELECT *,expires_at>now() AS valid FROM pending_registrations WHERE id=${id} FOR UPDATE`;
    if (!row || !row["valid"] || row["attempts"] >= 5) return null;
    if (!(await bcrypt.compare(code, String(row["codeHash"])))) {
      await tx`UPDATE pending_registrations SET attempts=attempts+1 WHERE id=${id}`;
      return null; // Commit attempts even when the caller sees an error.
    }
    const data = row["payload"] as Omit<Registration, "password" | "confirmPassword">;
    await tx`SELECT pg_advisory_xact_lock(hashtext(${data.email}))`;
    if ((await tx`SELECT id FROM users WHERE lower(email)=${data.email}`).length) return null;
    const account = await createVerifiedAccount(tx, data, String(row["passwordHash"]));
    await tx`DELETE FROM pending_registrations WHERE id=${id}`;
    return account;
  });
  if (!result) throw new Error(invalid);
  return result;
}
