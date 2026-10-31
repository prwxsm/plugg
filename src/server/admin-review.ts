import sql from "../lib/db.ts";
import { requirePermission } from "./admin-rbac.ts";
import { decodeJson, jsonObject } from "../components/admin/model.ts";
import { z } from "zod";
export const reviewInput = z
  .object({
    action: z.enum(["approve", "request_changes"]),
    releaseId: z.string().min(1).max(100),
    date: z.string().max(10).optional(),
    feedback: z.string().trim().max(5000).optional(),
  })
  .strict();
export function futureMidnight(date: string, now: Date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Use a valid YYYY-MM-DD release date.");
  const day = new Date(date + "T00:00:00Z");
  if (!Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== date)
    throw new Error("Invalid release date.");
  const at = new Date(day.getTime() - 3 * 3600000);
  if (at <= now)
    throw new Error("Choose a future release date. Publication is at midnight Africa/Kampala.");
  return at;
}
export async function reviewRelease(
  sessionId: string | undefined,
  input: unknown,
  connection: typeof sql = sql,
) {
  const data = reviewInput.parse(input);
  return connection.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(734821,1)`;
    const actor = await requirePermission(tx, sessionId, "review.write");
    const [release] =
      await tx`SELECT id,title,status,release_date::text,review_history,audio_processing_status,coalesce(rights_hold, false) AS rights_hold FROM releases WHERE id=${data.releaseId} FOR UPDATE`;
    if (!release) throw new Error("Release not found.");
    if (release["status"] !== "under_review")
      throw new Error("This release is no longer awaiting review. Refresh and try again.");
    if (data.action === "approve" && release["rightsHold"]) {
      throw new Error("Cannot approve release: An active rights hold exists. Resolve the rights conflict before scheduling.");
    }
    const [clock] = await tx<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
    const now = clock!.now;
    const raw = decodeJson(release["reviewHistory"]);
    const history = Array.isArray(raw) ? raw : [];
    let date = release["releaseDate"] as string;
    let at: Date | null = null;
    if (data.action === "approve") {
      const tracks =
        await tx`SELECT audio_processing_status,audio_variants FROM tracks WHERE release_id=${data.releaseId} FOR UPDATE`;
      if (
        release["audioProcessingStatus"] !== "completed" ||
        !tracks.length ||
        tracks.some(
          (t) =>
            t["audioProcessingStatus"] !== "completed" ||
            !Object.keys(jsonObject(t["audioVariants"])).length,
        )
      )
        throw new Error("Every track must have completed audio processing and stored variants.");
      date = data.date || date;
      at = futureMidnight(date, now!);
    } else if (!data.feedback?.trim()) throw new Error("Written feedback is required.");
    const status = data.action === "approve" ? "scheduled" : "changes_required";
    history.push({
      id: crypto.randomUUID(),
      action: data.action === "approve" ? "approved" : "changes_requested",
      timestamp: now!.toISOString(),
      actorId: actor.id,
      actorName: actor.name,
      feedback: data.feedback || null,
    });
    await tx`UPDATE releases SET status=${status},release_date=${date},go_live_at=${at},reviewed_at=now(),reviewer_id=${actor.id},review_feedback=${data.action === "approve" ? null : data.feedback!},review_history=${tx.json(history)},updated_at=now() WHERE id=${data.releaseId}`;
    await tx`UPDATE tracks SET published=false,release_date=${date},updated_at=now() WHERE release_id=${data.releaseId}`;
    await tx`INSERT INTO admin_audit_log(actor_user_id,actor_role,action,target_type,target_id,reason,before_state,after_state,result)
   VALUES(${actor.id},${actor.role},${"release." + data.action},'release',${data.releaseId},${data.feedback || null},${tx.json({ status: release["status"], releaseDate: release["releaseDate"] })},${tx.json({ status, releaseDate: date, goLiveAt: at?.toISOString() || null })},'success')`;
    return {
      success: true,
      releaseId: data.releaseId,
      status,
      releaseDate: date,
      goLiveAt: at?.toISOString() || "",
      feedback: data.feedback || "",
    };
  });
}
