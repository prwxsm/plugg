import bcrypt from "bcrypt";
import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";
import sql from "./db";
import type { User } from "@/data/types";

export const SESSION_COOKIE_NAME = "plugg_session";
const SESSION_DURATION_DAYS = 30;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string): Promise<string> {
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

  await sql`
    INSERT INTO sessions (id, user_id, expires_at)
    VALUES (${sessionId}, ${userId}, ${expiresAt})
  `;

  try {
    setCookie(SESSION_COOKIE_NAME, sessionId, {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
      maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
    });
  } catch (err) {
    console.warn("Failed to set session cookie:", err);
  }

  return sessionId;
}

export async function clearSession(): Promise<void> {
  try {
    const sessionId = getCookie(SESSION_COOKIE_NAME);
    if (sessionId) {
      await sql`DELETE FROM sessions WHERE id = ${sessionId}`;
    }
    deleteCookie(SESSION_COOKIE_NAME, { path: "/" });
  } catch (err) {
    console.warn("Failed to clear session:", err);
  }
}

export async function getUserFromSession(): Promise<User | null> {
  try {
    const sessionId = getCookie(SESSION_COOKIE_NAME);
    if (!sessionId) {
      return null;
    }

    const [user] = await sql<(User & { isAdmin?: boolean })[]>`
      SELECT u.id, u.name, u.username, u.email, u.account_type as "accountType", u.avatar_url as "avatarUrl", u.artist_id as "artistId", EXISTS(SELECT 1 FROM admin_memberships m WHERE m.user_id=u.id AND m.active) as "isAdmin"
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.id = ${sessionId} AND s.expires_at > now()
      LIMIT 1
    `;

    if (!user) {
      try {
        deleteCookie(SESSION_COOKIE_NAME, { path: "/" });
      } catch {}
      return null;
    }

    const isSystemAdmin = user.isAdmin === true;

    return {
      id: user.id,
      name: user.name,
      username: user.username || undefined,
      email: user.email,
      accountType: user.accountType,
      avatarUrl: user.avatarUrl || "",
      artistId: user.artistId || undefined,
      isAdmin: isSystemAdmin,
    };
  } catch (err) {
    console.error("Error retrieving user from session:", err);
    return null;
  }
}
