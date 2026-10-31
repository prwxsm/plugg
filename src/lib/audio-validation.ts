import type { TechnicalValidation } from "@/data/types";

/**
 * Validates audio file headers (WAV / FLAC / MP3) according to Plugg artist master requirements:
 * - Formats: WAV, FLAC, or MP3
 * - Lossless (WAV/FLAC): Min 16-bit / 44.1 kHz, Stereo (>= 2 channels). 24-bit recommended.
 * - MP3:
 *   - 256–320 kbps: Accepted (recommended)
 *   - 192–255 kbps: Accept with quality-review flag
 *   - Below 192 kbps: Reject and request better audio
 *   - Sample rate: Min 44.1 kHz
 *   - Channels: Stereo (>= 2 channels)
 *   - Bit depth: Not applicable to MP3
 */

export interface AudioValidationResult {
  valid: boolean;
  error?: string | undefined;
  warning?: string | undefined;
  qualityWarning?: string | undefined;
  properties: TechnicalValidation;
}

/**
 * Fast binary header inspection for WAV (RIFF), FLAC, and MP3 files.
 * Works with Uint8Array or Buffer.
 */
export function inspectAudioHeader(buffer: Uint8Array | ArrayBuffer): AudioValidationResult {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

  if (bytes.length < 44) {
    return {
      valid: false,
      error: "The uploaded file is incomplete or too small to be a valid audio file.",
      properties: { valid: false },
    };
  }

  // 1. Check for WAV ("RIFF" ... "WAVE")
  const isWav =
    bytes[0] === 0x52 && // 'R'
    bytes[1] === 0x49 && // 'I'
    bytes[2] === 0x46 && // 'F'
    bytes[3] === 0x46 && // 'F'
    bytes[8] === 0x57 && // 'W'
    bytes[9] === 0x41 && // 'A'
    bytes[10] === 0x56 && // 'V'
    bytes[11] === 0x45; // 'E'

  // 2. Check for FLAC ("fLaC")
  const isFlac =
    bytes[0] === 0x66 && // 'f'
    bytes[1] === 0x4c && // 'L'
    bytes[2] === 0x61 && // 'a'
    bytes[3] === 0x43; // 'C'

  // 3. Check for MP3: ID3v2 tag ("ID3") or MPEG frame sync (0xFF 0xEx/0xFx)
  const isId3 = bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33;
  const isMpegSync = (bytes[0] === 0xff && (bytes[1]! & 0xe0) === 0xe0) || isId3;

  if (isWav) {
    return parseWavHeader(bytes);
  } else if (isFlac) {
    return parseFlacHeader(bytes);
  } else if (isMpegSync) {
    const mp3Result = parseMp3Header(bytes);
    if (mp3Result) return mp3Result;
  }

  // Not recognized as WAV, FLAC, or MP3
  return {
    valid: false,
    error:
      "Accepted formats are WAV, FLAC, or MP3 only. AAC, OGG, and other formats are not accepted for master uploads.",
    properties: { format: "unknown", valid: false },
  };
}

function parseWavHeader(bytes: Uint8Array): AudioValidationResult {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  // Search for the "fmt " subchunk
  let offset = 12;
  let fmtOffset = -1;

  while (offset + 8 <= bytes.length) {
    const chunkId =
      String.fromCharCode(bytes[offset] ?? 0) +
      String.fromCharCode(bytes[offset + 1] ?? 0) +
      String.fromCharCode(bytes[offset + 2] ?? 0) +
      String.fromCharCode(bytes[offset + 3] ?? 0);

    const chunkSize = view.getUint32(offset + 4, true);

    if (chunkId === "fmt ") {
      fmtOffset = offset;
      break;
    }
    offset += 8 + chunkSize;
    if (chunkSize % 2 === 1) offset += 1;
  }

  if (fmtOffset === -1 || fmtOffset + 24 > bytes.length) {
    return {
      valid: false,
      error: "Invalid WAV structure: Missing format (fmt) chunk.",
      properties: { format: "WAV", valid: false },
    };
  }

  const audioFormat = view.getUint16(fmtOffset + 8, true);
  const channels = view.getUint16(fmtOffset + 10, true);
  const sampleRate = view.getUint32(fmtOffset + 12, true);
  const bitsPerSample = view.getUint16(fmtOffset + 22, true);

  const isStereo = channels >= 2;
  const isLossless = audioFormat === 1 || audioFormat === 3; // PCM or IEEE float
  const is24Bit = bitsPerSample >= 24;

  const properties: TechnicalValidation = {
    format: "WAV",
    sampleRate,
    bitDepth: bitsPerSample,
    channels,
    isStereo,
    isLossless,
    is24Bit,
  };

  // 1. Minimum 44.1 kHz sample rate
  if (sampleRate < 44100) {
    return {
      valid: false,
      error: `Sample rate must be at least 44.1 kHz. Detected: ${(sampleRate / 1000).toFixed(1)} kHz. Please upload a high-quality master.`,
      properties: { ...properties, valid: false },
    };
  }

  // 2. Minimum 16-bit
  if (bitsPerSample < 16) {
    return {
      valid: false,
      error: `Bit depth must be at least 16-bit. Detected: ${bitsPerSample}-bit. 8-bit audio is not accepted.`,
      properties: { ...properties, valid: false },
    };
  }

  // 3. Stereo requirement
  if (channels < 2) {
    return {
      valid: false,
      error: "Master tracks must be in Stereo (2 channels). Mono recordings are not accepted.",
      properties: { ...properties, valid: false },
    };
  }

  let warning: string | undefined;
  if (!is24Bit) {
    warning = "Master is 16-bit. Recommended: 24-bit original studio master for optimal sound dynamics.";
  }

  return {
    valid: true,
    warning,
    properties: { ...properties, valid: true },
  };
}

function parseFlacHeader(bytes: Uint8Array): AudioValidationResult {
  if (bytes.length < 42) {
    return {
      valid: false,
      error: "Invalid FLAC structure: File header too short.",
      properties: { format: "FLAC", valid: false },
    };
  }

  const blockType = bytes[4]! & 0x7f;
  if (blockType !== 0) {
    return {
      valid: false,
      error: "Invalid FLAC structure: Missing STREAMINFO block.",
      properties: { format: "FLAC", valid: false },
    };
  }

  const b1 = bytes[18] ?? 0;
  const b2 = bytes[19] ?? 0;
  const b3 = bytes[20] ?? 0;
  const b4 = bytes[21] ?? 0;

  const sampleRate = (b1 << 12) | (b2 << 4) | (b3 >> 4);
  const channels = ((b3 >> 1) & 0x07) + 1;
  const bitsPerSample = (((b3 & 0x01) << 4) | (b4 >> 4)) + 1;

  const isStereo = channels >= 2;
  const is24Bit = bitsPerSample >= 24;

  const properties: TechnicalValidation = {
    format: "FLAC",
    sampleRate,
    bitDepth: bitsPerSample,
    channels,
    isStereo,
    isLossless: true,
    is24Bit,
  };

  // 1. Minimum 44.1 kHz sample rate
  if (sampleRate < 44100) {
    return {
      valid: false,
      error: `Sample rate must be at least 44.1 kHz. Detected: ${(sampleRate / 1000).toFixed(1)} kHz. Please upload a high-quality master.`,
      properties: { ...properties, valid: false },
    };
  }

  // 2. Minimum 16-bit
  if (bitsPerSample < 16) {
    return {
      valid: false,
      error: `Bit depth must be at least 16-bit. Detected: ${bitsPerSample}-bit.`,
      properties: { ...properties, valid: false },
    };
  }

  // 3. Stereo requirement
  if (channels < 2) {
    return {
      valid: false,
      error: "Master tracks must be in Stereo (2 channels). Mono recordings are not accepted.",
      properties: { ...properties, valid: false },
    };
  }

  let warning: string | undefined;
  if (!is24Bit) {
    warning = "Master is 16-bit. Recommended: 24-bit original studio master for optimal sound dynamics.";
  }

  return {
    valid: true,
    warning,
    properties: { ...properties, valid: true },
  };
}

function parseMp3Header(bytes: Uint8Array): AudioValidationResult | null {
  let offset = 0;

  // Handle ID3v2 tag if present at start
  if (bytes.length >= 10 && bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    const id3Size =
      ((bytes[6]! & 0x7f) << 21) |
      ((bytes[7]! & 0x7f) << 14) |
      ((bytes[8]! & 0x7f) << 7) |
      (bytes[9]! & 0x7f);
    const hasFooter = (bytes[5]! & 0x10) !== 0;
    offset = 10 + id3Size + (hasFooter ? 10 : 0);
  }

  // Search for the first valid MPEG audio frame sync
  let frameStart = -1;
  const maxSearch = Math.min(bytes.length - 4, offset + 65536);

  for (let i = offset; i < maxSearch; i++) {
    if (bytes[i] === 0xff && (bytes[i + 1]! & 0xe0) === 0xe0) {
      const ver = (bytes[i + 1]! >> 3) & 3;
      const layer = (bytes[i + 1]! >> 1) & 3;
      const brIdx = (bytes[i + 2]! >> 4) & 15;
      const srIdx = (bytes[i + 2]! >> 2) & 3;

      // ver: 3 = MPEG-1, 2 = MPEG-2, 0 = MPEG-2.5 (1 is reserved)
      // layer: 1 = Layer III (MP3), 2 = Layer II, 3 = Layer I
      // brIdx !== 0 && brIdx !== 15 (not free or bad)
      // srIdx !== 3 (not reserved)
      if (ver !== 1 && layer === 1 && brIdx !== 0 && brIdx !== 15 && srIdx !== 3) {
        frameStart = i;
        break;
      }
    }
  }

  if (frameStart === -1) {
    return null;
  }

  const b1 = bytes[frameStart + 1]!;
  const b2 = bytes[frameStart + 2]!;
  const b3 = bytes[frameStart + 3]!;

  const ver = (b1 >> 3) & 3;
  const isMpeg1 = ver === 3;
  const srIdx = (b2 >> 2) & 3;
  const sampleRate = isMpeg1
    ? [44100, 48000, 32000][srIdx]!
    : [22050, 24000, 16000][srIdx]!;

  const brIdx = (b2 >> 4) & 15;
  const brTableMpeg1 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
  const brTableMpeg2 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
  const cbrBitrate = isMpeg1 ? brTableMpeg1[brIdx]! : brTableMpeg2[brIdx]!;

  const channelMode = (b3 >> 6) & 3;
  const channels = channelMode === 3 ? 1 : 2;
  const isStereo = channels >= 2;

  // Check for Xing / Info / VBRI VBR header
  const xingOffset = isMpeg1
    ? channels === 2
      ? frameStart + 36
      : frameStart + 21
    : channels === 2
      ? frameStart + 21
      : frameStart + 13;

  let isVbr = false;
  let bitrateKbps = cbrBitrate;

  if (xingOffset + 12 < bytes.length) {
    const magic =
      String.fromCharCode(bytes[xingOffset] ?? 0) +
      String.fromCharCode(bytes[xingOffset + 1] ?? 0) +
      String.fromCharCode(bytes[xingOffset + 2] ?? 0) +
      String.fromCharCode(bytes[xingOffset + 3] ?? 0);

    if (magic === "Xing" || magic === "Info") {
      isVbr = magic === "Xing";
      const flags =
        ((bytes[xingOffset + 4]! << 24) |
          (bytes[xingOffset + 5]! << 16) |
          (bytes[xingOffset + 6]! << 8) |
          bytes[xingOffset + 7]!) >>>
        0;

      let pos = xingOffset + 8;
      let totalFrames = 0;
      let totalBytes = 0;

      if (flags & 1 && pos + 4 <= bytes.length) {
        totalFrames =
          ((bytes[pos]! << 24) |
            (bytes[pos + 1]! << 16) |
            (bytes[pos + 2]! << 8) |
            bytes[pos + 3]!) >>>
          0;
        pos += 4;
      }
      if (flags & 2 && pos + 4 <= bytes.length) {
        totalBytes =
          ((bytes[pos]! << 24) |
            (bytes[pos + 1]! << 16) |
            (bytes[pos + 2]! << 8) |
            bytes[pos + 3]!) >>>
          0;
        pos += 4;
      }

      if (totalFrames > 0 && totalBytes > 0 && sampleRate > 0) {
        const samplesPerFrame = isMpeg1 ? 1152 : 576;
        const durSec = (totalFrames * samplesPerFrame) / sampleRate;
        if (durSec > 0) {
          bitrateKbps = Math.round((totalBytes * 8) / (durSec * 1000));
        }
      }
    }
  }

  // Check for Fraunhofer VBRI header
  const vbriOffset = frameStart + 36;
  if (!isVbr && vbriOffset + 18 < bytes.length) {
    const magic =
      String.fromCharCode(bytes[vbriOffset] ?? 0) +
      String.fromCharCode(bytes[vbriOffset + 1] ?? 0) +
      String.fromCharCode(bytes[vbriOffset + 2] ?? 0) +
      String.fromCharCode(bytes[vbriOffset + 3] ?? 0);

    if (magic === "VBRI") {
      isVbr = true;
      const totalBytes =
        ((bytes[vbriOffset + 10]! << 24) |
          (bytes[vbriOffset + 11]! << 16) |
          (bytes[vbriOffset + 12]! << 8) |
          bytes[vbriOffset + 13]!) >>>
        0;
      const totalFrames =
        ((bytes[vbriOffset + 14]! << 24) |
          (bytes[vbriOffset + 15]! << 16) |
          (bytes[vbriOffset + 16]! << 8) |
          bytes[vbriOffset + 17]!) >>>
        0;

      if (totalFrames > 0 && totalBytes > 0 && sampleRate > 0) {
        const durSec = (totalFrames * 1152) / sampleRate;
        if (durSec > 0) {
          bitrateKbps = Math.round((totalBytes * 8) / (durSec * 1000));
        }
      }
    }
  }

  const properties: TechnicalValidation = {
    format: "MP3",
    sampleRate,
    channels,
    bitrateKbps,
    isStereo,
    isLossless: false,
    is24Bit: false,
    isVbr,
  };

  // 1. Sample rate check (Minimum 44.1 kHz)
  if (sampleRate < 44100) {
    return {
      valid: false,
      error: `Sample rate must be at least 44.1 kHz. Detected: ${(sampleRate / 1000).toFixed(1)} kHz. Please upload a high-quality master.`,
      properties: { ...properties, valid: false },
    };
  }

  // 2. Stereo requirement
  if (channels < 2) {
    return {
      valid: false,
      error: "Master tracks must be in Stereo (2 channels). Mono recordings are not accepted.",
      properties: { ...properties, valid: false },
    };
  }

  // 3. Bitrate requirement:
  // Below 192 kbps: Reject and request better audio
  if (bitrateKbps < 192) {
    return {
      valid: false,
      error: `MP3 bitrate is below 192 kbps (${bitrateKbps} kbps detected). Plugg requires at least 192 kbps for MP3 uploads. Please upload a higher quality audio file (256–320 kbps recommended, or lossless WAV/FLAC).`,
      properties: { ...properties, valid: false },
    };
  }

  // 192–255 kbps: Accept with quality-review flag
  if (bitrateKbps < 256) {
    return {
      valid: true,
      warning: `MP3 bitrate is ${bitrateKbps} kbps. Accepted with quality-review flag. Recommended: 256–320 kbps or lossless WAV/FLAC for best sound dynamics.`,
      qualityWarning: `MP3 ${bitrateKbps} kbps (Quality review flag)`,
      properties: {
        ...properties,
        valid: true,
        warning: `MP3 bitrate is ${bitrateKbps} kbps. Accepted with quality-review flag.`,
        qualityWarning: `MP3 ${bitrateKbps} kbps (Quality review flag)`,
      },
    };
  }

  // 256–320 kbps: Accepted (recommended)
  return {
    valid: true,
    properties: { ...properties, valid: true },
  };
}

/**
 * Validate an audio File in the browser by inspecting binary header and stream properties.
 */
export async function validateAudioFileInBrowser(
  file: File,
  knownDurationSec?: number,
): Promise<AudioValidationResult> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext !== "wav" && ext !== "flac" && ext !== "mp3") {
    return {
      valid: false,
      error: `Accepted formats are WAV, FLAC, or MP3. The file "${file.name}" has .${ext || "unknown"} format.`,
      properties: { format: ext, valid: false },
    };
  }

  try {
    // Read up to 64KB to cover ID3 headers and initial audio frames
    const slice = file.slice(0, 65536);
    const arrayBuffer = await slice.arrayBuffer();
    const result = inspectAudioHeader(arrayBuffer);

    // If MP3 and duration is known or provided, refine average bitrate for VBR files
    if (result.properties.format === "MP3" && knownDurationSec && knownDurationSec > 0) {
      const avgBitrate = Math.round((file.size * 8) / (knownDurationSec * 1000));
      if (Math.abs(avgBitrate - (result.properties.bitrateKbps || 0)) > 24) {
        result.properties.bitrateKbps = avgBitrate;
        result.properties.isVbr = true;

        if (avgBitrate < 192) {
          result.valid = false;
          result.error = `MP3 bitrate is below 192 kbps (${avgBitrate} kbps detected). Plugg requires at least 192 kbps for MP3 uploads. Please upload a higher quality audio file (256–320 kbps recommended, or lossless WAV/FLAC).`;
          result.properties.valid = false;
        } else if (avgBitrate < 256) {
          result.valid = true;
          result.warning = `MP3 bitrate is ${avgBitrate} kbps. Accepted with quality-review flag. Recommended: 256–320 kbps or lossless WAV/FLAC.`;
          result.qualityWarning = `MP3 ${avgBitrate} kbps (Quality review flag)`;
          result.properties.valid = true;
          result.properties.warning = result.warning;
          result.properties.qualityWarning = result.qualityWarning;
        } else {
          result.valid = true;
          delete result.warning;
          delete result.qualityWarning;
          delete result.properties.warning;
          delete result.properties.qualityWarning;
          result.properties.valid = true;
        }
      }
    }

    return result;
  } catch (err: any) {
    return {
      valid: false,
      error: `Failed to inspect audio file: ${err.message || "Unknown read error"}`,
      properties: { valid: false },
    };
  }
}

export const estimateDuration = (bytes: number): number => Math.max(30, Math.round(bytes / 20000));

export const getAudioDuration = (file: File): Promise<number> => {
  return new Promise((resolve) => {
    try {
      if (typeof window === "undefined") {
        resolve(estimateDuration(file.size));
        return;
      }
      const url = URL.createObjectURL(file);
      const audio = new Audio();
      audio.preload = "metadata";
      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        const sec = Math.round(audio.duration);
        resolve(Number.isFinite(sec) && sec > 0 ? sec : estimateDuration(file.size));
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(estimateDuration(file.size));
      };
      audio.src = url;
    } catch {
      resolve(estimateDuration(file.size));
    }
  });
};
