import { useState } from "react";
import { KeyRound, Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
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
  verifyCurrentPasswordFn,
  changeUserPasswordFn,
} from "@/server-fns/auth-functions";

interface ChangePasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ChangePasswordModal({
  open,
  onOpenChange,
  onSuccess,
}: ChangePasswordModalProps) {
  const [step, setStep] = useState<"current" | "new">("current");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetState = () => {
    setStep("current");
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowOldPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setError(null);
    setLoading(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      resetState();
    }
    onOpenChange(isOpen);
  };

  const handleVerifyCurrentPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!oldPassword) {
      setError("Please enter your current password.");
      return;
    }

    setLoading(true);
    try {
      await verifyCurrentPasswordFn({ data: { oldPassword } });
      setStep("new");
    } catch (err: any) {
      setError(err?.message || "Incorrect current password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match. Please verify.");
      return;
    }

    if (newPassword === oldPassword) {
      setError("New password must be different from your current password.");
      return;
    }

    setLoading(true);
    try {
      await changeUserPasswordFn({
        data: {
          oldPassword,
          newPassword,
          confirmPassword,
        },
      });
      toast.success("Password updated successfully!");
      if (onSuccess) {
        onSuccess();
      }
      handleOpenChange(false);
    } catch (err: any) {
      setError(err?.message || "Failed to update password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md rounded-2xl bg-card border border-border p-6 shadow-xl">
        {step === "current" ? (
          <form onSubmit={handleVerifyCurrentPassword} className="space-y-4">
            <DialogHeader className="text-left space-y-1.5">
              <div className="flex items-center gap-2 text-primary">
                <KeyRound className="h-5 w-5" />
                <DialogTitle className="text-lg font-bold text-foreground">
                  Reset password
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                Enter your current password first to verify your identity.
              </DialogDescription>
            </DialogHeader>

            <Field label="Current password" hint="Enter the password you currently use to sign in">
              <div className="relative">
                <input
                  type={showOldPassword ? "text" : "password"}
                  value={oldPassword}
                  onChange={(e) => {
                    setOldPassword(e.target.value);
                    setError(null);
                  }}
                  placeholder="••••••••"
                  className={cn(inputClass, "pr-7")}
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowOldPassword((prev) => !prev)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 cursor-pointer focus:outline-none"
                  title={showOldPassword ? "Hide password" : "Show password"}
                  aria-label={showOldPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showOldPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>

            {error ? <p className="text-xs text-destructive">{error}</p> : null}

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
                    <Loader2 size={13} className="mr-1.5 animate-spin" /> Verifying…
                  </>
                ) : (
                  "Continue"
                )}
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <DialogHeader className="text-left space-y-1.5">
              <div className="flex items-center gap-2 text-primary">
                <KeyRound className="h-5 w-5" />
                <DialogTitle className="text-lg font-bold text-foreground">
                  Set new password
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                Create a strong new password with at least 6 characters.
              </DialogDescription>
            </DialogHeader>

            <Field label="New password">
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setError(null);
                  }}
                  placeholder="At least 6 characters"
                  className={cn(inputClass, "pr-7")}
                  required
                  minLength={6}
                  autoFocus
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
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError(null);
                  }}
                  placeholder="Repeat new password"
                  className={cn(inputClass, "pr-7")}
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

            {error ? <p className="text-xs text-destructive">{error}</p> : null}

            <div className="flex items-center justify-between gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                className="rounded-full text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setStep("current")}
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
                  "Update password"
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
