import { useState } from "react";
import { Mail, CheckCircle2, ArrowLeft, Loader2, KeyRound } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button, Field, inputClass } from "@/components/plugg/primitives";
import { usePlugg } from "@/state/plugg-store";

interface ChangeEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentEmail: string;
  onSuccess?: (newEmail: string) => void;
}

export function ChangeEmailModal({
  open,
  onOpenChange,
  currentEmail,
  onSuccess,
}: ChangeEmailModalProps) {
  const { updateUser } = usePlugg();
  const [step, setStep] = useState<"enter" | "verify">("enter");
  const [newEmail, setNewEmail] = useState("");
  const [inputCode, setInputCode] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetState = () => {
    setStep("enter");
    setNewEmail("");
    setInputCode("");
    setGeneratedCode("");
    setError(null);
    setIsSubmitting(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      resetState();
    }
    onOpenChange(isOpen);
  };

  const handleSendCode = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleaned = newEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(cleaned)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (cleaned === currentEmail.trim().toLowerCase()) {
      setError("New email must be different from your current email.");
      return;
    }

    // Generate random 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(code);
    setStep("verify");
    setInputCode("");
    toast.success(`Verification code sent to ${cleaned}! (Test code: ${code})`, {
      duration: 8000,
    });
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (inputCode.trim() !== generatedCode) {
      setError("Invalid verification code. Please check the code and try again.");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateUser({ email: newEmail.trim().toLowerCase() });
      toast.success("Email address updated successfully!");
      if (onSuccess) {
        onSuccess(newEmail.trim().toLowerCase());
      }
      handleOpenChange(false);
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to update email.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md rounded-2xl bg-card border border-border p-6 shadow-xl">
        {step === "enter" ? (
          <form onSubmit={handleSendCode} className="space-y-4">
            <DialogHeader className="text-left space-y-1.5">
              <div className="flex items-center gap-2 text-primary">
                <Mail className="h-5 w-5" />
                <DialogTitle className="text-lg font-bold text-foreground">
                  Change email address
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                Current email: <span className="font-mono text-foreground/90">{currentEmail}</span>
              </DialogDescription>
            </DialogHeader>

            <Field label="New email address" hint="Enter the new email you want to associate with your account">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => {
                  setNewEmail(e.target.value);
                  setError(null);
                }}
                placeholder="newname@example.com"
                className={inputClass}
                required
                autoFocus
              />
            </Field>

            {error ? <p className="text-xs text-destructive">{error}</p> : null}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-full text-xs"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-full text-xs font-semibold"
              >
                Send verification code
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <DialogHeader className="text-left space-y-1.5">
              <div className="flex items-center gap-2 text-primary">
                <KeyRound className="h-5 w-5" />
                <DialogTitle className="text-lg font-bold text-foreground">
                  Verify new email
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                Enter the 6-digit verification code sent to{" "}
                <span className="font-semibold text-foreground">{newEmail}</span>.
              </DialogDescription>
            </DialogHeader>

            {/* Test helper badge */}
            <div className="flex items-center justify-between rounded-xl bg-primary/10 border border-primary/20 px-3.5 py-2 text-xs text-primary">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Code sent! Use code:</span>
              </div>
              <button
                type="button"
                onClick={() => setInputCode(generatedCode)}
                className="font-mono font-bold tracking-widest bg-primary/20 px-2 py-0.5 rounded hover:bg-primary/30 transition-colors cursor-pointer"
                title="Click to autofill"
              >
                {generatedCode}
              </button>
            </div>

            <Field label="Verification code" hint="6-digit numerical code">
              <input
                type="text"
                maxLength={6}
                value={inputCode}
                onChange={(e) => {
                  setInputCode(e.target.value.replace(/[^0-9]/g, ""));
                  setError(null);
                }}
                placeholder="123456"
                className="h-12 w-full rounded-xl border border-input bg-elevated/40 px-4 text-center font-mono text-xl tracking-[0.4em] font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-xs"
                required
                autoFocus
              />
            </Field>

            {error ? <p className="text-xs text-destructive">{error}</p> : null}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  setStep("enter");
                  setError(null);
                }}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back</span>
              </button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full text-xs"
                  onClick={() => handleOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || inputCode.length < 6}
                  className="rounded-full text-xs font-semibold"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify & update email"
                  )}
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
