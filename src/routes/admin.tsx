import { createFileRoute } from "@tanstack/react-router";
import { AdminApp } from "@/components/admin/admin-app";
export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Plugg Admin — Staff Back-Office" },
      {
        name: "description",
        content:
          "Plugg staff operations: moderation, catalog, artist verification and streaming telemetry. Role-protected administration of the existing Plugg database.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminApp,
});
