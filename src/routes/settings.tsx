import { createFileRoute, redirect } from "@tanstack/react-router";

/** Settings now live inside the profile page. */
export const Route = createFileRoute("/settings")({
  beforeLoad: () => {
    throw redirect({ to: "/profile" });
  },
  component: () => null,
});
