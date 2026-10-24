import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  Bell,
  ChevronsLeft,
  ChevronsRight,
  Compass,
  Headphones,
  Home,
  Library,
  Mic,
  Pause,
  Play,
  TrendingUp,
  Upload,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import logo from "@/assets/logo.png";
import { art } from "@/data/covers";
import { cn } from "@/lib/utils";
import { formatCount } from "@/lib/plugg";
import { usePlugg } from "@/state/plugg-store";
import { FullPlayer, PlayerBar } from "./player";
import { Button } from "@/components/ui/button";

const listenerNav = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/discover", label: "Discover", icon: Compass, exact: false },
  { to: "/library", label: "Library", icon: Library, exact: false },
] as const;

const artistNav = [
  { to: "/dashboard", label: "Dashboard", icon: BarChart3, exact: false },
  { to: "/upload", label: "Upload", icon: Upload, exact: false },
] as const;

const mobileNav = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/discover", label: "Discover", icon: Compass, exact: false },
  { to: "/library", label: "Library", icon: Library, exact: false },
  { to: "/profile", label: "Profile", icon: UserRound, exact: false },
] as const;

/* ── Right-side discovery panel (desktop only) ── */
function DiscoveryPanel() {
  const { artists, tracks, playTrack, currentTrack, isPlaying, togglePlay } = usePlugg();

  const featuredArtists = useMemo(() => {
    return [...artists]
      .sort((a, b) => {
        const aScore = (a.featured ? 100 : 0) + (a.verified ? 20 : 0);
        const bScore = (b.featured ? 100 : 0) + (b.verified ? 20 : 0);
        return bScore - aScore || b.monthlyListeners - a.monthlyListeners;
      })
      .slice(0, 3);
  }, [artists]);

  const trending = useMemo(() => {
    return [...tracks]
      .filter((t) => t.published)
      .sort((a, b) => b.playCount - a.playCount)
      .slice(0, 5);
  }, [tracks]);

  return (
    <aside className="fixed right-0 top-0 z-30 hidden h-full w-[var(--right-sidebar-w)] flex-col bg-surface pt-[98px] xl:flex overflow-y-auto pb-[96px]">
      {/* Featured Artists */}
      <div className="px-5">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <Mic size={14} />
            Featured artists
          </h3>
          <Link
            to="/"
            hash="artists"
            onClick={() => {
              const el = document.getElementById("artists");
              el?.scrollIntoView({ behavior: "smooth" });
            }}
            className="text-[11px] font-medium text-muted-foreground/70 hover:text-muted-foreground cursor-pointer transition-colors"
          >
            See all
          </Link>
        </div>
        <div className="space-y-0.5">
          {featuredArtists.map((artist) => (
            <Link
              key={artist.id}
              to="/artist/$username"
              params={{ username: artist.username }}
              className="group/artist flex items-center gap-3.5 rounded-lg px-3 py-3.5 transition-colors hover:bg-elevated/40"
            >
              <img
                src={art(artist.avatarUrl)}
                alt={artist.displayName}
                className="h-12 w-12 shrink-0 rounded-full object-cover ring-1 ring-border/30"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold">{artist.displayName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {formatCount(artist.monthlyListeners)} monthly listeners
                </p>
              </div>
              <ArrowRight
                size={15}
                className="shrink-0 text-muted-foreground/50 opacity-0 transition-opacity group-hover/artist:opacity-100"
              />
            </Link>
          ))}
        </div>
      </div>

      {/* Trending Now */}
      <div className="mt-8 px-5">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <TrendingUp size={14} />
            Trending now
          </h3>
          <Link
            to="/discover"
            hash="trending"
            onClick={() => {
              const el = document.getElementById("trending");
              el?.scrollIntoView({ behavior: "smooth" });
            }}
            className="text-[11px] font-medium text-muted-foreground/70 hover:text-muted-foreground cursor-pointer transition-colors"
          >
            See all
          </Link>
        </div>
        <div className="space-y-0.5">
          {trending.map((track, index) => {
            const isCurrent = currentTrack?.id === track.id;
            const artist = artists.find((a) => a.id === track.artistId);
            return (
              <button
                key={track.id}
                type="button"
                onClick={() =>
                  isCurrent
                    ? togglePlay()
                    : playTrack(
                        track.id,
                        trending.map((t) => t.id),
                      )
                }
                className={cn(
                  "group/trend flex w-full items-center gap-3 rounded-lg px-3 py-3.5 text-left transition-colors hover:bg-elevated/40",
                  isCurrent && "bg-elevated/30",
                )}
              >
                <span className="w-6 shrink-0 text-center text-xs font-semibold tabular-nums text-muted-foreground/60">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <img
                  src={art(track.coverUrl)}
                  alt=""
                  className="h-[42px] w-[42px] shrink-0 rounded-md object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "truncate text-[13px] font-semibold",
                      isCurrent && "text-primary",
                    )}
                  >
                    {track.title}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{artist?.displayName}</p>
                </div>
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all",
                    isCurrent && isPlaying
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/60 text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                  )}
                >
                  {isCurrent && isPlaying ? (
                    <Pause size={13} fill="currentColor" />
                  ) : (
                    <Play size={13} fill="currentColor" className="ml-0.5" />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const location = useRouterState({ select: (s) => s.location });
  const pathname = location.pathname;
  const hash = location.hash;
  const { session, currentUser, currentArtist, notifications } = usePlugg();
  const bare =
    pathname.startsWith("/auth") ||
    pathname.startsWith("/legal") ||
    pathname.startsWith("/terms") ||
    pathname.startsWith("/privacy") ||
    pathname.startsWith("/copyright");
  const [collapsed, setCollapsed] = useState(false);
  const [hovering, setHovering] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  const router = useRouter();

  useEffect(() => {
    const stored = window.localStorage.getItem("plugg:sidebar");
    if (stored) setCollapsed(stored === "collapsed");
    if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  // Helper to reliably scroll the main container and window to the top
  const resetScrollTop = () => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
    const mainEl = document.getElementById("main-content");
    if (mainEl) {
      mainEl.scrollTop = 0;
    }
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  // Ensure scroll is reset to top on navigation completion via router subscription
  useEffect(() => {
    const unsub = router.subscribe("onResolved", () => {
      if (!location.hash) {
        resetScrollTop();
      }
    });
    return () => unsub();
  }, [router, location.hash]);

  // Restore scroll to top on page navigation or smooth-scroll to hash target
  useEffect(() => {
    const rawHash = hash?.replace(/^#/, "");
    if (rawHash) {
      const timer = setTimeout(() => {
        const el = document.getElementById(rawHash);
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        } else {
          resetScrollTop();
        }
      }, 50);
      return () => clearTimeout(timer);
    }

    // Immediately reset scroll to top
    resetScrollTop();

    // Re-apply across animation frames and ticks to override any browser / route transition reflow
    const raf1 = requestAnimationFrame(resetScrollTop);
    const raf2 = requestAnimationFrame(() => requestAnimationFrame(resetScrollTop));
    const t1 = setTimeout(resetScrollTop, 40);
    const t2 = setTimeout(resetScrollTop, 120);

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [pathname, hash, bare]);

  const toggleSidebar = () =>
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem("plugg:sidebar", next ? "collapsed" : "expanded");
      return next;
    });

  if (bare) return <>{children}</>;

  const isArtist = session === "loggedInArtist";
  const nav = isArtist ? [...listenerNav, ...artistNav] : listenerNav;

  return (
    <div
      className="h-screen h-dvh w-full overflow-hidden bg-background"
      style={{
        ["--sidebar-w" as string]: collapsed ? "76px" : "280px",
        ["--right-sidebar-w" as string]: "340px",
      }}
    >
      {/* Desktop sidebar */}
      <aside
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden flex-col bg-surface pt-6 pb-[96px] transition-[width] duration-300 md:flex",
          collapsed ? "w-[76px] px-2" : "w-[280px] px-5",
        )}
      >
        {/* Hover-revealed expand / collapse handle on the panel edge */}
        <button
          onClick={toggleSidebar}
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          aria-expanded={!collapsed}
          className={cn(
            "absolute -right-3 top-1/2 z-50 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-elevated text-muted-foreground shadow-lg transition-all duration-200 hover:text-foreground md:flex",
            hovering ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        >
          {collapsed ? <ChevronsRight size={15} /> : <ChevronsLeft size={15} />}
        </button>

        <div className={cn("flex items-center", collapsed ? "justify-center" : "px-2")}>
          <Link
            to="/"
            className="flex items-center gap-2 font-display text-xl font-bold tracking-tight"
          >
            <img src={logo} alt="Plugg" className="h-8 w-8 shrink-0 object-contain" />
            {collapsed ? null : (
              <span>
                plugg<span className="text-muted-foreground">.</span>
              </span>
            )}
          </Link>
        </div>

        <nav className="mt-8 space-y-1">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.exact }}
              activeProps={{ className: "bg-elevated text-foreground" }}
              inactiveProps={{
                className: "text-muted-foreground hover:text-foreground hover:bg-elevated/60",
              }}
              className={cn(
                "flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-colors",
                collapsed ? "justify-center px-0" : "px-3",
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={18} />
              {collapsed ? <span className="sr-only">{item.label}</span> : item.label}
            </Link>
          ))}

          {currentUser ? (
            <Link
              to="/updates"
              activeProps={{ className: "bg-elevated text-foreground" }}
              inactiveProps={{
                className: "text-muted-foreground hover:text-foreground hover:bg-elevated/60",
              }}
              className={cn(
                "flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-colors relative",
                collapsed ? "justify-center px-0" : "px-3",
              )}
              title={
                collapsed
                  ? notifications.length > 0
                    ? `Updates (${notifications.length})`
                    : "Updates"
                  : undefined
              }
            >
              <div className="relative shrink-0 flex items-center justify-center">
                <Bell size={18} />
                {notifications.length > 0 && collapsed && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground shadow-xs">
                    {notifications.length > 9 ? "9+" : notifications.length}
                  </span>
                )}
              </div>
              {collapsed ? (
                <span className="sr-only">Updates</span>
              ) : (
                <>
                  <span className="flex-1 text-left">Updates</span>
                  {notifications.length > 0 && (
                    <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary/20 px-1.5 text-xs font-semibold text-primary">
                      {notifications.length}
                    </span>
                  )}
                </>
              )}
            </Link>
          ) : null}
        </nav>

        <div className="mt-auto">
          {currentUser ? (
            <Link
              to="/profile"
              className={cn(
                "flex items-center gap-3 rounded-lg py-2.5 hover:bg-elevated",
                collapsed ? "justify-center px-0" : "px-3",
              )}
              title={collapsed ? currentUser.name : undefined}
            >
              <img
                src={art(currentArtist?.avatarUrl ?? currentUser.avatarUrl)}
                alt=""
                className="h-8 w-8 shrink-0 rounded-full object-cover"
              />
              {collapsed ? null : (
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{currentUser.name}</span>
                  <span className="block text-xs capitalize text-muted-foreground">
                    {currentUser.accountType}
                  </span>
                </span>
              )}
            </Link>
          ) : (
            <Link
              to="/auth"
              className="flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              {collapsed ? <UserRound size={16} /> : "Sign in"}
            </Link>
          )}
        </div>
      </aside>

      {/* Floating top bar */}
      <header className="fixed left-0 right-0 top-0 z-50 flex w-full items-center justify-between px-4 py-3 pointer-events-none md:left-[var(--sidebar-w)] md:justify-end md:w-auto md:right-4 xl:right-[calc(var(--right-sidebar-w)+1rem)]">
        <Link
          to="/"
          className="flex items-center gap-2 font-display text-lg font-bold tracking-tight pointer-events-auto md:hidden bg-background/40 px-3 py-1.5 rounded-full backdrop-blur-md"
        >
          <img src={logo} alt="Plugg" className="h-7 w-7 object-contain" />
          <span>
            plugg<span className="text-muted-foreground">.</span>
          </span>
        </Link>
        <div className="relative pointer-events-auto md:hidden">
          {currentUser ? (
            <Link
              to="/updates"
              aria-label={
                notifications.length > 0 ? `Updates (${notifications.length})` : "Updates"
              }
              className="relative flex h-9 w-9 items-center justify-center rounded-full bg-background/40 backdrop-blur-md hover:bg-background/60 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Bell size={18} />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow-xs">
                  {notifications.length > 9 ? "9+" : notifications.length}
                </span>
              )}
            </Link>
          ) : null}
        </div>
      </header>

      <main
        ref={mainRef}
        id="main-content"
        className={cn(
          "h-full overflow-y-auto overflow-x-hidden px-4 pb-36 transition-[margin] duration-300 sm:px-6 md:ml-[var(--sidebar-w)] md:pb-[110px] xl:mr-[var(--right-sidebar-w)]",
          pathname === "/" ? "" : "pt-16 md:pt-16",
        )}
      >
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>

      {/* Right discovery panel (desktop xl+) */}
      <DiscoveryPanel />

      <PlayerBar />
      <FullPlayer />

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-4 items-center bg-surface/95 px-2 py-2 backdrop-blur-xl md:hidden">
        {mobileNav.map((item) => {
          const profileSection =
            isArtist &&
            item.to === "/profile" &&
            ["/profile", "/dashboard", "/upload"].includes(pathname);
          const active =
            profileSection || (item.exact ? pathname === item.to : pathname.startsWith(item.to));
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex min-w-0 flex-col items-center justify-center gap-1 rounded-full py-1 text-[9px] font-medium transition-colors",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              <item.icon size={20} strokeWidth={1.8} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
