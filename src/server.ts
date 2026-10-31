import { handleAdminRequest } from "./server/api/admin";
import { startPublicationWorker } from "./server/publication-worker";
import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { handleStreamRequest } from "./server/api/stream";
import { handleFileRequest } from "./server/api/file";
import { handleUploadRequest } from "./server/api/upload";
import { handlePlayRequest } from "./server/api/play";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      startPublicationWorker();
      const url = new URL(request.url);

      if (url.pathname.startsWith("/api/admin/v1/")) return await handleAdminRequest(request);

      // Route custom API endpoints
      if (url.pathname.startsWith("/api/stream/")) {
        const key = url.pathname.slice("/api/stream/".length);
        return await handleStreamRequest(request, key);
      }

      if (url.pathname.startsWith("/api/file/")) {
        const key = url.pathname.slice("/api/file/".length);
        return await handleFileRequest(request, key);
      }

      if (url.pathname === "/api/upload") {
        return await handleUploadRequest(request);
      }

      if (url.pathname === "/api/play") {
        return await handlePlayRequest(request);
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
