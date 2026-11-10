import { R2StorageProvider } from "./r2-storage.ts";
import { LocalStorageProvider } from "./local-storage.ts";
import type { StorageProvider } from "./types.ts";

export * from "./types.ts";
export * from "./local-storage.ts";

let defaultProvider: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (!defaultProvider) {
    const mode = process.env["STORAGE_PROVIDER"] || "local";
    if (mode !== "local" && mode !== "r2") throw new Error("Unsupported STORAGE_PROVIDER");
    defaultProvider = mode === "r2" ? R2StorageProvider.fromEnvironment() : new LocalStorageProvider();
  }
  return defaultProvider;
}

export default getStorageProvider();
