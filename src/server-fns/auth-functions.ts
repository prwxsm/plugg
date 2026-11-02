import { limitLogin } from "../server/login-rate-limit.ts";
import { createServerFn } from "@tanstack/react-start";
import sql from "@/lib/db";
import {
  hashPassword,
  verifyPassword,
  createSession,
  clearSession,
  getUserFromSession,
} from "@/lib/auth";

export const registerUser = createServerFn({ method: "POST" })
  .validator(
    (data: {
      name?: string | undefined;
      email?: string | undefined;
      password?: string | undefined;
      confirmPassword?: string | undefined;
      accountType?: "listener" | "artist" | undefined;
      // Artist-specific fields (required when accountType is 'artist')
      artistName?: string | undefined;
      country?: string | undefined;
      primaryGenre?: string | undefined;
      acceptTerms?: boolean | undefined;
      location?: string | undefined;
      bio?: string | undefined;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { name, email, password, confirmPassword, accountType = "listener" } = data;

    if (!name || !email || !password || !confirmPassword) {
      throw new Error("All fields are required");
    }

    if (password !== confirmPassword) {
      throw new Error("Passwords do not match");
    }

    if (password.length < 6) {
      throw new Error("Password must be at least 6 characters long");
    }

    if (accountType === "artist") {
      if (!data.artistName?.trim()) {
        throw new Error("Artist / Stage name is required");
      }
      if (!data.country?.trim()) {
        throw new Error("Please select your country");
      }
      if (!data.primaryGenre?.trim()) {
        throw new Error("Please select your primary music genre");
      }
      if (!data.acceptTerms) {
        throw new Error("You must accept the Terms & Conditions and Music Upload Policy");
      }
    }

    const normalizedEmail = email.trim().toLowerCase();

    const [existing] = await sql`SELECT id FROM users WHERE lower(email) = ${normalizedEmail}`;
    if (existing) {
      throw new Error("An account with this email already exists");
    }

    const userId = crypto.randomUUID();
    const hashedPassword = await hashPassword(password);

    let artistId: string | null = null;
    let artistUsername: string | null = null;

    if (accountType === "artist") {
      // Create both user and artist records in a single transaction
      artistId = crypto.randomUUID();
      const baseUsername =
        (data.artistName || name)
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "-")
          .replace(/-+/g, "-") || "artist";
      artistUsername = `${baseUsername}-${Math.floor(100 + Math.random() * 900)}`;

      await sql.begin(async (tx) => {
        await tx`
          INSERT INTO artists (
            id, username, display_name, bio, location, country, primary_genre, avatar_url, cover_url, terms_accepted_at, is_mock
          )
          VALUES (
            ${artistId},
            ${artistUsername},
            ${(data.artistName || name).trim()},
            ${data.bio?.trim() || ""},
            ${data.location?.trim() || data.country?.trim() || ""},
            ${data.country?.trim() || null},
            ${data.primaryGenre?.trim() || null},
            '',
            '',
            now(),
            false
          )
        `;

        await tx`
          INSERT INTO users (id, name, email, password_hash, account_type, artist_id, is_mock)
          VALUES (${userId}, ${name.trim()}, ${normalizedEmail}, ${hashedPassword}, 'artist', ${artistId}, false)
        `;

        await tx`
          INSERT INTO artist_analytics (artist_id, total_plays, monthly_listeners, fans, growth_percent)
          VALUES (${artistId}, 0, 0, 0, 0)
          ON CONFLICT (artist_id) DO NOTHING
        `;
      });
    } else {
      // Standard listener registration
      await sql`
        INSERT INTO users (id, name, email, password_hash, account_type, artist_id, is_mock)
        VALUES (${userId}, ${name.trim()}, ${normalizedEmail}, ${hashedPassword}, 'listener', null, false)
      `;
    }

    // Auto-login: create session immediately after registration
    await createSession(userId);

    return {
      success: true,
      userId,
      name: name.trim(),
      email: normalizedEmail,
      role: accountType as "listener" | "artist",
      artistId,
      artistUsername,
    };
  });

export const loginUser = createServerFn({ method: "POST" })
  .validator((data: { email?: string; identifier?: string; password?: string }) => data)
  .handler(async ({ data }) => {
    const rawIdentifier = (data.identifier || data.email || "").trim();
    const { password } = data;
    if (!rawIdentifier || !password) {
      throw new Error("Email or username and password are required");
    }

    if (rawIdentifier.length > 254 || password.length > 200) throw new Error("Invalid sign-in fields");
    const normalized = rawIdentifier.toLowerCase();
    if (limitLogin(normalized)) throw new Error("Too many sign-in attempts. Please try again later.");

    const [user] = await sql<
      {
        id: string;
        name: string;
        email: string;
        passwordHash: string | null;
        accountType: "listener" | "artist";
        artistId: string | null;
      }[]
    >`
      SELECT u.id, u.name, u.email, u.password_hash, u.account_type, u.artist_id
      FROM users u
      LEFT JOIN artists a ON a.id = u.artist_id
      WHERE lower(u.email) = ${normalized}
         OR lower(u.username) = ${normalized}
         OR lower(a.username) = ${normalized}
      LIMIT 1
    `;

    if (!user || !user.passwordHash) {
      throw new Error("Invalid email, username, or password");
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      throw new Error("Invalid email, username, or password");
    }

    await createSession(user.id);
    return {
      success: true,
      userId: user.id,
      name: user.name,
      role: user.accountType,
      artistId: user.artistId,
    };
  });

// Disabled until a verified out-of-band delivery provider is configured. Never return reset codes.
export const requestPasswordResetCodeFn = createServerFn({ method: "POST" })
  .validator((data: { email: string }) => data)
  .handler(async () => {
    throw new Error("Password recovery is temporarily unavailable. Contact the platform owner.");
  });
export const resetPasswordWithCodeFn = createServerFn({ method: "POST" })
  .validator(
    (data: { email: string; code: string; newPassword: string; confirmPassword: string }) => data,
  )
  .handler(async () => {
    throw new Error(
      "Password recovery is temporarily unavailable. Sign in to change your password securely.",
    );
  });

export const logoutUser = createServerFn({ method: "POST" }).handler(async () => {
  await clearSession();
  return { success: true };
});

export const getCurrentUser = createServerFn({ method: "GET" }).handler(async () => {
  return await getUserFromSession();
});

export const updateUserProfileFn = createServerFn({ method: "POST" })
  .validator(
    (data: {
      name?: string | undefined;
      username?: string | undefined;
      email?: string | undefined;
      avatarUrl?: string | undefined;
    }) => data,
  )
  .handler(async ({ data }) => {
    const user = await getUserFromSession();
    if (!user) {
      throw new Error("Unauthorized");
    }

    const { name, username, email, avatarUrl } = data;
    const cleanName = name?.trim();
    const cleanUsername = username
      ? username
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9_-]/g, "")
      : null;
    const cleanEmail = email ? email.trim().toLowerCase() : null;

    if (cleanEmail && cleanEmail !== user.email.toLowerCase()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        throw new Error("Invalid email address format");
      }
      const existingEmail = await sql<{ id: string }[]>`
        SELECT id FROM users WHERE lower(email) = ${cleanEmail} AND id != ${user.id}
      `;
      if (existingEmail.length > 0) {
        throw new Error("An account with this email already exists");
      }
    }

    if (cleanUsername) {
      if (cleanUsername.length < 3 || cleanUsername.length > 15) {
        throw new Error(
          "Username must be between 3 and 15 characters (lowercase letters, numbers, hyphens, underscores)",
        );
      }
      if (!/^[a-z0-9_-]+$/.test(cleanUsername)) {
        throw new Error(
          "Username can only contain lowercase letters, numbers, hyphens (-), and underscores (_)",
        );
      }
      const existingUser = await sql<{ id: string }[]>`
        SELECT id FROM users WHERE lower(username) = ${cleanUsername} AND id != ${user.id} LIMIT 1
      `;
      const existingArtist = await sql<{ id: string }[]>`
        SELECT id FROM artists WHERE lower(username) = ${cleanUsername} AND id != ${user.artistId || ""} LIMIT 1
      `;
      if (existingUser.length > 0 || existingArtist.length > 0) {
        throw new Error("Username is already taken");
      }
    }

    await sql`
      UPDATE users
      SET name = COALESCE(${cleanName || null}, name),
          username = COALESCE(${cleanUsername}, username),
          email = COALESCE(${cleanEmail || null}, email),
          avatar_url = COALESCE(${avatarUrl ?? null}, avatar_url),
          updated_at = now()
      WHERE id = ${user.id}
    `;

    const [updated] = await sql<
      {
        id: string;
        name: string;
        username: string | null;
        email: string;
        accountType: "listener" | "artist";
        avatarUrl: string | null;
        artistId: string | null;
      }[]
    >`
      SELECT id, name, username, email, account_type as "accountType", avatar_url as "avatarUrl", artist_id as "artistId"
      FROM users
      WHERE id = ${user.id}
    `;

    if (!updated) {
      throw new Error("User not found");
    }

    return {
      id: updated.id,
      name: updated.name,
      username: updated.username || undefined,
      email: updated.email,
      accountType: updated.accountType,
      avatarUrl: updated.avatarUrl || "",
      artistId: updated.artistId || undefined,
    };
  });

export const verifyCurrentPasswordFn = createServerFn({ method: "POST" })
  .validator((data: { oldPassword?: string }) => data)
  .handler(async ({ data }) => {
    const user = await getUserFromSession();
    if (!user) {
      throw new Error("You must be signed in");
    }
    const { oldPassword } = data;
    if (!oldPassword) {
      throw new Error("Please enter your current password");
    }
    const [dbUser] = await sql<{ passwordHash: string | null }[]>`
      SELECT password_hash as "passwordHash" FROM users WHERE id = ${user.id} LIMIT 1
    `;
    if (!dbUser || !dbUser.passwordHash) {
      throw new Error("Account not found");
    }
    const isValid = await verifyPassword(oldPassword, dbUser.passwordHash);
    if (!isValid) {
      throw new Error("Incorrect current password");
    }
    return { valid: true };
  });

export const changeUserPasswordFn = createServerFn({ method: "POST" })
  .validator(
    (data: { oldPassword?: string; newPassword?: string; confirmPassword?: string }) => data,
  )
  .handler(async ({ data }) => {
    const user = await getUserFromSession();
    if (!user) {
      throw new Error("You must be signed in to change your password");
    }

    const { oldPassword, newPassword, confirmPassword } = data;
    if (!oldPassword || !newPassword || !confirmPassword) {
      throw new Error("All fields are required");
    }

    if (newPassword !== confirmPassword) {
      throw new Error("New passwords do not match");
    }

    if (newPassword.length < 6) {
      throw new Error("New password must be at least 6 characters long");
    }

    const [dbUser] = await sql<{ passwordHash: string | null }[]>`
      SELECT password_hash as "passwordHash" FROM users WHERE id = ${user.id} LIMIT 1
    `;

    if (!dbUser || !dbUser.passwordHash) {
      throw new Error("Account not found");
    }

    const isValid = await verifyPassword(oldPassword, dbUser.passwordHash);
    if (!isValid) {
      throw new Error("Incorrect current password");
    }

    const newHash = await hashPassword(newPassword);

    await sql`
      UPDATE users
      SET password_hash = ${newHash}, updated_at = now()
      WHERE id = ${user.id}
    `;

    return { success: true };
  });

export const checkUsernameAvailabilityFn = createServerFn({ method: "GET" })
  .validator((data: { username?: string }) => data)
  .handler(async ({ data }) => {
    const user = await getUserFromSession();
    const clean = (data.username || "").trim().toLowerCase();

    if (!clean) {
      return { available: false, error: "Username cannot be empty" };
    }

    if (clean.length < 3 || clean.length > 15) {
      return { available: false, error: "Username must be between 3 and 15 characters" };
    }

    if (!/^[a-z0-9_-]+$/.test(clean)) {
      return {
        available: false,
        error: "Only lowercase letters, numbers, hyphens (-), and underscores (_) allowed",
      };
    }

    const currentUserId = user?.id || "";
    const currentArtistId = user?.artistId || "";

    const [existingUser] = await sql<{ id: string }[]>`
      SELECT id FROM users WHERE lower(username) = ${clean} AND id != ${currentUserId} LIMIT 1
    `;
    const [existingArtist] = await sql<{ id: string }[]>`
      SELECT id FROM artists WHERE lower(username) = ${clean} AND id != ${currentArtistId} LIMIT 1
    `;

    if (existingUser || existingArtist) {
      return { available: false, error: "This username is already taken" };
    }

    return { available: true };
  });

export const deleteUserAccountFn = createServerFn({ method: "POST" }).handler(async () => {
  const user = await getUserFromSession();
  if (!user) {
    throw new Error("You must be logged in to delete your account");
  }

  await sql.begin(async (tx) => {
    // If user is an artist, delete artist profile (cascades releases, tracks, etc.)
    if (user.artistId) {
      await tx`DELETE FROM artists WHERE id = ${user.artistId}`;
    }
    // Delete user (cascades playlists, likes, follows, sessions, files)
    await tx`DELETE FROM users WHERE id = ${user.id}`;
  });

  await clearSession();
  return { success: true };
});
