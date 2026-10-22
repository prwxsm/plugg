import { Link } from "@tanstack/react-router";
import { LogIn, Music2, X } from "lucide-react";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/plugg/primitives";

interface AuthPromptState {
  open: boolean;
  title: string;
  description: string;
  returnTo?: string | undefined;
}

interface AuthPromptContextValue {
  showAuthPrompt: (opts?: { title?: string; description?: string; returnTo?: string | undefined }) => void;
  closeAuthPrompt: () => void;
}

const AuthPromptContext = createContext<AuthPromptContextValue | null>(null);

export function AuthPromptProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthPromptState>({
    open: false,
    title: "Sign in to continue",
    description: "Create a free account or sign in to access this feature.",
  });

  const showAuthPrompt = useCallback(
    (opts?: { title?: string; description?: string; returnTo?: string | undefined }) => {
      setState({
        open: true,
        title: opts?.title || "Sign in to continue",
        description: opts?.description || "Create a free account or sign in to access this feature.",
        returnTo: opts?.returnTo,
      });
    },
    [],
  );

  const closeAuthPrompt = useCallback(() => {
    setState((prev) => ({ ...prev, open: false }));
  }, []);

  return (
    <AuthPromptContext.Provider value={{ showAuthPrompt, closeAuthPrompt }}>
      {children}
      {state.open ? (
        <AuthPromptModal
          title={state.title}
          description={state.description}
          returnTo={state.returnTo}
          onClose={closeAuthPrompt}
        />
      ) : null}
    </AuthPromptContext.Provider>
  );
}

export function useAuthPrompt(): AuthPromptContextValue {
  const ctx = useContext(AuthPromptContext);
  if (!ctx) throw new Error("useAuthPrompt must be used inside AuthPromptProvider");
  return ctx;
}

function AuthPromptModal({
  title,
  description,
  returnTo,
  onClose,
}: {
  title: string;
  description: string;
  returnTo?: string | undefined;
  onClose: () => void;
}) {
  const authSearch = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : "";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-surface p-6 shadow-2xl ring-1 ring-border/20 animate-in zoom-in-95 fade-in duration-200">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-elevated hover:text-foreground"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        {/* Icon */}
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Music2 size={24} className="text-primary" />
        </div>

        {/* Content */}
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>

        {/* Actions */}
        <div className="mt-6 space-y-3">
          <Link
            to="/auth"
            search={returnTo ? { returnTo } : {}}
            onClick={onClose}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-all duration-200 hover:opacity-90 active:scale-[0.97]",
            )}
          >
            <LogIn size={16} />
            Sign in or create account
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-full px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-elevated hover:text-foreground"
          >
            Continue browsing
          </button>
        </div>
      </div>
    </div>
  );
}
