import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, Mic, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/plugg/primitives";
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
  const { session, currentUser, currentArtist, signOut, deleteAccount, settings, updateSettings } = usePlugg();
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
                <p className="text-base font-semibold text-foreground truncate">{currentUser.name}</p>
                <p className="text-sm text-muted-foreground truncate">{currentUser.email}</p>
              </div>
            </div>

            {isArtist ? (
              <div className="rounded-xl bg-primary/5 p-4 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary capitalize">
                    <Mic size={12} strokeWidth={2} /> Artist Account
                  </span>
                </div>
                <p className="text-xs text-muted-foreground pt-1">
                  Your artist account unlocks music uploads, your public artist profile, and real-time streaming analytics.
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

          <div>
            <Toggle
              label="Crossfade"
              hint="Blend the last seconds of one song into the next."
              checked={settings.crossfade}
              onCheckedChange={(val) => {
                updateSettings({ crossfade: val });
                toast.success(
                  val
                    ? `Crossfade enabled (${settings.crossfadeSeconds}s smooth blend)`
                    : "Crossfade disabled",
                );
              }}
            />
            {settings.crossfade && (
              <div className="pb-4 pt-1 px-1 space-y-2 text-xs text-muted-foreground animate-in fade-in duration-200">
                <div className="flex items-center justify-between font-medium">
                  <span>Crossfade transition length</span>
                  <span className="font-mono text-foreground font-semibold">
                    {settings.crossfadeSeconds} seconds
                  </span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={12}
                  step={1}
                  value={settings.crossfadeSeconds}
                  onChange={(e) => {
                    const sec = Number(e.target.value);
                    updateSettings({ crossfadeSeconds: sec });
                  }}
                  className="w-full accent-primary h-1.5 bg-elevated rounded-lg cursor-pointer"
                  aria-label="Crossfade duration in seconds"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>2s (subtle)</span>
                  <span>6s</span>
                  <span>12s (long blend)</span>
                </div>
              </div>
            )}
          </div>

          <Toggle
            label="High quality streaming"
            hint="Stream high fidelity 320 kbps audio with intelligent pre-buffering."
            checked={settings.highQualityStreaming}
            onCheckedChange={(val) => {
              updateSettings({ highQualityStreaming: val });
              toast.success(
                val
                  ? "High quality streaming enabled (320 kbps audio)"
                  : "Standard audio streaming active",
              );
            }}
          />
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

      {/* Centered Brand, Social & Legal Info Footer (No Card) */}
      <footer className="pt-8 sm:pt-10 pb-4 text-center flex flex-col items-center justify-center space-y-5 select-none">
        {/* Tagline & Operator */}
        <div className="space-y-1">
          <p className="text-sm font-semibold tracking-tight text-foreground sm:text-base">
            Discover music. Support creators.
          </p>
          <p className="text-xs text-muted-foreground">
            Operated by Atedo · Pakwach, Uganda
          </p>
        </div>

        {/* Follow Plugg & Social Links */}
        <div className="space-y-2 max-w-md mx-auto">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
            Follow Plugg
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed px-4">
            Stay connected for new releases, featured artists, and platform announcements.
          </p>
          <div className="flex items-center justify-center gap-2 pt-1">
            <a
              href="https://instagram.com/pluggmusic"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow Plugg on Instagram"
              className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all duration-150 hover:scale-110 active:scale-95"
            >
              <InstagramIcon className="w-4 h-4" />
            </a>
            <a
              href="https://tiktok.com/@pluggmusic"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow Plugg on TikTok"
              className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all duration-150 hover:scale-110 active:scale-95"
            >
              <TikTokIcon className="w-4 h-4" />
            </a>
            <a
              href="https://facebook.com/pluggmusic"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow Plugg on Facebook"
              className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all duration-150 hover:scale-110 active:scale-95"
            >
              <FacebookIcon className="w-4 h-4" />
            </a>
            <a
              href="https://youtube.com/@pluggmusic"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow Plugg on YouTube"
              className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all duration-150 hover:scale-110 active:scale-95"
            >
              <YouTubeIcon className="w-4 h-4" />
            </a>
            <a
              href="https://x.com/pluggmusic"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow Plugg on X"
              className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all duration-150 hover:scale-110 active:scale-95"
            >
              <XIcon className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Legal Information */}
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            Legal Information
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <a
              href="/documents/Plugg_Terms_and_Conditions.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors hover:underline underline-offset-4"
            >
              Terms & Conditions
            </a>
            <span className="text-muted-foreground/40 select-none">·</span>
            <a
              href="/documents/Plugg_Privacy_Policy.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors hover:underline underline-offset-4"
            >
              Privacy Policy
            </a>
            <span className="text-muted-foreground/40 select-none">·</span>
            <a
              href="/documents/Plugg_Terms_and_Conditions.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors hover:underline underline-offset-4"
            >
              Copyright Reports
            </a>
          </div>
        </div>

        {/* Copyright */}
        <p className="text-[11px] text-muted-foreground/50">
          © 2026 Plugg. All rights reserved.
        </p>
      </footer>

      {/* Delete Confirmation Popup */}
      <AlertDialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <AlertDialogContent className="max-w-md rounded-2xl bg-card border border-border p-6 shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-foreground">
              Delete your account?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed mt-2">
              Are you sure you want to permanently delete your Plugg account? This action cannot be undone. All your personal data, saved music, playlists, and {isArtist ? "uploaded releases and artist analytics" : "preferences"} will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
            <AlertDialogCancel
              disabled={isDeleting}
              className="rounded-full px-5 text-xs font-medium"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                handleDeleteAccount();
              }}
              className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 px-5 text-xs font-semibold"
            >
              {isDeleting ? (
                <>
                  <Loader2 size={13} className="mr-2 animate-spin" /> Deleting…
                </>
              ) : (
                "Yes, delete account"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
