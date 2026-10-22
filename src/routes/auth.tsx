import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, Headphones, Mic, ArrowLeft } from "lucide-react";

import logo from "@/assets/logo.png";
import { Button, Field, inputClass } from "@/components/plugg/primitives";
import { cn } from "@/lib/utils";
import { loginUser, registerUser } from "@/server-fns/auth-functions";
import { SUPPORTED_COUNTRIES } from "@/data/locations";
import { genres } from "@/data/genres";
import { DocumentViewerModal } from "@/components/plugg/document-viewer-modal";

export interface AuthSearch {
  returnTo?: string;
}

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in - Plugg" },
      {
        name: "description",
        content: "Sign in to stream African and East African music on Plugg.",
      },
      { property: "og:title", content: "Sign in - Plugg" },
      { property: "og:description", content: "Sign in to your Plugg account." },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): AuthSearch => {
    const raw = search["returnTo"];
    if (typeof raw === "string" && raw.trim().length > 0) {
      return { returnTo: raw };
    }
    return {};
  },
  component: AuthPage,
});

type AccountType = "listener" | "artist";

function AuthPage() {
  const { returnTo } = useSearch({ from: "/auth" });
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [accountType, setAccountType] = useState<AccountType | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Artist-specific fields
  const [artistName, setArtistName] = useState("");
  const [country, setCountry] = useState("");
  const [primaryGenre, setPrimaryGenre] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [viewingDocId, setViewingDocId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (mode === "signup") {
      if (password !== confirmPassword) {
        setError("Passwords do not match. Please verify your password.");
        return;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters long.");
        return;
      }
      if (accountType === "artist") {
        if (!artistName.trim()) {
          setError("Please enter your artist / stage name.");
          return;
        }
        if (!country.trim()) {
          setError("Please select your country.");
          return;
        }
        if (!primaryGenre.trim()) {
          setError("Please select your primary music genre.");
          return;
        }
        if (!acceptTerms) {
          setError("You must accept the Terms & Conditions and Music Upload Policy to continue.");
          return;
        }
      }
    }

    setLoading(true);

    try {
      if (mode === "signin") {
        const res = await loginUser({ data: { email, password } });
        if (res.success) {
          // Redirect to returnTo if provided, otherwise role-based redirect
          if (returnTo) {
            window.location.href = returnTo;
          } else {
            window.location.href = res.role === "artist" ? "/dashboard" : "/";
          }
        }
      } else {
        const payload: {
          name: string;
          email: string;
          password: string;
          confirmPassword: string;
          accountType: "listener" | "artist";
          artistName?: string;
          country?: string;
          primaryGenre?: string;
          acceptTerms?: boolean;
        } = {
          name,
          email,
          password,
          confirmPassword,
          accountType: accountType || "listener",
        };
        if (accountType === "artist") {
          payload.artistName = artistName.trim();
          payload.country = country.trim();
          payload.primaryGenre = primaryGenre.trim();
          payload.acceptTerms = acceptTerms;
        }

        const res = await registerUser({
          data: payload,
        });
        if (res.success) {
          // Auto-login means we redirect immediately after registration
          if (returnTo) {
            window.location.href = returnTo;
          } else {
            window.location.href = res.role === "artist" ? "/dashboard" : "/";
          }
        }
      }
    } catch (err: any) {
      setError(err?.message || "Authentication failed. Please check your details.");
      setLoading(false);
    }
  };

  const resetToAccountSelection = () => {
    setAccountType(null);
    setError(null);
    setSuccessMessage(null);
  };

  const switchMode = (newMode: "signin" | "signup") => {
    setError(null);
    setSuccessMessage(null);
    setPassword("");
    setConfirmPassword("");
    setAccountType(null);
    setMode(newMode);
  };

  // ── Sign-up: Account type selection step ──
  if (mode === "signup" && accountType === null) {
    return (
      <div className="h-full w-full overflow-y-auto bg-background px-5">
        <div className="flex min-h-full w-full flex-col items-center py-10 sm:py-16">
          <div className="my-auto w-full max-w-md">
            <div className="flex justify-center">
              <Link
                to="/"
                className="inline-block transition-transform hover:scale-105 active:scale-95"
                title="Plugg home"
              >
                <img src={logo} alt="Plugg" className="h-10 w-10 object-contain" />
              </Link>
            </div>
            <h1 className="mt-5 text-center text-xl font-semibold">
              How will you use Plugg?
            </h1>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Select your account type to get started.
            </p>

            <div className="mt-8 grid gap-4">
              {/* Listener option */}
              <button
                type="button"
                onClick={() => setAccountType("listener")}
                className="group relative flex items-start gap-4 rounded-2xl border border-border/60 bg-surface p-5 text-left transition-all duration-200 hover:border-primary/40 hover:bg-elevated/40 hover:shadow-md active:scale-[0.99]"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-105">
                  <Headphones size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold text-foreground">Listener</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    Stream, discover, save, and engage with music. Build your library and follow your
                    favorite artists.
                  </p>
                </div>
              </button>

              {/* Artist option */}
              <button
                type="button"
                onClick={() => setAccountType("artist")}
                className="group relative flex items-start gap-4 rounded-2xl border border-border/60 bg-surface p-5 text-left transition-all duration-200 hover:border-primary/40 hover:bg-elevated/40 hover:shadow-md active:scale-[0.99]"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-105">
                  <Mic size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold text-foreground">Artist</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    Publish music, manage releases, reach listeners, and track your growth with the
                    Artist Dashboard.
                  </p>
                </div>
              </button>
            </div>

            <p className="mt-8 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <button
                type="button"
                className="font-medium text-primary hover:underline"
                onClick={() => switchMode("signin")}
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Sign-in & Sign-up forms ──
  return (
    <div className="h-full w-full overflow-y-auto bg-background px-5">
      <div className="flex min-h-full w-full flex-col items-center py-10 sm:py-16">
        <div className="my-auto w-full max-w-sm">
          <div className="flex justify-center">
            <Link
              to="/"
              className="inline-block transition-transform hover:scale-105 active:scale-95"
              title="Plugg home"
            >
              <img src={logo} alt="Plugg" className="h-10 w-10 object-contain" />
            </Link>
          </div>
          <h1 className="mt-5 text-center text-xl font-semibold">
            {mode === "signin"
              ? "Welcome back"
              : accountType === "artist"
                ? "Create your artist account"
                : "Create your listener account"}
          </h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">
          {mode === "signin"
            ? "Sign in with your email and password to access your library."
            : accountType === "artist"
              ? "Set up your artist profile to start publishing music."
              : "Sign up to stream, save, and discover African music."}
        </p>

        {/* Account type badge for signup */}
        {mode === "signup" && accountType ? (
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={resetToAccountSelection}
              className="inline-flex items-center gap-2 rounded-full bg-elevated px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft size={12} />
              {accountType === "artist" ? (
                <>
                  <Mic size={13} className="text-primary" /> Artist account
                </>
              ) : (
                <>
                  <Headphones size={13} className="text-primary" /> Listener account
                </>
              )}
              <span className="text-muted-foreground/60">· Change</span>
            </button>
          </div>
        ) : null}

        {successMessage && (
          <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-emerald-500/10 p-3.5 text-xs text-emerald-400">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-xl bg-destructive/15 p-3.5 text-xs text-destructive">
            {error}
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {mode === "signup" ? (
            <Field label="Full name">
              <input
                className={inputClass}
                placeholder="e.g. Amani Kariuki"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </Field>
          ) : null}

          {/* Artist Stage Name */}
          {mode === "signup" && accountType === "artist" ? (
            <Field label="Artist / Stage name" hint="This is the name listeners will see on your songs.">
              <input
                className={inputClass}
                placeholder="e.g. Zuri Mwangi"
                value={artistName}
                onChange={(e) => setArtistName(e.target.value)}
                required
              />
            </Field>
          ) : null}

          <Field label="Email address">
            <input
              type="email"
              className={inputClass}
              placeholder="you@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>

          <Field label="Password">
            <input
              type="password"
              className={inputClass}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </Field>

          {mode === "signup" ? (
            <Field label="Confirm password">
              <input
                type="password"
                className={inputClass}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </Field>
          ) : null}

          {/* Artist Country, Primary Genre, and Legal Terms Agreement */}
          {mode === "signup" && accountType === "artist" ? (
            <>
              <Field label="Country" hint="Available across East Africa and select partner regions">
                <select
                  className={cn(inputClass, "cursor-pointer bg-surface")}
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  required
                >
                  <option value="" disabled>
                    Select your country
                  </option>
                  {SUPPORTED_COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Primary music genre" hint="Choose the primary genre that best defines your sound">
                <select
                  className={cn(inputClass, "cursor-pointer bg-surface")}
                  value={primaryGenre}
                  onChange={(e) => setPrimaryGenre(e.target.value)}
                  required
                >
                  <option value="" disabled>
                    Select primary genre
                  </option>
                  {genres.map((g) => (
                    <option key={g.id} value={g.name}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </Field>

              {/* Accept Terms & Music Upload Policy */}
              <div className="pt-2 rounded-xl bg-elevated/40 p-3.5 border border-border/60">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-input bg-surface text-primary accent-primary focus:ring-ring cursor-pointer"
                    required
                  />
                  <span className="text-xs leading-relaxed text-muted-foreground group-hover:text-foreground/90 transition-colors">
                    I agree to the{" "}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setViewingDocId("terms");
                      }}
                      className="font-medium text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
                    >
                      Terms & Conditions
                    </button>
                    {", "}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setViewingDocId("upload-policy");
                      }}
                      className="font-medium text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
                    >
                      Music Upload Policy
                    </button>
                    {", and "}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setViewingDocId("privacy");
                      }}
                      className="font-medium text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
                    >
                      Privacy Policy
                    </button>
                    .
                  </span>
                </label>
              </div>
            </>
          ) : null}

          <Button type="submit" className="w-full py-2.5 mt-2" disabled={loading}>
            {loading
              ? "Please wait…"
              : mode === "signin"
                ? "Sign in"
                : accountType === "artist"
                  ? "Create artist account"
                  : "Create account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "signin" ? "New to Plugg?" : "Already have an account?"}{" "}
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </div>
    </div>

    <DocumentViewerModal
      documentId={viewingDocId}
      onClose={() => setViewingDocId(null)}
    />
  </div>
  );
}
