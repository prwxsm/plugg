/** Single-instance login protection. Resets on process restart; never trust client IP headers. */
export function createLoginLimiter(now = Date.now) {
  const attempts = new Map<string, { count: number; expires: number }>();
  let globalWindow = { count: 0, expires: 0 };
  return (identifier: string): number => {
    const time = now();
    if (globalWindow.expires <= time) globalWindow = { count: 0, expires: time + 60_000 };
    if (globalWindow.count >= 120) return Math.ceil((globalWindow.expires - time) / 1000);
    globalWindow.count++;
    for (const [key, entry] of attempts) if (entry.expires <= time) attempts.delete(key);
    const key = identifier.trim().toLowerCase();
    const entry = attempts.get(key) ?? { count: 0, expires: time + 15 * 60_000 };
    if (entry.count >= 8) return Math.ceil((entry.expires - time) / 1000);
    entry.count++;
    attempts.set(key, entry);
    return 0;
  };
}
// Shared by the main site's login and the administrative REST login.
export const limitLogin = createLoginLimiter();
