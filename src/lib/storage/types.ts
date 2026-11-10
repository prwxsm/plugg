export interface StoredFileMetadata {
  key: string;
  size: number;
  mimeType: string;
  lastModified?: Date;
}

export interface StorageProvider {
  saveFile(key: string, data: Buffer | Uint8Array, mimeType: string): Promise<string>;
  headFile(key: string): Promise<StoredFileMetadata | null>;
  getFile(key: string, options?: { start?: number; end?: number }): Promise<{
    stream: NodeJS.ReadableStream;
    size: number;
    mimeType: string;
  } | null>;
  getFileBuffer(key: string): Promise<{
    buffer: Buffer;
    size: number;
    mimeType: string;
  } | null>;
  deleteFile(key: string): Promise<boolean>;
  getUrl(key: string): string;
}
