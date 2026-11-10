import type { TransactionSql } from "postgres";
import { z } from "zod";
import type { ArtistVerificationApplication } from "../data/types";

const optionalText = (max: number) => z.string().trim().max(max).optional().default("");
export const verificationInput = z
  .object({
    legalName: z.string().trim().min(2).max(200),
    contactEmail: z.string().trim().email().max(254),
    contactPhone: optionalText(50),
    country: optionalText(100),
    city: optionalText(100),
    primaryGenre: optionalText(100),
    note: optionalText(3000),
    supportingLinks: z
      .array(
        z
          .string()
          .trim()
          .max(2000)
          .url()
          .refine((value) => {
            try {
              const url = new URL(value);
              return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password;
            } catch {
              return false;
            }
          }, "Use a complete http:// or https:// profile URL without credentials."),
      )
      .min(1)
      .max(10),
    accuracyConfirmed: z.literal(true),
  })
  .strict();
export async function submitVerificationApplication(
  tx: TransactionSql,
  user: { id: string; accountType: string; artistId?: string | null | undefined } | null,
  input: unknown,
) {
  const data = verificationInput.parse(input);
  if (!user || user.accountType !== "artist" || !user.artistId) {
    throw new Error("Unauthorized: Artist account required");
  }

  await tx`SELECT pg_advisory_xact_lock(734821,1)`;
  if (!data.accuracyConfirmed) {
    throw new Error("You must confirm that all submitted information is accurate and truthful.");
  }

  const [artist] = await tx<{ id: string; displayName: string; verified: boolean }[]>`
      SELECT id, display_name as "displayName", verified FROM artists WHERE id = ${user.artistId} LIMIT 1
    `;
  if (!artist) {
    throw new Error("Artist profile not found");
  }

  if (artist.verified) {
    throw new Error("Your artist profile is already verified.");
  }

  const legalName = (data.legalName || "").trim();
  if (legalName.length < 2) {
    throw new Error("Legal name or registered identity is required (minimum 2 characters).");
  }

  const contactEmail = (data.contactEmail || "").trim();
  if (!contactEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    throw new Error("A valid contact email address is required.");
  }

  const rawLinks = data.supportingLinks;
  const cleanLinks = rawLinks
    .map((l) => (typeof l === "string" ? l.trim() : ""))
    .filter((l) => l.length > 0);

  if (cleanLinks.length === 0) {
    throw new Error(
      "At least one supporting profile link is required (e.g., Spotify, Apple Music, YouTube, Instagram).",
    );
  }

  // Check for existing application
  const [existing] = await tx<{ id: string; status: string }[]>`
      SELECT id, status FROM artist_verification_applications
      WHERE artist_id = ${user.artistId}
      ORDER BY created_at DESC
      LIMIT 1
    `;

  if (existing && !["rejected", "more_info_required"].includes(existing.status)) {
    throw new Error(
      "A verification application is already pending review. Please wait for an administrator to complete the review.",
    );
  }

  const appId = existing ? existing.id : crypto.randomUUID();

  if (existing) {
    await tx`
        UPDATE artist_verification_applications
        SET
          stage_name = ${artist.displayName},
          legal_name = ${legalName},
          contact_email = ${contactEmail},
          contact_phone = ${data.contactPhone?.trim() || ""},
          country = ${data.country?.trim() || ""},
          city = ${data.city?.trim() || ""},
          primary_genre = ${data.primaryGenre?.trim() || ""},
          supporting_links = ${JSON.stringify(cleanLinks)}::jsonb,
          note = ${data.note?.trim() || ""},
          status = 'pending',
          admin_feedback = NULL,
          reviewed_at = NULL,
          reviewer_id = NULL,
          updated_at = now()
        WHERE id = ${existing.id}
      `;
  } else {
    await tx`
        INSERT INTO artist_verification_applications (
          id, artist_id, user_id, stage_name, legal_name, contact_email,
          contact_phone, country, city, primary_genre, supporting_links, note, status
        ) VALUES (
          ${appId}, ${user.artistId}, ${user.id}, ${artist.displayName}, ${legalName}, ${contactEmail},
          ${data.contactPhone?.trim() || ""}, ${data.country?.trim() || ""}, ${data.city?.trim() || ""},
          ${data.primaryGenre?.trim() || ""}, ${JSON.stringify(cleanLinks)}::jsonb, ${data.note?.trim() || ""}, 'pending'
        )
      `;
  }

  const [saved] = await tx<any[]>`
      SELECT id, artist_id as "artistId", user_id as "userId", stage_name as "stageName",
             legal_name as "legalName", contact_email as "contactEmail", contact_phone as "contactPhone",
             country, city, primary_genre as "primaryGenre", supporting_links as "supportingLinks",
             note, status, admin_feedback as "adminFeedback", reviewed_at as "reviewedAt",
             reviewer_id as "reviewerId", created_at as "createdAt", updated_at as "updatedAt"
      FROM artist_verification_applications
      WHERE id = ${appId}
      LIMIT 1
    `;

  const application: ArtistVerificationApplication = {
    id: saved.id,
    artistId: saved.artistId,
    userId: saved.userId,
    stageName: saved.stageName,
    legalName: saved.legalName,
    contactEmail: saved.contactEmail,
    contactPhone: saved.contactPhone || undefined,
    country: saved.country || undefined,
    city: saved.city || undefined,
    primaryGenre: saved.primaryGenre || undefined,
    supportingLinks: Array.isArray(saved.supportingLinks) ? saved.supportingLinks : [],
    note: saved.note || undefined,
    status: saved.status,
    adminFeedback: saved.adminFeedback || null,
    reviewedAt: saved.reviewedAt
      ? saved.reviewedAt instanceof Date
        ? saved.reviewedAt.toISOString()
        : String(saved.reviewedAt)
      : null,
    reviewerId: saved.reviewerId || null,
    createdAt:
      saved.createdAt instanceof Date ? saved.createdAt.toISOString() : String(saved.createdAt),
    updatedAt:
      saved.updatedAt instanceof Date ? saved.updatedAt.toISOString() : String(saved.updatedAt),
  };

  return { success: true, application };
}

export async function reviewVerificationApplication(
  tx: TransactionSql,
  targetId: string,
  actorId: string,
  decision: "approved" | "rejected" | "more_info_required" | undefined,
  artistFeedback: string | undefined,
  reason: string,
) {
  await tx`SELECT pg_advisory_xact_lock(734821,1)`;
  const [app] =
    await tx`SELECT id,artist_id,status,legal_name,stage_name FROM artist_verification_applications WHERE id=${targetId} FOR UPDATE`;
  if (!app) throw new Error("Verification application not found.");
  if (app["status"] !== "pending")
    throw new Error("This application has already been reviewed. Refresh the queue.");
  if (!decision) throw new Error("Select an action for this application.");
  const vStatus = decision;
  if ((vStatus === "rejected" || vStatus === "more_info_required") && !artistFeedback?.trim()) {
    throw new Error("Provide feedback or reason for this decision.");
  }
  const feedback = artistFeedback?.trim() || reason?.trim() || null;
  const before = { ...app };
  await tx`UPDATE artist_verification_applications SET status=${vStatus},admin_feedback=${feedback},reviewed_at=now(),reviewer_id=${actorId},updated_at=now() WHERE id=${targetId}`;
  if (vStatus === "approved") {
    await tx`UPDATE artists SET verified=true,updated_at=now() WHERE id=${app["artistId"]}`;
  } else if (vStatus === "rejected") {
    await tx`UPDATE artists SET verified=false,updated_at=now() WHERE id=${app["artistId"]}`;
  }
  const after = { status: vStatus, adminFeedback: feedback, reviewedAt: new Date().toISOString() };
  return { before, after };
}
