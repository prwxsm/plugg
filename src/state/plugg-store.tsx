import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { analyticsByArtist, fallbackAnalytics } from "@/data/analytics";
import { artists as seedArtists } from "@/data/artists";
import { genres as seedGenres } from "@/data/genres";
import { playlists as seedPlaylists } from "@/data/playlists";
import { releases as seedReleases } from "@/data/releases";
import { tracks as seedTracks } from "@/data/tracks";
import type { Analytics, Artist, ArtistVerificationApplication, Genre, Playlist, RecordingType, Release, Track, UploaderRole, User } from "@/data/types";
import { goLiveAt, select, slugify } from "@/lib/plugg";
import {
  toggleLikeTrackFn,
  toggleFollowArtistFn,
  createPlaylistFn,
  addTrackToPlaylistFn,
  removeTrackFromPlaylistFn,
  deletePlaylistFn,
  updatePlaylistFn,
  upgradeToArtistFn,
  createReleaseWithTracksFn,
  updateArtistProfileFn,
  updateReleaseFn,
  updateTrackFn,
  deleteReleaseFn,
  recordTrackDownloadFn,
  approveReleaseFn,
  requestChangesReleaseFn,
  resubmitReleaseFn,
  retryTrackProcessingFn,
  replaceTrackAudioFn,
  submitVerificationApplicationFn,
} from "@/server-fns/data-functions";
import { logoutUser, updateUserProfileFn, deleteUserAccountFn } from "@/server-fns/auth-functions";
import { useAuthPrompt } from "@/components/plugg/auth-prompt-modal";
import { toast } from "sonner";

export type SessionState = "loggedOut" | "loggedInListener" | "loggedInArtist";
export type RepeatMode = "off" | "one" | "all";

export type StreamingQuality = "auto" | "data_saver" | "normal" | "high" | "very_high";
export type DownloadQuality = "data_saver" | "standard" | "very_high";

export interface UserSettings {
  autoplaySimilar: boolean;
  crossfade: boolean;
  crossfadeSeconds: number;
  streamingQuality: StreamingQuality;
  downloadQuality: DownloadQuality;
  highQualityStreaming: boolean;
  notifyNewReleases: boolean;
  notifyWeeklyDigest: boolean;
}

export const defaultUserSettings: UserSettings = {
  autoplaySimilar: true,
  crossfade: false,
  crossfadeSeconds: 5,
  streamingQuality: "auto",
  downloadQuality: "standard",
  highQualityStreaming: true,
  notifyNewReleases: true,
  notifyWeeklyDigest: false,
};

export interface PluggNotification {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  targetUrl: string;
  type: "drop" | "playlist" | "milestone" | "system";
}

export const defaultNotifications: PluggNotification[] = [
  {
    id: "notif-1",
    title: "New drop: Fresh releases from artists you follow",
    description: "Accra Motion by Bina Osel and more new releases are now ready to play.",
    timestamp: "12 minutes ago",
    targetUrl: "/discover",
    type: "drop",
  },
  {
    id: "notif-2",
    title: "Your weekly discovery mix has been refreshed",
    description: "Handpicked Afrobeats, Amapiano, and East African vibes tailored for you.",
    timestamp: "Today",
    targetUrl: "/discover",
    type: "playlist",
  },
  {
    id: "notif-3",
    title: "Milestone: 10,000 monthly streams reached",
    description: "Your artist catalog is gaining listeners across Lagos, Nairobi, and London.",
    timestamp: "Yesterday",
    targetUrl: "/dashboard",
    type: "milestone",
  },
  {
    id: "notif-4",
    title: "Trending: 'Bad' is climbing the charts",
    description: "Your track was featured in top daily listener queues.",
    timestamp: "2 days ago",
    targetUrl: "/discover",
    type: "system",
  },
];

export interface SongDraft {
  title: string;
  genre?: string;
  features: string;
  producers: string;
  lyrics: string;
  durationSeconds: number;
  file: { name: string; size: number } | null;
  audioUrl?: string | null;
  recordingType?: RecordingType;
  hasSamplesOrBeats?: boolean;
  sampleDetails?: string;
  isrc?: string;
  fileHash?: string;
}

export interface UploadDraft {
  step: number;
  type: Release["type"];
  title: string;
  genre: string;
  description: string;
  label?: string | undefined;
  coverKey: string;
  releaseDate: string;
  songs: SongDraft[];
  savedAt: string;
  uploaderRole?: UploaderRole;
  rightsDeclarationAccepted?: boolean;
}

export const emptySongDraft = (defaultGenre = "Afrobeats"): SongDraft => ({
  title: "",
  genre: defaultGenre,
  features: "",
  producers: "",
  lyrics: "",
  durationSeconds: 0,
  file: null,
  audioUrl: null,
  recordingType: "original",
  hasSamplesOrBeats: false,
  sampleDetails: "",
  isrc: "",
});

export interface NewReleaseInput {
  title: string;
  type: Release["type"];
  genre: string;
  coverKey: string;
  description: string;
  label?: string | undefined;
  releaseDate: string;
  songs: SongDraft[];
  uploaderRole?: UploaderRole;
  rightsDeclarationAccepted?: boolean;
}

export interface NewArtistInput {
  displayName: string;
  location: string;
  bio: string;
  avatarKey: string;
}

export interface InitialData {
  artists?: Artist[];
  tracks?: Track[];
  releases?: Release[];
  playlists?: Playlist[];
  genres?: Genre[];
  user?: User | null;
  likedTrackIds?: string[];
  followingArtistIds?: string[];
  analytics?: Analytics;
  verificationApplication?: ArtistVerificationApplication | null;
}

interface PluggContextValue {
  // data
  artists: Artist[];
  tracks: Track[];
  releases: Release[];
  playlists: Playlist[];
  genres: Genre[];
  analytics: Analytics;
  // session
  session: SessionState;
  currentUser: User | null;
  currentArtist: Artist | null;
  signIn: () => void;
  signOut: () => void;
  updateUser: (patch: Partial<User>) => Promise<User>;
  deleteAccount: () => Promise<void>;
  showAuthPrompt: (opts?: { title?: string; description?: string; returnTo?: string | undefined }) => void;
  // library
  likedTrackIds: string[];
  isLiked: (trackId: string) => boolean;
  toggleLike: (trackId: string) => void;
  followingArtistIds: string[];
  isFollowing: (artistId: string) => boolean;
  toggleFollow: (artistId: string) => void;
  recentlyPlayedIds: string[];
  createPlaylist: (name: string, description?: string, coverUrl?: string) => Playlist | null;
  addTrackToPlaylist: (playlistId: string, trackId: string) => void;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  deletePlaylist: (playlistId: string) => void;
  updatePlaylist: (
    playlistId: string,
    patch: { name?: string | undefined; description?: string | undefined; coverUrl?: string | undefined },
  ) => void;
  likedPlaylistIds: string[];
  toggleLikePlaylist: (playlistId: string) => void;
  userTrackPlays: Record<string, number>;
  recordDownload: (trackId: string) => boolean;
  // artist tools
  updateArtist: (patch: Partial<Artist>) => Promise<Artist | void>;
  upgradeToArtist: (input: NewArtistInput) => Promise<Artist>;
  createRelease: (input: NewReleaseInput) => Promise<Release>;
  updateRelease: (releaseId: string, patch: Partial<Pick<Release, "description">>) => void;
  updateTrack: (
    trackId: string,
    patch: Partial<Pick<Track, "features" | "producers" | "lyrics">>,
  ) => void;
  deleteRelease: (releaseId: string) => void;
  uploadDraft: UploadDraft | null;
  saveUploadDraft: (draft: UploadDraft) => void;
  clearUploadDraft: () => void;
  verificationApplication: ArtistVerificationApplication | null;
  submitVerificationApplication: (data: {
    legalName: string;
    contactEmail: string;
    contactPhone?: string | undefined;
    country?: string | undefined;
    city?: string | undefined;
    primaryGenre?: string | undefined;
    supportingLinks: string[];
    note?: string | undefined;
    accuracyConfirmed?: boolean | undefined;
  }) => Promise<ArtistVerificationApplication>;
  // review workflow
  approveRelease: (releaseId: string, newReleaseDate?: string) => Promise<void>;
  requestChangesRelease: (releaseId: string, feedback: string) => Promise<void>;
  resubmitRelease: (releaseId: string, releaseDate?: string, notes?: string) => Promise<void>;
  retryTrackProcessing: (trackId: string) => Promise<void>;
  replaceTrackAudio: (trackId: string, audioUrl: string, durationSeconds?: number) => Promise<any>;
  // notifications
  notifications: PluggNotification[];
  clearNotification: (id: string) => void;
  clearAllNotifications: () => void;
  restoreDefaultNotifications: () => void;
  // settings
  settings: UserSettings;
  updateSettings: (patch: Partial<UserSettings>) => void;
  networkQuality: "data_saver" | "normal" | "high" | "very_high";
  // player
  currentTrack: Track | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  getCurrentTime: () => number;
  volume: number;
  queue: string[];
  repeatMode: RepeatMode;
  shuffle: boolean;
  fullPlayerOpen: boolean;
  playTrack: (trackId: string, queueIds?: string[]) => void;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  seek: (seconds: number) => void;
  setVolume: (value: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setFullPlayerOpen: (open: boolean) => void;
  clearPlayer: () => void;
}

export function detectNetworkAdaptiveQuality(): "data_saver" | "normal" | "high" | "very_high" {
  if (typeof navigator === "undefined" || !("connection" in navigator)) {
    return "high";
  }
  const conn = (navigator as any).connection;
  if (!conn) return "high";

  // Prioritize data efficiency on mobile/cellular or saveData
  if (conn.saveData || conn.type === "cellular") {
    if (conn.effectiveType === "slow-2g" || conn.effectiveType === "2g") {
      return "data_saver";
    }
    return "normal";
  }

  if (conn.effectiveType === "slow-2g" || conn.effectiveType === "2g") {
    return "data_saver";
  }
  if (conn.effectiveType === "3g") {
    return "normal";
  }
  return "very_high";
}

export function getEffectiveStreamingUrl(
  track: Track,
  quality: StreamingQuality,
  adaptiveQuality: "data_saver" | "normal" | "high" | "very_high"
): string {
  if (!track.audioUrl) return "";
  const resolvedQuality = quality === "auto" ? adaptiveQuality : quality;

  // If track has specific audioVariants mapped, use direct variant if available
  if (track.audioVariants) {
    const variantKey =
      resolvedQuality === "data_saver"
        ? "stream_64k"
        : resolvedQuality === "normal"
          ? "stream_96k"
          : resolvedQuality === "high"
            ? "stream_160k"
            : "stream_256k";
    if (track.audioVariants[variantKey]?.url) {
      return track.audioVariants[variantKey].url;
    }
  }

  // Otherwise, route through /api/stream with quality query parameter
  if (track.audioUrl.startsWith("/api/stream/")) {
    const url = new URL(
      track.audioUrl,
      typeof window !== "undefined" ? window.location.origin : "http://localhost"
    );
    url.searchParams.set("quality", resolvedQuality);
    return url.pathname + url.search;
  }

  return track.audioUrl;
}

const PluggContext = createContext<PluggContextValue | null>(null);

export function PluggProvider({
  initialData,
  children,
}: {
  initialData?: InitialData | null;
  children: ReactNode;
}) {
  const { showAuthPrompt } = useAuthPrompt();
  const [artists, setArtists] = useState<Artist[]>(
    initialData?.artists ?? [],
  );
  const [tracks, setTracks] = useState<Track[]>(
    initialData?.tracks ?? [],
  );
  const [releases, setReleases] = useState<Release[]>(
    initialData?.releases ?? [],
  );
  const [playlists, setPlaylists] = useState<Playlist[]>(
    initialData?.playlists ?? [],
  );
  const genres = useMemo(
    () => (initialData?.genres ?? []),
    [initialData?.genres],
  );

  // Sync state if initialData is provided/updated
  useEffect(() => {
    if (initialData?.artists) setArtists(initialData.artists);
    if (initialData?.tracks) setTracks(initialData.tracks);
    if (initialData?.releases) setReleases(initialData.releases);
    if (initialData?.playlists) setPlaylists(initialData.playlists);
    if (initialData?.likedTrackIds) setLikedTrackIds(initialData.likedTrackIds);
    if (initialData?.followingArtistIds) setFollowingArtistIds(initialData.followingArtistIds);
    if (initialData?.user) {
      setDbUser(initialData.user);
      setSession(initialData.user.accountType === "artist" ? "loggedInArtist" : "loggedInListener");
    } else if (initialData && initialData.user === null) {
      setDbUser(null);
      setSession("loggedOut");
    }
    if (initialData?.verificationApplication !== undefined) {
      setVerificationApplication(initialData.verificationApplication);
    }
  }, [initialData]);

  const [dbUser, setDbUser] = useState<User | null>(initialData?.user ?? null);
  const [session, setSession] = useState<SessionState>(() => {
    if (initialData?.user) {
      return initialData.user.accountType === "artist" ? "loggedInArtist" : "loggedInListener";
    }
    return "loggedOut";
  });

  const [verificationApplication, setVerificationApplication] =
    useState<ArtistVerificationApplication | null>(
      initialData?.verificationApplication ?? null,
    );

  const [likedTrackIds, setLikedTrackIds] = useState<string[]>(initialData?.likedTrackIds ?? []);
  const [followingArtistIds, setFollowingArtistIds] = useState<string[]>(
    initialData?.followingArtistIds ?? [],
  );
  const [recentlyPlayedIds, setRecentlyPlayedIds] = useState<string[]>(["t17", "t5", "t1"]);
  const [likedPlaylistIds, setLikedPlaylistIds] = useState<string[]>([]);
  const [userTrackPlays, setUserTrackPlays] = useState<Record<string, number>>({});

  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeDuration, setActiveDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [queue, setQueue] = useState<string[]>([]);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("off");
  const [shuffle, setShuffle] = useState(false);
  const [fullPlayerOpen, setFullPlayerOpen] = useState(false);
  const [upgradedArtistId, setUpgradedArtistId] = useState<string | null>(null);
  const [uploadDraft, setUploadDraft] = useState<UploadDraft | null>(null);
  const [restored, setRestored] = useState(false);
  const [allNotifications, setAllNotifications] = useState<PluggNotification[]>(defaultNotifications);

  // User playback & notification settings
  const [settings, setSettings] = useState<UserSettings>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = window.localStorage.getItem("plugg:settings");
        if (stored) {
          return { ...defaultUserSettings, ...JSON.parse(stored) };
        }
      } catch {
        /* ignore */
      }
    }
    return defaultUserSettings;
  });

  const [networkQuality, setNetworkQuality] = useState<"data_saver" | "normal" | "high" | "very_high">(
    () => detectNetworkAdaptiveQuality()
  );
  const networkQualityRef = useRef(networkQuality);
  networkQualityRef.current = networkQuality;

  useEffect(() => {
    if (typeof navigator === "undefined" || !("connection" in navigator)) return;
    const conn = (navigator as any).connection;
    if (!conn) return;
    const updateNetwork = () => {
      const q = detectNetworkAdaptiveQuality();
      setNetworkQuality(q);
      networkQualityRef.current = q;
    };
    conn.addEventListener?.("change", updateNetwork);
    return () => {
      conn.removeEventListener?.("change", updateNetwork);
    };
  }, []);

  const updateSettings = useCallback((patch: Partial<UserSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try {
        window.localStorage.setItem("plugg:settings", JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("plugg:notifications");
      if (stored) {
        setAllNotifications(JSON.parse(stored));
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Sync artist verification application status updates to user notifications
  useEffect(() => {
    if (!verificationApplication || verificationApplication.status === "pending") return;
    const notifId = `verification-${verificationApplication.id}-${verificationApplication.status}-${verificationApplication.reviewedAt || verificationApplication.updatedAt}`;
    try {
      const dismissed: string[] = JSON.parse(
        window.localStorage.getItem("plugg:dismissed_notifs") || "[]",
      );
      if (Array.isArray(dismissed) && dismissed.includes(notifId)) return;
    } catch {
      /* ignore */
    }

    setAllNotifications((prev) => {
      if (prev.some((n) => n.id === notifId)) return prev;
      const newNotif: PluggNotification = {
        id: notifId,
        title:
          verificationApplication.status === "approved"
            ? "Artist Verification Approved"
            : verificationApplication.status === "more_info_required"
              ? "Verification: Action Required"
              : "Artist Verification Declined",
        description:
          verificationApplication.status === "approved"
            ? `Congratulations! Your artist profile "${verificationApplication.stageName}" is now officially verified on Plugg.`
            : verificationApplication.adminFeedback
              ? `Review feedback: "${verificationApplication.adminFeedback}"`
              : verificationApplication.status === "more_info_required"
                ? "The review team requested additional details or active streaming links for your application."
                : "Your artist verification application was reviewed and not approved at this time.",
        timestamp: "Recently",
        targetUrl: "/profile?verify=1",
        type: "system",
      };
      const updated = [newNotif, ...prev];
      try {
        window.localStorage.setItem("plugg:notifications", JSON.stringify(updated));
      } catch {
        /* ignore */
      }
      return updated;
    });
  }, [verificationApplication]);

  const clearNotification = useCallback((id: string) => {
    setAllNotifications((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      try {
        window.localStorage.setItem("plugg:notifications", JSON.stringify(updated));
        if (id.startsWith("verification-")) {
          const dismissed: string[] = JSON.parse(
            window.localStorage.getItem("plugg:dismissed_notifs") || "[]",
          );
          if (!dismissed.includes(id)) {
            dismissed.push(id);
            window.localStorage.setItem("plugg:dismissed_notifs", JSON.stringify(dismissed));
          }
        }
      } catch {
        /* ignore */
      }
      return updated;
    });
  }, []);

  const clearAllNotifications = useCallback(() => {
    setAllNotifications([]);
    try {
      window.localStorage.setItem("plugg:notifications", JSON.stringify([]));
    } catch {
      /* ignore */
    }
  }, []);

  const restoreDefaultNotifications = useCallback(() => {
    setAllNotifications(defaultNotifications);
    try {
      window.localStorage.setItem("plugg:notifications", JSON.stringify(defaultNotifications));
    } catch {
      /* ignore */
    }
  }, []);

  // Filter visible notifications by active notification settings
  const notifications = useMemo(() => {
    return allNotifications.filter((n) => {
      if (n.type === "drop" && !settings.notifyNewReleases) return false;
      if (n.type === "playlist" && !settings.notifyWeeklyDigest) return false;
      return true;
    });
  }, [allNotifications, settings.notifyNewReleases, settings.notifyWeeklyDigest]);

  // Restore client-only state (drafts, queue, recents) from localStorage
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("plugg:state");
      if (raw) {
        const s = JSON.parse(raw) as Record<string, unknown>;
        if (Array.isArray(s["recentlyPlayedIds"]))
          setRecentlyPlayedIds(s["recentlyPlayedIds"] as string[]);
        if (typeof s["upgradedArtistId"] === "string") setUpgradedArtistId(s["upgradedArtistId"]);
        if (s["uploadDraft"] && typeof s["uploadDraft"] === "object")
          setUploadDraft(s["uploadDraft"] as UploadDraft);
        if (Array.isArray(s["likedPlaylistIds"]))
          setLikedPlaylistIds(s["likedPlaylistIds"] as string[]);
        if (s["userTrackPlays"] && typeof s["userTrackPlays"] === "object")
          setUserTrackPlays(s["userTrackPlays"] as Record<string, number>);
      }
    } catch {
      /* ignore */
    }
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored) return;
    try {
      window.localStorage.setItem(
        "plugg:state",
        JSON.stringify({
          recentlyPlayedIds,
          upgradedArtistId,
          uploadDraft,
          likedPlaylistIds,
          userTrackPlays,
        }),
      );
    } catch {
      /* storage unavailable */
    }
  }, [
    restored,
    recentlyPlayedIds,
    upgradedArtistId,
    uploadDraft,
    likedPlaylistIds,
    userTrackPlays,
  ]);

  const currentTrack = useMemo(
    () => (currentTrackId ? (select.track(tracks, currentTrackId) ?? null) : null),
    [currentTrackId, tracks],
  );

  const currentUser: User | null = useMemo(() => {
    return dbUser;
  }, [dbUser]);

  const currentArtist = useMemo(() => {
    if (!currentUser?.artistId) return null;
    return select.artist(artists, currentUser.artistId) ?? null;
  }, [artists, currentUser]);

  const analytics = useMemo<Analytics>(() => {
    if (initialData?.analytics) return initialData.analytics;
    const id = currentArtist?.id ?? "a1";
    const base = analyticsByArtist[id] ?? fallbackAnalytics(id);
    if (!currentArtist) return base;
    return {
      ...base,
      totalPlays: currentArtist.totalPlays,
      monthlyListeners: currentArtist.monthlyListeners,
      fans: currentArtist.fans,
    };
  }, [currentArtist, initialData?.analytics]);

  // ── HTML5 Audio Engine & Play Tracking ──
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playCountLoggedRef = useRef<string | null>(null);
  const clientSessionId = useRef<string>(crypto.randomUUID());

  // Settings & volume refs for real-time audio animation
  const volumeRef = useRef(volume);
  volumeRef.current = volume;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const currentTrackIdRef = useRef(currentTrackId);
  currentTrackIdRef.current = currentTrackId;
  const currentTrackRef = useRef(currentTrack);
  currentTrackRef.current = currentTrack;
  const repeatModeRef = useRef(repeatMode);
  repeatModeRef.current = repeatMode;
  const fadeIntervalRef = useRef<number | null>(null);

  // Initialize Audio element once on client
  useEffect(() => {
    if (typeof window === "undefined") return;
    const audio = new Audio();
    audio.preload = settings.highQualityStreaming ? "auto" : "metadata";
    audioRef.current = audio;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    const onDurationSync = () => {
      const dur = audio.duration;
      if (Number.isFinite(dur) && dur > 0) {
        const rounded = Math.round(dur);
        setActiveDuration(rounded);
        setTracks((prev) =>
          prev.map((t) =>
            t.id === currentTrackIdRef.current && t.durationSeconds !== rounded
              ? { ...t, durationSeconds: rounded }
              : t,
          ),
        );
      }
    };

    const onTimeUpdate = () => {
      const current = audio.currentTime;
      const dur = audio.duration;
      if (Number.isFinite(dur) && dur > 0) {
        // When within 0.25s of end, clamp progress to full duration so the line completes 100%
        if (current >= dur - 0.25) {
          setProgress(Math.round(dur));
        } else {
          setProgress(Math.floor(current));
        }
      } else {
        setProgress(Math.floor(current));
      }

      // Handle crossfade volume fade out at track tail
      if (settingsRef.current.crossfade && dur && !Number.isNaN(dur)) {
        const remaining = dur - current;
        const fadeSec = settingsRef.current.crossfadeSeconds;
        if (remaining <= fadeSec && remaining > 0 && dur > fadeSec * 2) {
          const factor = Math.max(0, remaining / fadeSec);
          audio.volume = Math.max(0, Math.min(1, volumeRef.current * factor));
        }
      }
    };

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onDurationSync);
    audio.addEventListener("durationchange", onDurationSync);
    audio.addEventListener("canplay", onDurationSync);

    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onDurationSync);
      audio.removeEventListener("durationchange", onDurationSync);
      audio.removeEventListener("canplay", onDurationSync);
      audio.pause();
    };
  }, []);

  // Seamlessly adjust playback quality when setting or network changes without interruption
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrackRef.current) return;
    const effUrl = getEffectiveStreamingUrl(
      currentTrackRef.current,
      settings.streamingQuality,
      networkQuality
    );
    if (!effUrl) return;

    // Check if the current audio.src already matches the target URL or quality query
    const currentSrc = audio.src;
    if (currentSrc === effUrl || currentSrc.endsWith(effUrl)) return;

    // Preserve playback position and playing state
    const currentTime = audio.currentTime;
    const wasPlaying = !audio.paused;

    audio.src = effUrl;
    audio.currentTime = currentTime;
    if (wasPlaying) {
      audio.play().catch(() => {});
    }
  }, [settings.streamingQuality, networkQuality]);

  // Update audio preloading when high quality streaming setting changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.preload =
        settings.streamingQuality === "high" ||
        settings.streamingQuality === "very_high" ||
        settings.highQualityStreaming
          ? "auto"
          : "metadata";
    }
  }, [settings.streamingQuality, settings.highQualityStreaming]);

  // Restore volume immediately if crossfade is turned off while playing
  useEffect(() => {
    if (!settings.crossfade && audioRef.current) {
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
        fadeIntervalRef.current = null;
      }
      audioRef.current.volume = Math.max(0, Math.min(1, volume));
    }
  }, [settings.crossfade, volume]);

  // Update audio volume when state changes
  const setVolume = useCallback((val: number) => {
    setVolumeState(val);
    if (audioRef.current) {
      audioRef.current.volume = Math.max(0, Math.min(1, val));
    }
  }, []);

  // Synchronize Audio playback when currentTrack changes
  const playTrackInternal = useCallback(
    (trackId: string, queueIds?: string[]) => {
      setCurrentTrackId(trackId);
      setProgress(0);
      setIsPlaying(true);
      playCountLoggedRef.current = null; // reset 30s play count threshold

      setQueue(queueIds && queueIds.length > 0 ? queueIds : [trackId]);
      setRecentlyPlayedIds((prev) =>
        [trackId, ...prev.filter((id) => id !== trackId)].slice(0, 12),
      );
      setUserTrackPlays((prev) => ({ ...prev, [trackId]: (prev[trackId] || 0) + 1 }));

      const target = tracks.find((t) => t.id === trackId);
      setActiveDuration(target?.durationSeconds ?? 0);
      const audio = audioRef.current;
      if (audio && target) {
        const streamUrl = getEffectiveStreamingUrl(
          target,
          settingsRef.current.streamingQuality,
          networkQualityRef.current
        );
        if (streamUrl && audio.src !== streamUrl) {
          audio.src = streamUrl;
        }
        audio.currentTime = 0;

        // Apply crossfade fade-in if enabled
        if (settingsRef.current.crossfade) {
          if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
          audio.volume = 0;
          const targetVol = volumeRef.current;
          const steps = 16;
          const stepTime = 1000 / steps;
          let currentStep = 0;
          fadeIntervalRef.current = window.setInterval(() => {
            currentStep++;
            if (!audioRef.current) {
              if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
              return;
            }
            const currentVol = (currentStep / steps) * targetVol;
            audioRef.current.volume = Math.min(targetVol, Math.max(0, currentVol));
            if (currentStep >= steps) {
              if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
              fadeIntervalRef.current = null;
            }
          }, stepTime);
        } else {
          if (fadeIntervalRef.current) {
            clearInterval(fadeIntervalRef.current);
            fadeIntervalRef.current = null;
          }
          audio.volume = volumeRef.current;
        }

        audio.play().catch((err) => {
          console.warn("Audio autoplay blocked by browser policy:", err);
        });
      }
    },
    [tracks],
  );

  const step = useCallback(
    (direction: 1 | -1) => {
      if (!currentTrackId) return;
      const list = queue.length > 0 ? queue : [currentTrackId];
      if (shuffle && direction === 1 && list.length > 1) {
        const pool = list.filter((id) => id !== currentTrackId);
        const pick = pool[Math.floor(Math.random() * pool.length)];
        if (pick) {
          playTrackInternal(pick, queue);
        }
        return;
      }
      const index = list.indexOf(currentTrackId);
      const nextIndex = index + direction;
      const wrapped =
        nextIndex < 0
          ? list.length - 1
          : nextIndex >= list.length
            ? repeatMode === "off"
              ? -1
              : 0
            : nextIndex;
      if (wrapped === -1) {
        // Autoplay similar music when queue ends if enabled
        if (settingsRef.current.autoplaySimilar && tracks.length > 0) {
          const current = currentTrackId ? select.track(tracks, currentTrackId) : null;
          const candidates = tracks.filter((t) => {
            if (t.id === currentTrackId) return false;
            if (list.includes(t.id)) return false;
            return (
              (current?.genre && t.genre.toLowerCase() === current.genre.toLowerCase()) ||
              (current?.artistId && t.artistId === current.artistId)
            );
          });
          const pool =
            candidates.length > 0
              ? candidates
              : tracks.filter((t) => t.id !== currentTrackId && !list.includes(t.id));
          const nextTrack =
            pool.length > 0
              ? pool[Math.floor(Math.random() * pool.length)]
              : tracks.filter((t) => t.id !== currentTrackId)[0] || tracks[0];

          if (nextTrack) {
            const newQueue = [...list, nextTrack.id];
            playTrackInternal(nextTrack.id, newQueue);
            toast.info(`Autoplaying similar track: ${nextTrack.title}`, {
              description: "Queue ended • Playing related music based on your taste",
            });
            return;
          }
        }

        setIsPlaying(false);
        const finalDur =
          audioRef.current?.duration &&
          Number.isFinite(audioRef.current.duration) &&
          audioRef.current.duration > 0
            ? Math.round(audioRef.current.duration)
            : (activeDuration > 0 ? activeDuration : (currentTrackRef.current?.durationSeconds ?? 0));
        setProgress(finalDur);
        if (audioRef.current) {
          audioRef.current.pause();
        }
        return;
      }
      const nextId = list[wrapped];
      if (!nextId) return;
      playTrackInternal(nextId, queue);
    },
    [currentTrackId, queue, repeatMode, shuffle, tracks, playTrackInternal, activeDuration],
  );

  const stepRef = useRef(step);
  stepRef.current = step;

  // Handle track ended
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onEnded = () => {
      const finalDur =
        audio.duration && Number.isFinite(audio.duration) && audio.duration > 0
          ? Math.round(audio.duration)
          : (activeDuration > 0 ? activeDuration : (currentTrackRef.current?.durationSeconds ?? progress));
      setProgress(finalDur);

      if (repeatModeRef.current === "one") {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else {
        setTimeout(() => {
          stepRef.current(1);
        }, 120);
      }
    };

    audio.addEventListener("ended", onEnded);
    return () => audio.removeEventListener("ended", onEnded);
  }, [activeDuration, progress]);

  const playTrack = useCallback(
    (trackId: string, queueIds?: string[]) => {
      playTrackInternal(trackId, queueIds);
    },
    [playTrackInternal],
  );

  // Play counting: log count after 30 seconds of playback
  useEffect(() => {
    if (!currentTrack || progress < 30) return;
    if (playCountLoggedRef.current === currentTrack.id) return;

    playCountLoggedRef.current = currentTrack.id;

    // Send to /api/play
    fetch("/api/play", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trackId: currentTrack.id,
        durationPlayedSeconds: progress,
        sessionId: clientSessionId.current,
        userId: currentUser?.id,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.counted && typeof data.newPlayCount === "number") {
          setTracks((prev) =>
            prev.map((t) =>
              t.id === currentTrack.id ? { ...t, playCount: data.newPlayCount } : t,
            ),
          );
        }
      })
      .catch((err) => console.warn("Failed to record play:", err));
  }, [progress, currentTrack, currentUser?.id]);

  // Fallback timer when track has no audioUrl (so demo items still have visual progress)
  useEffect(() => {
    if (!isPlaying || currentTrack?.audioUrl) return;
    const duration = currentTrack?.durationSeconds ?? 0;
    if (duration <= 0) return;

    const interval = window.setInterval(() => {
      setProgress((prev) => {
        if (prev + 1 >= duration) {
          if (repeatMode === "one") return 0;
          stepRef.current(1);
          return 0;
        }
        return prev + 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isPlaying, currentTrack, repeatMode]);

  const value: PluggContextValue = {
    artists,
    tracks,
    releases,
    playlists,
    genres,
    analytics,
    session,
    currentUser,
    currentArtist,
    signIn: () => {
      window.location.href = "/auth";
    },
    signOut: () => {
      logoutUser()
        .then(() => {
          setDbUser(null);
          setSession("loggedOut");
          window.location.href = "/auth";
        })
        .catch((err) => {
          console.warn("Logout error:", err);
          setDbUser(null);
          setSession("loggedOut");
          window.location.href = "/auth";
        });
    },
    updateUser: async (patch: Partial<User>) => {
      try {
        const updated = await updateUserProfileFn({ data: patch });
        setDbUser(updated as User);
        return updated as User;
      } catch (err: unknown) {
        console.error("Failed to update user profile:", err);
        const msg = (err as Error)?.message || "Failed to save profile changes";
        toast.error(msg);
        throw err;
      }
    },
    deleteAccount: async () => {
      try {
        await deleteUserAccountFn();
        setDbUser(null);
        setSession("loggedOut");
        toast.success("Your account has been deleted");
        window.location.href = "/";
      } catch (err) {
        console.error("Failed to delete account:", err);
        toast.error("Failed to delete account. Please try again.");
        throw err;
      }
    },
    showAuthPrompt,
    likedTrackIds,
    isLiked: (trackId) => likedTrackIds.includes(trackId),
    toggleLike: (trackId) => {
      if (!currentUser) {
        showAuthPrompt({
          title: "Sign in to like tracks",
          description: "Save your favorite tracks and build your personal collection by creating a free account.",
        });
        return;
      }
      const willLike = !likedTrackIds.includes(trackId);
      setLikedTrackIds((prev) =>
        willLike ? [trackId, ...prev] : prev.filter((id) => id !== trackId),
      );
      setTracks((prev) =>
        prev.map((t) =>
          t.id === trackId
            ? { ...t, likeCount: Math.max(0, (t.likeCount || 0) + (willLike ? 1 : -1)) }
            : t,
        ),
      );
      toggleLikeTrackFn({ data: { trackId } }).catch((err) => {
        console.warn("Could not sync like with server:", err);
      });
    },
    recordDownload: (trackId: string) => {
      if (!currentUser) {
        showAuthPrompt({
          title: "Sign in to download music",
          description: "Create an account or sign in to download tracks for offline listening.",
        });
        return false;
      }
      setTracks((prev) =>
        prev.map((t) =>
          t.id === trackId ? { ...t, downloadCount: (t.downloadCount || 0) + 1 } : t,
        ),
      );
      recordTrackDownloadFn({ data: { trackId } }).catch((err) => {
        console.warn("Could not sync download with server:", err);
      });
      return true;
    },
    followingArtistIds,
    isFollowing: (artistId) => followingArtistIds.includes(artistId),
    toggleFollow: (artistId) => {
      if (!currentUser) {
        showAuthPrompt({
          title: "Sign in to follow artists",
          description: "Follow your favorite artists to stay notified of their latest drops and milestones.",
        });
        return;
      }
      const willFollow = !followingArtistIds.includes(artistId);
      setFollowingArtistIds((prev) =>
        willFollow ? [artistId, ...prev] : prev.filter((id) => id !== artistId),
      );
      setArtists((prev) =>
        prev.map((a) => (a.id === artistId ? { ...a, fans: a.fans + (willFollow ? 1 : -1) } : a)),
      );
      toggleFollowArtistFn({ data: { artistId } }).catch((err) => {
        console.warn("Could not sync follow with server:", err);
      });
    },
    recentlyPlayedIds,
    createPlaylist: (name: string, description = "", coverUrl?: string) => {
      if (!currentUser) {
        showAuthPrompt({
          title: "Sign in to create playlists",
          description: "Create and organize your favorite African music into custom playlists.",
        });
        return null;
      }
      const playlistId =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `p-${Date.now()}`;

      const finalCover = coverUrl || "default_playlist";

      const playlist: Playlist = {
        id: playlistId,
        userId: currentUser.id,
        name,
        description,
        coverUrl: finalCover,
        trackIds: [],
      };
      setPlaylists((prev) => [playlist, ...prev]);

      createPlaylistFn({
        data: {
          id: playlistId,
          name,
          description,
          coverUrl: finalCover,
        },
      })
        .then((created) => {
          setPlaylists((prev) =>
            prev.map((p) =>
              p.id === playlistId ? { ...p, ...created, trackIds: p.trackIds } : p,
            ),
          );
        })
        .catch((err) => console.warn("Could not sync playlist with server:", err));

      return playlist;
    },
    addTrackToPlaylist: (playlistId, trackId) => {
      if (!currentUser) {
        showAuthPrompt({
          title: "Sign in to save to playlists",
          description: "Create an account or sign in to add songs to playlists.",
        });
        return;
      }
      setPlaylists((prev) =>
        prev.map((p) =>
          p.id === playlistId && !p.trackIds.includes(trackId)
            ? { ...p, trackIds: [...p.trackIds, trackId] }
            : p,
        ),
      );
      addTrackToPlaylistFn({ data: { playlistId, trackId } }).catch((err) => {
        console.warn("Could not sync addTrackToPlaylist:", err);
      });
    },
    removeTrackFromPlaylist: (playlistId, trackId) => {
      if (!currentUser) return;
      setPlaylists((prev) =>
        prev.map((p) =>
          p.id === playlistId ? { ...p, trackIds: p.trackIds.filter((id) => id !== trackId) } : p,
        ),
      );
      removeTrackFromPlaylistFn({ data: { playlistId, trackId } }).catch((err) => {
        console.warn("Could not sync removeTrackFromPlaylist:", err);
      });
    },
    deletePlaylist: (playlistId) => {
      if (!currentUser) return;
      setPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
      deletePlaylistFn({ data: { playlistId } }).catch((err) => {
        console.warn("Could not sync deletePlaylist:", err);
      });
    },
    updatePlaylist: (playlistId, patch) => {
      if (!currentUser) return;
      setPlaylists((prev) =>
        prev.map((p) => {
          if (p.id !== playlistId) return p;
          return {
            ...p,
            ...(typeof patch.name === "string" ? { name: patch.name } : {}),
            ...(typeof patch.description === "string" ? { description: patch.description } : {}),
            ...(typeof patch.coverUrl === "string" ? { coverUrl: patch.coverUrl } : {}),
          };
        }),
      );
      updatePlaylistFn({ data: { playlistId, patch } }).catch((err) => {
        console.warn("Could not sync updatePlaylist:", err);
      });
    },
    likedPlaylistIds,
    toggleLikePlaylist: (playlistId) => {
      if (!currentUser) {
        showAuthPrompt({
          title: "Sign in to save playlists",
          description: "Save playlists to your library by creating an account or signing in.",
        });
        return;
      }
      setLikedPlaylistIds((prev) =>
        prev.includes(playlistId) ? prev.filter((id) => id !== playlistId) : [playlistId, ...prev],
      );
    },
    userTrackPlays,
    updateArtist: async (patch) => {
      if (!currentArtist) return;
      const updated = await updateArtistProfileFn({ data: patch });
      const mergedArtist = updated
        ? { ...currentArtist, ...updated, socialLinks: updated.socialLinks ?? patch.socialLinks ?? currentArtist.socialLinks }
        : { ...currentArtist, ...patch, socialLinks: patch.socialLinks ?? currentArtist.socialLinks };
      setArtists((prev) => prev.map((a) => (a.id === currentArtist.id ? mergedArtist : a)));
      return mergedArtist;
    },
    upgradeToArtist: async (input) => {
      try {
        const createdArtist = await upgradeToArtistFn({ data: input });
        setArtists((prev) => [createdArtist, ...prev]);
        setUpgradedArtistId(createdArtist.id);
        setSession("loggedInArtist");
        if (currentUser) {
          setDbUser({ ...currentUser, accountType: "artist", artistId: createdArtist.id });
        }
        return createdArtist;
      } catch {
        // Fallback local upgrade if server call fails
        const id = `a${Date.now()}`;
        const artist: Artist = {
          id,
          username: slugify(input.displayName) || "new-artist",
          displayName: input.displayName,
          bio: input.bio,
          location: input.location,
          avatarUrl: input.avatarKey,
          coverUrl: "b1",
          verified: false,
          fans: 0,
          monthlyListeners: 0,
          totalPlays: 0,
          phoneNumber: "",
          socialLinks: {},
        };
        setArtists((prev) => [artist, ...prev]);
        setUpgradedArtistId(id);
        setSession("loggedInArtist");
        return artist;
      }
    },
    createRelease: async (input) => {
      const artistId = currentArtist?.id ?? "a1";
      const releaseId = `r${Date.now()}`;
      const songs = input.songs.filter((s) => s.title.trim().length > 0);
      const list = songs.length > 0 ? songs : [{ ...emptySongDraft(), title: input.title }];

      const goLiveTime = goLiveAt(input.releaseDate);
      const releaseStatus: Release["status"] = "under_review";
      const reviewSubmittedAt = new Date().toISOString();

      const newTracks: Track[] = list.map((song, index) => ({
        id: `${releaseId}-t${index + 1}`,
        artistId,
        releaseId,
        title: song.title.trim(),
        slug: slugify(`${song.title}-${index + 1}`),
        genre: song.genre || input.genre,
        coverUrl: input.coverKey,
        audioUrl: song.audioUrl || null,
        durationSeconds: song.durationSeconds > 0 ? song.durationSeconds : 180 + index * 17,
        playCount: 0,
        published: false,
        releaseDate: input.releaseDate,
        features: song.features,
        producers: song.producers,
        lyrics: song.lyrics,
        audioProcessingStatus: "completed",
        recordingType: song.recordingType || "original",
        hasSamplesOrBeats: song.hasSamplesOrBeats,
        sampleDetails: song.sampleDetails,
        isrc: song.isrc,
        fileHash: song.fileHash,
      }));

      const release: Release = {
        id: releaseId,
        artistId,
        title: input.title,
        slug: slugify(input.title),
        type: input.type,
        coverUrl: input.coverKey,
        releaseDate: input.releaseDate,
        status: releaseStatus,
        goLiveAt: goLiveTime,
        description: input.description,
        label: input.label,
        reviewSubmittedAt,
        audioProcessingStatus: "completed",
        trackIds: newTracks.map((t) => t.id),
        uploaderRole: input.uploaderRole || "owner",
        rightsDeclarationAccepted: input.rightsDeclarationAccepted,
        rightsDeclarationTimestamp: input.rightsDeclarationAccepted ? reviewSubmittedAt : undefined,
        rightsDeclarationVersion: input.rightsDeclarationAccepted ? "2026-10-31.1" : undefined,
      };

      setTracks((prev) => [...newTracks, ...prev]);
      setReleases((prev) => [release, ...prev]);
      setUploadDraft(null);

      // Persist to database
      createReleaseWithTracksFn({
        data: {
          release: {
            title: input.title,
            type: input.type,
            genre: input.genre,
            coverUrl: input.coverKey,
            description: input.description,
            label: input.label,
            releaseDate: input.releaseDate,
            goLiveAt: goLiveTime,
            status: releaseStatus,
            uploaderRole: input.uploaderRole || "owner",
            rightsDeclarationAccepted: input.rightsDeclarationAccepted,
          },
          songs: list.map((s) => ({
            title: s.title,
            genre: s.genre || input.genre,
            features: s.features,
            producers: s.producers,
            lyrics: s.lyrics,
            durationSeconds: s.durationSeconds,
            audioUrl: s.audioUrl || undefined,
            recordingType: s.recordingType || "original",
            hasSamplesOrBeats: s.hasSamplesOrBeats,
            sampleDetails: s.sampleDetails,
            isrc: s.isrc,
          })),
        },
      }).catch((err) => console.warn("Could not save release to database:", err));

      return release;
    },
    updateRelease: (releaseId, patch) => {
      setReleases((prev) => prev.map((r) => (r.id === releaseId ? { ...r, ...patch } : r)));
      updateReleaseFn({ data: { releaseId, patch } }).catch((err) => {
        console.warn("Could not sync release update with database:", err);
      });
    },
    updateTrack: (trackId, patch) => {
      setTracks((prev) => prev.map((t) => (t.id === trackId ? { ...t, ...patch } : t)));
      updateTrackFn({ data: { trackId, patch } }).catch((err) => {
        console.warn("Could not sync track update with database:", err);
      });
    },
    deleteRelease: (releaseId: string) => {
      setReleases((prev) => prev.filter((r) => r.id !== releaseId));
      setTracks((prev) => prev.filter((t) => t.releaseId !== releaseId));
      deleteReleaseFn({ data: { releaseId } }).catch((err) => {
        console.warn("Could not sync release deletion with database:", err);
      });
    },
    uploadDraft,
    saveUploadDraft: setUploadDraft,
    clearUploadDraft: () => setUploadDraft(null),
    verificationApplication,
    submitVerificationApplication: async (data) => {
      const res = await submitVerificationApplicationFn({ data });
      if (res?.application) {
        setVerificationApplication(res.application);
      }
      return res.application;
    },
    // review workflow
    approveRelease: async (releaseId: string, newReleaseDate?: string | undefined) => {
      try {
        await approveReleaseFn({ data: { releaseId, newReleaseDate } });
        setReleases((prev) =>
          prev.map((r) =>
            r.id === releaseId
              ? {
                  ...r,
                  status: "scheduled",
                  releaseDate: newReleaseDate || r.releaseDate,
                  reviewedAt: new Date().toISOString(),
                  reviewFeedback: undefined,
                }
              : r
          )
        );
        toast.success("Track approved and moved to Scheduled!");
      } catch (err: any) {
        toast.error(err.message || "Failed to approve release");
        throw err;
      }
    },
    requestChangesRelease: async (releaseId: string, feedback: string) => {
      try {
        await requestChangesReleaseFn({ data: { releaseId, feedback } });
        setReleases((prev) =>
          prev.map((r) =>
            r.id === releaseId
              ? {
                  ...r,
                  status: "changes_required",
                  reviewedAt: new Date().toISOString(),
                  reviewFeedback: feedback,
                }
              : r
          )
        );
        toast.info("Changes requested from artist.");
      } catch (err: any) {
        toast.error(err.message || "Failed to request changes");
        throw err;
      }
    },
    resubmitRelease: async (releaseId: string, releaseDate?: string | undefined, notes?: string | undefined) => {
      try {
        await resubmitReleaseFn({ data: { releaseId, releaseDate, notes } });
        setReleases((prev) =>
          prev.map((r) =>
            r.id === releaseId
              ? {
                  ...r,
                  status: "under_review",
                  reviewSubmittedAt: new Date().toISOString(),
                  releaseDate: releaseDate || r.releaseDate,
                }
              : r
          )
        );
        toast.success("Track resubmitted for review!");
      } catch (err: any) {
        toast.error(err.message || "Failed to resubmit release");
        throw err;
      }
    },
    retryTrackProcessing: async (trackId: string) => {
      try {
        const res = await retryTrackProcessingFn({ data: { trackId } });
        if (!res.success) {
          toast.error(res.error || "Failed to process audio");
          return;
        }
        toast.info("Audio processing restarted.");
      } catch (err: any) {
        toast.error(err.message || "Failed to retry audio processing");
        throw err;
      }
    },
    replaceTrackAudio: async (trackId: string, audioUrl: string, durationSeconds?: number) => {
      try {
        const res = await replaceTrackAudioFn({ data: { trackId, audioUrl, durationSeconds } });
        if (!res.success) {
          throw new Error("Failed to process replacement audio");
        }
        setTracks((prev) =>
          prev.map((t) =>
            t.id === trackId
              ? {
                  ...t,
                  audioUrl,
                  durationSeconds: durationSeconds || t.durationSeconds,
                  audioProcessingStatus: "completed",
                }
              : t
          )
        );
        toast.success("Corrected master audio processed and updated!");
        return res;
      } catch (err: any) {
        toast.error(err.message || "Failed to replace audio");
        throw err;
      }
    },

    notifications,
    clearNotification,
    clearAllNotifications,
    restoreDefaultNotifications,
    settings,
    updateSettings,
    networkQuality,
    currentTrack,
    isPlaying,
    progress,
    duration: activeDuration > 0 ? activeDuration : (currentTrack?.durationSeconds ?? 0),
    getCurrentTime: () => {
      if (audioRef.current && currentTrack?.audioUrl && Number.isFinite(audioRef.current.currentTime)) {
        return audioRef.current.currentTime;
      }
      return progress;
    },
    volume,
    queue,
    repeatMode,
    shuffle,
    fullPlayerOpen,
    playTrack,
    togglePlay: () => {
      if (!currentTrackId) return;
      const audio = audioRef.current;
      if (isPlaying) {
        audio?.pause();
        setIsPlaying(false);
      } else {
        const effDuration = activeDuration > 0 ? activeDuration : (currentTrack?.durationSeconds ?? 0);
        if (effDuration > 0 && progress >= effDuration) {
          if (audio) audio.currentTime = 0;
          setProgress(0);
        }
        audio?.play().catch(() => {});
        setIsPlaying(true);
      }
    },
    next: () => step(1),
    previous: () => {
      if (progress > 4) {
        if (audioRef.current) audioRef.current.currentTime = 0;
        setProgress(0);
        return;
      }
      step(-1);
    },
    seek: (seconds) => {
      const effDuration = activeDuration > 0 ? activeDuration : (currentTrack?.durationSeconds ?? 0);
      const targetSeconds = Math.max(0, Math.min(seconds, effDuration));
      if (audioRef.current && currentTrack?.audioUrl) {
        const maxAudio =
          Number.isFinite(audioRef.current.duration) && audioRef.current.duration > 0
            ? audioRef.current.duration
            : targetSeconds;
        audioRef.current.currentTime = Math.min(targetSeconds, maxAudio);
      }
      setProgress(targetSeconds);
    },
    setVolume,
    toggleShuffle: () => setShuffle((prev) => !prev),
    cycleRepeat: () =>
      setRepeatMode((prev) => (prev === "off" ? "all" : prev === "all" ? "one" : "off")),
    setFullPlayerOpen,
    clearPlayer: () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setIsPlaying(false);
      setCurrentTrackId(null);
      setProgress(0);
      setQueue([]);
      setFullPlayerOpen(false);
    },
  };

  return <PluggContext.Provider value={value}>{children}</PluggContext.Provider>;
}

export function usePlugg(): PluggContextValue {
  const ctx = useContext(PluggContext);
  if (!ctx) throw new Error("usePlugg must be used inside PluggProvider");
  return ctx;
}
