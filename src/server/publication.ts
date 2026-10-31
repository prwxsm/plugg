import sql from "../lib/db.ts";
/** Controlled scheduled publication. Only the releases transitioned by this transaction publish tracks. */
export async function publishScheduled(connection: typeof sql = sql, releaseId?: string) {
  return connection.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(734821,1)`;
    const due =
      await tx`SELECT r.id FROM releases r WHERE (${releaseId ?? null}::text IS NULL OR r.id=${releaseId ?? null}) AND r.status='scheduled' AND r.go_live_at<=now()
   AND r.reviewer_id IS NOT NULL AND r.audio_processing_status='completed'
   AND NOT coalesce(r.rights_hold, false)
   AND EXISTS(SELECT 1 FROM tracks t WHERE t.release_id=r.id)
   AND NOT EXISTS(SELECT 1 FROM tracks t WHERE t.release_id=r.id AND t.audio_processing_status<>'completed')
   AND coalesce((SELECT a.action FROM admin_audit_log a WHERE a.target_type='release' AND a.target_id=r.id AND a.action IN ('release.takedown','release.reinstate') ORDER BY a.id DESC LIMIT 1),'')<>'release.takedown'
   FOR UPDATE OF r`;
    for (const r of due) {
      await tx`UPDATE releases SET status='published',updated_at=now() WHERE id=${r["id"]}`;
      await tx`UPDATE tracks SET published=true,updated_at=now() WHERE release_id=${r["id"]}`;
    }
    return { published: due.length };
  });
}
