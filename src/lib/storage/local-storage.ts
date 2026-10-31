import fs from "node:fs";
import path from "node:path";
import type { StorageProvider } from "./types";

export class LocalStorageProvider implements StorageProvider {
  private baseDir: string;

  constructor(dirPath?: string) {
    this.baseDir = path.resolve(
      process.cwd(),
      dirPath || process.env["STORAGE_DIR"] || ".storage/uploads"
    );
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  private resolveSafePath(key: string): string {
    // Prevent directory traversal attacks
    const normalizedKey = path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, "");
    const safePath = path.join(this.baseDir, normalizedKey);
    if (!safePath.startsWith(this.baseDir)) {
      throw new Error("Invalid storage key path");
    }
    return safePath;
  }

  async saveFile(key: string, data: Buffer | Uint8Array, mimeType: string): Promise<string> {
    const filePath = this.resolveSafePath(key);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    await fs.promises.writeFile(filePath, data);
    return key;
  }

  async getFile(
    key: string,
    options?: { start?: number; end?: number }
  ): Promise<{
    stream: NodeJS.ReadableStream;
    size: number;
    mimeType: string;
  } | null> {
    try {
      const filePath = this.resolveSafePath(key);
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const stat = await fs.promises.stat(filePath);
      const stream = fs.createReadStream(filePath, options);
      const mimeType = this.guessMimeType(key);

      return {
        stream,
        size: stat.size,
        mimeType,
      };
    } catch {
      return null;
    }
  }

  async getFileBuffer(key: string): Promise<{
    buffer: Buffer;
    size: number;
    mimeType: string;
  } | null> {
    try {
      const filePath = this.resolveSafePath(key);
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const buffer = await fs.promises.readFile(filePath);
      const mimeType = this.guessMimeType(key);

      return {
        buffer,
        size: buffer.length,
        mimeType,
      };
    } catch {
      return null;
    }
  }

  async deleteFile(key: string): Promise<boolean> {
    try {
      const filePath = this.resolveSafePath(key);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
      return true;
    } catch {
      return false;
    }
  }

  getUrl(key: string): string {
    // If it's an audio file, route through the streaming API with byte-range support
    const ext = path.extname(key).toLowerCase();
    if ([".mp3", ".wav", ".ogg", ".opus", ".m4a", ".aac", ".flac"].includes(ext)) {
      return `/api/stream/${encodeURIComponent(key)}`;
    }
    return `/api/file/${encodeURIComponent(key)}`;
  }

  private guessMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    switch (ext) {
      case ".mp3":
        return "audio/mpeg";
      case ".wav":
        return "audio/wav";
      case ".ogg":
        return "audio/ogg";
      case ".m4a":
        return "audio/mp4";
      case ".aac":
        return "audio/aac";
      case ".flac":
        return "audio/flac";
      case ".jpg":
      case ".jpeg":
        return "image/jpeg";
      case ".png":
        return "image/png";
      case ".webp":
        return "image/webp";
      case ".gif":
        return "image/gif";
      default:
        return "application/octet-stream";
    }
  }
}
