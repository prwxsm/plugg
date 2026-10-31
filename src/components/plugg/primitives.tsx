import { Link } from "@tanstack/react-router";
import { Check, ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import badgeImg from "@/assets/badge.png";

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-lg font-semibold sm:text-xl">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

type ButtonVariant = "primary" | "outline" | "ghost" | "subtle";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground hover:opacity-90",
  outline: "bg-elevated text-foreground hover:bg-secondary",
  ghost: "text-muted-foreground hover:text-foreground hover:bg-elevated",
  subtle: "bg-elevated text-foreground hover:bg-secondary",
};

export function Button({
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {hint ? <span className="mt-1.5 block text-[11px] text-muted-foreground/80">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  "w-full rounded-none border-x-0 border-t-0 border-b border-border-strong bg-transparent px-0 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 transition-colors hover:border-foreground/30 focus:border-primary focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50";

/** Dropdown styled with the Plugg design system instead of the native select box. */
export function Select({
  value,
  options,
  onChange,
  placeholder = "Select",
  label,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label ?? placeholder}
        onClick={() => setOpen((o) => !o)}
        className={cn(inputClass, "flex items-center justify-between text-left", open && "border-ring")}
      >
        <span className={value ? "" : "text-muted-foreground"}>{value || placeholder}</span>
        <ChevronDown
          size={16}
          className={cn("shrink-0 text-muted-foreground transition-transform duration-200", open && "rotate-180")}
        />
      </button>
      {open ? (
        <ul
          role="listbox"
          className="absolute z-50 mt-2 max-h-64 w-full origin-top animate-scale-in overflow-y-auto rounded-xl border border-border-strong bg-elevated p-1 shadow-2xl"
        >
          {options.map((option) => (
            <li key={option}>
              <button
                type="button"
                role="option"
                aria-selected={option === value}
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-secondary",
                  option === value ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {option}
                {option === value ? <Check size={14} /> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export const DEFAULT_GENRE_OPTIONS = [
  "Afrobeats",
  "Dancehall",
  "DJ",
  "Gospel",
  "Hip-Hop",
  "R&B",
];

export function GenreCheckboxGroup({
  value,
  onChange,
  options = DEFAULT_GENRE_OPTIONS,
  max = 2,
  label = "Genre",
  hint,
}: {
  value: string;
  onChange: (value: string) => void;
  options?: string[];
  max?: number;
  label?: string;
  hint?: string;
}) {
  const selected = useMemo(() => {
    if (!value || !value.trim()) return [];
    return value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }, [value]);

  const toggleGenre = (genreName: string) => {
    if (selected.includes(genreName)) {
      const next = selected.filter((g) => g !== genreName);
      onChange(next.join(", "));
    } else {
      if (selected.length >= max) return;
      const next = [...selected, genreName];
      onChange(next.join(", "));
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">{label}</label>
        <div className="text-xs">
          {selected.length === 0 ? (
            <span className="font-medium text-amber-500">Select 1 or 2 genres</span>
          ) : selected.length >= max ? (
            <span className="font-medium text-primary">
              {selected.length}/{max} selected (max)
            </span>
          ) : (
            <span className="text-muted-foreground">
              {selected.length}/{max} selected · optional 2nd genre
            </span>
          )}
        </div>
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5">
        {options.map((opt) => {
          const isChecked = selected.includes(opt);
          const isDisabled = !isChecked && selected.length >= max;

          return (
            <button
              key={opt}
              type="button"
              role="checkbox"
              aria-checked={isChecked}
              aria-disabled={isDisabled}
              disabled={isDisabled}
              onClick={() => toggleGenre(opt)}
              className={cn(
                "group relative flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-all sm:p-3 cursor-pointer select-none",
                isChecked
                  ? "border-primary/70 bg-primary/10 text-foreground font-medium shadow-sm"
                  : "border-border/60 bg-surface/50 text-muted-foreground hover:border-border hover:bg-surface hover:text-foreground",
                isDisabled &&
                  "opacity-40 cursor-not-allowed hover:border-border/60 hover:bg-surface/50 hover:text-muted-foreground",
              )}
            >
              <div
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-md border transition-colors",
                  isChecked
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border-strong bg-background/50 text-transparent group-hover:border-foreground/50",
                  isDisabled && "group-hover:border-border-strong",
                )}
              >
                {isChecked ? <Check size={11} strokeWidth={3} /> : null}
              </div>
              <span className="truncate text-sm">{opt}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  ctaLabel,
  ctaTo,
  onCta,
  icon,
}: {
  title: string;
  description?: string;
  ctaLabel?: string;
  ctaTo?: "/discover" | "/upload" | "/library" | "/become-artist" | "/auth" | "/profile" | "/dashboard" | "/" | (string & {});
  onCta?: () => void;
  icon?: ReactNode;
}) {
  return (
    <div className="surface-card flex flex-col items-center justify-center px-6 py-14 text-center">
      {icon ? <div className="mb-4 text-muted-foreground">{icon}</div> : null}
      <p className="font-display text-base font-semibold">{title}</p>
      {description ? <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      {ctaLabel && ctaTo ? (
        <Link
          to={ctaTo}
          className="mt-6 inline-flex items-center rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          {ctaLabel}
        </Link>
      ) : null}
      {ctaLabel && !ctaTo ? (
        <Button className="mt-6" onClick={onCta}>
          {ctaLabel}
        </Button>
      ) : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  delta,
}: {
  label: string;
  value: string;
  delta?: string;
}) {
  return (
    <div className="surface-card p-5">
      <p className="text-eyebrow">{label}</p>
      <p className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl">{value}</p>
      {delta ? <p className="mt-1 text-xs text-primary">{delta}</p> : null}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="w-[160px] shrink-0 sm:w-[180px]">
      <div className="skeleton-block aspect-square w-full" />
      <div className="skeleton-block mt-3 h-3.5 w-3/4" />
      <div className="skeleton-block mt-2 h-3 w-1/2" />
    </div>
  );
}

export function VerifiedBadge({
  className,
  size = "md",
}: {
  className?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
} = {}) {
  const sizeMap = {
    xs: "h-3.5 w-3.5",
    sm: "h-4 w-4",
    md: "h-4.5 w-4.5 sm:h-5 sm:w-5",
    lg: "h-5 w-5 sm:h-6 sm:w-6",
    xl: "h-7 w-7 sm:h-8 sm:w-8",
  };

  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center align-middle select-none", className)}
      title="Verified Plugg Artist"
      aria-label="Verified Plugg Artist"
    >
      <img
        src={badgeImg}
        alt="Verified Plugg Artist"
        className={cn(sizeMap[size] ?? sizeMap.md, "shrink-0 object-contain drop-shadow-xs")}
        draggable={false}
      />
    </span>
  );
}
