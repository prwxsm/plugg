import { LocalStorageProvider } from "./local-storage";
import type { StorageProvider } from "./types";

export * from "./types";
export * from "./local-storage";

let defaultProvider: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (!defaultProvider) {
    defaultProvider = new LocalStorageProvider();
  }
  return defaultProvider;
}

export default getStorageProvider();
