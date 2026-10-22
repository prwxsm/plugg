import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowRight, Bell, Headphones, Music2, TrendingUp, X, RotateCcw } from "lucide-react";

import { Button, EmptyState } from "@/components/plugg/primitives";
import { usePlugg } from "@/state/plugg-store";

export const Route = createFileRoute("/updates")({
  head: () => ({
    meta: [
      { title: "Updates — Plugg" },
      {
        name: "description",
        content: "Stay up to date with new music drops, activity, and notifications on Plugg.",
      },
      { property: "og:title", content: "Updates — Plugg" },
      {
        property: "og:description",
        content: "Stay up to date with new music drops and notifications on Plugg.",
      },
    ],
  }),
  component: UpdatesPage,
});

function getNotificationIcon(type: string) {
  switch (type) {
    case "drop":
      return Music2;
    case "playlist":
      return Headphones;
    case "milestone":
      return TrendingUp;
    default:
      return Bell;
  }
}

function UpdatesPage() {
  const {
    session,
    notifications,
    clearNotification,
    clearAllNotifications,
    restoreDefaultNotifications,
  } = usePlugg();
  const navigate = useNavigate();

  useEffect(() => {
    if (session === "loggedOut") {
      window.location.href = "/auth?returnTo=/updates";
    }
  }, [session]);

  if (session === "loggedOut") {
    return (
      <EmptyState
        title="Sign in to view updates"
        description="Sign in or register to view your latest music drops, activity, and notifications."
        ctaLabel="Sign in or register"
        ctaTo="/auth"
        icon={<Bell size={28} />}
      />
    );
  }

  const visibleNotifications = notifications.filter((notif) => {
    if (session === "loggedInListener" && notif.type === "milestone") {
      return false;
    }
    return true;
  });

  const handleSelectNotification = (notif: { id: string; targetUrl: string }) => {
    clearNotification(notif.id);
    navigate({ to: notif.targetUrl as any });
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Updates</h1>
            {visibleNotifications.length > 0 && (
              <span className="inline-flex items-center justify-center rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {visibleNotifications.length} new
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Your latest music drops, playlist refreshes, and activity notifications.
          </p>
        </div>

        {visibleNotifications.length > 0 ? (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={clearAllNotifications}
              className="text-xs"
            >
              Clear all updates
            </Button>
          </div>
        ) : null}
      </div>

      {/* Notifications list or empty state */}
      {visibleNotifications.length > 0 ? (
        <div className="space-y-3">
          {visibleNotifications.map((notif) => {
            const Icon = getNotificationIcon(notif.type);
            return (
              <div
                key={notif.id}
                onClick={() => handleSelectNotification(notif)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSelectNotification(notif);
                  }
                }}
                className="group relative flex items-center justify-between gap-4 rounded-xl bg-surface p-4 sm:p-5 transition-all duration-200 hover:bg-elevated/70 cursor-pointer shadow-xs"
              >
                <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
                  <span className="grid h-10 w-10 sm:h-11 sm:w-11 shrink-0 place-items-center rounded-full bg-background/80 shadow-xs text-foreground group-hover:scale-105 transition-transform duration-200">
                    <Icon size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground group-hover:text-foreground">
                      {notif.title}
                    </p>
                    <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground line-clamp-2">
                      {notif.description}
                    </p>
                    <span className="mt-1.5 block text-[11px] font-medium text-muted-foreground/75">
                      {notif.timestamp}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Arrow button to take the user to the activity page */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectNotification(notif);
                    }}
                    aria-label="Go to page"
                    title="Go to page"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-background/60 text-muted-foreground transition-all duration-200 group-hover:text-foreground group-hover:translate-x-0.5 hover:bg-elevated"
                  >
                    <ArrowRight size={16} />
                  </button>

                  {/* Button at the end to clear the notification */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearNotification(notif.id);
                    }}
                    aria-label="Clear notification"
                    title="Clear notification"
                    className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-all duration-200 hover:bg-destructive/15 hover:text-destructive active:scale-95"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-6">
          <EmptyState
            icon={<Bell className="h-12 w-12 text-muted-foreground/40 stroke-1" />}
            title="No updates yet"
            description="You're completely up to date! When artists you follow drop new music or there's activity on your account, it'll show up here."
            ctaLabel="Discover new music"
            ctaTo="/discover"
          />
          <div className="flex justify-center">
            <button
              type="button"
              onClick={restoreDefaultNotifications}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
            >
              <RotateCcw size={13} />
              Restore sample updates
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
