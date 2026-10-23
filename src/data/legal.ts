export interface LegalDocument {
  id: "terms" | "privacy" | "upload-policy" | "deployment-notes";
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
  "upload-policy": {
    id: "upload-policy",
    title: "Music Upload & Copyright Policy",
    subtitle: "Music rights, copyright ownership, content guidelines, and royalty licensing policy",
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
  "deployment-notes": {
    id: "deployment-notes",
    title: "Deployment & Legal Notes",
    subtitle: "Operator facts, legal references, and platform review notes",
    fileName: "Plugg_Deployment_Notes.txt",
    url: "/documents/Plugg_Deployment_Notes.txt",
  },
};
