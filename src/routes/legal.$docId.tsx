import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Download, ExternalLink, FileText, Shield, Sparkles } from "lucide-react";
import logo from "@/assets/logo.png";
import { Button } from "@/components/plugg/primitives";
import { LEGAL_DOCUMENTS, type LegalDocument } from "@/data/legal";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/legal/$docId")({
  loader: ({ params }) => {
    const doc = LEGAL_DOCUMENTS[params.docId];
    if (!doc) throw notFound();
    return { doc, docId: params.docId };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Legal Document Not Found — Plugg" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const title = `${loaderData.doc.title} — Plugg Legal`;
    const description = loaderData.doc.subtitle;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: LegalDocumentPage,
});

function LegalDocumentPage() {
  const { doc, docId } = Route.useLoaderData();
  const navigate = useNavigate();

  const allDocs = Object.values(LEGAL_DOCUMENTS).filter((d) => d.id !== "deployment-notes");

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-border/80 bg-card/90 px-4 backdrop-blur-md sm:px-6">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <button
            type="button"
            onClick={() => {
              if (window.history.length > 1) {
                window.history.back();
              } else {
                navigate({ to: "/" });
              }
            }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-elevated/80 text-muted-foreground transition-colors hover:bg-elevated hover:text-foreground active:scale-95 cursor-pointer"
            title="Go back"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <Link
            to="/"
            className="flex shrink-0 items-center gap-2 transition-transform hover:scale-105 active:scale-95"
            title="Plugg home"
          >
            <img src={logo} alt="Plugg" className="h-8 w-8 object-contain" />
            <span className="hidden font-bold tracking-tight text-foreground sm:inline-block">
              Plugg
            </span>
          </Link>

          <div className="h-4 w-px bg-border/60 hidden sm:block" />

          <div className="min-w-0">
            <h1 className="text-sm font-semibold tracking-tight text-foreground sm:text-base truncate">
              {doc.title}
            </h1>
            <p className="text-[11px] text-muted-foreground truncate hidden md:block">
              {doc.subtitle}
            </p>
          </div>
        </div>

        {/* Right side actions: download & open */}
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={doc.url}
            download={doc.fileName}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs transition-opacity hover:opacity-90 active:scale-95"
            title="Download PDF"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Download</span>
          </a>

          <a
            href={doc.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-elevated px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-elevated/80 active:scale-95"
            title="Open in new window"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Open file</span>
          </a>
        </div>
      </header>

      {/* Document switch tabs */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border/60 bg-surface/50 px-4 py-2 sm:px-6 overflow-x-auto no-scrollbar">
        <span className="text-[11px] font-medium text-muted-foreground shrink-0 uppercase tracking-wider pr-1">
          Documents:
        </span>
        {allDocs.map((item) => {
          const isActive = item.id === docId;
          return (
            <Link
              key={item.id}
              to="/legal/$docId"
              params={{ docId: item.id }}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all",
                isActive
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-elevated/70 text-muted-foreground hover:bg-elevated hover:text-foreground"
              )}
            >
              <FileText className="h-3 w-3" />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </div>

      {/* Full Page Document Viewer Content */}
      <main className="flex-1 w-full bg-black/50 relative overflow-hidden">
        <iframe
          src={`${doc.url}#view=FitH`}
          title={doc.title}
          className="h-full w-full border-0"
        />
      </main>
    </div>
  );
}
