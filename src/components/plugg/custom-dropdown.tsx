import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DropdownOption<T extends string = string> {
  id: T;
  label: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  badge?: string;
}

interface CustomDropdownProps<T extends string = string> {
  value: T;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  searchable?: boolean;
  className?: string;
  disabled?: boolean;
  id?: string;
}

export function CustomDropdown<T extends string = string>({
  value,
  options,
  onChange,
  placeholder = "Select...",
  searchable = false,
  className,
  disabled = false,
  id,
}: CustomDropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      return;
    }

    if (searchable && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }

    const handlePointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, searchable]);

  const selected = options.find((o) => o.id === value);
  const SelectedIcon = selected?.icon;

  const filteredOptions = searchable && searchQuery.trim().length > 0
    ? options.filter((o) =>
        o.label.toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : options;

  return (
    <div ref={containerRef} className={cn("relative w-full text-left", className)} id={id}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "flex w-full items-center justify-between gap-2.5 rounded-lg border border-input bg-surface px-3.5 py-2.5 text-sm text-foreground transition-all duration-150 select-none cursor-pointer",
          open
            ? "border-ring ring-1 ring-ring bg-secondary/40 shadow-xs"
            : "hover:border-border/80 hover:bg-elevated/30",
          disabled && "opacity-50 cursor-not-allowed pointer-events-none"
        )}
      >
        <div className="flex items-center gap-2.5 truncate">
          {SelectedIcon && (
            <SelectedIcon size={15} className="text-primary shrink-0" />
          )}
          <span
            className={cn(
              "truncate font-medium text-sm",
              selected ? "text-foreground" : "text-muted-foreground font-normal"
            )}
          >
            {selected?.label || placeholder}
          </span>
        </div>

        <ChevronDown
          size={15}
          className={cn(
            "text-muted-foreground transition-transform duration-200 shrink-0",
            open && "rotate-180 text-foreground"
          )}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-full z-50 mt-1.5 w-full max-h-64 overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-2xl animate-scale-in flex flex-col"
        >
          {searchable && (
            <div className="p-1.5 border-b border-border/60">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-md border border-input bg-elevated/50 pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring"
                />
              </div>
            </div>
          )}

          <div className="overflow-y-auto max-h-52 space-y-0.5">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs text-muted-foreground">
                No matching options
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = option.id === value;
                const Icon = option.icon;

                return (
                  <button
                    key={option.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(option.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-xs transition-colors cursor-pointer",
                      isSelected
                        ? "bg-elevated text-foreground font-medium"
                        : "text-muted-foreground hover:bg-elevated/70 hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      {Icon && (
                        <Icon
                          size={14}
                          className={
                            isSelected ? "text-primary shrink-0" : "text-muted-foreground shrink-0"
                          }
                        />
                      )}
                      <span className="truncate">{option.label}</span>
                      {option.badge && (
                        <span className="text-[10px] text-muted-foreground/80">
                          {option.badge}
                        </span>
                      )}
                    </div>

                    {isSelected && <Check size={14} className="text-primary shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
