import assert from "node:assert/strict";
import { runWithStartContext } from "@tanstack/start-storage-context";
import { serverFnFetcher } from "../node_modules/@tanstack/start-client-core/dist/esm/client-rpc/serverFnFetcher.js";
const base = "http://127.0.0.1:3000";
async function endpoint(file, name) {
  const source = await (await fetch(base + "/src/server-fns/" + file + ".ts")).text();
  const match = source.match(
    new RegExp("export const " + name + ' =[\\s\\S]*?createClientRpc\\("([^"\\n]+)"'),
  );
  assert.ok(match, `Could not find compiled endpoint ${name}`);
  return base + "/_serverFn/" + match[1];
}
const call = (url, method, data, origin = base) =>
  runWithStartContext({ startOptions: {} }, () =>
    serverFnFetcher(
      url,
      [
        {
          method,
          data,
          headers: { origin, "sec-fetch-site": origin === base ? "same-origin" : "cross-site" },
        },
      ],
      fetch,
    ),
  );
const read = await endpoint("admin-functions", "getAdminSnapshot");
assert.equal((await call(read, "GET")).result.status, "unauthenticated");
for (const [file, name, data] of [
  [
    "admin-functions",
    "performAdminOperation",
    {
      action: "takedown",
      targetId: "nonexistent-http-fixture",
      reason: "Authorization test",
      confirmed: true,
    },
  ],
  ["admin-functions", "retryAdminAudio", { trackId: "nonexistent-http-fixture" }],
  [
    "data-functions",
    "approveReleaseFn",
    { releaseId: "nonexistent-http-fixture", newReleaseDate: "2099-01-01" },
  ],
  [
    "data-functions",
    "requestChangesReleaseFn",
    { releaseId: "nonexistent-http-fixture", feedback: "Authorization test" },
  ],
]) {
  const url = await endpoint(file, name);
  const response = await call(url, "POST", data);
  assert.ok(response.error, `${name} must deny unauthenticated requests`);
  assert.match(response.error.message, /Authentication required/);
  await assert.rejects(call(url, "POST", data, "https://untrusted.invalid"));
}
console.log(
  "PASS: direct admin read/write endpoints deny unauthenticated callers; cross-site writes are rejected. No valid targets used.",
);
