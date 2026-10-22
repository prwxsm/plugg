import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/become-artist")({
  beforeLoad: () => {
    throw redirect({ to: "/auth" });
  },
  component: BecomeArtistRedirect,
});

function BecomeArtistRedirect() {
  useEffect(() => {
    window.location.href = "/auth";
  }, []);
  return null;
}
