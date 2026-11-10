import { limitLogin } from "../login-rate-limit.ts";
import bcrypt from "bcrypt";
import { z } from "zod";
import database from "../../lib/db.ts";
import { readAdminSnapshot } from "../admin-data.ts";
import { administer } from "../admin-operations.ts";
import { reviewRelease } from "../admin-review.ts";
import { retryAudio } from "../admin-retry.ts";
import { AdminAuthorizationError } from "../admin-rbac.ts";

const cookieName = "plugg_session";
const loginInput = z
  .object({ identifier: z.string().trim().min(1).max(254), password: z.string().min(1).max(200) })
  .strict();
export function adminSession(request: Request) {
  return request.headers
    .get("cookie")
    ?.split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(cookieName + "="))
    ?.slice(cookieName.length + 1);
}
export function trustedAdminWrite(request: Request) {
  const origins = (
    process.env["PLUGG_ADMIN_ORIGINS"] ||
    (process.env["NODE_ENV"] !== "production" ? "http://localhost:3001,http://127.0.0.1:3001" : "")
  )
    .split(",")
    .filter(Boolean);
  return (
    request.headers.get("X-Plugg-Admin") === "1" &&
    [new URL(request.url).origin, ...origins].includes(request.headers.get("origin") || "") &&
    request.headers.get("content-type")?.split(";")[0] === "application/json"
  );
}
function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });
}
export async function handleAdminRequest(
  request: Request,
  connection: typeof database = database,
): Promise<Response> {
  const sql = connection;
  const route = new URL(request.url).pathname.slice("/api/admin/v1/".length);
  const session = adminSession(request);
  if (request.method === "GET" && route === "snapshot")
    return json(await readAdminSnapshot(session, sql));
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!trustedAdminWrite(request)) return json({ error: "Untrusted administrative request" }, 403);
  try {
    if (Number(request.headers.get("content-length") || 0) > 32768)
      return json({ error: "Request too large" }, 413);
    const raw = await request.text();
    if (raw.length > 32768) return json({ error: "Request too large" }, 413);
    const body: unknown = JSON.parse(raw);
    if (route === "login") {
      const data = loginInput.parse(body);
      const identifier = data.identifier.toLowerCase();
      const retryAfter = limitLogin(identifier);
      if (retryAfter) return json({ error: "Too many sign-in attempts. Please try again later." }, 429, { "Retry-After": String(retryAfter) });
      const [user] =
        await sql`SELECT u.id,u.password_hash FROM users u LEFT JOIN artists a ON a.id=u.artist_id WHERE lower(u.email)=${identifier} OR lower(u.username)=${identifier} OR lower(a.username)=${identifier} LIMIT 1`;
      if (!user?.["passwordHash"] || !(await bcrypt.compare(data.password, user["passwordHash"])))
        return json({ error: "Invalid email, username, or password" }, 401);
      const [membership] =
        await sql`SELECT role FROM admin_memberships WHERE user_id=${user["id"]} AND active`;
      if (!membership)
        return json({ error: "This account does not have administrative access" }, 403);
      const id = crypto.randomUUID();
      const expires = new Date(Date.now() + 30 * 24 * 3600 * 1000);
      await sql`INSERT INTO sessions(id,user_id,expires_at) VALUES(${id},${user["id"]},${expires})`;
      return json({ success: true }, 200, {
        "Set-Cookie": `${cookieName}=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${process.env["NODE_ENV"] === "production" ? "; Secure" : ""}`,
      });
    }
    if (route === "logout") {
      if (session) await sql`DELETE FROM sessions WHERE id=${session}`;
      return json({ success: true }, 200, {
        "Set-Cookie": `${cookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${process.env["NODE_ENV"] === "production" ? "; Secure" : ""}`,
      });
    }
    if (route === "operations") return json(await administer(session, body, sql));
    if (route === "review") return json(await reviewRelease(session, body, sql));
    if (route === "retry-audio") {
      const data = z
        .object({ trackId: z.string().min(1).max(100) })
        .strict()
        .parse(body);
      return json(await retryAudio(session, data.trackId, false, sql));
    }
    return json({ error: "Endpoint not found" }, 404);
  } catch (error) {
    if (error instanceof AdminAuthorizationError)
      return json({ error: error.message }, error.status);
    if (error instanceof z.ZodError || error instanceof SyntaxError)
      return json({ error: "Invalid request fields" }, 400);
    if (error && typeof error === "object" && "code" in error)
      return json({ error: "The operation could not be completed. Refresh and retry." }, 500);
    return json({ error: error instanceof Error ? error.message : "Operation failed" }, 400);
  }
}
