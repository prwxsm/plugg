import { requireLocalAudioProcessing } from "./processing-mode";
import fs from "node:fs";
import path from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import sql from "@/lib/db";
import { getStorageProvider } from "@/lib/storage";
import type { AudioVariantInfo, TechnicalValidation } from "@/data/types";
import { inspectAudioHeader } from "@/lib/audio-validation";
import { computeFileSha256 } from "@/lib/rights-validation";

const execAsync = promisify(exec);

/**
 * Resolves the path to the ffmpeg or ffprobe executable.
 * Checks environment overrides, local user bins, standard system paths, and system PATH.
 */
function getBinaryPath(name: "ffmpeg" | "ffprobe"): string {
  const envVar = name === "ffmpeg" ? process.env["FFMPEG_PATH"] : process.env["FFPROBE_PATH"];
  if (envVar && fs.existsSync(envVar)) {
    return envVar;
  }
  const homeDir = process.env["HOME"] || "";
  const candidates = [
    path.join(homeDir, ".local/bin", name),
    `/home/prwxsm/.local/bin/${name}`,
    `/usr/local/bin/${name}`,
    `/usr/bin/${name}`,
    `/bin/${name}`,
  ];
  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return name;
}

function getExecutionEnv(): NodeJS.ProcessEnv {
  const homeDir = process.env["HOME"] || "";
  const localBin = path.join(homeDir, ".local/bin");
  const defaultPath = `${localBin}:/home/prwxsm/.local/bin:/usr/local/bin:/usr/bin:/bin`;
  return {
    ...process.env,
    PATH: process.env["PATH"] ? `${defaultPath}:${process.env["PATH"]}` : defaultPath,
  };
}

async function runExec(cmd: string): Promise<{ stdout: string; stderr: string }> {
  return execAsync(cmd, { env: getExecutionEnv() });
}

export interface ProcessAudioResult {
  success: boolean;
  error?: string;
  variants: Record<string, AudioVariantInfo>;
  technicalValidation: TechnicalValidation;
}

interface FfprobeOutput {
  streams?: {
    codec_name?: string;
    codec_type?: string;
    sample_rate?: string | number;
    channels?: number;
    bits_per_sample?: number;
    bits_per_raw_sample?: string | number;
    bit_rate?: string | number;
    duration?: string | number;
  }[];
  format?: {
    format_name?: string;
    duration?: string | number;
    size?: string | number;
    bit_rate?: string | number;
  };
}

/**
 * Inspects and validates audio technical specifications using FFprobe and binary header checks.
 */
export async function probeAndValidateAudio(filePath: string): Promise<{
  valid: boolean;
  error?: string | undefined;
  warning?: string | undefined;
  qualityWarning?: string | undefined;
  properties: TechnicalValidation;
}> {
  requireLocalAudioProcessing();
  // 1. First run fast binary header inspection
  let headerValidation: ReturnType<typeof inspectAudioHeader> | null = null;
  try {
    const headerBuffer = Buffer.alloc(65536);
    const fd = await fs.promises.open(filePath, "r");
    const { bytesRead } = await fd.read(headerBuffer, 0, 65536, 0);
    await fd.close();
    headerValidation = inspectAudioHeader(headerBuffer.subarray(0, bytesRead));
  } catch (err) {
    console.warn("Fast header inspection read error:", err);
  }

  // 2. Run FFprobe for deep stream inspection and validation
  let ffprobeData: FfprobeOutput | null = null;
  try {
    const ffprobeBin = getBinaryPath("ffprobe");
    const { stdout } = await runExec(
      `"${ffprobeBin}" -v error -print_format json -show_format -show_streams "${filePath}"`,
    );
    ffprobeData = JSON.parse(stdout) as FfprobeOutput;
  } catch (probeErr: any) {
    return {
      valid: false,
      error: `Audio file inspection failed: File may be corrupted or in an unsupported format. (${probeErr.message || probeErr})`,
      properties: { format: "unknown", valid: false },
    };
  }

  const audioStream = ffprobeData.streams?.find((s) => s.codec_type === "audio");
  if (!audioStream) {
    return {
      valid: false,
      error: "No audio stream found in the uploaded file.",
      properties: { format: "unknown", valid: false },
    };
  }

  const codec = (audioStream.codec_name || "").toLowerCase();
  const formatName = (ffprobeData.format?.format_name || "").toLowerCase();

  const isWav = formatName.includes("wav") || codec.startsWith("pcm_");
  const isFlac = formatName.includes("flac") || codec === "flac";
  const isMp3 = formatName.includes("mp3") || codec === "mp3";

  if (!isWav && !isFlac && !isMp3) {
    return {
      valid: false,
      error: `Accepted formats are WAV, FLAC, or MP3 only. Detected format: ${codec || formatName || "unknown"}.`,
      properties: { format: codec || formatName, valid: false },
    };
  }

  const sampleRate = parseInt(String(audioStream.sample_rate || 0), 10);
  const channels = audioStream.channels || 0;
  const isStereo = channels >= 2;

  const durationSeconds = Math.round(
    parseFloat(String(ffprobeData.format?.duration || audioStream.duration || 0)),
  );

  // Bit depth for lossless PCM / FLAC
  let bitDepth: number | undefined;
  if (isWav || isFlac) {
    const rawBits = parseInt(
      String(audioStream.bits_per_raw_sample || audioStream.bits_per_sample || 0),
      10,
    );
    bitDepth = rawBits > 0 ? rawBits : headerValidation?.properties.bitDepth || 16;
  }

  // Bitrate calculation
  const rawBitrateBps = parseInt(
    String(ffprobeData.format?.bit_rate || audioStream.bit_rate || 0),
    10,
  );
  let bitrateKbps: number | undefined;
  if (rawBitrateBps > 0) {
    bitrateKbps = Math.round(rawBitrateBps / 1000);
  } else if (headerValidation?.properties.bitrateKbps) {
    bitrateKbps = headerValidation.properties.bitrateKbps;
  }

  // Check 1: Sample Rate >= 44.1 kHz
  if (sampleRate < 44100) {
    return {
      valid: false,
      error: `Sample rate must be at least 44.1 kHz. Detected: ${(sampleRate / 1000).toFixed(1)} kHz. Please upload a high-quality master.`,
      properties: {
        format: isWav ? "WAV" : isFlac ? "FLAC" : "MP3",
        sampleRate,
        channels,
        durationSeconds,
        bitDepth,
        bitrateKbps,
        valid: false,
      },
    };
  }

  // Check 2: Stereo channels (>= 2)
  if (channels < 2) {
    return {
      valid: false,
      error: "Master tracks must be in Stereo (2 channels). Mono recordings are not accepted.",
      properties: {
        format: isWav ? "WAV" : isFlac ? "FLAC" : "MP3",
        sampleRate,
        channels,
        durationSeconds,
        bitDepth,
        bitrateKbps,
        valid: false,
      },
    };
  }

  // Check 3: WAV and FLAC minimum bit-depth (>= 16-bit)
  if (isWav || isFlac) {
    if (bitDepth !== undefined && bitDepth < 16) {
      return {
        valid: false,
        error: `Bit depth must be at least 16-bit. Detected: ${bitDepth}-bit. 8-bit audio is not accepted.`,
        properties: {
          format: isWav ? "WAV" : "FLAC",
          sampleRate,
          channels,
          bitDepth,
          durationSeconds,
          isStereo,
          isLossless: true,
          is24Bit: false,
          valid: false,
        },
      };
    }

    const is24Bit = (bitDepth || 0) >= 24;
    let warning: string | undefined;
    if (!is24Bit) {
      warning = "Master is 16-bit. Recommended: 24-bit original studio master for optimal sound dynamics.";
    }

    return {
      valid: true,
      warning,
      properties: {
        format: isWav ? "WAV" : "FLAC",
        sampleRate,
        channels,
        bitDepth,
        durationSeconds,
        isStereo,
        isLossless: true,
        is24Bit,
        valid: true,
      },
    };
  }

  // Check 4: MP3 Validation (No bit-depth check!)
  const effectiveBitrate = bitrateKbps || headerValidation?.properties.bitrateKbps || 0;

  if (effectiveBitrate < 192) {
    return {
      valid: false,
      error: `MP3 bitrate is below 192 kbps (${effectiveBitrate} kbps detected). Plugg requires at least 192 kbps for MP3 uploads. Please upload a higher quality audio file (256–320 kbps recommended, or lossless WAV/FLAC).`,
      properties: {
        format: "MP3",
        sampleRate,
        channels,
        durationSeconds,
        bitrateKbps: effectiveBitrate,
        isStereo,
        isLossless: false,
        is24Bit: false,
        valid: false,
      },
    };
  }

  // MP3 192–255 kbps: Accept with quality-review flag
  if (effectiveBitrate < 256) {
    const warning = `MP3 bitrate is ${effectiveBitrate} kbps. Accepted with quality-review flag. Recommended: 256–320 kbps or lossless WAV/FLAC for best sound dynamics.`;
    const qualityWarning = `MP3 ${effectiveBitrate} kbps (Quality review flag)`;
    return {
      valid: true,
      warning,
      qualityWarning,
      properties: {
        format: "MP3",
        sampleRate,
        channels,
        durationSeconds,
        bitrateKbps: effectiveBitrate,
        isStereo,
        isLossless: false,
        is24Bit: false,
        warning,
        qualityWarning,
        valid: true,
      },
    };
  }

  // MP3 256–320 kbps: Accepted (recommended)
  return {
    valid: true,
    properties: {
      format: "MP3",
      sampleRate,
      channels,
      durationSeconds,
      bitrateKbps: effectiveBitrate,
      isStereo,
      isLossless: false,
      is24Bit: false,
      valid: true,
    },
  };
}

/**
 * Validates a generated audio variant with FFprobe to confirm it is valid and playable.
 */
async function verifyVariantPlayable(variantPath: string): Promise<boolean> {
  try {
    const stat = await fs.promises.stat(variantPath);
    if (stat.size === 0) return false;
    const ffprobeBin = getBinaryPath("ffprobe");
    const { stdout } = await runExec(
      `"${ffprobeBin}" -v error -print_format json -show_streams "${variantPath}"`,
    );
    const data = JSON.parse(stdout) as FfprobeOutput;
    const audioStream = data.streams?.find((s) => s.codec_type === "audio");
    return Boolean(audioStream && Number(audioStream.duration || 1) > 0);
  } catch {
    return false;
  }
}

/**
 * Validates and transcodes a master audio file (WAV, FLAC, or MP3) into streaming and download variants:
 * Streaming:
 *  - stream_64k: Opus 64 kbps (.opus)
 *  - stream_96k: Opus 96 kbps (.opus)
 *  - stream_160k: Opus 160 kbps (.opus)
 *  - stream_256k: AAC 256 kbps (.m4a)
 * Downloads:
 *  - download_96k: AAC 96 kbps (.m4a)
 *  - download_160k: AAC 160 kbps (.m4a)
 *  - download_256k: AAC 256 kbps (.m4a)
 */
export async function processMasterAudio(
  masterStorageKey: string,
  trackId: string,
  persist = true,
): Promise<ProcessAudioResult> {
  requireLocalAudioProcessing();
  const baseDir = path.resolve(process.cwd(), process.env["STORAGE_DIR"] || ".storage/uploads");

  const cleanMasterKey = path.normalize(masterStorageKey).replace(/^(\.\.(\/|\\|$))+/, "");
  const masterFilePath = path.join(baseDir, cleanMasterKey);

  if (!fs.existsSync(masterFilePath)) {
    throw new Error(`Master audio file not found at ${masterFilePath}`);
  }

  // 1. Technical inspection and validation via FFprobe + header inspection
  const validation = await probeAndValidateAudio(masterFilePath);

  if (!validation.valid) {
    if (persist) {
      await sql`
        UPDATE tracks
        SET
          audio_processing_status = 'failed',
          technical_validation = ${validation.properties ? sql.json(validation.properties as any) : sql`'{}'::jsonb`},
          updated_at = now()
        WHERE id = ${trackId}
      `;
    }
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
  const generatedFiles: string[] = [];

  try {
    const ffmpegBin = getBinaryPath("ffmpeg");

    // 3. Generate Streaming variants
    // 64k Opus
    const s64Key = `${variantsRelDir}/stream_64k.opus`;
    const s64Path = path.join(baseDir, s64Key);
    await runExec(`"${ffmpegBin}" -y -i "${masterFilePath}" -c:a libopus -b:a 64k -vbr on "${s64Path}"`);
    generatedFiles.push(s64Path);
    if (!(await verifyVariantPlayable(s64Path))) {
      throw new Error("Generated 64k Opus variant failed playback verification");
    }
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
    await runExec(`"${ffmpegBin}" -y -i "${masterFilePath}" -c:a libopus -b:a 96k -vbr on "${s96Path}"`);
    generatedFiles.push(s96Path);
    if (!(await verifyVariantPlayable(s96Path))) {
      throw new Error("Generated 96k Opus variant failed playback verification");
    }
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
    await runExec(
      `"${ffmpegBin}" -y -i "${masterFilePath}" -c:a libopus -b:a 160k -vbr on "${s160Path}"`,
    );
    generatedFiles.push(s160Path);
    if (!(await verifyVariantPlayable(s160Path))) {
      throw new Error("Generated 160k Opus variant failed playback verification");
    }
    const s160Stat = await fs.promises.stat(s160Path);
    variants["stream_160k"] = {
      storageKey: s160Key,
      url: storage.getUrl(s160Key),
      format: "opus",
      bitrateKbps: 160,
      sizeBytes: s160Stat.size,
      type: "stream",
    };

    // 256k AAC (used for high streaming & 256k download)
    const aac256Key = `${variantsRelDir}/aac_256k.m4a`;
    const aac256Path = path.join(baseDir, aac256Key);
    await runExec(`"${ffmpegBin}" -y -i "${masterFilePath}" -c:a aac -b:a 256k "${aac256Path}"`);
    generatedFiles.push(aac256Path);
    if (!(await verifyVariantPlayable(aac256Path))) {
      throw new Error("Generated 256k AAC variant failed playback verification");
    }
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
    await runExec(`"${ffmpegBin}" -y -i "${masterFilePath}" -c:a aac -b:a 96k "${d96Path}"`);
    generatedFiles.push(d96Path);
    if (!(await verifyVariantPlayable(d96Path))) {
      throw new Error("Generated 96k AAC variant failed playback verification");
    }
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
    await runExec(`"${ffmpegBin}" -y -i "${masterFilePath}" -c:a aac -b:a 160k "${d160Path}"`);
    generatedFiles.push(d160Path);
    if (!(await verifyVariantPlayable(d160Path))) {
      throw new Error("Generated 160k AAC variant failed playback verification");
    }
    const d160Stat = await fs.promises.stat(d160Path);
    variants["download_160k"] = {
      storageKey: d160Key,
      url: storage.getUrl(d160Key),
      format: "aac",
      bitrateKbps: 160,
      sizeBytes: d160Stat.size,
      type: "download",
    };

    // Compute file hash of master if not already present
    const fileHash = await computeFileSha256(masterFilePath).catch(() => null);

    // Update database records
    if (persist) {
      await sql`
        UPDATE tracks
        SET
          audio_processing_status = 'completed',
          technical_validation = ${validation.properties ? sql.json(validation.properties as any) : sql`'{}'::jsonb`},
          audio_variants = ${sql.json(variants as any)},
          file_hash = COALESCE(file_hash, ${fileHash}),
          duration_seconds = COALESCE(NULLIF(${validation.properties.durationSeconds || 0}, 0), duration_seconds),
          updated_at = now()
        WHERE id = ${trackId}
      `;
    }

    return {
      success: true,
      variants,
      technicalValidation: validation.properties,
    };
  } catch (err: any) {
    console.error(`Audio processing error for track ${trackId}:`, err);

    // Clean up partial variant files on failure to prevent corrupted outputs
    for (const f of generatedFiles) {
      try {
        if (fs.existsSync(f)) await fs.promises.unlink(f);
      } catch (cleanErr) {
        console.warn(`Failed to clean up variant file ${f}:`, cleanErr);
      }
    }

    if (persist) {
      await sql`
        UPDATE tracks
        SET
          audio_processing_status = 'failed',
          technical_validation = ${validation?.properties ? sql.json(validation.properties as any) : sql`'{}'::jsonb`},
          updated_at = now()
        WHERE id = ${trackId}
      `;
    }

    return {
      success: false,
      error: err.message || "Audio transcoding failed",
      variants: {},
      technicalValidation: validation.properties,
    };
  }
}

/**
 * Atomically replaces an existing track's master audio and regenerates all variants.
 * Only updates active master references and variants if validation and all transcoding succeed.
 * If transcoding fails, existing audio and variants remain completely intact.
 */
export async function replaceTrackAudioMaster(
  replacementStorageKey: string,
  trackId: string,
  actorId?: string,
  actorName?: string,
): Promise<ProcessAudioResult> {
  requireLocalAudioProcessing();
  const baseDir = path.resolve(process.cwd(), process.env["STORAGE_DIR"] || ".storage/uploads");
  const cleanMasterKey = path.normalize(replacementStorageKey).replace(/^(\.\.(\/|\\|$))+/, "").replace(/\\/g, "/");
  let masterFilePath: string;
  if (path.isAbsolute(replacementStorageKey)) {
    masterFilePath = replacementStorageKey;
  } else if (fs.existsSync(path.resolve(process.cwd(), replacementStorageKey))) {
    masterFilePath = path.resolve(process.cwd(), replacementStorageKey);
  } else {
    masterFilePath = path.join(baseDir, cleanMasterKey);
  }

  if (!fs.existsSync(masterFilePath)) {
    return {
      success: false,
      error: `Replacement master audio file not found at ${masterFilePath}`,
      variants: {},
      technicalValidation: {},
    };
  }

  // 1. Technical inspection of replacement file
  const validation = await probeAndValidateAudio(masterFilePath);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error || "Replacement audio failed technical validation requirements",
      variants: {},
      technicalValidation: validation.properties,
    };
  }

  const fileHash = await computeFileSha256(masterFilePath).catch(() => null);

  // 2. Prepare staging variants directory to prevent corrupting active variants on failure
  const stagingTimestamp = Date.now();
  const stagingRelDir = `variants/${trackId}/staged_${stagingTimestamp}`;
  const stagingAbsDir = path.join(baseDir, stagingRelDir);
  if (!fs.existsSync(stagingAbsDir)) {
    await fs.promises.mkdir(stagingAbsDir, { recursive: true });
  }

  const storage = getStorageProvider();
  const stagedVariants: Record<string, AudioVariantInfo> = {};
  const stagedFiles: string[] = [];

  try {
    const ffmpegBin = getBinaryPath("ffmpeg");

    // Generate Streaming variants in staging
    // 64k Opus
    const s64Key = `${stagingRelDir}/stream_64k.opus`;
    const s64Path = path.join(baseDir, s64Key);
    await runExec(`"${ffmpegBin}" -y -i "${masterFilePath}" -c:a libopus -b:a 64k -vbr on "${s64Path}"`);
    stagedFiles.push(s64Path);
    if (!(await verifyVariantPlayable(s64Path))) throw new Error("Staged 64k Opus variant failed verification");
    const s64Stat = await fs.promises.stat(s64Path);
    stagedVariants["stream_64k"] = {
      storageKey: s64Key,
      url: storage.getUrl(s64Key),
      format: "opus",
      bitrateKbps: 64,
      sizeBytes: s64Stat.size,
      type: "stream",
    };

    // 96k Opus
    const s96Key = `${stagingRelDir}/stream_96k.opus`;
    const s96Path = path.join(baseDir, s96Key);
    await runExec(`"${ffmpegBin}" -y -i "${masterFilePath}" -c:a libopus -b:a 96k -vbr on "${s96Path}"`);
    stagedFiles.push(s96Path);
    if (!(await verifyVariantPlayable(s96Path))) throw new Error("Staged 96k Opus variant failed verification");
    const s96Stat = await fs.promises.stat(s96Path);
    stagedVariants["stream_96k"] = {
      storageKey: s96Key,
      url: storage.getUrl(s96Key),
      format: "opus",
      bitrateKbps: 96,
      sizeBytes: s96Stat.size,
      type: "stream",
    };

    // 160k Opus
    const s160Key = `${stagingRelDir}/stream_160k.opus`;
    const s160Path = path.join(baseDir, s160Key);
    await runExec(`"${ffmpegBin}" -y -i "${masterFilePath}" -c:a libopus -b:a 160k -vbr on "${s160Path}"`);
    stagedFiles.push(s160Path);
    if (!(await verifyVariantPlayable(s160Path))) throw new Error("Staged 160k Opus variant failed verification");
    const s160Stat = await fs.promises.stat(s160Path);
    stagedVariants["stream_160k"] = {
      storageKey: s160Key,
      url: storage.getUrl(s160Key),
      format: "opus",
      bitrateKbps: 160,
      sizeBytes: s160Stat.size,
      type: "stream",
    };

    // 256k AAC
    const aac256Key = `${stagingRelDir}/aac_256k.m4a`;
    const aac256Path = path.join(baseDir, aac256Key);
    await runExec(`"${ffmpegBin}" -y -i "${masterFilePath}" -c:a aac -b:a 256k "${aac256Path}"`);
    stagedFiles.push(aac256Path);
    if (!(await verifyVariantPlayable(aac256Path))) throw new Error("Staged 256k AAC variant failed verification");
    const aac256Stat = await fs.promises.stat(aac256Path);
    stagedVariants["stream_256k"] = {
      storageKey: aac256Key,
      url: storage.getUrl(aac256Key),
      format: "aac",
      bitrateKbps: 256,
      sizeBytes: aac256Stat.size,
      type: "stream",
    };
    stagedVariants["download_256k"] = {
      storageKey: aac256Key,
      url: storage.getUrl(aac256Key),
      format: "aac",
      bitrateKbps: 256,
      sizeBytes: aac256Stat.size,
      type: "download",
    };

    // 96k AAC download
    const d96Key = `${stagingRelDir}/download_96k.m4a`;
    const d96Path = path.join(baseDir, d96Key);
    await runExec(`"${ffmpegBin}" -y -i "${masterFilePath}" -c:a aac -b:a 96k "${d96Path}"`);
    stagedFiles.push(d96Path);
    if (!(await verifyVariantPlayable(d96Path))) throw new Error("Staged 96k AAC variant failed verification");
    const d96Stat = await fs.promises.stat(d96Path);
    stagedVariants["download_96k"] = {
      storageKey: d96Key,
      url: storage.getUrl(d96Key),
      format: "aac",
      bitrateKbps: 96,
      sizeBytes: d96Stat.size,
      type: "download",
    };

    // 160k AAC download
    const d160Key = `${stagingRelDir}/download_160k.m4a`;
    const d160Path = path.join(baseDir, d160Key);
    await runExec(`"${ffmpegBin}" -y -i "${masterFilePath}" -c:a aac -b:a 160k "${d160Path}"`);
    stagedFiles.push(d160Path);
    if (!(await verifyVariantPlayable(d160Path))) throw new Error("Staged 160k AAC variant failed verification");
    const d160Stat = await fs.promises.stat(d160Path);
    stagedVariants["download_160k"] = {
      storageKey: d160Key,
      url: storage.getUrl(d160Key),
      format: "aac",
      bitrateKbps: 160,
      sizeBytes: d160Stat.size,
      type: "download",
    };

    // Move staged files to permanent variant directory
    const finalRelDir = `variants/${trackId}`;
    const finalAbsDir = path.join(baseDir, finalRelDir);
    if (!fs.existsSync(finalAbsDir)) {
      await fs.promises.mkdir(finalAbsDir, { recursive: true });
    }

    const finalVariants: Record<string, AudioVariantInfo> = {};
    for (const [vKey, vInfo] of Object.entries(stagedVariants)) {
      const filename = path.basename(vInfo.storageKey);
      const targetRelPath = `${finalRelDir}/${filename}`;
      const targetAbsPath = path.join(baseDir, targetRelPath);
      const srcAbsPath = path.join(baseDir, vInfo.storageKey);
      if (fs.existsSync(srcAbsPath)) {
        await fs.promises.rename(srcAbsPath, targetAbsPath);
      }
      finalVariants[vKey] = {
        ...vInfo,
        storageKey: targetRelPath,
        url: storage.getUrl(targetRelPath),
      };
    }

    // Clean up empty staging folder
    try {
      if (fs.existsSync(stagingAbsDir)) await fs.promises.rmdir(stagingAbsDir);
    } catch {}

    // Atomic DB commit: update track and parent release review history
    await sql.begin(async (tx) => {
      await tx`SELECT pg_advisory_xact_lock(734821, 1)`;

      const [track] = await tx<Record<string, any>[]>`
        SELECT release_id, title, plugg_track_id FROM tracks WHERE id = ${trackId} FOR UPDATE
      `;
      if (!track) throw new Error("Track not found");
      const releaseId = track["releaseId"] ?? track["release_id"];
      const pluggTrackId = track["pluggTrackId"] ?? track["plugg_track_id"] ?? trackId;

      await tx`
        UPDATE tracks
        SET
          audio_url = ${`/api/stream/${cleanMasterKey}`},
          file_hash = ${fileHash},
          audio_variants = ${tx.json(finalVariants as any)},
          technical_validation = ${tx.json(validation.properties as any)},
          duration_seconds = COALESCE(NULLIF(${validation.properties.durationSeconds || 0}, 0), duration_seconds),
          audio_processing_status = 'completed',
          updated_at = now()
        WHERE id = ${trackId}
      `;

      const [rel] = await tx<Record<string, any>[]>`
        SELECT review_history FROM releases WHERE id = ${releaseId} FOR UPDATE
      `;
      const rawHistory = rel?.["reviewHistory"] ?? rel?.["review_history"];
      const history = Array.isArray(rawHistory) ? rawHistory : [];
      history.push({
        id: crypto.randomUUID(),
        action: "audio_replaced",
        timestamp: new Date().toISOString(),
        actorId: actorId || null,
        actorName: actorName || "Artist",
        feedback: `Replacement audio master uploaded and validated for track "${track["title"]}" (${pluggTrackId}).`,
      });

      await tx`
        UPDATE releases
        SET
          review_history = ${tx.json(history)},
          audio_processing_status = 'completed',
          updated_at = now()
        WHERE id = ${releaseId}
      `;
    });

    return {
      success: true,
      variants: finalVariants,
      technicalValidation: validation.properties,
    };
  } catch (err: any) {
    console.error(`Audio replacement failed for track ${trackId}:`, err);

    // Clean up staging files on failure
    for (const f of stagedFiles) {
      try {
        if (fs.existsSync(f)) await fs.promises.unlink(f);
      } catch {}
    }
    try {
      if (fs.existsSync(stagingAbsDir)) await fs.promises.rmdir(stagingAbsDir);
    } catch {}

    // Notice: Existing track master and variants were NOT touched!
    return {
      success: false,
      error: err.message || "Replacement audio transcoding failed",
      variants: {},
      technicalValidation: validation.properties,
    };
  }
}

