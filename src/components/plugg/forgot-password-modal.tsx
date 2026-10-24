import { useState } from "react";
import { KeyRound, Mail, CheckCircle2, ArrowLeft, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button, Field, inputClass } from "@/components/plugg/primitives";
import { cn } from "@/lib/utils";
import {
  requestPasswordResetCodeFn,
  resetPasswordWithCodeFn,
} from "@/server-fns/auth-functions";

interface ForgotPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialEmail?: string;
  onSuccess?: (email: string) => void;
}

export function ForgotPasswordModal({
  open,
  onOpenChange,
  initialEmail = "",
  onSuccess,
}: ForgotPasswordModalProps) {
  const [step, setStep] = useState<"email" | "reset" | "success">("email");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetState = () => {
    setStep("email");
    setCode("");
    setNewPassword("");
    setConfirmPassword("");
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setError(null);
    setLoading(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      resetState();
    } else if (initialEmail && !email) {
      setEmail(initialEmail);
    }
    onOpenChange(isOpen);
  };

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await requestPasswordResetCodeFn({ data: { email: cleanEmail } });
      setStep("reset");
      toast.success(
        `Verification code sent to ${cleanEmail}!${res.code ? ` (Test code: ${res.code})` : ""}`,
        { duration: 8000 }
      );
    } catch (err: any) {
      setError(err?.message || "Could not request password reset code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanCode = code.trim();
    if (!cleanCode) {
      setError("Please enter the 6-digit verification code sent to your email.");
      return;
    }

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please verify both passwords.");
      return;
    }

    setLoading(true);
    try {
      await resetPasswordWithCodeFn({
        data: {
          email: email.trim().toLowerCase(),
          code: cleanCode,
          newPassword,
          confirmPassword,
        },
      });
      setStep("success");
      toast.success("Password reset successfully!");
    } catch (err: any) {
      setError(err?.message || "Failed to reset password. Please verify the code.");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    const finalEmail = email.trim().toLowerCase();
    handleOpenChange(false);
    if (onSuccess) {
      onSuccess(finalEmail);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md rounded-2xl bg-card border border-border p-6 shadow-2xl">
        {step === "email" && (
          <form onSubmit={handleRequestCode} className="space-y-4">
            <DialogHeader className="text-left space-y-1.5">
              <div className="flex items-center gap-2 text-primary">
                <KeyRound className="h-5 w-5" />
                <DialogTitle className="text-lg font-bold text-foreground">
                  Forgot password
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                Enter your account email address. We will send you a 6-digit verification code to reset your password.
              </DialogDescription>
            </DialogHeader>

            <Field label="Email address" hint="The email address you used to register on Plugg">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                placeholder="you@domain.com"
                className={inputClass}
                required
                autoFocus
              />
            </Field>

            {error ? (
              <div className="rounded-xl bg-destructive/15 p-3 text-xs text-destructive">
                {error}
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-full text-xs"
                onClick={() => handleOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-full text-xs font-semibold"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={13} className="mr-1.5 animate-spin" /> Sending code…
                  </>
                ) : (
                  "Send reset code"
                )}
              </Button>
            </div>
          </form>
        )}

        {step === "reset" && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <DialogHeader className="text-left space-y-1.5">
              <div className="flex items-center gap-2 text-primary">
                <Mail className="h-5 w-5" />
                <DialogTitle className="text-lg font-bold text-foreground">
                  Reset password
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                Code sent to <span className="font-medium text-foreground">{email}</span>. Enter the code and choose a new password.
              </DialogDescription>
            </DialogHeader>

            <Field label="6-digit verification code" hint="Check your inbox or spam folder">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.replace(/\D/g, ""));
                  setError(null);
                }}
                placeholder="123456"
                className={cn(
                  inputClass,
                  "text-center font-mono text-lg tracking-[0.3em] font-semibold"
                )}
                required
                autoFocus
              />
            </Field>

            <Field label="New password">
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  className={cn(inputClass, "pr-7")}
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setError(null);
                  }}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 cursor-pointer focus:outline-none"
                  title={showNewPassword ? "Hide password" : "Show password"}
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>

            <Field label="Confirm new password">
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className={cn(inputClass, "pr-7")}
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError(null);
                  }}
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

            <div className="text-right">
              <button
                type="button"
                onClick={handleRequestCode}
                className="text-xs text-primary hover:underline transition-colors"
                disabled={loading}
              >
                Resend code
              </button>
            </div>

            {error ? (
              <div className="rounded-xl bg-destructive/15 p-3 text-xs text-destructive">
                {error}
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                className="rounded-full text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setStep("email")}
                disabled={loading}
              >
                <ArrowLeft size={13} className="mr-1" /> Back
              </Button>
              <Button
                type="submit"
                className="rounded-full text-xs font-semibold"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={13} className="mr-1.5 animate-spin" /> Updating…
                  </>
                ) : (
                  "Reset password"
                )}
              </Button>
            </div>
          </form>
        )}

        {step === "success" && (
          <div className="space-y-4 py-2 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
              <CheckCircle2 size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-foreground">Password reset successfully</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your password has been updated. You can now sign in with your email or username and new password.
              </p>
            </div>
            <div className="pt-2">
              <Button
                type="button"
                className="w-full rounded-full text-xs font-semibold"
                onClick={handleComplete}
              >
                Back to Sign in
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
