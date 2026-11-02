/** Cloud deployments must opt out of local executables; unknown modes fail closed. */
export function localAudioProcessingEnabled(): boolean {
  return (process.env["STORAGE_PROVIDER"] || "local") === "local" && (process.env["PLUGG_AUDIO_PROCESSING"] || "local") === "local";
}
export function requireLocalAudioProcessing(): void {
  if (!localAudioProcessingEnabled()) {
    throw new Error("Audio processing is local-only. Ask an operator to process the master locally; cloud retry and replacement are unavailable.");
  }
}
