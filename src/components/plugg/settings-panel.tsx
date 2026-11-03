import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Check,
  Mic,
  Pencil,
  Trash2,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";

import { Button, VerifiedBadge } from "@/components/plugg/primitives";
import { ArtistVerificationModal } from "@/components/plugg/artist-verification-modal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { art } from "@/data/covers";
import { usePlugg } from "@/state/plugg-store";
import {
  FacebookIcon,
  InstagramIcon,
  TikTokIcon,
  YouTubeIcon,
  XIcon,
} from "@/components/plugg/social-icons";

function Toggle({
  label,
  hint,
  checked,
  onCheckedChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          checked ? "bg-white" : "bg-elevated",
        )}
      >
        <span
          className={cn(
            "block h-5 w-5 rounded-full transition-transform duration-200",
            checked ? "translate-x-5 bg-background shadow-xs" : "translate-x-0 bg-muted-foreground/50",
          )}
        />
      </button>
    </div>
  );
}

export function SettingsPanel({ onEditProfile }: { onEditProfile?: () => void } = {}) {
  const {
    session,
    currentUser,
    currentArtist,
    signOut,
    deleteAccount,
    settings,
    updateSettings,
    networkQuality,
    verificationApplication,
  } = usePlugg();
  const isArtist = session === "loggedInArtist" || currentUser?.accountType === "artist";
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  const isVerified = Boolean(currentArtist?.verified || verificationApplication?.status === "approved");
  const verificationStatus: "verified" | "pending" | "more_info_required" | "rejected" | "not_verified" =
    isVerified
      ? "verified"
      : verificationApplication?.status === "pending"
        ? "pending"
        : verificationApplication?.status === "more_info_required"
          ? "more_info_required"
          : verificationApplication?.status === "rejected"
            ? "rejected"
            : "not_verified";

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await deleteAccount();
    } catch {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Refined Account Card ── */}
      <section className="surface-card p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between">
          <p className="text-eyebrow">Account</p>
          {isArtist && currentArtist && (
            <span className="text-xs text-muted-foreground font-medium">
              Artist Account
            </span>
          )}
        </div>

        {currentUser ? (
          <div className="space-y-5">
            {/* Top Identity: Stage Name vs Account Identity */}
            <div className="flex items-start gap-4">
              <img
                src={art(currentArtist?.avatarUrl ?? currentUser.avatarUrl)}
                alt={currentArtist?.displayName ?? currentUser.name}
                className="h-14 w-14 rounded-full object-cover ring-2 ring-primary/20 shadow-md shrink-0"
              />
              <div className="min-w-0 flex-1 space-y-1">
                {isArtist && currentArtist ? (
                  <>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-base font-semibold text-foreground truncate">
                        {currentArtist.displayName}
                      </p>
                      {currentArtist.verified ? <VerifiedBadge size="sm" /> : null}
                      <span className="text-xs text-muted-foreground font-normal">
                        @{currentArtist.username}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                      <span>Account Identity:</span>
                      <span className="font-medium text-foreground">{currentUser.name}</span>
                      <span>•</span>
                      <span className="truncate">{currentUser.email}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-base font-semibold text-foreground truncate">{currentUser.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{currentUser.email}</p>
                  </>
                )}
              </div>
            </div>

            {/* Information Hierarchy: Verification Status Box */}
            {isArtist && currentArtist ? (
              <div className="rounded-xl border border-border/60 bg-elevated/40 p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Verification status
                    </p>
                    <div className="flex items-center gap-2">
                      {verificationStatus === "verified" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-semibold text-emerald-400">
                          <VerifiedBadge size="xs" />
                          <span>Verified</span>
                        </span>
                      )}
                      {verificationStatus === "pending" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/15 border border-sky-500/30 px-3 py-1 text-xs font-semibold text-sky-400">
                          <Clock className="h-3.5 w-3.5 animate-pulse" />
                          <span>Under Review</span>
                        </span>
                      )}
                      {verificationStatus === "more_info_required" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-xs font-semibold text-amber-400">
                          <AlertCircle className="h-3.5 w-3.5" />
                          <span>More Information Required</span>
                        </span>
                      )}
                      {verificationStatus === "rejected" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 border border-rose-500/30 px-3 py-1 text-xs font-semibold text-rose-400">
                          <XCircle className="h-3.5 w-3.5" />
                          <span>Declined</span>
                        </span>
                      )}
                      {verificationStatus === "not_verified" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-elevated border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
                          <ShieldAlert className="h-3.5 w-3.5" />
                          <span>Not Verified</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions according to status */}
                  {verificationStatus === "not_verified" ? (
                    <Button
                      type="button"
                      onClick={() => setShowVerificationModal(true)}
                      className="h-8 px-4 rounded-full text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98] transition-all shrink-0 self-start sm:self-auto"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>Get Verified</span>
                    </Button>
                  ) : verificationStatus === "pending" ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowVerificationModal(true)}
                      className="h-8 px-3.5 rounded-full text-xs font-medium text-sky-400 hover:text-sky-300 border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 active:scale-[0.98] transition-all shrink-0 self-start sm:self-auto"
                    >
                      <span>View Application</span>
                    </Button>
                  ) : verificationStatus === "more_info_required" ? (
                    <Button
                      type="button"
                      onClick={() => setShowVerificationModal(true)}
                      className="h-8 px-4 rounded-full text-xs font-semibold bg-amber-500 text-black hover:bg-amber-400 active:scale-[0.98] transition-all shrink-0 self-start sm:self-auto"
                    >
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span>Update Application</span>
                    </Button>
                  ) : verificationStatus === "rejected" ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowVerificationModal(true)}
                      className="h-8 px-3.5 rounded-full text-xs font-medium text-rose-400 hover:text-rose-300 border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 active:scale-[0.98] transition-all shrink-0 self-start sm:self-auto"
                    >
                      <span>View Details & Re-apply</span>
                    </Button>
                  ) : null}
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  {verificationStatus === "verified"
                    ? "Your artist identity is confirmed. The verified badge appears next to your stage name across Plugg."
                    : verificationStatus === "pending"
                      ? "Your verification request is currently under review by our administrative team. Duplicate applications are disabled while under review."
                      : verificationStatus === "more_info_required"
                        ? "Our review team requested additional verification details or streaming links before approving your badge."
                        : verificationStatus === "rejected"
                          ? "Your previous verification request was not approved. You can view the reviewer feedback and re-apply."
                          : "Verify your artist profile for free to confirm your stage name and receive the official verified badge across Plugg."}
                </p>
              </div>
            ) : (
              <div className="rounded-xl bg-surface/50 p-4 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-elevated px-3 py-1 text-xs font-medium text-muted-foreground">
                    Listener Account
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                  You are signed in as a listener. Enjoy streaming, saving tracks, and creating playlists.
                </p>
              </div>
            )}

            {/* Bottom Account Card Actions */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/40">
              <Button
                type="button"
                variant="outline"
                className="h-9 px-4 rounded-full text-xs font-medium bg-elevated/70 text-foreground hover:bg-elevated hover:text-primary transition-all"
                onClick={() => {
                  if (onEditProfile) {
                    onEditProfile();
                  } else {
                    window.location.href = "/profile";
                  }
                }}
              >
                <Pencil size={13} />
                <span>Edit profile</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                className="h-9 px-4 rounded-full text-xs font-medium text-destructive/90 hover:text-destructive hover:bg-destructive/10 border-border hover:border-destructive/30 transition-all"
                onClick={signOut}
              >
                <span>Sign out</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground">You are currently signed out.</p>
            <Link
              to="/auth"
              className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Sign in or create account
            </Link>
          </div>
        )}
      </section>

      {/* ── Playback Settings ── */}
      <section className="surface-card p-5 sm:p-6">
        <p className="text-eyebrow">Playback</p>
        <div className="mt-2 divide-y divide-border">
          <Toggle
            label="Autoplay similar music"
            hint="Keep playing related songs when a queue ends."
            checked={settings.autoplaySimilar}
            onCheckedChange={(val) => {
              updateSettings({ autoplaySimilar: val });
              toast.success(
                val
                  ? "Autoplay enabled: Plugg will keep playing related songs when a queue ends"
                  : "Autoplay disabled",
              );
            }}
          />

          <Toggle
            label="Crossfade"
            hint="Smooth 5-second blend between songs."
            checked={settings.crossfade}
            onCheckedChange={(val) => {
              updateSettings({ crossfade: val, crossfadeSeconds: 5 });
              toast.success(
                val ? "Crossfade enabled (5s smooth blend)" : "Crossfade disabled",
              );
            }}
          />

          {/* Streaming Audio Quality: Wide Two-Option Segmented Control */}
          <div className="py-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Streaming audio quality</p>
                <p className="text-xs text-muted-foreground">
                  Choose how Plugg delivers audio over your internet connection.
                </p>
              </div>
            </div>

            {/* Wider two-option segmented control aligned with settings content width */}
            <div
              role="radiogroup"
              aria-label="Streaming audio quality"
              className="grid grid-cols-2 gap-1 rounded-xl bg-elevated/80 p-1 border border-border/60"
            >
              <button
                type="button"
                role="radio"
                aria-checked={settings.streamingQuality !== "data_saver"}
                onClick={() => {
                  updateSettings({ streamingQuality: "auto", highQualityStreaming: true });
                  toast.success("Streaming set to Adaptive");
                }}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold transition-all cursor-pointer",
                  settings.streamingQuality !== "data_saver"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface/40",
                )}
              >
                <span>Adaptive</span>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={settings.streamingQuality === "data_saver"}
                onClick={() => {
                  updateSettings({ streamingQuality: "data_saver", highQualityStreaming: false });
                  toast.success("Streaming set to Data Saver");
                }}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold transition-all cursor-pointer",
                  settings.streamingQuality === "data_saver"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface/40",
                )}
              >
                <span>Data Saver</span>
              </button>
            </div>

            {/* Dynamic Concise Explanation Directly Beneath Selector */}
            <p className="text-xs text-muted-foreground leading-relaxed px-0.5">
              {settings.streamingQuality === "data_saver"
                ? "Data Saver compresses audio streams to minimize bandwidth, saving mobile data on metered connections."
                : "Adaptive automatically balances playback resolution to match your connection speed for seamless, high-fidelity sound."}
            </p>
          </div>
        </div>
      </section>


      <section className="surface-card p-5 sm:p-6">
        <p className="text-eyebrow">Notifications</p>
        <div className="mt-2 divide-y divide-border">
          <Toggle
            label="New releases from artists you follow"
            hint="Instant alerts whenever followed artists drop new singles, EPs, or albums."
            checked={settings.notifyNewReleases}
            onCheckedChange={(val) => {
              updateSettings({ notifyNewReleases: val });
              toast.success(
                val
                  ? "New release alerts from followed artists enabled"
                  : "New release alerts muted",
              );
            }}
          />
          <Toggle
            label="Weekly discovery digest"
            hint="Curated Monday mix based on your weekly playback patterns."
            checked={settings.notifyWeeklyDigest}
            onCheckedChange={(val) => {
              updateSettings({ notifyWeeklyDigest: val });
              toast.success(
                val
                  ? "Weekly discovery digest updates enabled"
                  : "Weekly discovery digest updates muted",
              );
            }}
          />
        </div>
      </section>

      {/* Delete Account Section */}
      {currentUser ? (
        <section className="surface-card p-5 sm:p-6 border border-destructive/20 bg-destructive/[0.02]">
          <p className="text-eyebrow text-destructive">Danger zone</p>
          <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-foreground">Delete account</p>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-md">
                Permanently delete your account, saved playlists, favorites, and profile data. This action is irreversible.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-destructive px-4 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive active:scale-[0.98]"
            >
              <Trash2 size={13} />
              Delete account
            </button>
          </div>
        </section>
      ) : null}

      {/* Centered Brand, Social & Legal Info Footer (No Card - Well Spaced & Balanced) */}
      <footer className="pt-12 sm:pt-16 pb-10 text-center flex flex-col items-center justify-center space-y-8 sm:space-y-10 select-none">
        {/* Tagline & Operator */}
        <div className="space-y-1.5">
          <p className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
            Discover music. Support creators.
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Operated by Atedo · Pakwach, Uganda
          </p>
        </div>

        {/* Follow Plugg & Social Links */}
        <div className="space-y-3 max-w-xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
            Follow Plugg
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed px-4">
            Stay connected for new releases, featured artists, and platform announcements.
          </p>
          <div className="flex items-center justify-center gap-4 sm:gap-5 pt-2">
            <a
              href="https://instagram.com/pluggmusic"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow Plugg on Instagram"
              className="p-2.5 rounded-full text-muted-foreground/80 hover:text-foreground hover:bg-white/10 transition-all duration-200 hover:scale-110 active:scale-95"
            >
              <InstagramIcon className="w-5 h-5" />
            </a>
            <a
              href="https://tiktok.com/@pluggmusic"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow Plugg on TikTok"
              className="p-2.5 rounded-full text-muted-foreground/80 hover:text-foreground hover:bg-white/10 transition-all duration-200 hover:scale-110 active:scale-95"
            >
              <TikTokIcon className="w-5 h-5" />
            </a>
            <a
              href="https://facebook.com/pluggmusic"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow Plugg on Facebook"
              className="p-2.5 rounded-full text-muted-foreground/80 hover:text-foreground hover:bg-white/10 transition-all duration-200 hover:scale-110 active:scale-95"
            >
              <FacebookIcon className="w-5 h-5" />
            </a>
            <a
              href="https://youtube.com/@pluggmusic"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow Plugg on YouTube"
              className="p-2.5 rounded-full text-muted-foreground/80 hover:text-foreground hover:bg-white/10 transition-all duration-200 hover:scale-110 active:scale-95"
            >
              <YouTubeIcon className="w-5 h-5" />
            </a>
            <a
              href="https://x.com/pluggmusic"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow Plugg on X"
              className="p-2.5 rounded-full text-muted-foreground/80 hover:text-foreground hover:bg-white/10 transition-all duration-200 hover:scale-110 active:scale-95"
            >
              <XIcon className="w-5 h-5" />
            </a>
          </div>
        </div>

        {/* Legal Information */}
        <div className="space-y-2.5">
          <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
            Legal Information
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-5 gap-y-2 text-xs sm:text-sm text-muted-foreground">
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors hover:underline underline-offset-4"
            >
              Terms & Conditions
            </a>
            <span className="text-muted-foreground/30 select-none">·</span>
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors hover:underline underline-offset-4"
            >
              Privacy Policy
            </a>
            <span className="text-muted-foreground/30 select-none">·</span>
            <a
              href="/copyright"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors hover:underline underline-offset-4"
            >
              Copyright Reports
            </a>
          </div>
        </div>

        {/* Copyright */}
        <p className="text-xs text-muted-foreground/50 pt-1">
          © 2026 Plugg. All rights reserved.
        </p>
      </footer>

      {/* Delete Confirmation Popup */}
      <AlertDialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <AlertDialogContent className="w-[calc(100%-3rem)] max-w-[360px] sm:max-w-[380px] rounded-3xl bg-card/95 backdrop-blur-xl border border-white/10 p-6 sm:p-7 shadow-2xl ring-1 ring-white/5">
          <AlertDialogHeader className="space-y-3 text-center sm:text-center items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 ring-8 ring-destructive/5 text-destructive mb-1">
              <Trash2 className="h-5 w-5 stroke-[2.2]" />
            </div>
            <AlertDialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-foreground text-center">
              Delete your account?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm text-muted-foreground/90 leading-relaxed text-center px-1">
              Are you sure you want to permanently delete your Plugg account? This action cannot be undone. All your personal data, saved music, playlists, and {isArtist ? "uploaded releases and artist analytics" : "preferences"} will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex flex-col gap-2.5 sm:flex-col sm:space-x-0 w-full">
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                handleDeleteAccount();
              }}
              className="w-full h-11 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 text-sm font-semibold shadow-md shadow-destructive/25 transition-all active:scale-[0.98]"
            >
              {isDeleting ? (
                <>
                  <Loader2 size={15} className="mr-2 animate-spin" /> Deleting…
                </>
              ) : (
                "Yes, delete account"
              )}
            </AlertDialogAction>
            <AlertDialogCancel
              disabled={isDeleting}
              className="w-full h-11 rounded-full bg-secondary/50 hover:bg-secondary text-foreground/80 hover:text-foreground border border-white/5 text-sm font-medium transition-all active:scale-[0.98] mt-0"
            >
              Cancel
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ArtistVerificationModal
        open={showVerificationModal}
        onOpenChange={setShowVerificationModal}
      />
    </div>
  );
}
