import type { Analytics } from "./types";

export const analyticsByArtist: Record<string, Analytics> = {
  a1: {
    artistId: "a1",
    totalPlays: 8420330,
    totalDownloads: 893277,
    monthlyListeners: 312480,
    fans: 48210,
    growthPercent: 18.4,
    timeline: [
      { label: "Mar", plays: 402100, listeners: 141200 },
      { label: "Apr", plays: 468300, listeners: 158900 },
      { label: "May", plays: 512400, listeners: 176400 },
      { label: "Jun", plays: 603800, listeners: 214700 },
      { label: "Jul", plays: 782900, listeners: 268300 },
      { label: "Aug", plays: 864200, listeners: 296100 },
      { label: "Sep", plays: 921700, listeners: 312480 },
    ],
    topTrackIds: ["t4", "t1", "t2", "t3"],
    recentPlays: [
      { trackId: "t4", city: "Nairobi", minutesAgo: 2 },
      { trackId: "t1", city: "Kampala", minutesAgo: 6 },
      { trackId: "t2", city: "Dar es Salaam", minutesAgo: 11 },
      { trackId: "t1", city: "Kisumu", minutesAgo: 17 },
      { trackId: "t3", city: "London", minutesAgo: 24 },
    ],
    releasePerformance: [
      { releaseId: "r1", plays: 3544230, saves: 41200 },
      { releaseId: "r2", plays: 2410770, saves: 33800 },
    ],
  },
};

export const fallbackAnalytics = (artistId: string): Analytics => ({
  artistId,
  totalPlays: 0,
  totalDownloads: 0,
  monthlyListeners: 0,
  fans: 0,
  growthPercent: 0,
  timeline: [],
  topTrackIds: [],
  recentPlays: [],
  releasePerformance: [],
});
