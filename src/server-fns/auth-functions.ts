import { createServerFn } from "@tanstack/react-start";
import sql from "@/lib/db";
import { hashPassword, verifyPassword, createSession, clearSession, getUserFromSession } from "@/lib/auth";

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
  .validator((data: { email?: string; password?: string }) => data)
  .handler(async ({ data }) => {
    const { email, password } = data;
    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    const normalizedEmail = email.trim().toLowerCase();

    const [user] = await sql<
      { id: string; name: string; email: string; passwordHash: string | null; accountType: "listener" | "artist"; artistId: string | null }[]
    >`
      SELECT id, name, email, password_hash, account_type, artist_id
      FROM users
      WHERE lower(email) = ${normalizedEmail}
      LIMIT 1
    `;

    if (!user || !user.passwordHash) {
      throw new Error("Invalid email or password");
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      throw new Error("Invalid email or password");
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
    const cleanUsername = username ? username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "") : null;
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
      const existing = await sql<{ id: string }[]>`
        SELECT id FROM users WHERE lower(username) = ${cleanUsername} AND id != ${user.id}
      `;
      if (existing.length > 0) {
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

export const deleteUserAccountFn = createServerFn({ method: "POST" })
  .handler(async () => {
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

