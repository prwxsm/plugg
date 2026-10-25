import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  CheckCircle2,
  Headphones,
  Mic,
  ArrowLeft,
  Eye,
  EyeOff,
  Globe,
  Music2,
  X,
} from "lucide-react";

import logo from "@/assets/logo.png";
import { Button, Field, inputClass } from "@/components/plugg/primitives";
import { cn } from "@/lib/utils";
import { loginUser, registerUser } from "@/server-fns/auth-functions";
import { SUPPORTED_COUNTRIES } from "@/data/locations";
import { genres } from "@/data/genres";
import { CustomDropdown } from "@/components/plugg/custom-dropdown";
import { ForgotPasswordModal } from "@/components/plugg/forgot-password-modal";

export interface AuthSearch {
  returnTo?: string;
  mode?: "signin" | "signup";
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
    const modeRaw = search["mode"];
    const result: AuthSearch = {};
    if (typeof raw === "string" && raw.trim().length > 0) {
      result.returnTo = raw;
    }
    if (modeRaw === "signin" || modeRaw === "signup") {
      result.mode = modeRaw;
    }
    return result;
  },
  component: AuthPage,
});

type AccountType = "listener" | "artist";

function AuthCardWrapper({
  children,
  onClose,
  maxWidth = "max-w-md",
}: {
  children: ReactNode;
  onClose: () => void;
  maxWidth?: string;
}) {
  return (
    <>
      {/* Mobile solid view: 100% full screen solid page */}
      <div className="md:hidden h-full w-full min-h-screen overflow-y-auto bg-background px-5 py-10 flex flex-col items-center justify-center">
        <div className="w-full max-w-sm my-auto">{children}</div>
      </div>

      {/* Desktop overlay modal view: floating card over blurred background */}
      <div
        className="hidden md:flex fixed inset-0 z-[100] items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <div
          className={cn(
            "relative z-10 w-full rounded-3xl border border-border/80 bg-surface/95 p-6 sm:p-8 shadow-2xl backdrop-blur-xl ring-1 ring-white/10 my-auto max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-200",
            maxWidth,
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top-right close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 sm:right-6 sm:top-6 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-elevated hover:text-foreground transition-colors"
            title="Close (Esc)"
            aria-label="Close"
          >
            <X size={18} />
          </button>

          {children}
        </div>
      </div>
    </>
  );
}


function AuthPage() {
  const { returnTo, mode: searchMode } = useSearch({ from: "/auth" });
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">(searchMode === "signup" ? "signup" : "signin");
  const [accountType, setAccountType] = useState<AccountType | null>(null);

  const handleClose = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    } else {
      const target = returnTo && !returnTo.startsWith("/auth") ? returnTo : "/";
      navigate({ to: target as any });
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [returnTo]);


  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Artist-specific fields
  const [artistName, setArtistName] = useState("");
  const [country, setCountry] = useState("");
  const [primaryGenre, setPrimaryGenre] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);

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
        const res = await loginUser({ data: { identifier: email, password } });
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
    setShowPassword(false);
    setShowConfirmPassword(false);
    setAccountType(null);
    setMode(newMode);
  };

  // ── Sign-up: Account type selection step ──
  if (mode === "signup" && accountType === null) {
    return (
      <AuthCardWrapper onClose={handleClose} maxWidth="max-w-md">
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
            key="select-listener-card"
            type="button"
            onClick={() => setAccountType("listener")}
            className="group relative flex items-start gap-4 rounded-2xl border border-border/60 bg-surface p-5 text-left transition-[border-color,background-color,box-shadow,transform] duration-200 hover:border-primary/40 hover:bg-elevated/40 hover:shadow-md active:scale-[0.99]"
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
            key="select-artist-card"
            type="button"
            onClick={() => setAccountType("artist")}
            className="group relative flex items-start gap-4 rounded-2xl border border-border/60 bg-surface p-5 text-left transition-[border-color,background-color,box-shadow,transform] duration-200 hover:border-primary/40 hover:bg-elevated/40 hover:shadow-md active:scale-[0.99]"
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
      </AuthCardWrapper>
    );
  }

  // ── Sign-in & Sign-up forms ──
  return (
    <>
      <AuthCardWrapper
        onClose={handleClose}
        maxWidth={mode === "signup" && accountType === "artist" ? "max-w-lg" : "max-w-md"}
      >
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
            ? "Sign in with your email or username and password to access your library."
            : accountType === "artist"
              ? "Set up your artist profile to start publishing music."
              : "Sign up to stream, save, and discover African music."}
        </p>

        {/* Account type badge for signup */}
        {mode === "signup" && accountType ? (
          <div className="mt-4 flex justify-center">
            <button
              key="account-type-change-badge"
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

          <Field label={mode === "signin" ? "Email address or username" : "Email address"}>
            <input
              type={mode === "signin" ? "text" : "email"}
              className={inputClass}
              placeholder={mode === "signin" ? "you@domain.com or username" : "you@domain.com"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoCapitalize="none"
              autoCorrect="off"
            />
          </Field>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Password</span>
              {mode === "signin" ? (
                <button
                  type="button"
                  onClick={() => setForgotPasswordOpen(true)}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors hover:underline focus:outline-none"
                >
                  Forgot password?
                </button>
              ) : null}
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className={cn(inputClass, "pr-7")}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 cursor-pointer focus:outline-none"
                title={showPassword ? "Hide password" : "Show password"}
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {mode === "signup" ? (
            <Field label="Confirm password">
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className={cn(inputClass, "pr-7")}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 cursor-pointer focus:outline-none"
                  title={showConfirmPassword ? "Hide password" : "Show password"}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>
          ) : null}

          {/* Artist Country, Primary Genre, and Legal Terms Agreement */}
          {mode === "signup" && accountType === "artist" ? (
            <>
              <Field label="Country" hint="Available across East Africa and select partner regions">
                <CustomDropdown
                  value={country}
                  onChange={setCountry}
                  placeholder="Select your country"
                  options={SUPPORTED_COUNTRIES.map((c) => ({
                    id: c,
                    label: c,
                    icon: Globe,
                  }))}
                />
              </Field>

              <Field label="Primary music genre" hint="Choose the primary genre that best defines your sound">
                <CustomDropdown
                  value={primaryGenre}
                  onChange={setPrimaryGenre}
                  placeholder="Select primary genre"
                  options={genres.map((g) => ({
                    id: g.name,
                    label: g.name,
                    icon: Music2,
                  }))}
                />
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
                    <a
                      href="/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
                    >
                      Terms & Conditions
                    </a>
                    {", "}
                    <a
                      href="/copyright"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
                    >
                      Music Upload Policy
                    </a>
                    {", and "}
                    <a
                      href="/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
                    >
                      Privacy Policy
                    </a>
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
      </AuthCardWrapper>

      <ForgotPasswordModal
        open={forgotPasswordOpen}
        onOpenChange={setForgotPasswordOpen}
        initialEmail={email.includes("@") ? email : ""}
        onSuccess={(resetEmail) => {
          setEmail(resetEmail);
          setPassword("");
          setSuccessMessage("Password reset successfully. Please sign in with your new password.");
        }}
      />
    </>
  );
}
