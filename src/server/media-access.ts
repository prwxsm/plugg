import sql from "../lib/db.ts";
/** Audio stays public only while its release and track are published. */
export async function canReadAudio(request: Request, key: string, connection: typeof sql = sql) {
  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith("plugg_session="))
    ?.slice("plugg_session=".length);
  return connection.begin("read only", async (tx) => {
    const tracks =
      await tx`SELECT t.artist_id,t.published,r.status,coalesce(r.rights_hold, false) AS rights_hold FROM tracks t JOIN releases r ON r.id=t.release_id
   WHERE t.audio_url IN (${"/api/stream/" + encodeURIComponent(key)},${"/api/file/" + encodeURIComponent(key)},${"/api/stream/" + key},${"/api/file/" + key})
   OR starts_with(${key},'variants/'||t.id||'/')`;
    if (tracks.some((t) => t["published"] && t["status"] === "published" && !(t["rightsHold"] ?? t["rights_hold"]))) return true;
    if (!cookie) return false;
    const [user] =
      await tx`SELECT u.id,u.artist_id,m.role FROM sessions s JOIN users u ON u.id=s.user_id LEFT JOIN admin_memberships m ON m.user_id=u.id AND m.active WHERE s.id=${cookie} AND s.expires_at>now()`;
    if (!user) return false;
    if (tracks.length)
      return tracks.some(
        (t) =>
          t["artistId"] === user["artistId"] ||
          ["super_admin", "admin"].includes(user["role"]) ||
          (user["role"] === "moderator" &&
            ["under_review", "changes_required"].includes(t["status"])),
      );
    const [file] =
      await tx`SELECT id FROM files WHERE storage_key=${key} AND owner_id=${user["id"]}`;
    return !!file;
  });
}

/** Do not allow an alternate /api/file URL or misleading extension to bypass audio access checks. */
export async function isStoredAudio(key: string) {
  const [record] = await sql`SELECT
    EXISTS(SELECT 1 FROM files WHERE storage_key=${key} AND mime_type LIKE 'audio/%') OR
    EXISTS(SELECT 1 FROM tracks t WHERE t.audio_url IN (${"/api/stream/" + encodeURIComponent(key)},${"/api/file/" + encodeURIComponent(key)},${"/api/stream/" + key},${"/api/file/" + key}) OR starts_with(${key},'variants/'||t.id||'/')) AS audio`;
  return record?.["audio"] === true;
}

/** Only referenced public artwork is anonymous; documents and other uploads need an owner/staff session. */
export async function canReadStoredFile(request: Request, key: string, connection: typeof sql = sql) {
  const urls = ['/api/file/' + key, '/api/file/' + encodeURIComponent(key)];
  if (/\.(png|jpe?g|webp|gif)$/i.test(key)) {
    const [publicImage] = await connection`SELECT
      EXISTS(SELECT 1 FROM users WHERE avatar_url IN (${urls[0]!},${urls[1]!})) OR
      EXISTS(SELECT 1 FROM artists WHERE avatar_url IN (${urls[0]!},${urls[1]!}) OR cover_url IN (${urls[0]!},${urls[1]!})) OR
      EXISTS(SELECT 1 FROM releases WHERE cover_url IN (${urls[0]!},${urls[1]!}) AND status='published' AND NOT coalesce(rights_hold,false)) AS allowed`;
    if (publicImage?.['allowed']) return true;
  }
  const cookie = request.headers.get('cookie')?.split(';').map(v => v.trim()).find(v => v.startsWith('plugg_session='))?.slice('plugg_session='.length);
  if (!cookie) return false;
  const [allowed] = await connection`SELECT EXISTS(
    SELECT 1 FROM sessions s JOIN users u ON u.id=s.user_id
    LEFT JOIN admin_memberships m ON m.user_id=u.id AND m.active
    WHERE s.id=${cookie} AND s.expires_at>now() AND (
      m.role IN ('super_admin','admin') OR EXISTS(SELECT 1 FROM files f WHERE f.storage_key=${key} AND f.owner_id=u.id)
      OR (m.role='moderator' AND EXISTS(SELECT 1 FROM releases r WHERE r.cover_url IN (${urls[0]!},${urls[1]!}) AND r.status IN ('under_review','changes_required')))
    )) AS allowed`;
  return allowed?.['allowed'] === true;
}
