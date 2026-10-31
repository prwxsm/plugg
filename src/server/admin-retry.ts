import sql from "../lib/db.ts";
import { requirePermission, type AdminPrincipal } from "./admin-rbac.ts";
import type { ProcessAudioResult } from "./audio-processor";
import { z } from "zod";
export async function retryAudio(
  sessionId: string | undefined,
  trackId: string,
  allowOwner = false,
  connection: typeof sql = sql,
  processor?: (key: string, id: string) => Promise<ProcessAudioResult>,
) {
  z.string().min(1).max(100).parse(trackId);
  const claim = await connection.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(734821,1)`;
    let actor: AdminPrincipal | null = null;
    try {
      actor = await requirePermission(tx, sessionId, "processing.retry");
    } catch (error) {
      if (!allowOwner) throw error;
    }
    const [track] =
      await tx`SELECT id,artist_id,audio_url,audio_processing_status,release_id FROM tracks WHERE id=${trackId} FOR UPDATE`;
    if (!track) throw new Error("Track not found.");
    if (!actor) {
      if (!sessionId) throw new Error("Authentication required.");
      const [owner] =
        await tx`SELECT u.id FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=${sessionId} AND s.expires_at>now() AND u.artist_id=${track["artistId"]}`;
      if (!owner) throw new Error("You do not own this track.");
    }
    if (track["audioProcessingStatus"] !== "failed")
      throw new Error("Only failed processing can be retried; a job may already be running.");
    if (typeof track["audioUrl"] !== "string" || !/^\/api\/(stream|file)\//.test(track["audioUrl"]))
      throw new Error("A local master audio file is required.");
    const key = decodeURIComponent(track["audioUrl"].replace(/^\/api\/(stream|file)\//, ""));
    if (!/^[a-zA-Z0-9_./-]+$/.test(key) || key.split("/").includes(".."))
      throw new Error("Invalid master storage path.");
    await tx`UPDATE tracks SET audio_processing_status='processing',updated_at=now() WHERE id=${trackId}`;
    if (actor)
      await tx`INSERT INTO admin_audit_log(actor_user_id,actor_role,action,target_type,target_id,before_state,after_state,result) VALUES(${actor.id},${actor.role},'processing.retry','track',${trackId},'{"status":"failed"}','{"status":"processing"}','success')`;
    return { actor, key, releaseId: track["releaseId"] as string };
  });
  let result: ProcessAudioResult;
  try {
    const run =
      processor ||
      ((key: string, id: string) =>
        import("./audio-processor").then((m) => m.processMasterAudio(key, id, false)));
    result = await run(claim.key, trackId);
  } catch {
    result = {
      success: false,
      error: "Audio processing failed. Check the server logs and master file.",
      variants: {},
      technicalValidation: {},
    } as ProcessAudioResult;
  }
  await connection.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(734821,1)`;
    await tx`UPDATE tracks SET audio_processing_status=${result.success ? "completed" : "failed"},audio_variants=${tx.json(result.variants as never)},technical_validation=${tx.json(result.technicalValidation as never)},updated_at=now() WHERE id=${trackId}`;
    const [remaining] =
      await tx`SELECT count(*) FILTER(WHERE audio_processing_status<>'completed')::int AS n FROM tracks WHERE release_id=${claim.releaseId}`;
    await tx`UPDATE releases SET audio_processing_status=${remaining?.["n"] ? "failed" : "completed"},status=CASE WHEN status='processing' AND ${!remaining?.["n"]} THEN 'under_review'::release_status ELSE status END,updated_at=now() WHERE id=${claim.releaseId}`;
    if (claim.actor)
      await tx`INSERT INTO admin_audit_log(actor_user_id,actor_role,action,target_type,target_id,after_state,result) VALUES(${claim.actor.id},${claim.actor.role},'processing.result','track',${trackId},${tx.json({ status: result.success ? "completed" : "failed", variants: Object.keys(result.variants).length })},${result.success ? "success" : "failed"})`;
  });
  return {
    success: result.success,
    error: result.success
      ? undefined
      : "Processing failed. Inspect the master audio and retry after correcting it.",
  };
}
