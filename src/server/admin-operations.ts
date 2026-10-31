import sql from "../lib/db.ts";
import { requirePermission, type AdminPermission } from "./admin-rbac.ts";
import { futureMidnight } from "./admin-review.ts";
import { safeMediaUrl } from "../components/admin/model.ts";
import bcrypt from "bcrypt";
import { z } from "zod";
export const operationInput = z
  .object({
    action: z.enum([
      "reschedule",
      "takedown",
      "reinstate",
      "verify_artist",
      "edit_artist",
      "create_genre",
      "edit_genre",
      "delete_genre",
      "staff_role",
      "create_staff",
      "edit_staff",
    ]),
    targetId: z.string().min(1).max(100),
    reason: z.string().trim().min(1).max(2000),
    date: z.string().max(10).optional(),
    name: z.string().trim().min(1).max(120).optional(),
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(100)
      .optional(),
    image: z.string().max(2000).optional(),
    bio: z.string().max(3000).optional(),
    location: z.string().max(200).optional(),
    verified: z.boolean().optional(),
    role: z.enum(["admin", "moderator", "none"]).optional(),
    password: z.string().max(200).optional(),
    username: z
      .string()
      .trim()
      .regex(/^[a-z0-9_-]{3,30}$/)
      .optional(),
    email: z
      .string()
      .trim()
      .email()
      .max(254)
      .transform((v) => v.toLowerCase())
      .optional(),
    initialPassword: z.string().min(12).max(72).optional(),
    confirmed: z.literal(true),
  })
  .strict();
const permissions: Record<z.infer<typeof operationInput>["action"], AdminPermission> = {
  reschedule: "schedule.write",
  takedown: "content.takedown",
  reinstate: "content.takedown",
  verify_artist: "artists.write",
  edit_artist: "artists.write",
  create_genre: "genres.write",
  edit_genre: "genres.write",
  delete_genre: "genres.write",
  staff_role: "staff.manage",
  create_staff: "staff.manage",
  edit_staff: "staff.manage",
};
export async function administer(
  sessionId: string | undefined,
  input: unknown,
  connection: typeof sql = sql,
) {
  const data = operationInput.parse(input);
  return connection.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(734821,1)`;
    const actor = await requirePermission(tx, sessionId, permissions[data.action]);
    if (["staff_role", "create_staff", "edit_staff"].includes(data.action)) {
      const [credentials] = await tx`SELECT password_hash FROM users WHERE id=${actor.id}`;
      if (
        !data.password ||
        !credentials?.["passwordHash"] ||
        !(await bcrypt.compare(data.password, credentials["passwordHash"]))
      )
        throw new Error("Confirm your current password to change staff access.");
    }
    let before: Record<string, unknown> = {},
      after: Record<string, unknown> = {},
      targetType = "release";
    let targetId = data.targetId;
    if (data.action === "create_staff" || data.action === "edit_staff") {
      targetType = "user";
      if (!data.name || !data.username || !data.email)
        throw new Error("Name, username and email are required.");
      await tx`LOCK TABLE users,artists IN SHARE ROW EXCLUSIVE MODE`;
      if (data.action === "edit_staff") {
        const [member] =
          await tx`SELECT role FROM admin_memberships WHERE user_id=${targetId} FOR UPDATE`;
        if (!member || !["admin", "moderator"].includes(member["role"]))
          throw new Error("Only Admin and Moderator accounts can be edited here.");
        const [user] =
          await tx`SELECT name,username,email FROM users WHERE id=${targetId} FOR UPDATE`;
        if (!user) throw new Error("Staff account not found.");
        before = { ...user };
      }
      const [duplicate] =
        await tx`SELECT EXISTS(SELECT 1 FROM users WHERE (lower(email)=${data.email} OR lower(username)=${data.username}) AND id<>${data.action === "create_staff" ? "" : targetId}) OR EXISTS(SELECT 1 FROM artists a WHERE lower(a.username)=${data.username} AND NOT EXISTS(SELECT 1 FROM users u WHERE u.id=${data.action === "create_staff" ? "" : targetId} AND u.artist_id=a.id)) AS taken`;
      if (duplicate?.["taken"]) throw new Error("That email or username is already in use.");
      if (data.action === "create_staff") {
        if (!data.initialPassword || new TextEncoder().encode(data.initialPassword).length > 72)
          throw new Error(
            "Set an initial password of at least 12 characters and at most 72 bytes.",
          );
        if (!data.role || data.role === "none") throw new Error("Choose Admin or Moderator.");
        targetId = crypto.randomUUID();
        const hash = await bcrypt.hash(data.initialPassword, 12);
        await tx`INSERT INTO users(id,name,username,email,password_hash,account_type,is_admin,is_mock) VALUES(${targetId},${data.name},${data.username},${data.email},${hash},'listener',false,false)`;
        await tx`INSERT INTO admin_memberships(user_id,role) VALUES(${targetId},${data.role})`;
        after = {
          name: data.name,
          username: data.username,
          email: data.email,
          role: data.role,
          active: true,
        };
      } else {
        await tx`UPDATE users SET name=${data.name},username=${data.username},email=${data.email},updated_at=now() WHERE id=${targetId}`;
        after = { name: data.name, username: data.username, email: data.email };
      }
    } else if (["reschedule", "takedown", "reinstate"].includes(data.action)) {
      const [r] =
        await tx`SELECT id,status,release_date::text,go_live_at,audio_processing_status FROM releases WHERE id=${targetId} FOR UPDATE`;
      if (!r) throw new Error("Release not found.");
      before = { status: r["status"], date: r["releaseDate"], goLiveAt: r["goLiveAt"] };
      const [last] =
        await tx`SELECT action FROM admin_audit_log WHERE target_type='release' AND target_id=${targetId} AND action IN ('release.takedown','release.reinstate') ORDER BY id DESC LIMIT 1`;
      if (data.action === "takedown") {
        if (last?.["action"] === "release.takedown")
          throw new Error("This release is already taken down.");
        if (
          !["published", "scheduled", "under_review", "changes_required", "draft"].includes(
            r["status"],
          )
        )
          throw new Error("Wait for active processing to finish.");
        await tx`UPDATE releases SET status='draft',go_live_at=NULL,updated_at=now() WHERE id=${targetId}`;
        await tx`UPDATE tracks SET published=false,updated_at=now() WHERE release_id=${targetId}`;
        after = { status: "draft", hidden: true };
      } else if (data.action === "reinstate") {
        if (last?.["action"] !== "release.takedown")
          throw new Error("Only a taken-down release can be reinstated.");
        await tx`UPDATE releases SET status='under_review',go_live_at=NULL,review_submitted_at=now(),updated_at=now() WHERE id=${targetId}`;
        await tx`UPDATE tracks SET published=false,updated_at=now() WHERE release_id=${targetId}`;
        after = { status: "under_review", published: false };
      } else {
        if (r["status"] !== "scheduled" || last?.["action"] === "release.takedown")
          throw new Error("Only approved scheduled releases can be rescheduled.");
        const [bad] =
          await tx`SELECT count(*)::int AS n FROM tracks WHERE release_id=${targetId} AND audio_processing_status<>'completed'`;
        if (r["audioProcessingStatus"] !== "completed" || bad?.["n"])
          throw new Error("Audio processing is incomplete.");
        const [clock] = await tx<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
        const at = futureMidnight(data.date || "", clock!.now);
        await tx`UPDATE releases SET release_date=${data.date!},go_live_at=${at},updated_at=now() WHERE id=${targetId}`;
        await tx`UPDATE tracks SET release_date=${data.date!},published=false,updated_at=now() WHERE release_id=${targetId}`;
        after = { status: "scheduled", date: data.date, goLiveAt: at.toISOString() };
      }
    } else if (data.action === "staff_role") {
      targetType = "user";
      if (targetId === actor.id) throw new Error("You cannot change your own staff access.");
      if (!data.role) throw new Error("Select a role.");
      const [target] =
        await tx`SELECT id,password_hash IS NOT NULL AS has_password,is_mock FROM users WHERE id=${targetId} FOR UPDATE`;
      if (!target || target["isMock"] || !target["hasPassword"])
        throw new Error("Select an existing non-seed account with a password.");
      const [member] =
        await tx`SELECT role,active FROM admin_memberships WHERE user_id=${targetId} FOR UPDATE`;
      if (member?.["role"] === "super_admin")
        throw new Error("Super Admin accounts cannot be changed through lower-staff management.");
      before = { role: member?.["role"] || null, active: member?.["active"] || false };
      if (data.role === "none") {
        if (!member?.["active"]) throw new Error("This user has no active staff membership.");
        await tx`UPDATE admin_memberships SET active=false,updated_at=now() WHERE user_id=${targetId}`;
        after = { role: member["role"], active: false };
      } else {
        await tx`INSERT INTO admin_memberships(user_id,role) VALUES(${targetId},${data.role}) ON CONFLICT(user_id) DO UPDATE SET role=EXCLUDED.role,active=true,updated_at=now()`;
        after = { role: data.role, active: true };
      }
    } else if (data.action === "verify_artist" || data.action === "edit_artist") {
      targetType = "artist";
      const [artist] =
        await tx`SELECT display_name,bio,location,verified FROM artists WHERE id=${targetId} FOR UPDATE`;
      if (!artist) throw new Error("Artist not found.");
      before = { ...artist };
      if (data.action === "verify_artist") {
        if (data.verified === undefined) throw new Error("Select verification status.");
        await tx`UPDATE artists SET verified=${data.verified},updated_at=now() WHERE id=${targetId}`;
        after = { ...before, verified: data.verified };
      } else {
        await tx`UPDATE artists SET display_name=coalesce(${data.name ?? null},display_name),bio=coalesce(${data.bio ?? null},bio),location=coalesce(${data.location ?? null},location),updated_at=now() WHERE id=${targetId}`;
        after = {
          displayName: data.name ?? before["displayName"],
          bio: data.bio ?? before["bio"],
          location: data.location ?? before["location"],
          verified: before["verified"],
        };
      }
    } else {
      targetType = "genre";
      await tx`LOCK TABLE genres,tracks,artists IN SHARE ROW EXCLUSIVE MODE`;
      const [genre] =
        await tx`SELECT id,name,slug,image FROM genres WHERE id=${targetId} FOR UPDATE`;
      if (data.action !== "create_genre" && !genre) throw new Error("Genre not found.");
      before = genre ? { ...genre } : {};
      if (
        data.action === "delete_genre" ||
        (genre &&
          ((data.name && data.name !== genre["name"]) ||
            (data.slug && data.slug !== genre["slug"])))
      ) {
        const [used] =
          await tx`SELECT EXISTS(SELECT 1 FROM tracks WHERE lower(genre) IN (lower(${genre!["name"]}),lower(${genre!["slug"]}))) OR EXISTS(SELECT 1 FROM artists WHERE lower(primary_genre) IN (lower(${genre!["name"]}),lower(${genre!["slug"]})) OR additional_genres::text ILIKE ${"%" + genre!["name"] + "%"} OR additional_genres::text ILIKE ${"%" + genre!["slug"] + "%"}) AS used`;
        if (used?.["used"])
          throw new Error(
            "This genre is referenced by artists or tracks. Its name/slug cannot be changed or deleted.",
          );
      }
      if (data.action === "delete_genre") {
        await tx`DELETE FROM genres WHERE id=${targetId}`;
        after = { deleted: true };
      } else {
        const name = data.name || genre?.["name"],
          slug = data.slug || genre?.["slug"],
          image = data.image ?? genre?.["image"] ?? "";
        if (!name || !slug) throw new Error("Name and slug are required.");
        if (image && !safeMediaUrl(image)) throw new Error("Use a valid artwork URL.");
        const [duplicate] =
          await tx`SELECT id FROM genres WHERE (lower(name)=lower(${name}) OR lower(slug)=lower(${slug})) AND id<>${data.action === "create_genre" ? "" : targetId}`;
        if (duplicate) throw new Error("Genre name or slug already exists.");
        if (data.action === "create_genre") {
          targetId = crypto.randomUUID();
          await tx`INSERT INTO genres(id,name,slug,image,is_mock) VALUES(${targetId},${name},${slug},${image},false)`;
        } else
          await tx`UPDATE genres SET name=${name},slug=${slug},image=${image} WHERE id=${targetId}`;
        after = { name, slug, image };
      }
    }
    const action = (targetType === "user" ? "staff" : targetType) + "." + data.action;
    await tx`INSERT INTO admin_audit_log(actor_user_id,actor_role,action,target_type,target_id,reason,before_state,after_state,result) VALUES(${actor.id},${actor.role},${action},${targetType},${targetId},${data.reason},${tx.json(before as never)},${tx.json(after as never)},'success')`;
    return { success: true, targetId };
  });
}
