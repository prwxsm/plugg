import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, Mic, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button, VerifiedBadge } from "@/components/plugg/primitives";
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
  const { session, currentUser, currentArtist, signOut, deleteAccount, settings, updateSettings, networkQuality } = usePlugg();
  const isArtist = session === "loggedInArtist" || currentUser?.accountType === "artist";
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
      <section className="surface-card p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <p className="text-eyebrow">Account</p>
          {currentUser ? (
            <button
              type="button"
              onClick={() => {
                if (onEditProfile) {
                  onEditProfile();
                } else {
                  window.location.href = "/profile";
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-elevated/70 px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-elevated hover:text-primary"
              title="Edit profile"
            >
              <Pencil size={12} />
              <span>Edit profile</span>
            </button>
          ) : null}
        </div>

        {currentUser ? (
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-4">
              <img
                src={art(currentArtist?.avatarUrl ?? currentUser.avatarUrl)}
                alt={currentUser.name}
                className="h-14 w-14 rounded-full object-cover ring-2 ring-primary/20 shadow-md shrink-0"
              />
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <p className="text-base font-semibold text-foreground truncate">{currentUser.name}</p>
                  {currentArtist?.verified ? (
                    <span className="relative -top-0.5 inline-flex shrink-0 self-start" title="Verified Plugg Artist">
                      <VerifiedBadge size="sm" />
                    </span>
                  ) : null}
                </div>
                <p className="text-sm text-muted-foreground truncate">{currentUser.email}</p>
              </div>
            </div>

            {isArtist ? (
              <div className="rounded-xl bg-primary/5 p-4 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary capitalize">
                    {currentArtist?.verified ? (
                      <>
                        <VerifiedBadge size="xs" />
                        <span>Verified Plugg Artist</span>
                      </>
                    ) : (
                      <>
                        <Mic size={12} strokeWidth={2} />
                        <span>Artist Account</span>
                      </>
                    )}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground pt-1">
                  {currentArtist?.verified
                    ? "Your verified Plugg artist account is officially confirmed. Unlocks music uploads, your public artist profile, and real-time streaming analytics."
                    : "Your artist account unlocks music uploads, your public artist profile, and real-time streaming analytics."}
                </p>
                <div className="pt-2 flex gap-3">
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                  >
                    Go to Artist Dashboard →
                  </Link>
                </div>
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

            <div className="pt-2">
              <Button
                variant="outline"
                className="px-4 py-1.5 text-xs text-destructive hover:bg-destructive/10 border-border hover:border-destructive/40 transition-colors"
                onClick={signOut}
              >
                <span className="text-destructive font-medium">Sign out</span>
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

          {/* Streaming Quality: Adaptive vs Data Saver */}
          <div className="py-2 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Streaming audio quality</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {settings.streamingQuality === "data_saver"
                  ? "Data Saver active (reduced data usage for metered connections)"
                  : "Adaptive streaming (automatically optimizes playback quality)"}
              </p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <span
                className={cn(
                  "text-xs font-medium cursor-pointer transition-colors",
                  settings.streamingQuality !== "data_saver"
                    ? "text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => {
                  updateSettings({ streamingQuality: "auto" });
                  toast.success("Streaming set to Adaptive");
                }}
              >
                Adaptive
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={settings.streamingQuality === "data_saver"}
                onClick={() => {
                  const isSaver = settings.streamingQuality === "data_saver";
                  const next = isSaver ? "auto" : "data_saver";
                  updateSettings({
                    streamingQuality: next,
                    highQualityStreaming: next === "auto",
                  });
                  toast.success(next === "data_saver" ? "Data Saver enabled" : "Adaptive streaming enabled");
                }}
                className={cn(
                  "h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 cursor-pointer",
                  settings.streamingQuality === "data_saver" ? "bg-primary" : "bg-elevated"
                )}
              >
                <span
                  className={cn(
                    "block h-5 w-5 rounded-full transition-transform duration-200",
                    settings.streamingQuality === "data_saver"
                      ? "translate-x-5 bg-background shadow-xs"
                      : "translate-x-0 bg-white shadow-xs"
                  )}
                />
              </button>
              <span
                className={cn(
                  "text-xs font-medium cursor-pointer transition-colors",
                  settings.streamingQuality === "data_saver"
                    ? "text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => {
                  updateSettings({ streamingQuality: "data_saver", highQualityStreaming: false });
                  toast.success("Streaming set to Data Saver");
                }}
              >
                Data Saver
              </span>
            </div>
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
    </div>
  );
}
