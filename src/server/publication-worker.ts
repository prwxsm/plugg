import { publishScheduled } from "./publication";
declare global {
  var __plugg_publication_timer__: ReturnType<typeof setInterval> | undefined;
}
/** Local Node backend worker: independent of page loads after server initialization. */
export function startPublicationWorker() {
  if (process.env["PLUGG_SCHEDULER_ENABLED"] !== "true" || globalThis.__plugg_publication_timer__)
    return;
  let running = false;
  globalThis.__plugg_publication_timer__ = setInterval(() => {
    if (running) return;
    running = true;
    void publishScheduled()
      .catch(() =>
        console.error("[publication] Scheduled publication failed; retrying next interval."),
      )
      .finally(() => {
        running = false;
      });
  }, 30_000);
  globalThis.__plugg_publication_timer__.unref?.();
}
