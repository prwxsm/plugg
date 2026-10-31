import fs from "node:fs";
import path from "node:path";
import sql from "@/lib/db";
import { getStorageProvider } from "@/lib/storage";

export async function handleUploadRequest(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const category = (formData.get("category") as string) || "audio";
    const ownerId = (formData.get("ownerId") as string) || null;
    const trackId = (formData.get("trackId") as string) || null;

    if (!file || typeof file === "string") {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let technicalValidation = null;
    if (category === "audio") {
      const { inspectAudioHeader } = await import("@/lib/audio-validation");
      const validation = inspectAudioHeader(buffer);
      if (!validation.valid) {
        return new Response(
          JSON.stringify({
            error: validation.error || "Audio file does not meet Plugg master requirements",
            validation: validation.properties,
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      technicalValidation = validation.properties;
    }

    // Sanitize filename
    const cleanFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniqueSuffix = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const storageKey = `${category}/${uniqueSuffix}-${cleanFilename}`;

    const storage = getStorageProvider();
    await storage.saveFile(storageKey, buffer, file.type);

    // Deep FFprobe validation on server-saved file
    if (category === "audio") {
      const baseDir = path.resolve(process.cwd(), process.env["STORAGE_DIR"] || ".storage/uploads");
      const savedFilePath = path.join(baseDir, storageKey);
      const { probeAndValidateAudio } = await import("@/server/audio-processor");
      const probeResult = await probeAndValidateAudio(savedFilePath);
      if (!probeResult.valid) {
        try {
          if (fs.existsSync(savedFilePath)) await fs.promises.unlink(savedFilePath);
        } catch {}
        return new Response(
          JSON.stringify({
            error: probeResult.error || "Audio file does not meet Plugg master requirements",
            validation: probeResult.properties,
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      technicalValidation = probeResult.properties;
    }

    const fileId = crypto.randomUUID();
    const resolvedOwnerId = ownerId || "system";

    // Insert into files table if ownerId is a valid user, or without FK constraint issue
    try {
      if (ownerId) {
        await sql`
          INSERT INTO files (
            id, owner_id, track_id, original_filename, storage_key, mime_type, size, category, storage_provider, upload_status
          )
          VALUES (
            ${fileId}, ${ownerId}, ${trackId}, ${file.name}, ${storageKey}, ${file.type || "application/octet-stream"},
            ${file.size}, ${category}, 'local', 'ready'
          )
        `;
      }
    } catch (dbErr) {
      console.warn("Could not insert file record into DB:", dbErr);
    }

    const publicUrl = storage.getUrl(storageKey);

    return new Response(
      JSON.stringify({
        success: true,
        fileId,
        storageKey,
        url: publicUrl,
        filename: file.name,
        size: file.size,
        mimeType: file.type,
        technicalValidation,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("Upload handler error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Failed to process upload" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
