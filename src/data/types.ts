export type AccountType = "listener" | "artist";

export interface User {
  id: string;
  name: string;
  username?: string | undefined;
  email: string;
  accountType: AccountType;
  avatarUrl: string;
  artistId?: string | undefined;
  isAdmin?: boolean | undefined;
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
export type ReleaseStatus =
  | "published"
  | "scheduled"
  | "draft"
  | "under_review"
  | "changes_required"
  | "processing";

export interface TechnicalValidation {
  format?: string | undefined;
  sampleRate?: number | undefined;
  bitDepth?: number | undefined;
  channels?: number | undefined;
  durationSeconds?: number | undefined;
  bitrateKbps?: number | undefined;
  isStereo?: boolean | undefined;
  isLossless?: boolean | undefined;
  is24Bit?: boolean | undefined;
  isVbr?: boolean | undefined;
  valid?: boolean | undefined;
  notes?: string | undefined;
  error?: string | undefined;
  warning?: string | undefined;
  qualityWarning?: string | undefined;
}

export interface AudioVariantInfo {
  storageKey: string;
  url: string;
  format: "opus" | "aac" | "wav" | "flac" | "mp3";
  bitrateKbps: number;
  sizeBytes: number;
  type: "stream" | "download";
}

export interface ReviewHistoryItem {
  id?: string | undefined;
  date: string;
  action: "submitted" | "approved" | "changes_requested" | "resubmitted";
  timestamp?: string | undefined;
  actorId?: string | undefined;
  actorName?: string | undefined;
  feedback?: string | undefined;
  notes?: string | undefined;
}


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
  /** ISO datetime the release goes live (midnight in Africa/Kampala UTC+03:00). */
  goLiveAt?: string | undefined;
  description?: string | undefined;
  label?: string | undefined;
  reviewSubmittedAt?: string | undefined;
  reviewedAt?: string | undefined;
  reviewerId?: string | undefined;
  reviewFeedback?: string | undefined;
  audioProcessingStatus?: "pending" | "processing" | "completed" | "failed" | undefined;
  technicalValidation?: TechnicalValidation | undefined;
  reviewHistory?: ReviewHistoryItem[] | undefined;
  createdAt?: string | undefined;
}


export interface Track {
  id: string;
  /** Permanent Plugg Track ID in PLG-YYYY-XXXXXX format. */
  pluggTrackId?: string | undefined;
  artistId: string;
  releaseId: string;
  title: string;
  slug: string;
  genre: string;
  coverUrl: string;
  audioUrl: string | null;
  durationSeconds: number;
  playCount: number;
  downloadCount?: number | undefined;
  likeCount?: number | undefined;
  published: boolean;
  releaseDate: string;
  features?: string | undefined;
  producers?: string | undefined;
  lyrics?: string | undefined;
  audioProcessingStatus?: "pending" | "processing" | "completed" | "failed" | undefined;
  technicalValidation?: TechnicalValidation | undefined;
  audioVariants?: Record<string, AudioVariantInfo> | undefined;
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
