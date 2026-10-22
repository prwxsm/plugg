import { Download, FileText, ExternalLink, X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/plugg/primitives";

export interface LegalDocument {
  id: "terms" | "privacy" | "upload-policy";
  title: string;
  subtitle: string;
  fileName: string;
  url: string;
}

export const LEGAL_DOCUMENTS: Record<string, LegalDocument> = {
  terms: {
    id: "terms",
    title: "Terms and Conditions",
    subtitle: "Terms of service, artist obligations, and platform usage agreement",
    fileName: "Plugg_Terms_and_Conditions.pdf",
    url: "/documents/Plugg_Terms_and_Conditions.pdf",
  },
  privacy: {
    id: "privacy",
    title: "Privacy Policy",
    subtitle: "How Plugg collects, protects, and manages your personal and artist data",
    fileName: "Plugg_Privacy_Policy.pdf",
    url: "/documents/Plugg_Privacy_Policy.pdf",
  },
  "upload-policy": {
    id: "upload-policy",
    title: "Music Upload & Copyright Policy",
    subtitle: "Music rights, copyright ownership, content guidelines, and royalty licensing policy",
    fileName: "Plugg_Terms_and_Conditions.pdf",
    url: "/documents/Plugg_Terms_and_Conditions.pdf",
  },
};

interface DocumentViewerModalProps {
  documentId: string | null;
  onClose: () => void;
}

export function DocumentViewerModal({ documentId, onClose }: DocumentViewerModalProps) {
  const doc = documentId ? LEGAL_DOCUMENTS[documentId] : null;

  return (
    <Dialog open={!!doc} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden bg-card border border-border rounded-2xl shadow-2xl">
        {doc ? (
          <>
            <DialogHeader className="p-4 sm:p-5 border-b border-border/80 flex flex-row items-center justify-between gap-4 text-left">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-base sm:text-lg font-bold text-foreground truncate">
                    {doc.title}
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground truncate hidden sm:block">
                    {doc.subtitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pr-6 sm:pr-8">
                <a
                  href={doc.url}
                  download={doc.fileName}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/25 transition-colors"
                  title="Download Document"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download</span>
                </a>
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-elevated/80 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-elevated transition-colors hidden sm:inline-flex"
                  title="Open in new tab"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Open</span>
                </a>
              </div>
            </DialogHeader>

            <div className="flex-1 w-full bg-black/40 relative">
              <iframe
                src={`${doc.url}#view=FitH`}
                title={doc.title}
                className="w-full h-full border-0"
              />
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
