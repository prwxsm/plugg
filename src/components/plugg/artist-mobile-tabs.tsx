import { Link, useRouterState } from "@tanstack/react-router";
import { BarChart3, Upload, UserRound } from "lucide-react";

import { cn } from "@/lib/utils";

const tabs = [
  { to: "/profile", label: "Profile", icon: UserRound },
  { to: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { to: "/upload", label: "Upload", icon: Upload },
] as const;

export function ArtistMobileTabs() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <nav
      aria-label="Artist account"
      className="rail-scroll -mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 md:hidden"
    >
      {tabs.map((tab) => {
        const active = pathname === tab.to;
        return (
          <Link
            key={tab.to}
            to={tab.to}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors select-none",
              active
                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                : "bg-elevated/60 text-muted-foreground hover:bg-elevated hover:text-foreground",
            )}
          >
            <tab.icon
              size={13}
              className={active ? "text-primary-foreground" : "text-muted-foreground"}
            />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
