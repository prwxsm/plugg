import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Pencil,
  ExternalLink,
  ArrowLeft,
  Check,
  Phone,
  ShieldCheck,
  Settings,
  MapPin,
  Music2,
  Globe,
} from "lucide-react";

import {
  Button,
  EmptyState,
  Field,
  inputClass,
  VerifiedBadge,
} from "@/components/plugg/primitives";
import { ArtistMobileTabs } from "@/components/plugg/artist-mobile-tabs";
import { SettingsPanel } from "@/components/plugg/settings-panel";
import { ProfileImageUpload } from "@/components/plugg/profile-image-upload";
import { ChangeEmailModal } from "@/components/plugg/change-email-modal";
import { ChangePasswordModal } from "@/components/plugg/change-password-modal";
import {
  SocialIconsList,
  InstagramIcon,
  FacebookIcon,
  TikTokIcon,
} from "@/components/plugg/social-icons";
import { art } from "@/data/covers";
import { usePlugg } from "@/state/plugg-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SUPPORTED_COUNTRIES, UGANDA_CITIES } from "@/data/locations";
import { genres } from "@/data/genres";
import { CustomDropdown } from "@/components/plugg/custom-dropdown";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your profile & settings — Plugg" },
      {
        name: "description",
        content:
          "View and edit your Plugg profile — bio, profile photo, location, links, and manage account settings.",
      },
      { property: "og:title", content: "Your profile & settings — Plugg" },
      {
        property: "og:description",
        content: "View and edit your profile and manage account settings on Plugg.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { currentUser, currentArtist, updateArtist, updateUser, playlists, followingArtistIds } = usePlugg();
  const [tab, setTab] = useState<"profile" | "settings">("profile");
  const [isEditing, setIsEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const userPlaylistsCount = playlists.filter((p) => p.userId === currentUser?.id).length;
  const followingCount = followingArtistIds.length;

  // Artist form states
  const [displayName, setDisplayName] = useState(currentArtist?.displayName ?? "");
  const [username, setUsername] = useState(currentArtist?.username ?? "");
  const [bio, setBio] = useState(currentArtist?.bio ?? "");
  const [location, setLocation] = useState(currentArtist?.location ?? "");
  const [country, setCountry] = useState(currentArtist?.country ?? "");
  const [city, setCity] = useState(currentArtist?.city ?? "");
  const [primaryGenre, setPrimaryGenre] = useState(currentArtist?.primaryGenre ?? "");
  const [additionalGenres, setAdditionalGenres] = useState<string[]>(
    currentArtist?.additionalGenres ?? [],
  );
  const [phoneNumber, setPhoneNumber] = useState(currentArtist?.phoneNumber ?? "");
  const [instagram, setInstagram] = useState(currentArtist?.socialLinks.instagram ?? "");
  const [facebook, setFacebook] = useState(currentArtist?.socialLinks.facebook ?? "");
  const [tiktok, setTiktok] = useState(currentArtist?.socialLinks.tiktok ?? "");
  const [avatarKey, setAvatarKey] = useState(currentArtist?.avatarUrl ?? "c1");
  const [email, setEmail] = useState(currentUser?.email ?? "");

  // Listener form states
  const [listenerName, setListenerName] = useState(currentUser?.name ?? "");
  const [listenerUsername, setListenerUsername] = useState(currentUser?.username ?? "");
  const [listenerEmail, setListenerEmail] = useState(currentUser?.email ?? "");
  const [listenerAvatarUrl, setListenerAvatarUrl] = useState(currentUser?.avatarUrl ?? "");

  // Keep form in sync when currentArtist changes/loads
  useEffect(() => {
    if (currentArtist) {
      setDisplayName(currentArtist.displayName || "");
      setUsername(currentArtist.username || "");
      setBio(currentArtist.bio || "");
      setLocation(currentArtist.location || "");
      setCountry(currentArtist.country || "");
      setCity(currentArtist.city || "");
      setPrimaryGenre(currentArtist.primaryGenre || "");
      setAdditionalGenres(currentArtist.additionalGenres || []);
      setPhoneNumber(currentArtist.phoneNumber || "");
      setInstagram(currentArtist.socialLinks.instagram || "");
      setFacebook(currentArtist.socialLinks.facebook || "");
      setTiktok(currentArtist.socialLinks.tiktok || "");
      setAvatarKey(currentArtist.avatarUrl || "c1");
    }
  }, [currentArtist]);

  // Keep listener form in sync when currentUser changes/loads
  useEffect(() => {
    if (currentUser) {
      setEmail(currentUser.email || "");
      setListenerName(currentUser.name || "");
      setListenerUsername(currentUser.username || "");
      setListenerEmail(currentUser.email || "");
      setListenerAvatarUrl(currentUser.avatarUrl || "");
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      window.location.href = "/auth?returnTo=/profile";
    }
  }, [currentUser]);

  if (!currentUser) {
    return (
      <EmptyState
        title="Sign in to view your profile"
        description="Sign in or create an account to view and edit your profile and account settings."
        ctaLabel="Sign in or register"
        ctaTo="/auth"
      />
    );
  }

  const handleResetForm = () => {
    if (currentArtist) {
      setDisplayName(currentArtist.displayName || "");
      setUsername(currentArtist.username || "");
      setEmail(currentUser?.email || "");
      setBio(currentArtist.bio || "");
      setLocation(currentArtist.location || "");
      setCountry(currentArtist.country || "");
      setCity(currentArtist.city || "");
      setPrimaryGenre(currentArtist.primaryGenre || "");
      setAdditionalGenres(currentArtist.additionalGenres || []);
      setPhoneNumber(currentArtist.phoneNumber || "");
      setInstagram(currentArtist.socialLinks.instagram || "");
      setFacebook(currentArtist.socialLinks.facebook || "");
      setTiktok(currentArtist.socialLinks.tiktok || "");
      setAvatarKey(currentArtist.avatarUrl || "c1");
    }
    setIsEditing(false);
  };

  const handleResetListenerForm = () => {
    if (currentUser) {
      setListenerName(currentUser.name || "");
      setListenerUsername(currentUser.username || "");
      setListenerEmail(currentUser.email || "");
      setListenerAvatarUrl(currentUser.avatarUrl || "");
    }
    setIsEditing(false);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentArtist) return;

    const cleanedUsername = username
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "");

    if (cleanedUsername.length < 3 || cleanedUsername.length > 15) {
      toast.error("Username must be between 3 and 15 characters (lowercase letters, numbers, hyphens, underscores).");
      return;
    }

    if (!/^[a-z0-9_-]+$/.test(cleanedUsername)) {
      toast.error("Username can only contain lowercase letters, numbers, hyphens (-), and underscores (_).");
      return;
    }

    const cleanedEmail = email.trim().toLowerCase();
    const computedLocation =
      city && country ? `${city}, ${country}` : city || country || location.trim();

    try {
      if (cleanedEmail && cleanedEmail !== currentUser?.email.toLowerCase()) {
        await updateUser({ email: cleanedEmail });
      }

      await updateArtist({
        displayName: displayName.trim() || currentArtist.displayName,
        username: cleanedUsername,
        bio: bio.trim(),
        location: computedLocation,
        country: country.trim() || undefined,
        city: city.trim() || undefined,
        primaryGenre: primaryGenre.trim() || undefined,
        additionalGenres: additionalGenres,
        avatarUrl: avatarKey,
        phoneNumber: phoneNumber.trim(),
        socialLinks: {
          ...currentArtist.socialLinks,
          instagram: instagram.trim() || undefined,
          facebook: facebook.trim() || undefined,
          tiktok: tiktok.trim() || undefined,
        },
      });

      setSaved(true);
      setIsEditing(false);
      toast.success("Profile details updated successfully!");
      window.setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update profile details");
    }
  };

  const handleSaveListenerProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const cleanedUsername = listenerUsername.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");

    if (cleanedUsername) {
      if (cleanedUsername.length < 3 || cleanedUsername.length > 15) {
        toast.error("Username must be between 3 and 15 characters (lowercase letters, numbers, hyphens, underscores).");
        return;
      }

      if (!/^[a-z0-9_-]+$/.test(cleanedUsername)) {
        toast.error("Username can only contain lowercase letters, numbers, hyphens (-), and underscores (_).");
        return;
      }
    }

    const cleanedEmail = listenerEmail.trim().toLowerCase();

    try {
      await updateUser({
        name: listenerName.trim() || currentUser.name,
        username: cleanedUsername || undefined,
        email: cleanedEmail || currentUser.email,
        avatarUrl: listenerAvatarUrl,
      });

      setSaved(true);
      setIsEditing(false);
      toast.success("Profile details updated successfully!");
      window.setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update profile details");
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-7 pb-12">
      {currentArtist ? <ArtistMobileTabs /> : null}

      {/* Header section */}
      <div>
        <p className="text-eyebrow">{currentArtist ? "Artist profile" : "Your account"}</p>
        <h1 className="mt-1 truncate text-2xl font-semibold sm:text-3xl">
          {currentArtist ? currentArtist.displayName : currentUser.name}
        </h1>
      </div>

      {/* Tabs */}
      <div
        className={cn(
          "inline-flex rounded-full bg-elevated p-1",
          currentArtist && "hidden md:inline-flex",
        )}
      >
        {(["profile", "settings"] as const).map((key) => (
          <button
            key={key}
            onClick={() => {
              setTab(key);
              setIsEditing(false);
            }}
            className={cn(
              "rounded-full px-5 py-2 text-sm font-medium capitalize transition-colors",
              tab === key
                ? "bg-primary text-primary-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {key}
          </button>
        ))}
      </div>

      {tab === "settings" ? (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => {
              setTab("profile");
              setIsEditing(false);
            }}
            className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors md:hidden"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to profile
          </button>
          <SettingsPanel
            onEditProfile={() => {
              setTab("profile");
              setIsEditing(true);
            }}
          />
        </div>
      ) : null}

      {/* Listener Profile View & Edit */}
      {tab === "profile" && !currentArtist ? (
        <div>
          {saved ? (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 px-4 py-3 text-sm text-primary">
              <Check className="h-4 w-4" />
              <span>Profile details updated successfully!</span>
            </div>
          ) : null}

          {!isEditing ? (
            /* CLEAN LISTENER PROFILE DISPLAY */
            <div className="surface-card overflow-hidden rounded-2xl bg-card p-6 shadow-sm sm:p-8 space-y-7">
              <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-6">
                <div className="relative group shrink-0">
                  <img
                    src={art(currentUser.avatarUrl)}
                    alt={currentUser.name}
                    className="h-24 w-24 rounded-full object-cover ring-4 ring-primary/20 shadow-md transition-transform duration-300 group-hover:scale-105 sm:h-28 sm:w-28"
                  />
                </div>

                <div className="min-w-0 flex-1 text-left">
                  <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                    {currentUser.name}
                  </h2>

                  <div className="mt-1 flex items-center gap-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      @{currentUser.username?.replace(/^@/, "") || currentUser.name.toLowerCase().replace(/\s+/g, "")}
                    </p>
                  </div>

                  {/* Public Playlists and Following stats linked to library */}
                  <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground font-medium">
                    <Link
                      to="/library"
                      className="hover:text-foreground transition-colors hover:underline"
                    >
                      {userPlaylistsCount} {userPlaylistsCount === 1 ? "Public Playlist" : "Public Playlists"}
                    </Link>
                    <span>•</span>
                    <Link
                      to="/library"
                      className="hover:text-foreground transition-colors hover:underline"
                    >
                      {followingCount} Following
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* EDIT LISTENER PROFILE VIEW */
            <form
              className="surface-card space-y-6 rounded-2xl bg-card p-6 shadow-sm sm:p-7"
              onSubmit={handleSaveListenerProfile}
            >
              <div className="flex items-center justify-between border-b border-border/60 pb-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleResetListenerForm}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-elevated/60 text-muted-foreground hover:bg-elevated hover:text-foreground"
                    title="Back to profile"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <h2 className="text-lg font-semibold text-foreground">Edit profile</h2>
                </div>
                <button
                  type="button"
                  onClick={handleResetListenerForm}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>

              {/* Profile Image Upload */}
              <ProfileImageUpload
                value={listenerAvatarUrl}
                onChange={(newUrl) => setListenerAvatarUrl(newUrl)}
                label="Profile photo"
                description="Upload an image. We will center and crop it into a crisp HD avatar."
              />

              {/* Full Name */}
              <Field label="Full name" hint="Your display name on Plugg">
                <input
                  value={listenerName}
                  onChange={(e) => setListenerName(e.target.value)}
                  placeholder="e.g. Amani Kariuki"
                  className={inputClass}
                  required
                />
              </Field>

              {/* Username */}
              <Field
                label="Username"
                hint="Lowercase letters, numbers, hyphens, underscores. 3-15 chars"
              >
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-sm font-medium text-muted-foreground">
                    @
                  </div>
                  <input
                    type="text"
                    value={listenerUsername}
                    minLength={3}
                    maxLength={15}
                    onChange={(e) =>
                      setListenerUsername(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9_-]/g, "")
                          .slice(0, 15)
                      )
                    }
                    placeholder="amanik"
                    className={cn(inputClass, "pl-8")}
                  />
                </div>
              </Field>

              {/* Email Address */}
              <Field label="Email address" hint="Your account email used for sign in">
                <div className="space-y-1.5">
                  <div className="flex h-11 w-full items-center rounded-xl border border-input bg-elevated/40 px-3.5 py-2 text-sm text-foreground/90 font-mono shadow-xs select-none">
                    {currentUser.email}
                  </div>
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => setShowEmailModal(true)}
                      className="text-xs font-semibold text-destructive hover:underline transition-colors block text-left cursor-pointer"
                    >
                      Change email
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPasswordModal(true)}
                      className="text-xs font-semibold text-primary hover:underline transition-colors block text-left cursor-pointer"
                    >
                      Reset password
                    </button>
                  </div>
                </div>
              </Field>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResetListenerForm}
                  className="rounded-full px-5"
                >
                  Cancel
                </Button>
                <Button type="submit" className="rounded-full px-6">
                  Save changes
                </Button>
              </div>
            </form>
          )}
        </div>
      ) : null}

      {/* Artist Profile View & Edit */}
      {tab === "profile" && currentArtist ? (
        <div>
          {saved ? (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 px-4 py-3 text-sm text-primary">
              <Check className="h-4 w-4" />
              <span>Profile details updated successfully!</span>
            </div>
          ) : null}

          {!isEditing ? (
            /* CLEAN PROFILE DISPLAY */
            <div className="surface-card overflow-hidden rounded-2xl bg-card p-6 shadow-sm sm:p-8 space-y-7">
              {/* Profile image & Identity Hero */}
              <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-6">
                <div className="relative group shrink-0">
                  <img
                    src={art(currentArtist.avatarUrl)}
                    alt={currentArtist.displayName}
                    className="h-24 w-24 rounded-full object-cover ring-4 ring-primary/20 shadow-md transition-transform duration-300 group-hover:scale-105 sm:h-28 sm:w-28 md:h-32 md:w-32"
                  />
                </div>

                <div className="min-w-0 flex-1 text-left">
                  <div className="flex flex-wrap items-start gap-1.5">
                    <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                      {currentArtist.displayName}
                    </h2>
                    {currentArtist.verified ? (
                      <span
                        className="relative -top-0.5 sm:-top-1 inline-flex shrink-0 self-start"
                        title="Verified artist"
                      >
                        <VerifiedBadge size="md" />
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      @{currentArtist.username.replace(/^@/, "")}
                    </p>
                    {currentArtist.city || currentArtist.country || currentArtist.location ? (
                      <div className="inline-flex items-center gap-1 text-xs text-muted-foreground/90">
                        <span>•</span>
                        <MapPin className="h-3 w-3 text-primary" />
                        <span>
                          {currentArtist.city && currentArtist.country
                            ? `${currentArtist.city}, ${currentArtist.country}`
                            : currentArtist.city || currentArtist.country || currentArtist.location}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  {/* Genres Badges */}
                  {currentArtist.primaryGenre ||
                  (currentArtist.additionalGenres && currentArtist.additionalGenres.length > 0) ? (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {currentArtist.primaryGenre ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">
                          <Music2 className="h-3 w-3" />
                          {currentArtist.primaryGenre}
                        </span>
                      ) : null}
                      {currentArtist.additionalGenres?.map((g) => (
                        <span
                          key={g}
                          className="inline-flex items-center rounded-full bg-elevated px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {/* Actions: Edit Profile and View Public Page */}
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Button
                      onClick={() => setIsEditing(true)}
                      className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium shadow-xs"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit profile
                    </Button>

                    <Link
                      to="/artist/$username"
                      params={{ username: currentArtist.username }}
                      className="inline-flex items-center gap-2 rounded-full bg-elevated/70 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-elevated hover:text-primary"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      View public page
                    </Link>
                  </div>
                </div>
              </div>

              <div className="h-px w-full bg-border/60" />

              {/* Biography Section */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Biography
                  </h3>
                </div>

                {currentArtist.bio && currentArtist.bio.trim().length > 0 ? (
                  <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line sm:text-base">
                    {currentArtist.bio}
                  </p>
                ) : (
                  <p className="text-sm italic text-muted-foreground">
                    No biography written yet. Click &quot;Edit profile&quot; to tell your listeners
                    about yourself.
                  </p>
                )}
              </div>

              {/* Social Media Links Section */}
              <div className="space-y-3 pt-1">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Social media
                </h3>

                {currentArtist.socialLinks &&
                (currentArtist.socialLinks.instagram ||
                  currentArtist.socialLinks.facebook ||
                  currentArtist.socialLinks.tiktok) ? (
                  <SocialIconsList socialLinks={currentArtist.socialLinks} />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No social media links connected. Click &quot;Edit profile&quot; to connect your
                    Instagram, Facebook, or TikTok.
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* EDIT PROFILE VIEW */
            <form
              className="surface-card space-y-6 rounded-2xl bg-card p-6 shadow-sm sm:p-7"
              onSubmit={handleSaveProfile}
            >
              <div className="flex items-center justify-between border-b border-border/60 pb-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-elevated/60 text-muted-foreground hover:bg-elevated hover:text-foreground"
                    title="Back to profile"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <h2 className="text-lg font-semibold text-foreground">Edit artist profile</h2>
                </div>
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>

              {/* Profile Image Upload with Auto-Resolution */}
              <ProfileImageUpload
                value={avatarKey}
                onChange={(newUrl) => setAvatarKey(newUrl)}
                label="Profile picture"
                description="Upload an image. Our system determines the optimal resolution and centers it to a crisp 512 × 512 HD avatar."
              />

              {/* Artist Name */}
              <Field label="Artist name" hint="Your public stage or artist name">
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Mego Bhee"
                  className={inputClass}
                  required
                />
              </Field>

              {/* Username */}
              <Field
                label="Username"
                hint="Lowercase letters, numbers, hyphens, underscores. 3-15 chars"
              >
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-sm font-medium text-muted-foreground">
                    @
                  </div>
                  <input
                    type="text"
                    value={username}
                    minLength={3}
                    maxLength={15}
                    onChange={(e) =>
                      setUsername(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9_-]/g, "")
                          .slice(0, 15)
                      )
                    }
                    placeholder="megobhee"
                    className={cn(inputClass, "pl-8")}
                    required
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Public page:{" "}
                  <span className="font-mono text-foreground/80">
                    /artist/{username || "username"}
                  </span>
                </p>
              </Field>

              {/* Email Address */}
              <Field label="Email address" hint="Your account email used for sign in">
                <div className="space-y-1.5">
                  <div className="flex h-11 w-full items-center rounded-xl border border-input bg-elevated/40 px-3.5 py-2 text-sm text-foreground/90 font-mono shadow-xs select-none">
                    {currentUser.email}
                  </div>
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => setShowEmailModal(true)}
                      className="text-xs font-semibold text-destructive hover:underline transition-colors block text-left cursor-pointer"
                    >
                      Change email
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPasswordModal(true)}
                      className="text-xs font-semibold text-primary hover:underline transition-colors block text-left cursor-pointer"
                    >
                      Reset password
                    </button>
                  </div>
                </div>
              </Field>

              {/* Bio */}
              <Field
                label="Biography"
                hint="A couple of sentences listeners will read on your profile."
              >
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  placeholder="Share your musical journey, influences, and what inspires you..."
                  className={inputClass}
                />
              </Field>

              {/* Country */}
              <Field label="Country" hint="Available across East Africa and partner countries">
                <CustomDropdown
                  value={country}
                  onChange={(newCountry) => {
                    setCountry(newCountry);
                    if (newCountry !== "Uganda" && UGANDA_CITIES.includes(city as any)) {
                      setCity("");
                    }
                  }}
                  placeholder="Select country"
                  options={SUPPORTED_COUNTRIES.map((c) => ({
                    id: c,
                    label: c,
                    icon: Globe,
                  }))}
                />
              </Field>

              {/* City / Hometown (Ugandan towns dropdown if Uganda is selected, otherwise standard text input) */}
              {country === "Uganda" ? (
                <Field
                  label="City / Hometown"
                  hint="Select your hometown or district in Uganda"
                >
                  <CustomDropdown
                    value={city}
                    onChange={setCity}
                    placeholder="Select city or hometown"
                    searchable
                    options={UGANDA_CITIES.map((c) => ({
                      id: c,
                      label: c,
                      icon: MapPin,
                    }))}
                  />
                </Field>
              ) : (
                <Field
                  label="City / Hometown"
                  hint="Your home city or base"
                >
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Nairobi, Lagos, Accra, Johannesburg"
                    className={inputClass}
                  />
                </Field>
              )}

              {/* Primary Music Genre */}
              <Field
                label="Primary music genre"
                hint="Your main musical genre and signature style"
              >
                <CustomDropdown
                  value={primaryGenre}
                  onChange={(newPrimary) => {
                    setPrimaryGenre(newPrimary);
                    setAdditionalGenres((prev) => prev.filter((g) => g !== newPrimary));
                  }}
                  placeholder="Select primary genre"
                  options={genres.map((g) => ({
                    id: g.name,
                    label: g.name,
                    icon: Music2,
                  }))}
                />
              </Field>

              {/* Additional Music Genres (up to 2 maximum, making 3 genres total with primary) */}
              <Field
                label="Additional music genres"
                hint="Add up to 2 additional genres from the system (max 3 genres total with your primary genre)"
              >
                <div className="space-y-2 rounded-xl bg-elevated/30 p-3.5 border border-border/50">
                  <div className="flex flex-wrap gap-2">
                    {genres.map((g) => {
                      const isPrimary = g.name === primaryGenre;
                      const isSelected = additionalGenres.includes(g.name);
                      const isMaxedOut = additionalGenres.length >= 2 && !isSelected;

                      return (
                        <button
                          key={g.id}
                          type="button"
                          disabled={isPrimary}
                          onClick={() => {
                            if (isPrimary) return;
                            if (isSelected) {
                              setAdditionalGenres((prev) => prev.filter((item) => item !== g.name));
                            } else {
                              if (additionalGenres.length >= 2) {
                                toast.error("You can select at most 2 additional genres (3 genres total).");
                                return;
                              }
                              setAdditionalGenres((prev) => [...prev, g.name]);
                            }
                          }}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all active:scale-95",
                            isPrimary
                              ? "bg-primary/20 text-primary border border-primary/30 cursor-not-allowed opacity-80"
                              : isSelected
                                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                                : isMaxedOut
                                  ? "bg-elevated/40 text-muted-foreground/60 border border-border/40 hover:border-border cursor-pointer"
                                  : "bg-elevated text-foreground hover:bg-elevated/80 border border-border/60 hover:border-border cursor-pointer"
                          )}
                        >
                          {isPrimary ? (
                            <span className="flex items-center gap-1">
                              <Check className="h-3 w-3 text-primary" /> {g.name}{" "}
                              <span className="text-[10px] opacity-75">(Primary)</span>
                            </span>
                          ) : isSelected ? (
                            <span className="flex items-center gap-1">
                              <Check className="h-3 w-3" /> {g.name}
                            </span>
                          ) : (
                            <span>+ {g.name}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                    <span>
                      {additionalGenres.length} of 2 additional genres selected
                    </span>
                    <span className="font-medium text-foreground/80">
                      Total: {(primaryGenre ? 1 : 0) + additionalGenres.length} / 3 genres
                    </span>
                  </div>
                </div>
              </Field>

              {/* Phone number (Private) */}
              <Field
                label="Phone number"
                hint="Private contact for management & booking inquiries. This will NOT be shown on your profile."
              >
                <div className="relative">
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+254 700 000 000"
                    className={cn(inputClass, "pl-10")}
                  />
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <ShieldCheck className="h-3 w-3 text-emerald-500" />
                  <span>Confidential — hidden from public listener views</span>
                </div>
              </Field>

              {/* Social Media Links (Instagram, Facebook, TikTok ONLY) */}
              <div className="space-y-4 rounded-xl bg-elevated/30 p-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Social media links</h3>
                  <p className="text-xs text-muted-foreground">
                    Connect your IG, Facebook, and TikTok. Only the official icons are displayed on
                    your profile.
                  </p>
                </div>

                <div className="space-y-3.5">
                  {/* Instagram */}
                  <div>
                    <label className="mb-1 flex items-center gap-2 text-xs font-medium text-foreground">
                      <InstagramIcon className="h-3.5 w-3.5 text-[#E4405F]" />
                      <span>Instagram</span>
                    </label>
                    <input
                      type="text"
                      value={instagram}
                      onChange={(e) => setInstagram(e.target.value)}
                      placeholder="@username or https://instagram.com/username"
                      className={inputClass}
                    />
                  </div>

                  {/* Facebook */}
                  <div>
                    <label className="mb-1 flex items-center gap-2 text-xs font-medium text-foreground">
                      <FacebookIcon className="h-3.5 w-3.5 text-[#1877F2]" />
                      <span>Facebook</span>
                    </label>
                    <input
                      type="text"
                      value={facebook}
                      onChange={(e) => setFacebook(e.target.value)}
                      placeholder="username or https://facebook.com/username"
                      className={inputClass}
                    />
                  </div>

                  {/* TikTok */}
                  <div>
                    <label className="mb-1 flex items-center gap-2 text-xs font-medium text-foreground">
                      <TikTokIcon className="h-3.5 w-3.5 text-[#25F4EE]" />
                      <span>TikTok</span>
                    </label>
                    <input
                      type="text"
                      value={tiktok}
                      onChange={(e) => setTiktok(e.target.value)}
                      placeholder="@username or https://tiktok.com/@username"
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-3">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="rounded-full px-5 py-2.5 text-sm font-medium text-muted-foreground hover:bg-elevated hover:text-foreground transition-colors"
                >
                  Cancel
                </button>

                <Button type="submit" className="rounded-full px-6 py-2.5">
                  Save changes
                </Button>
              </div>
            </form>
          )}
        </div>
      ) : null}

      {/* Mobile Settings Button (visible on mobile only, when on profile view and not editing) */}
      {tab === "profile" && !isEditing ? (
        <div className="pt-2 md:hidden">
          <button
            type="button"
            onClick={() => setTab("settings")}
            className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-card px-5 py-3.5 text-sm font-medium text-foreground transition-colors hover:bg-elevated hover:text-primary active:scale-[0.99] shadow-xs"
          >
            <Settings className="h-4 w-4 text-muted-foreground" />
            <span>Settings</span>
          </button>
        </div>
      ) : null}

      <ChangeEmailModal
        open={showEmailModal}
        onOpenChange={setShowEmailModal}
        currentEmail={currentUser.email}
        onSuccess={(newEmail) => {
          setEmail(newEmail);
          setListenerEmail(newEmail);
        }}
      />

      <ChangePasswordModal
        open={showPasswordModal}
        onOpenChange={setShowPasswordModal}
      />
    </div>
  );
}
