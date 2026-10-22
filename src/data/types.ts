export type AccountType = "listener" | "artist";

export interface User {
  id: string;
  name: string;
  username?: string | undefined;
  email: string;
  accountType: AccountType;
  avatarUrl: string;
  artistId?: string | undefined;
}

export interface Artist {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  location: string;
  avatarUrl: string;
  coverUrl: string;
  verified: boolean;
  featured?: boolean | undefined;
  growthRate?: number | undefined;
  fans: number;
  monthlyListeners: number;
  totalPlays: number;
  phoneNumber?: string | undefined;
  country?: string | undefined;
  city?: string | undefined;
  primaryGenre?: string | undefined;
  additionalGenres?: string[] | undefined;
  termsAcceptedAt?: string | undefined;
  socialLinks: {
    instagram?: string | undefined;
    facebook?: string | undefined;
    x?: string | undefined;
    youtube?: string | undefined;
    tiktok?: string | undefined;
  };
}

export type ReleaseType = "single" | "EP" | "album";
export type ReleaseStatus = "published" | "scheduled" | "draft";

export interface Release {
  id: string;
  artistId: string;
  title: string;
  slug: string;
  type: ReleaseType;
  coverUrl: string;
  releaseDate: string;
  status: ReleaseStatus;
  trackIds: string[];
  /** ISO datetime the release goes live (midnight of the release day). */
  goLiveAt?: string | undefined;
  description?: string | undefined;
  label?: string | undefined;
}

export interface Track {
  id: string;
  artistId: string;
  releaseId: string;
  title: string;
  slug: string;
  genre: string;
  coverUrl: string;
  audioUrl: string | null;
  durationSeconds: number;
  playCount: number;
  downloadCount?: number;
  likeCount?: number;
  published: boolean;
  releaseDate: string;
  features?: string | undefined;
  producers?: string | undefined;
  lyrics?: string | undefined;
}

export interface Playlist {
  id: string;
  userId: string;
  name: string;
  description: string;
  coverUrl: string;
  trackIds: string[];
}

export interface Genre {
  id: string;
  name: string;
  slug: string;
  image: string;
}

export interface AnalyticsPoint {
  label: string;
  plays: number;
  listeners: number;
}

export interface Analytics {
  artistId: string;
  totalPlays: number;
  totalDownloads?: number;
  monthlyListeners: number;
  fans: number;
  growthPercent: number;
  timeline: AnalyticsPoint[];
  topTrackIds: string[];
  recentPlays: { trackId: string; city: string; minutesAgo: number }[];
  releasePerformance: { releaseId: string; plays: number; saves: number }[];
}
