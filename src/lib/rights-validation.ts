import crypto from "node:crypto";
import fs from "node:fs";

export const PLUGG_RIGHTS_DECLARATION_VERSION = "2026-10-v1";

export const PLUGG_RIGHTS_DECLARATION_TEXT =
  "I confirm that I own or have obtained the permissions and licenses necessary to distribute this recording and its underlying musical works, including any third-party beats, samples, lyrics or other protected material. I authorize Plugg to make this release available for streaming and downloading under Plugg's Terms and Copyright Policy.";

/**
 * Standard ISRC regex according to ISO 3901:
 * 2 characters country code (letters)
 * 3 characters registrant code (alphanumeric)
 * 2 characters year of reference (digits)
 * 5 characters designation code (digits)
 * Total 12 alphanumeric characters, case-insensitive, hyphens allowed.
 */
const ISRC_REGEX = /^[A-Z]{2}[A-Z0-9]{3}\d{7}$/;

/**
 * Validates and normalizes an official ISRC.
 * Removes hyphens/spaces and uppercases.
 * Returns normalized string (12 chars) or null if invalid or empty.
 */
export function normalizeIsrc(val?: string | null): string | null {
  if (!val || typeof val !== "string") return null;
  const cleaned = val.replace(/[\s-]/g, "").toUpperCase();
  if (!cleaned) return null;
  return ISRC_REGEX.test(cleaned) ? cleaned : null;
}

/**
 * Validates if a non-empty string is a valid ISRC format.
 */
export function isValidIsrc(val?: string | null): boolean {
  if (!val || typeof val !== "string") return false;
  const cleaned = val.replace(/[\s-]/g, "").toUpperCase();
  return ISRC_REGEX.test(cleaned);
}

/**
 * Computes SHA-256 hash from a Buffer or Uint8Array.
 */
export function computeBufferSha256(buffer: Buffer | Uint8Array): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * Computes SHA-256 hash of a file on disk using streaming to avoid loading large files into memory.
 */
export async function computeFileSha256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", (err) => reject(err));
  });
}
