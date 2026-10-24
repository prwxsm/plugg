import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { LEGAL_DOCUMENTS } from "@/data/legal";

export const Route = createFileRoute("/legal/$docId")({
  loader: ({ params }) => {
    const doc = LEGAL_DOCUMENTS[params.docId];
    if (!doc) throw notFound();
    throw redirect({ href: doc.webUrl || doc.url });
  },
});
