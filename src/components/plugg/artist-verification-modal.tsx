import { useState, useEffect } from "react";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Plus,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Loader2,
  Info,
} from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button, Field, inputClass, VerifiedBadge } from "@/components/plugg/primitives";
import { usePlugg } from "@/state/plugg-store";
import { cn } from "@/lib/utils";

interface ArtistVerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ArtistVerificationModal({ open, onOpenChange }: ArtistVerificationModalProps) {
  const { currentArtist, currentUser, verificationApplication, submitVerificationApplication } =
    usePlugg();

  const isVerified = Boolean(
    currentArtist?.verified || verificationApplication?.status === "approved",
  );
  const isPending = !isVerified && verificationApplication?.status === "pending";
  const isMoreInfo = !isVerified && verificationApplication?.status === "more_info_required";
  const isRejected = !isVerified && verificationApplication?.status === "rejected";

  const [legalName, setLegalName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [primaryGenre, setPrimaryGenre] = useState("");
  const [supportingLinks, setSupportingLinks] = useState<string[]>([""]);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [accuracyConfirmed, setAccuracyConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync initial values when modal opens
  useEffect(() => {
    if (open) {
      setError(null);
      setAccuracyConfirmed(false);
      if (verificationApplication) {
        setLegalName(verificationApplication.legalName || "");
        setContactEmail(verificationApplication.contactEmail || currentUser?.email || "");
        setContactPhone(verificationApplication.contactPhone || currentArtist?.phoneNumber || "");
        setCountry(verificationApplication.country || currentArtist?.country || "");
        setCity(verificationApplication.city || currentArtist?.city || "");
        setPrimaryGenre(verificationApplication.primaryGenre || currentArtist?.primaryGenre || "");
        setSupportingLinks(
          verificationApplication.supportingLinks &&
            verificationApplication.supportingLinks.length > 0
            ? verificationApplication.supportingLinks
            : [""],
        );
        setNote(verificationApplication.note || "");
      } else {
        setLegalName("");
        setContactEmail(currentUser?.email || "");
        setContactPhone(currentArtist?.phoneNumber || "");
        setCountry(currentArtist?.country || "");
        setCity(currentArtist?.city || "");
        setPrimaryGenre(currentArtist?.primaryGenre || "");
        setSupportingLinks([""]);
        setNote("");
      }
    }
  }, [open, verificationApplication, currentArtist, currentUser]);

  const handleAddLink = () => {
    if (supportingLinks.length < 5) {
      setSupportingLinks([...supportingLinks, ""]);
    }
  };

  const handleRemoveLink = (index: number) => {
    if (supportingLinks.length > 1) {
      setSupportingLinks(supportingLinks.filter((_, i) => i !== index));
    } else {
      setSupportingLinks([""]);
    }
  };

  const handleLinkChange = (index: number, value: string) => {
    const updated = [...supportingLinks];
    updated[index] = value;
    setSupportingLinks(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanLegal = legalName.trim();
    if (cleanLegal.length < 2) {
      setError("Please provide your full legal name or registered artist entity.");
      return;
    }

    const cleanEmail = contactEmail.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Please provide a valid contact email address.");
      return;
    }

    const validLinks = supportingLinks.map((l) => l.trim()).filter((l) => l.length > 0);

    if (validLinks.length === 0) {
      setError(
        "Please provide at least one supporting profile link (e.g. Spotify, Apple Music, YouTube, Instagram).",
      );
      return;
    }

    if (!accuracyConfirmed) {
      setError("Please confirm that the information you provided is accurate and truthful.");
      return;
    }

    setSubmitting(true);
    try {
      await submitVerificationApplication({
        legalName: cleanLegal,
        contactEmail: cleanEmail,
        contactPhone: contactPhone.trim() || undefined,
        country: country.trim() || undefined,
        city: city.trim() || undefined,
        primaryGenre: primaryGenre.trim() || undefined,
        supportingLinks: validLinks,
        note: note.trim() || undefined,
        accuracyConfirmed: true,
      });
      toast.success("Verification application submitted successfully!");
    } catch (err: any) {
      setError(err?.message || "Failed to submit verification application.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto rounded-2xl bg-card border border-border p-6 text-foreground shadow-xl">
        <DialogHeader className="space-y-2 text-left">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
                Artist Verification
                {isVerified && <VerifiedBadge />}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Free official artist badge review for legitimate creators on Plugg.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* State Banner: Verified */}
        {isVerified && (
          <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-400">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-emerald-300">Profile Verified</p>
                <p className="text-xs text-emerald-400/90 leading-relaxed">
                  Your artist account{" "}
                  <span className="font-semibold text-emerald-200">
                    "{currentArtist?.displayName}"
                  </span>{" "}
                  is verified. The official verified badge is active on your profile, catalog, and
                  public searches.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* State Banner: Under Review */}
        {isPending && (
          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-4 text-sky-400">
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 h-5 w-5 shrink-0 animate-pulse" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-sky-300">Application Under Review</p>
                  <p className="text-xs text-sky-400/90 leading-relaxed">
                    Your verification request was submitted on{" "}
                    {verificationApplication?.createdAt
                      ? new Date(verificationApplication.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "recently"}{" "}
                    and is currently being reviewed by our administrative team. Duplicate
                    submissions are disabled while an application is pending.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-border/60 bg-elevated/40 p-4 text-xs">
              <div className="flex justify-between border-b border-border/40 pb-2">
                <span className="text-muted-foreground">Stage Name:</span>
                <span className="font-medium text-foreground">
                  {verificationApplication?.stageName}
                </span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-2">
                <span className="text-muted-foreground">Legal Name:</span>
                <span className="font-medium text-foreground">
                  {verificationApplication?.legalName}
                </span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-2">
                <span className="text-muted-foreground">Contact Email:</span>
                <span className="font-medium text-foreground">
                  {verificationApplication?.contactEmail}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Submitted Profiles:</span>
                <div className="mt-1.5 space-y-1">
                  {verificationApplication?.supportingLinks.map((link, idx) => (
                    <a
                      key={idx}
                      href={link.startsWith("http") ? link : `https://${link}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span className="truncate max-w-[360px]">{link}</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                variant="subtle"
                onClick={() => onOpenChange(false)}
                className="h-9 px-5 text-xs font-semibold"
              >
                Close
              </Button>
            </div>
          </div>
        )}

        {/* State Banner: More Info Required */}
        {isMoreInfo && (
          <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-400">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-amber-300">More Information Required</p>
                <p className="text-xs text-amber-400/90 leading-relaxed">
                  Our review team requested additional verification details before approving:
                </p>
                {verificationApplication?.adminFeedback && (
                  <div className="mt-2 rounded-lg bg-background/60 p-2.5 text-xs font-mono text-amber-200 border border-amber-500/20">
                    "{verificationApplication.adminFeedback}"
                  </div>
                )}
                <p className="mt-2 text-xs text-amber-400/80">
                  Please update your information below and resubmit for review.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* State Banner: Declined / Rejected */}
        {isRejected && (
          <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-400">
            <div className="flex items-start gap-3">
              <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-rose-300">Application Declined</p>
                <p className="text-xs text-rose-400/90 leading-relaxed">
                  Your previous verification request was not approved:
                </p>
                {verificationApplication?.adminFeedback && (
                  <div className="mt-2 rounded-lg bg-background/60 p-2.5 text-xs font-mono text-rose-200 border border-rose-500/20">
                    "{verificationApplication.adminFeedback}"
                  </div>
                )}
                <p className="mt-2 text-xs text-rose-400/80">
                  You may re-apply below with updated documentation and valid active streaming
                  profiles.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Application Form (shown if not verified and not pending) */}
        {!isVerified && !isPending && (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {error && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Stage Name" hint="Read-only from your profile">
                <input
                  type="text"
                  disabled
                  value={currentArtist?.displayName || ""}
                  className={cn(inputClass, "cursor-not-allowed bg-muted/30 text-muted-foreground")}
                />
              </Field>

              <Field label="Legal / Identity Name *" hint="Official registered name">
                <input
                  type="text"
                  required
                  placeholder="e.g. Samuel Kwame Asante"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Official Contact Email *" hint="Where our review team can reach you">
                <input
                  type="email"
                  required
                  placeholder="artist@label.com"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field label="Contact Phone" hint="Optional for direct coordination">
                <input
                  type="tel"
                  placeholder="+233 24 123 4567"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Location (Country & City)" hint="Based in">
                <input
                  type="text"
                  placeholder="e.g. Accra, Ghana"
                  value={city && country ? `${city}, ${country}` : city || country}
                  onChange={(e) => {
                    const parts = e.target.value.split(",");
                    if (parts.length > 1 && parts[0] && parts[1]) {
                      setCity(parts[0].trim());
                      setCountry(parts[1].trim());
                    } else {
                      setCity(e.target.value);
                    }
                  }}
                  className={inputClass}
                />
              </Field>

              <Field label="Primary Genre" hint="Your core music style">
                <input
                  type="text"
                  placeholder="e.g. Afrobeats, Highlife"
                  value={primaryGenre}
                  onChange={(e) => setPrimaryGenre(e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Supporting Profiles & Links * (At least 1)
                </label>
                {supportingLinks.length < 5 && (
                  <button
                    type="button"
                    onClick={handleAddLink}
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Plus className="h-3 w-3" />
                    Add Link
                  </button>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Provide links to your official Spotify, Apple Music, YouTube, Audiomack, or
                Instagram profiles to verify ownership.
              </p>
              <div className="space-y-2">
                {supportingLinks.map((link, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="url"
                      placeholder="https://open.spotify.com/artist/... or instagram.com/..."
                      value={link}
                      onChange={(e) => handleLinkChange(index, e.target.value)}
                      className={cn(inputClass, "flex-1 text-xs")}
                    />
                    {supportingLinks.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveLink(index)}
                        className="rounded-lg p-2 text-muted-foreground hover:bg-elevated hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Field label="Additional Note / Context" hint="Optional label or manager references">
              <textarea
                rows={2}
                placeholder="Share any additional details, management contacts, or press mentions..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className={cn(inputClass, "resize-none text-xs")}
              />
            </Field>

            <div className="rounded-xl border border-border/60 bg-elevated/30 p-3 text-[11px] text-muted-foreground flex items-center gap-2.5">
              <Info className="h-4 w-4 shrink-0 text-primary" />
              <span>
                <strong>100% Free Verification:</strong> Plugg never charges artists for review,
                badge allocation, or priority queues. No payment information is required.
              </span>
            </div>

            <label className="flex items-start gap-3 cursor-pointer select-none rounded-xl border border-border/60 bg-elevated/20 p-3 hover:bg-elevated/40 transition-colors">
              <input
                type="checkbox"
                checked={accuracyConfirmed}
                onChange={(e) => setAccuracyConfirmed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border accent-primary shrink-0 cursor-pointer"
              />
              <span className="text-[11px] text-muted-foreground leading-relaxed">
                I confirm that all information submitted in this application is accurate, truthful,
                and belongs to me or my authorized representation. I understand that providing false
                information may result in badge removal.
              </span>
            </label>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="subtle"
                onClick={() => onOpenChange(false)}
                className="h-10 px-5 text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || !accuracyConfirmed}
                className="h-10 px-6 text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : isMoreInfo || isRejected ? (
                  "Resubmit Application"
                ) : (
                  "Submit for Verification"
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
