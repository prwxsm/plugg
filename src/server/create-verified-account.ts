import type { TransactionSql } from "postgres";
import type { Registration } from "./registration-input.ts";
export async function createVerifiedAccount(
  tx: TransactionSql,
  data: Omit<Registration, "password" | "confirmPassword">,
  hashedPassword: string,
) {
  const { name, email: normalizedEmail, accountType } = data;
  const userId = crypto.randomUUID();

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

    {
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
          INSERT INTO users (id, name, email, password_hash, account_type, artist_id, is_mock, email_verified_at)
          VALUES (${userId}, ${name.trim()}, ${normalizedEmail}, ${hashedPassword}, 'artist', ${artistId}, false, now())
        `;

      await tx`
          INSERT INTO artist_analytics (artist_id, total_plays, monthly_listeners, fans, growth_percent)
          VALUES (${artistId}, 0, 0, 0, 0)
          ON CONFLICT (artist_id) DO NOTHING
        `;
    }
  } else {
    // Standard listener registration
    await tx`
        INSERT INTO users (id, name, email, password_hash, account_type, artist_id, is_mock, email_verified_at)
        VALUES (${userId}, ${name.trim()}, ${normalizedEmail}, ${hashedPassword}, 'listener', null, false, now())
      `;
  }

  return {
    success: true,
    userId,
    name,
    email: normalizedEmail,
    role: accountType,
    artistId,
    artistUsername,
  };
}
