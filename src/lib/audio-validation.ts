import type { TechnicalValidation } from "@/data/types";

/**
 * Validates audio file headers (WAV / FLAC) according to Plugg artist master requirements:
 * - Formats: WAV or FLAC
 * - Min quality: 16-bit / 44.1 kHz
 * - Channels: Stereo (>= 2)
 * - Recommended: 24-bit master
 */

export interface AudioValidationResult {
  valid: boolean;
  error?: string | undefined;
  warning?: string | undefined;
  properties: TechnicalValidation;
}


/**
 * Fast binary header inspection for WAV (RIFF) and FLAC files.
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

  // Check for WAV ("RIFF" ... "WAVE")
  const isWav =
    bytes[0] === 0x52 && // 'R'
    bytes[1] === 0x49 && // 'I'
    bytes[2] === 0x46 && // 'F'
    bytes[3] === 0x46 && // 'F'
    bytes[8] === 0x57 && // 'W'
    bytes[9] === 0x41 && // 'A'
    bytes[10] === 0x56 && // 'V'
    bytes[11] === 0x45; // 'E'

  // Check for FLAC ("fLaC")
  const isFlac =
    bytes[0] === 0x66 && // 'f'
    bytes[1] === 0x4c && // 'L'
    bytes[2] === 0x61 && // 'a'
    bytes[3] === 0x43; // 'C'

  if (!isWav && !isFlac) {
    return {
      valid: false,
      error: "Accepted formats are WAV or FLAC only. MP3, AAC, and other compressed formats are not accepted for master uploads.",
      properties: { format: "unknown", valid: false },
    };
  }

  if (isWav) {
    return parseWavHeader(bytes);
  } else {
    return parseFlacHeader(bytes);
  }
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
    // Chunk padding in RIFF
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

  // FLAC STREAMINFO is the first metadata block right after 'fLaC' (offset 4)
  // Offset 4: block header (1 byte is_last + 7 bits type). Type 0 is STREAMINFO.
  const blockType = bytes[4]! & 0x7f;
  if (blockType !== 0) {
    return {
      valid: false,
      error: "Invalid FLAC structure: Missing STREAMINFO block.",
      properties: { format: "FLAC", valid: false },
    };
  }

  // STREAMINFO payload starts at byte 8 (4 bytes 'fLaC' + 4 bytes block header)
  // At offset 18 (10 bytes into STREAMINFO):
  // 20 bits: sample rate
  // 3 bits: (channels - 1)
  // 5 bits: (bits per sample - 1)
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

/**
 * Validate an audio File in the browser by inspecting the first 8 KB.
 */
export async function validateAudioFileInBrowser(file: File): Promise<AudioValidationResult> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext !== "wav" && ext !== "flac") {
    return {
      valid: false,
      error: `Accepted formats are WAV or FLAC. The file "${file.name}" has .${ext || "unknown"} format.`,
      properties: { format: ext, valid: false },
    };
  }

  try {
    const slice = file.slice(0, 8192);
    const arrayBuffer = await slice.arrayBuffer();
    const result = inspectAudioHeader(arrayBuffer);
    return result;
  } catch (err: any) {
    return {
      valid: false,
      error: `Failed to inspect audio file: ${err.message || "Unknown read error"}`,
      properties: { valid: false },
    };
  }
}
