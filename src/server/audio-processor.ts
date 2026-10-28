import fs from "node:fs";
import path from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import sql from "@/lib/db";
import { getStorageProvider } from "@/lib/storage";
import type { AudioVariantInfo, TechnicalValidation } from "@/data/types";
import { inspectAudioHeader } from "@/lib/audio-validation";

const execAsync = promisify(exec);

export interface ProcessAudioResult {
  success: boolean;
  error?: string;
  variants: Record<string, AudioVariantInfo>;
  technicalValidation: TechnicalValidation;
}

/**
 * Validates and transcodes a master audio file (WAV or FLAC) into streaming and download variants:
 * Streaming:
 *  - stream_64k: Opus 64 kbps
 *  - stream_96k: Opus 96 kbps
 *  - stream_160k: Opus 160 kbps
 *  - stream_256k: AAC 256 kbps
 * Downloads:
 *  - download_96k: AAC 96 kbps
 *  - download_160k: AAC 160 kbps
 *  - download_256k: AAC 256 kbps
 */
export async function processMasterAudio(
  masterStorageKey: string,
  trackId: string
): Promise<ProcessAudioResult> {
  const baseDir = path.resolve(
    process.cwd(),
    process.env["STORAGE_DIR"] || ".storage/uploads"
  );

  const cleanMasterKey = path.normalize(masterStorageKey).replace(/^(\.\.(\/|\\|$))+/, "");
  const masterFilePath = path.join(baseDir, cleanMasterKey);

  if (!fs.existsSync(masterFilePath)) {
    throw new Error(`Master audio file not found at ${masterFilePath}`);
  }

  // 1. Read first 8KB to inspect binary header
  const headerBuffer = Buffer.alloc(8192);
  const fd = await fs.promises.open(masterFilePath, "r");
  const { bytesRead } = await fd.read(headerBuffer, 0, 8192, 0);
  await fd.close();

  const validation = inspectAudioHeader(headerBuffer.subarray(0, bytesRead));

  if (!validation.valid) {
    return {
      success: false,
      error: validation.error || "Master audio failed technical requirements",
      variants: {},
      technicalValidation: validation.properties,
    };
  }

  // 2. Prepare output directory for variants
  const variantsRelDir = `variants/${trackId}`;
  const variantsAbsDir = path.join(baseDir, variantsRelDir);
  if (!fs.existsSync(variantsAbsDir)) {
    await fs.promises.mkdir(variantsAbsDir, { recursive: true });
  }

  const storage = getStorageProvider();
  const variants: Record<string, AudioVariantInfo> = {};

  try {
    // 3. Generate Streaming variants
    // 64k Opus
    const s64Key = `${variantsRelDir}/stream_64k.opus`;
    const s64Path = path.join(baseDir, s64Key);
    await execAsync(`ffmpeg -y -i "${masterFilePath}" -c:a libopus -b:a 64k -vbr on "${s64Path}"`);
    const s64Stat = await fs.promises.stat(s64Path);
    variants["stream_64k"] = {
      storageKey: s64Key,
      url: storage.getUrl(s64Key),
      format: "opus",
      bitrateKbps: 64,
      sizeBytes: s64Stat.size,
      type: "stream",
    };

    // 96k Opus
    const s96Key = `${variantsRelDir}/stream_96k.opus`;
    const s96Path = path.join(baseDir, s96Key);
    await execAsync(`ffmpeg -y -i "${masterFilePath}" -c:a libopus -b:a 96k -vbr on "${s96Path}"`);
    const s96Stat = await fs.promises.stat(s96Path);
    variants["stream_96k"] = {
      storageKey: s96Key,
      url: storage.getUrl(s96Key),
      format: "opus",
      bitrateKbps: 96,
      sizeBytes: s96Stat.size,
      type: "stream",
    };

    // 160k Opus
    const s160Key = `${variantsRelDir}/stream_160k.opus`;
    const s160Path = path.join(baseDir, s160Key);
    await execAsync(`ffmpeg -y -i "${masterFilePath}" -c:a libopus -b:a 160k -vbr on "${s160Path}"`);
    const s160Stat = await fs.promises.stat(s160Path);
    variants["stream_160k"] = {
      storageKey: s160Key,
      url: storage.getUrl(s160Key),
      format: "opus",
      bitrateKbps: 160,
      sizeBytes: s160Stat.size,
      type: "stream",
    };

    // 256k AAC (used for both very-high streaming and very-high downloads)
    const aac256Key = `${variantsRelDir}/aac_256k.m4a`;
    const aac256Path = path.join(baseDir, aac256Key);
    await execAsync(`ffmpeg -y -i "${masterFilePath}" -c:a aac -b:a 256k "${aac256Path}"`);
    const aac256Stat = await fs.promises.stat(aac256Path);
    variants["stream_256k"] = {
      storageKey: aac256Key,
      url: storage.getUrl(aac256Key),
      format: "aac",
      bitrateKbps: 256,
      sizeBytes: aac256Stat.size,
      type: "stream",
    };
    variants["download_256k"] = {
      storageKey: aac256Key,
      url: storage.getUrl(aac256Key),
      format: "aac",
      bitrateKbps: 256,
      sizeBytes: aac256Stat.size,
      type: "download",
    };

    // 4. Generate Download variants (96k & 160k AAC)
    // 96k AAC
    const d96Key = `${variantsRelDir}/download_96k.m4a`;
    const d96Path = path.join(baseDir, d96Key);
    await execAsync(`ffmpeg -y -i "${masterFilePath}" -c:a aac -b:a 96k "${d96Path}"`);
    const d96Stat = await fs.promises.stat(d96Path);
    variants["download_96k"] = {
      storageKey: d96Key,
      url: storage.getUrl(d96Key),
      format: "aac",
      bitrateKbps: 96,
      sizeBytes: d96Stat.size,
      type: "download",
    };

    // 160k AAC
    const d160Key = `${variantsRelDir}/download_160k.m4a`;
    const d160Path = path.join(baseDir, d160Key);
    await execAsync(`ffmpeg -y -i "${masterFilePath}" -c:a aac -b:a 160k "${d160Path}"`);
    const d160Stat = await fs.promises.stat(d160Path);
    variants["download_160k"] = {
      storageKey: d160Key,
      url: storage.getUrl(d160Key),
      format: "aac",
      bitrateKbps: 160,
      sizeBytes: d160Stat.size,
      type: "download",
    };

    // Update database records
    await sql`
      UPDATE tracks
      SET
        audio_processing_status = 'completed',
        technical_validation = ${JSON.stringify(validation.properties)},
        audio_variants = ${JSON.stringify(variants)},
        updated_at = now()
      WHERE id = ${trackId}
    `;

    return {
      success: true,
      variants,
      technicalValidation: validation.properties,
    };
  } catch (err: any) {
    console.error(`Audio processing error for track ${trackId}:`, err);
    await sql`
      UPDATE tracks
      SET
        audio_processing_status = 'failed',
        technical_validation = ${JSON.stringify(validation.properties)},
        updated_at = now()
      WHERE id = ${trackId}
    `;
    return {
      success: false,
      error: err.message || "Audio transcoding failed",
      variants: {},
      technicalValidation: validation.properties,
    };
  }
}
