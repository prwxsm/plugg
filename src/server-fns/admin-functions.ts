import { createServerFn } from "@tanstack/react-start";
import { getCookie, setResponseHeader } from "@tanstack/react-start/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

/** No user ID, role, session token, SQL or database URL is accepted from client input. */
export const getAdminSnapshot = createServerFn({ method: "GET" }).handler(async () => {
  setResponseHeader("Cache-Control", "private, no-store");
  const { readAdminSnapshot } = await import("@/server/admin-data");
  return readAdminSnapshot(getCookie(SESSION_COOKIE_NAME));
});

export const performAdminOperation = createServerFn({ method: "POST" })
  .validator((input: unknown) => input)
  .handler(async ({ data }) => {
    try {
      const { administer } = await import("@/server/admin-operations");
      return await administer(getCookie(SESSION_COOKIE_NAME), data);
    } catch (error) {
      if (error && typeof error === "object" && "code" in error)
        throw new Error("The operation could not be completed. Refresh and retry.");
      throw error;
    }
  });
export const retryAdminAudio = createServerFn({ method: "POST" })
  .validator((data: { trackId: string }) => data)
  .handler(async ({ data }) => {
    const { retryAudio } = await import("@/server/admin-retry");
    return retryAudio(getCookie(SESSION_COOKIE_NAME), data.trackId);
  });
