import { handleAdminRequest } from "./server/api/admin";
import { startPublicationWorker } from "./server/publication-worker";
import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { handleStreamRequest } from "./server/api/stream";
import { handleFileRequest } from "./server/api/file";
import { handleOgImageRequest } from "./server/api/og-image";
import { handleUploadRequest } from "./server/api/upload";
import { handlePlayRequest } from "./server/api/play";
import {
  buildArtistHeadMeta,
  buildReleaseHeadMeta,
  buildTrackHeadMeta,
  isSocialCrawlerUserAgent,
  renderCrawlerHtml,
  resolveRequestOrigin,
} from "./lib/og-meta";
import {
  fetchArtistShareRecord,
  fetchReleaseShareRecord,
  fetchTrackShareRecord,
} from "./server/og-share-lookup";

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

function crawlerHtmlResponse(
  headResult: { meta: ReturnType<typeof buildTrackHeadMeta>["meta"]; canonicalUrl?: string },
  status: number,
  method: string,
): Response {
  const html = renderCrawlerHtml(headResult);
  const headers = new Headers({
    "content-type": "text/html; charset=utf-8",
    "cache-control": "private, no-store",
    vary: "User-Agent",
  });
  return new Response(method === "HEAD" ? null : html, { status, headers });
}

async function handleCrawlerFastPath(request: Request, url: URL): Promise<Response | null> {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  if (!isSocialCrawlerUserAgent(request.headers.get("user-agent"))) return null;

  const trackMatch = /^\/track\/([^/]+)\/?$/.exec(url.pathname);
  const releaseMatch = /^\/release\/([^/]+)\/?$/.exec(url.pathname);
  const artistMatch = /^\/artist\/([^/]+)\/?$/.exec(url.pathname);
  if (!trackMatch && !releaseMatch && !artistMatch) return null;

  const origin = resolveRequestOrigin(request.headers, request.url);

  if (trackMatch?.[1]) {
    let param = trackMatch[1];
    try {
      param = decodeURIComponent(param);
    } catch {
      return null;
    }
    const record = await fetchTrackShareRecord(param);
    return crawlerHtmlResponse(buildTrackHeadMeta(record, param, origin), record ? 200 : 404, request.method);
  }

  if (releaseMatch?.[1]) {
    let param = releaseMatch[1];
    try {
      param = decodeURIComponent(param);
    } catch {
      return null;
    }
    const record = await fetchReleaseShareRecord(param);
    return crawlerHtmlResponse(buildReleaseHeadMeta(record, param, origin), record ? 200 : 404, request.method);
  }

  if (artistMatch?.[1]) {
    let param = artistMatch[1];
    try {
      param = decodeURIComponent(param);
    } catch {
      return null;
    }
    const record = await fetchArtistShareRecord(param);
    return crawlerHtmlResponse(buildArtistHeadMeta(record, param, origin), record ? 200 : 404, request.method);
  }

  return null;
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      startPublicationWorker();
      const url = new URL(request.url);

      if (url.pathname.startsWith("/api/admin/v1/")) return await handleAdminRequest(request);

      if (url.pathname.startsWith("/api/og/")) {
        return await handleOgImageRequest(request, url.pathname);
      }

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

      const crawlerResponse = await handleCrawlerFastPath(request, url);
      if (crawlerResponse) return crawlerResponse;

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
