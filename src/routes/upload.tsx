import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Disc3,
  FileText,
  ImagePlus,
  Library,
  Music,
  Plus,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  Button,
  EmptyState,
  Field,
  GenreCheckboxGroup,
  Select,
  inputClass,
} from "@/components/plugg/primitives";
import { ArtistMobileTabs } from "@/components/plugg/artist-mobile-tabs";
import { PluggDatePicker } from "@/components/plugg/date-picker";
import { art } from "@/data/covers";
import type { Release, TechnicalValidation } from "@/data/types";
import { emptySongDraft, usePlugg, type SongDraft } from "@/state/plugg-store";
import { formatDateTime, formatDuration, goLiveAt, todayISO } from "@/lib/plugg";
import { validateAudioFileInBrowser } from "@/lib/audio-validation";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type UploadSearch = {
  type?: "single" | "ep" | "album" | undefined;
  step?: number | undefined;
};

export const Route = createFileRoute("/upload")({
  validateSearch: (search: Record<string, unknown>): UploadSearch => {
    const rawTypeVal = search["type"];
    const rawType = typeof rawTypeVal === "string" ? rawTypeVal.toLowerCase() : undefined;
    const type =
      rawType === "single"
        ? "single"
        : rawType === "ep"
          ? "ep"
          : rawType === "album"
            ? "album"
            : undefined;

    const rawStepVal = search["step"];
    const rawStep =
      typeof rawStepVal === "number"
        ? rawStepVal
        : typeof rawStepVal === "string"
          ? parseInt(rawStepVal, 10)
          : undefined;

    const step =
      typeof rawStep === "number" && !isNaN(rawStep) && rawStep >= 0 && rawStep <= 3
        ? rawStep
        : undefined;

    const result: UploadSearch = {};
    if (type !== undefined) result.type = type;
    if (step !== undefined) result.step = step;
    return result;
  },
  head: () => ({
    meta: [
      { title: "Upload a release - Plugg" },
      {
        name: "description",
        content: "Publish a single, EP or album to Plugg: songs, credits, lyrics and artwork.",
      },
      { property: "og:title", content: "Upload a release - Plugg" },
      { property: "og:description", content: "Publish a single, EP or album to Plugg." },
    ],
  }),
  component: UploadPage,
});

const genreOptions = ["Afrobeats", "Dancehall", "DJ", "Gospel", "Hip-Hop", "R&B"];

const releaseTypes: {
  value: Release["type"];
  title: string;
  description: string;
  icon: typeof Music;
}[] = [
  {
    value: "single",
    title: "Single",
    description: "One song, released on its own. No track list — just the song and its details.",
    icon: Music,
  },
  {
    value: "EP",
    title: "EP",
    description: "A short project of 3 to 6 songs with a total running time under 30 minutes.",
    icon: Disc3,
  },
  {
    value: "album",
    title: "Album",
    description: "A full body of work: 7 songs or more, running 30 minutes or longer.",
    icon: Library,
  },
];

/** Estimate: roughly 160 kbps audio, so ~20 KB per second. */
const estimateDuration = (bytes: number) => Math.max(30, Math.round(bytes / 20000));

/** Helper to extract accurate duration from audio file using browser Audio API */
const getAudioDuration = (file: File): Promise<number> => {
  return new Promise((resolve) => {
    try {
      if (typeof window === "undefined") {
        resolve(estimateDuration(file.size));
        return;
      }
      const url = URL.createObjectURL(file);
      const audio = new Audio();
      audio.preload = "metadata";
      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        const sec = Math.round(audio.duration);
        resolve(Number.isFinite(sec) && sec > 0 ? sec : estimateDuration(file.size));
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(estimateDuration(file.size));
      };
      audio.src = url;
    } catch {
      resolve(estimateDuration(file.size));
    }
  });
};

const parseGenres = (val?: string): string[] => {
  if (!val || !val.trim()) return [];
  return val
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
};

function CollaboratorField({
  label,
  value,
  onChange,
  placeholderPrefix,
}: {
  label: string;
  value?: string | null | undefined;
  onChange: (val: string) => void;
  placeholderPrefix: string;
}) {
  const parseList = (str?: string | null | undefined): string[] => {
    if (!str || !str.trim()) return [""];
    const parts = str
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return parts.length > 0 ? parts : [""];
  };

  const [items, setItems] = useState<string[]>(() => parseList(value));
  const lastEmittedValue = useRef<string>(value || "");

  useEffect(() => {
    const incoming = value || "";
    if (incoming !== lastEmittedValue.current) {
      lastEmittedValue.current = incoming;
      setItems(parseList(incoming));
    }
  }, [value]);

  const updateItem = (index: number, val: string) => {
    const next = [...items];
    next[index] = val;
    setItems(next);
    const joined = next
      .map((s) => s.trim())
      .filter(Boolean)
      .join(", ");
    lastEmittedValue.current = joined;
    onChange(joined);
  };

  const addItem = () => {
    setItems((prev) => [...prev, ""]);
  };

  const removeItem = (index: number) => {
    const next = items.filter((_, i) => i !== index);
    const finalItems = next.length > 0 ? next : [""];
    setItems(finalItems);
    const joined = finalItems
      .map((s) => s.trim())
      .filter(Boolean)
      .join(", ");
    lastEmittedValue.current = joined;
    onChange(joined);
  };

  const actionTitle =
    placeholderPrefix.toLowerCase() === "artist" ? "feature" : placeholderPrefix.toLowerCase();

  return (
    <Field label={label}>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              value={item}
              onChange={(e) => updateItem(index, e.target.value)}
              className={inputClass}
              placeholder={`${placeholderPrefix} ${index + 1}`}
              aria-label={`${label} ${index + 1}`}
            />
            {index === items.length - 1 ? (
              <button
                type="button"
                onClick={addItem}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-elevated text-foreground hover:bg-secondary transition-colors"
                title={`Add another ${actionTitle}`}
              >
                <Plus size={16} />
              </button>
            ) : null}
            {items.length > 1 ? (
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-elevated text-muted-foreground hover:text-destructive transition-colors"
                title="Remove"
              >
                <X size={15} />
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </Field>
  );
}

function RecordLabelField({
  labelStatus,
  setLabelStatus,
  labelName,
  setLabelName,
  customImprint,
  setCustomImprint,
}: {
  labelStatus: "independent" | "signed";
  setLabelStatus: (s: "independent" | "signed") => void;
  labelName: string;
  setLabelName: (val: string) => void;
  customImprint: string;
  setCustomImprint: (val: string) => void;
}) {
  return (
    <Field
      label="Record label"
      hint="Indicate whether this release is independent or distributed by a music label company."
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setLabelStatus("independent")}
            className={cn(
              "flex items-center justify-center gap-2.5 rounded-xl p-3 text-sm font-medium transition-all text-left",
              labelStatus === "independent"
                ? "bg-primary/15 text-primary font-semibold"
                : "bg-elevated/40 text-muted-foreground hover:bg-elevated hover:text-foreground",
            )}
          >
            <span
              className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
                labelStatus === "independent"
                  ? "bg-primary text-primary-foreground"
                  : "bg-elevated text-muted-foreground",
              )}
            >
              {labelStatus === "independent" ? <Check size={11} strokeWidth={3} /> : null}
            </span>
            <span>Independent</span>
          </button>

          <button
            type="button"
            onClick={() => setLabelStatus("signed")}
            className={cn(
              "flex items-center justify-center gap-2.5 rounded-xl p-3 text-sm font-medium transition-all text-left",
              labelStatus === "signed"
                ? "bg-primary/15 text-primary font-semibold"
                : "bg-elevated/40 text-muted-foreground hover:bg-elevated hover:text-foreground",
            )}
          >
            <span
              className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
                labelStatus === "signed"
                  ? "bg-primary text-primary-foreground"
                  : "bg-elevated text-muted-foreground",
              )}
            >
              {labelStatus === "signed" ? <Check size={11} strokeWidth={3} /> : null}
            </span>
            <span>Signed to a label</span>
          </button>
        </div>

        {labelStatus === "signed" ? (
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-medium text-foreground">
              Record label company name <span className="text-destructive">*</span>
            </label>
            <input
              value={labelName}
              onChange={(e) => setLabelName(e.target.value)}
              className={inputClass}
              placeholder="e.g. Mavin Records, Sony Music, Def Jam, etc."
              aria-label="Record label company name"
            />
            <p className="text-[11px] text-muted-foreground">
              Enter the official name of the music label company you are signed to.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-medium text-muted-foreground">
              Independent imprint or collective (optional)
            </label>
            <input
              value={customImprint}
              onChange={(e) => setCustomImprint(e.target.value)}
              className={inputClass}
              placeholder="e.g. Self-released, Independent, or your imprint name"
              aria-label="Independent imprint or collective"
            />
            <p className="text-[11px] text-muted-foreground">
              Leave blank to default to &ldquo;Independent&rdquo;, or specify your imprint name.
            </p>
          </div>
        )}
      </div>
    </Field>
  );
}

function CoverArtworkField({
  coverPreview,
  coverFile,
  coverInputRef,
  onFileSelect,
  onRemove,
}: {
  coverPreview: string | null;
  coverFile: File | null;
  coverInputRef: React.RefObject<HTMLInputElement | null>;
  onFileSelect: (file: File) => void;
  onRemove: () => void;
}) {
  return (
    <Field label="Cover artwork">
      <input
        ref={coverInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          onFileSelect(file);
        }}
      />

      {coverPreview ? (
        <div className="flex flex-col sm:flex-row items-start gap-4 p-4 rounded-xl bg-elevated/20">
          <div className="relative aspect-square w-36 sm:w-40 shrink-0 overflow-hidden rounded-xl shadow-md">
            <img
              src={art(coverPreview)}
              alt="Cover preview"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="space-y-2 py-1 min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate">
              {coverFile ? coverFile.name : "Custom cover artwork"}
            </p>
            {coverFile ? (
              <p className="text-xs text-muted-foreground">
                {Math.round(coverFile.size / 1024)} KB · Ready
              </p>
            ) : null}
            <div className="flex items-center gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                className="text-xs px-3 py-1.5"
                onClick={() => coverInputRef.current?.click()}
              >
                Replace artwork
              </Button>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-destructive px-2 py-1 transition-colors"
                onClick={onRemove}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onClick={() => coverInputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed border-border hover:border-primary/60 bg-elevated/20 hover:bg-elevated/40 p-6 sm:p-8 text-center cursor-pointer transition-colors"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-primary">
            <ImagePlus size={22} />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Upload cover artwork from your device
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Square image recommended (JPG, PNG or WebP, min 1400×1400px)
            </p>
          </div>
          <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-elevated px-4 py-1.5 text-xs font-medium text-foreground hover:bg-secondary">
            Browse image
          </span>
        </div>
      )}
    </Field>
  );
}

function AudioRequirementsNotice({ errorList }: { errorList?: string[] | undefined }) {
  return (
    <div className="mt-3 space-y-2">
      <div className="rounded-xl border border-border/80 bg-surface/50 p-4 text-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-foreground tracking-tight">Audio Requirements</p>
          <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">Master Specs</span>
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-muted-foreground">
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
            <span>Accepted formats: <strong className="text-foreground font-medium">WAV or FLAC</strong></span>
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
            <span>Minimum quality: <strong className="text-foreground font-medium">16-bit / 44.1 kHz</strong></span>
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
            <span>Channels: <strong className="text-foreground font-medium">Stereo</strong></span>
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
            <span>Recommended: <strong className="text-foreground font-medium">Original 24-bit master</strong></span>
          </li>
        </ul>
        <p className="text-[11px] text-muted-foreground italic pt-2 border-t border-border/40 leading-relaxed">
          Upload your original high-quality audio master. Plugg automatically prepares the streaming and download versions.
        </p>
      </div>

      {errorList && errorList.length > 0 && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3.5 text-xs text-destructive space-y-1.5 animate-in fade-in">
          <p className="font-semibold flex items-center gap-1.5">
            <span>Audio validation failed</span>
          </p>
          <ul className="list-disc list-inside space-y-0.5 text-[11px] text-destructive/90">
            {errorList.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function UploadPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { session, currentUser, createRelease, uploadDraft, saveUploadDraft, clearUploadDraft } =
    usePlugg();
  const rawAudioFiles = useRef<Map<number, File>>(new Map());

  const initialType: Release["type"] =
    search.type === "ep" ? "EP" : search.type === "album" ? "album" : "single";
  const initialStep = search.type ? (search.step ?? 1) : 0;

  const [step, setStep] = useState(initialStep);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<Release["type"]>(initialType);
  const [genre, setGenre] = useState("Afrobeats");
  const [description, setDescription] = useState("");
  const [songs, setSongs] = useState<SongDraft[]>([emptySongDraft()]);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);

  const [audioValidationErrors, setAudioValidationErrors] = useState<Record<number, string[]>>({});
  const [audioValidationDetails, setAudioValidationDetails] = useState<Record<number, TechnicalValidation>>({});
  const [isValidatingAudio, setIsValidatingAudio] = useState<Record<number, boolean>>({});

  const handleAudioFileSelect = async (index: number, file: File) => {
    setIsValidatingAudio((prev) => ({ ...prev, [index]: true }));
    try {
      const valResult = await validateAudioFileInBrowser(file);
      if (!valResult.valid) {
        const errorMsg = valResult.error || "Audio requirements not met";
        setAudioValidationErrors((prev) => ({ ...prev, [index]: [errorMsg] }));
        setAudioValidationDetails((prev) => {
          const copy = { ...prev };
          delete copy[index];
          return copy;
        });
        rawAudioFiles.current.delete(index);
        patchSong(index, { file: null, durationSeconds: 0 });
        toast.error(`Audio requirements not met: ${errorMsg}`);
        return;
      }

      setAudioValidationErrors((prev) => ({ ...prev, [index]: [] }));
      setAudioValidationDetails((prev) => ({
        ...prev,
        [index]: valResult.properties,
      }));

      rawAudioFiles.current.set(index, file);
      patchSong(index, {
        title: (index === 0 && isSingle ? title : songs[index]?.title) || file.name.replace(/\.[^/.]+$/, ""),
        file: { name: file.name, size: file.size },
        durationSeconds: estimateDuration(file.size),
      });
      getAudioDuration(file).then((realSec) => {
        if (realSec > 0) patchSong(index, { durationSeconds: realSec });
      });
      const formatLabel = valResult.properties.format ? valResult.properties.format.toUpperCase() : "MASTER";
      const sampleRateLabel = valResult.properties.sampleRate ? `${valResult.properties.sampleRate / 1000} kHz` : "";
      const bitDepthLabel = valResult.properties.bitDepth ? `${valResult.properties.bitDepth}-bit` : "";
      toast.success(
        `Audio master validated: ${formatLabel} ${sampleRateLabel} / ${bitDepthLabel}`
      );
    } catch (err: any) {
      setAudioValidationErrors((prev) => ({ ...prev, [index]: [err.message || "Could not read audio file"] }));
      toast.error("Failed to inspect audio file");
    } finally {
      setIsValidatingAudio((prev) => ({ ...prev, [index]: false }));
    }
  };

  // Sync state with URL search params (e.g. browser back/forward, direct links)
  useEffect(() => {
    if (search.type) {
      const mappedType = search.type === "ep" ? "EP" : search.type;
      setType(mappedType);
      const targetStep = search.step ?? 1;
      const maxStep = mappedType === "single" ? 2 : 3;
      setStep(Math.min(targetStep, maxStep));
    } else {
      setStep(0);
    }
  }, [search.type, search.step]);

  // Record Label state
  const [labelStatus, setLabelStatus] = useState<"independent" | "signed">("independent");
  const [labelName, setLabelName] = useState("");
  const [customImprint, setCustomImprint] = useState("");

  // Cover artwork device upload state
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverKey, setCoverKey] = useState("c1");
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  const [releaseDate, setReleaseDate] = useState(todayISO());
  const [openLyrics, setOpenLyrics] = useState<number | null>(null);
  const [resumed, setResumed] = useState(false);

  // Resume an unfinished release exactly where the artist stopped.
  useEffect(() => {
    if (resumed || !uploadDraft) return;
    const maxStep = uploadDraft.type === "single" ? 2 : 3;
    const restoredStep = Math.min(uploadDraft.step, maxStep);
    setTitle(uploadDraft.title);
    setType(uploadDraft.type);
    setGenre(uploadDraft.genre || "Afrobeats");
    setDescription(uploadDraft.description);
    setCoverKey(uploadDraft.coverKey);
    if (
      uploadDraft.coverKey &&
      (uploadDraft.coverKey.startsWith("blob:") ||
        uploadDraft.coverKey.startsWith("http") ||
        uploadDraft.coverKey.startsWith("/"))
    ) {
      setCoverPreview(uploadDraft.coverKey);
    }
    if (uploadDraft.label) {
      if (uploadDraft.label === "Independent") {
        setLabelStatus("independent");
        setCustomImprint("");
        setLabelName("");
      } else {
        setLabelStatus("signed");
        setLabelName(uploadDraft.label);
      }
    }
    setReleaseDate(uploadDraft.releaseDate);
    const restoredSongs = uploadDraft.songs.length ? uploadDraft.songs : [emptySongDraft()];
    setSongs(restoredSongs);

    if (!search.type && restoredStep > 0) {
      navigate({
        to: "/upload",
        search: {
          type: uploadDraft.type.toLowerCase() as "single" | "ep" | "album",
          step: restoredStep,
        },
        replace: true,
      });
    }

    setResumed(true);
  }, [resumed, uploadDraft, search.type, navigate]);

  const effectiveLabel =
    labelStatus === "signed" ? labelName.trim() : customImprint.trim() || "Independent";

  const started =
    title.trim().length > 0 ||
    description.trim().length > 0 ||
    Boolean(coverPreview) ||
    songs.some((s) => s.title.trim() || s.file);

  useEffect(() => {
    if (session !== "loggedInArtist" || !started || uploadPercent !== null) return;
    const id = window.setTimeout(() => {
      saveUploadDraft({
        step,
        type,
        title,
        genre,
        description,
        label: effectiveLabel,
        coverKey,
        releaseDate,
        songs,
        savedAt: new Date().toISOString(),
      });
    }, 400);
    return () => window.clearTimeout(id);
  }, [
    session,
    started,
    step,
    type,
    title,
    genre,
    description,
    effectiveLabel,
    coverKey,
    releaseDate,
    songs,
    uploadPercent,
  ]);

  useEffect(() => {
    if (session === "loggedOut") {
      window.location.href = "/auth?returnTo=/upload";
    }
  }, [session]);

  if (session !== "loggedInArtist") {
    return (
      <EmptyState
        title={session === "loggedInListener" ? "Artist Account Required" : "Sign in to upload music"}
        description={
          session === "loggedInListener"
            ? "Uploading music requires an Artist account. Please sign in with an Artist account or create one to publish singles, EPs, and albums."
            : "Sign in or register as an artist to upload and manage music on Plugg."
        }
        ctaLabel={session === "loggedInListener" ? "Explore music" : "Sign in or register"}
        ctaTo={session === "loggedInListener" ? "/discover" : "/auth"}
        icon={<Music size={28} />}
      />
    );
  }

  const isSingle = type === "single";

  // Stepper: 3 steps for Single, 4 steps for EP and Album
  const steps = isSingle
    ? (["Release type", "Song details", "Release"] as const)
    : ([
        "Release type",
        "Song details",
        type === "EP" ? "EP Detail" : "Album Detail",
        "Release",
      ] as const);

  const named = isSingle
    ? title.trim().length > 0
      ? [{ ...songs[0], title: title.trim() }]
      : []
    : songs.filter((s) => s.title.trim().length > 0);

  const readySongs = isSingle
    ? title.trim().length > 0 && songs[0]?.file
      ? [{ ...songs[0], title: title.trim(), genre: songs[0]?.genre || genre }]
      : []
    : songs.filter((s) => s.title.trim().length > 0 && s.file);

  const totalSeconds = readySongs.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);
  const totalMinutes = totalSeconds / 60;

  const countRule =
    type === "EP"
      ? {
          label: "3 to 6 songs",
          done: readySongs.length >= 3 && readySongs.length <= 6,
        }
      : type === "album"
        ? { label: "7 songs or more", done: readySongs.length >= 7 }
        : { label: "One song", done: readySongs.length === 1 };

  const lengthRule =
    type === "EP"
      ? {
          label: "Total running time under 30 minutes",
          done: totalMinutes > 0 && totalMinutes < 30,
        }
      : type === "album"
        ? { label: "Total running time of 30 minutes or more", done: totalMinutes >= 30 }
        : null;

  // Single Requirements (Step 1)
  const singleRequirements = [
    { label: "Song title", done: title.trim().length > 0 },
    {
      label: "Audio master (WAV/FLAC, 16-bit / 44.1 kHz stereo+)",
      done: Boolean(songs[0]?.file && !audioValidationErrors[0]?.length),
    },
    {
      label: "Genre selected (up to 2)",
      done: parseGenres(genre).length >= 1 && parseGenres(genre).length <= 2,
    },
    { label: "Cover artwork", done: Boolean(coverPreview || coverKey) },
    {
      label: "Record label",
      done: labelStatus === "independent" || labelName.trim().length > 0,
    },
  ];
  const singleDetailsReady = singleRequirements.every((r) => r.done);

  // EP / Album Song Requirements (Step 1)
  const epAlbumSongRequirements = [
    {
      label: "Song title for every song",
      done: songs.length > 0 && songs.every((s) => s.title.trim().length > 0),
    },
    {
      label: "Audio master for every song (WAV/FLAC)",
      done:
        songs.length > 0 &&
        readySongs.length === songs.length &&
        songs.every((_, idx) => !audioValidationErrors[idx]?.length),
    },
    {
      label: "Genre selected for every song (up to 2)",
      done:
        songs.length > 0 &&
        songs.every(
          (s) =>
            parseGenres(s.genre || genre).length >= 1 &&
            parseGenres(s.genre || genre).length <= 2,
        ),
    },
    countRule,
    ...(lengthRule ? [lengthRule] : []),
  ];
  const epAlbumSongsReady = epAlbumSongRequirements.every((r) => r.done);

  // EP / Album Detail Requirements (Step 2: "EP Detail" or "Album Detail")
  const epAlbumDetailRequirements = [
    { label: type === "EP" ? "EP title" : "Album title", done: title.trim().length > 0 },
    {
      label: "Primary genres (up to 2)",
      done: parseGenres(genre).length >= 1 && parseGenres(genre).length <= 2,
    },
    { label: "Cover artwork", done: Boolean(coverPreview || coverKey) },
    {
      label: "Record label",
      done: labelStatus === "independent" || labelName.trim().length > 0,
    },
  ];
  const epAlbumDetailsReady = epAlbumDetailRequirements.every((r) => r.done);

  let canContinue = false;
  if (step === 0) {
    canContinue = true;
  } else if (isSingle) {
    if (step === 1) canContinue = singleDetailsReady;
    else if (step === 2) canContinue = uploadPercent === null;
  } else {
    if (step === 1) canContinue = epAlbumSongsReady;
    else if (step === 2) canContinue = epAlbumDetailsReady;
    else if (step === 3) canContinue = uploadPercent === null;
  }

  const patchSong = (index: number, patch: Partial<SongDraft>) =>
    setSongs((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));

  const removeSong = (index: number) => {
    setSongs((prev) => {
      const next = prev.filter((_, idx) => idx !== index);
      return next.length > 0 ? next : [emptySongDraft(genre)];
    });
    // Shift audio files map
    const nextMap = new Map<number, File>();
    let nextIdx = 0;
    for (let oldIdx = 0; oldIdx < songs.length; oldIdx++) {
      if (oldIdx === index) continue;
      const f = rawAudioFiles.current.get(oldIdx);
      if (f) nextMap.set(nextIdx, f);
      nextIdx++;
    }
    rawAudioFiles.current = nextMap;
  };

  const addSong = () => {
    const defaultTrackGenre = songs[songs.length - 1]?.genre || genre;
    setSongs((prev) => [...prev, emptySongDraft(defaultTrackGenre)]);
  };

  const chooseType = (value: Release["type"]) => {
    setType(value);
    if (value === "single") {
      setSongs((prev) => [{ ...emptySongDraft(genre), title: prev[0]?.title || title }]);
    } else {
      setSongs((prev) => (prev.length === 0 ? [emptySongDraft(genre)] : prev));
    }
    navigate({
      to: "/upload",
      search: {
        type: value.toLowerCase() as "single" | "ep" | "album",
        step: 1,
      },
    });
  };

  const handleContinue = () => {
    if (!canContinue) return;
    if (step === 0) {
      chooseType(type);
      return;
    }
    navigate({
      to: "/upload",
      search: {
        type: type.toLowerCase() as "single" | "ep" | "album",
        step: step + 1,
      },
    });
  };

  const handleBack = () => {
    if (step <= 1) {
      navigate({
        to: "/upload",
        search: {},
      });
    } else {
      navigate({
        to: "/upload",
        search: {
          type: type.toLowerCase() as "single" | "ep" | "album",
          step: step - 1,
        },
      });
    }
  };

  const handleStepClick = (targetStep: number) => {
    if (targetStep === step) return;
    if (targetStep === 0) {
      navigate({ to: "/upload", search: {} });
      return;
    }
    if (targetStep < step) {
      navigate({
        to: "/upload",
        search: {
          type: type.toLowerCase() as "single" | "ep" | "album",
          step: targetStep,
        },
      });
    }
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (isSingle) {
      patchSong(0, { title: val });
    }
  };

  const handleCoverSelect = (file: File) => {
    setCoverFile(file);
    const previewUrl = URL.createObjectURL(file);
    setCoverPreview(previewUrl);
    setCoverKey(previewUrl);
  };

  const handleCoverRemove = () => {
    setCoverFile(null);
    setCoverPreview(null);
    setCoverKey("");
    if (coverInputRef.current) coverInputRef.current.value = "";
  };

  const startOver = () => {
    clearUploadDraft();
    setStep(0);
    setTitle("");
    setDescription("");
    setLabelStatus("independent");
    setLabelName("");
    setCustomImprint("");
    setSongs([emptySongDraft()]);
    setType("single");
    setGenre("Afrobeats");
    setReleaseDate(todayISO());
    setCoverFile(null);
    setCoverPreview(null);
    setCoverKey("c1");
    rawAudioFiles.current.clear();
    navigate({ to: "/upload", search: {} });
  };

  const handleSubmit = async () => {
    try {
      setUploadPercent(10);
      const updatedSongs = [...readySongs];
      let finalCoverKey = coverKey;

      // Upload cover file if uploaded from device
      if (coverFile) {
        try {
          const fd = new FormData();
          fd.append("file", coverFile);
          fd.append("category", "cover");
          if (currentUser?.id) fd.append("ownerId", currentUser.id);

          const res = await fetch("/api/upload", { method: "POST", body: fd });
          const data = await res.json();
          if (data.url) {
            finalCoverKey = data.url;
          }
        } catch (coverErr) {
          console.warn("Cover file upload to server failed, proceeding:", coverErr);
        }
      }

      for (let idx = 0; idx < updatedSongs.length; idx++) {
        const raw = rawAudioFiles.current.get(idx);
        if (raw) {
          try {
            const fd = new FormData();
            fd.append("file", raw);
            fd.append("category", "audio");
            if (currentUser?.id) fd.append("ownerId", currentUser.id);

            const res = await fetch("/api/upload", { method: "POST", body: fd });
            const data = await res.json();
            if (!res.ok) {
              toast.error(data.error || "Audio validation rejected by server");
              setUploadPercent(null);
              return;
            }
            const targetSong = updatedSongs[idx];
            if (targetSong && data.url) {
              targetSong.audioUrl = data.url;
            }
          } catch (uploadErr: any) {
            console.error("File upload to server failed:", uploadErr);
            toast.error(uploadErr.message || "Failed to upload audio to server");
            setUploadPercent(null);
            return;
          }
        }
        setUploadPercent(Math.min(90, Math.round(((idx + 1) / updatedSongs.length) * 80) + 10));
      }

      setUploadPercent(100);
      await createRelease({
        title:
          title.trim() ||
          (isSingle ? songs[0]?.title.trim() || "Untitled single" : "Untitled release"),
        type,
        genre: songs[0]?.genre || genre || "Afrobeats",
        coverKey: finalCoverKey || "c1",
        description,
        label: effectiveLabel,
        releaseDate,
        songs: updatedSongs,
      });

      window.setTimeout(() => navigate({ to: "/dashboard", search: { tab: "releases" } }), 400);
    } catch (err) {
      console.error("Failed to complete release:", err);
      setUploadPercent(null);
    }
  };

  const goLive = goLiveAt(releaseDate);

  return (
    <div className="mx-auto max-w-2xl space-y-8 pt-14 md:pt-0">
      <ArtistMobileTabs />
      <div className="flex items-center justify-between gap-3 mt-4">
        {step > 0 ? (
          <button
            type="button"
            onClick={() => navigate({ to: "/upload", search: {} })}
            className="group inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
          >
            <ChevronLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
            <span>Change release type ({type})</span>
          </button>
        ) : <span />}
        {started ? (
          <Button variant="ghost" className="h-8 px-3 text-xs" onClick={startOver}>
            Start over
          </Button>
        ) : null}
      </div>

      <div className="flex justify-center">
        <ol className="flex w-full max-w-[280px] sm:max-w-lg items-center gap-2">
          {steps.map((label, i) => {
            const isClickable = i < step;
            return (
              <li
                key={label}
                className={cn(
                  "flex items-center gap-2",
                  i < steps.length - 1 ? "flex-1" : "shrink-0",
                )}
              >
                <button
                  type="button"
                  disabled={!isClickable}
                  onClick={() => handleStepClick(i)}
                  className={cn(
                    "flex items-center gap-2 text-left transition-opacity",
                    isClickable ? "cursor-pointer hover:opacity-80" : "cursor-default",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                      i <= step
                        ? "bg-primary text-primary-foreground"
                        : "bg-elevated text-muted-foreground",
                    )}
                  >
                    {i < step ? <Check size={14} /> : i + 1}
                  </span>
                  <span
                    className={cn(
                      "hidden text-xs sm:block shrink-0",
                      i === step ? "text-foreground font-medium" : "text-muted-foreground",
                    )}
                  >
                    {label}
                  </span>
                </button>
                {i < steps.length - 1 ? <span className="h-px flex-1 bg-border" /> : null}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="surface-card space-y-5 p-5 sm:p-6">
        {/* Step 0: Choose Release Type */}
        {step === 0 ? (
          <>
            <p className="text-sm text-muted-foreground">What are you releasing?</p>
            <div className="flex flex-col gap-3">
              {releaseTypes.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => chooseType(option.value)}
                    className={cn(
                      "flex items-start gap-4 rounded-xl p-4 text-left transition-colors",
                      type === option.value
                        ? "bg-elevated text-foreground"
                        : "bg-surface/60 hover:bg-elevated/60",
                    )}
                  >
                    <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground">
                      <Icon size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{option.title}</span>
                      <span className="mt-1 block text-sm text-muted-foreground">
                        {option.description}
                      </span>
                    </span>
                    <ChevronRight size={18} className="mt-3 shrink-0 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          </>
        ) : null}

        {/* Step 1: Single - Song details (All single fields) */}
        {step === 1 && isSingle ? (
          <>
            <Field label="Song title">
              <input
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className={inputClass}
                placeholder="Nyota"
              />
            </Field>

            <GenreCheckboxGroup
              value={genre}
              onChange={setGenre}
              hint="Select up to 2 genres that best describe this single."
            />

            <CoverArtworkField
              coverPreview={coverPreview}
              coverFile={coverFile}
              coverInputRef={coverInputRef}
              onFileSelect={handleCoverSelect}
              onRemove={handleCoverRemove}
            />

            <Field label="Description" hint="Tell listeners the story behind this release.">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className={inputClass}
                placeholder="what is the song about.."
              />
            </Field>

            <RecordLabelField
              labelStatus={labelStatus}
              setLabelStatus={setLabelStatus}
              labelName={labelName}
              setLabelName={setLabelName}
              customImprint={customImprint}
              setCustomImprint={setCustomImprint}
            />

            {/* Audio track upload box for single */}
            <div>
              <span className="mb-2 block text-sm font-medium text-foreground">Audio track</span>
              {!songs[0]?.file ? (
                <label className="flex flex-col items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed border-border hover:border-primary/60 bg-elevated/20 hover:bg-elevated/40 p-6 sm:p-8 text-center cursor-pointer transition-colors">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-primary">
                    <UploadCloud size={24} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Upload song audio file</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Requires WAV or FLAC (16-bit / 44.1 kHz stereo minimum)
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
                    {isValidatingAudio[0] ? "Validating audio…" : "Choose audio file"}
                  </span>
                  <input
                    type="file"
                    accept=".wav,.flac,audio/wav,audio/flac,audio/x-wav,audio/x-flac"
                    className="sr-only"
                    disabled={isValidatingAudio[0]}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      handleAudioFileSelect(0, file);
                    }}
                  />
                </label>
              ) : (
                <div className="flex items-center justify-between gap-3 rounded-xl bg-elevated/40 p-3.5 sm:p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                      <Music size={18} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="truncate text-sm font-medium text-foreground">
                          {songs[0].file.name}
                        </p>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                          <Check size={10} /> Validated
                        </span>
                        {audioValidationDetails[0] && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-mono font-medium text-primary">
                            {audioValidationDetails[0].format?.toUpperCase()} ·{" "}
                            {audioValidationDetails[0].sampleRate ? `${audioValidationDetails[0].sampleRate / 1000} kHz` : ""} ·{" "}
                            {audioValidationDetails[0].bitDepth}-bit
                            {audioValidationDetails[0].bitDepth && audioValidationDetails[0].bitDepth >= 24 ? " Master" : ""}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {Math.round((songs[0].file.size / (1024 * 1024)) * 10) / 10} MB ·{" "}
                        {formatDuration(songs[0].durationSeconds)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <label className="cursor-pointer rounded-lg bg-elevated px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                      Replace
                      <input
                        type="file"
                        accept=".wav,.flac,audio/wav,audio/flac,audio/x-wav,audio/x-flac"
                        className="sr-only"
                        disabled={isValidatingAudio[0]}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          handleAudioFileSelect(0, file);
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        rawAudioFiles.current.delete(0);
                        patchSong(0, { file: null, durationSeconds: 0 });
                        setAudioValidationErrors((prev) => {
                          const copy = { ...prev };
                          delete copy[0];
                          return copy;
                        });
                        setAudioValidationDetails((prev) => {
                          const copy = { ...prev };
                          delete copy[0];
                          return copy;
                        });
                      }}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                      title="Remove audio track"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* Requirement 3: Audio Requirements notice placed directly below/alongside audio file input */}
              <AudioRequirementsNotice errorList={audioValidationErrors[0]} />
            </div>

            {/* Featured artists & Producers */}
            <div className="grid gap-4 sm:grid-cols-2">
              <CollaboratorField
                label="Featured artists"
                placeholderPrefix="Artist"
                value={songs[0]?.features}
                onChange={(features) => patchSong(0, { features })}
              />
              <CollaboratorField
                label="Producers"
                placeholderPrefix="Producer"
                value={songs[0]?.producers}
                onChange={(producers) => patchSong(0, { producers })}
              />
            </div>

            {/* Lyrics Toggle & Textarea */}
            <div>
              <button
                type="button"
                onClick={() => setOpenLyrics(openLyrics === 0 ? null : 0)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <FileText size={13} />
                {songs[0]?.lyrics?.trim() ? "Edit lyrics" : "+ Add lyrics"}
              </button>
              {openLyrics === 0 ? (
                <div className="mt-3">
                  <textarea
                    value={songs[0]?.lyrics || ""}
                    onChange={(e) => patchSong(0, { lyrics: e.target.value })}
                    rows={5}
                    className={inputClass}
                    placeholder="Let the listeners sing along..."
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Lyrics display in the player and on your song page while it plays.
                  </p>
                </div>
              ) : null}
            </div>

            {/* Single requirements */}
            <div className="rounded-xl bg-elevated/30 p-4">
              <p className="text-eyebrow">Minimum requirements</p>
              <ul className="mt-3 space-y-2">
                {singleRequirements.map((r) => (
                  <li key={r.label} className="flex items-center gap-2 text-sm">
                    <span
                      className={cn(
                        "flex h-4 w-4 items-center justify-center rounded-full",
                        r.done ? "bg-primary text-primary-foreground" : "bg-elevated",
                      )}
                    >
                      {r.done ? <Check size={11} /> : null}
                    </span>
                    <span className={r.done ? "" : "text-muted-foreground"}>{r.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        ) : null}

        {/* Step 1: EP / Album - Song details (ONLY track title, genre, audio track, features, producers, lyrics, add song) */}
        {step === 1 && !isSingle ? (
          <>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                Add your {type === "EP" ? "EP" : "album"} songs
              </p>
              <p className="text-xs text-muted-foreground">
                Configure song titles, genres, audio files, and contributors for every track.
              </p>
            </div>

            <div className="space-y-4">
              {songs.map((song, i) => (
                <div
                  key={i}
                  className="rounded-xl p-4 space-y-4 bg-elevated/30"
                >
                  {/* Song index, title input & remove song button */}
                  <div className="flex items-center gap-2">
                    <span className="w-5 text-right text-xs font-semibold tabular-nums text-muted-foreground">
                      {i + 1}
                    </span>
                    <input
                      value={song.title}
                      onChange={(e) => patchSong(i, { title: e.target.value })}
                      className={inputClass}
                      placeholder={`Song ${i + 1} title`}
                      aria-label={`Song ${i + 1} title`}
                    />
                    <button
                      type="button"
                      onClick={() => removeSong(i)}
                      aria-label="Remove song"
                      className="rounded-full p-2 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-30 disabled:hover:text-muted-foreground"
                      disabled={songs.length === 1}
                      title="Remove song"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Genre for this song */}
                  <GenreCheckboxGroup
                    label="Track genres"
                    value={song.genre || genre}
                    onChange={(val) => patchSong(i, { genre: val })}
                    hint="Select up to 2 genres for this track."
                  />

                  {/* Audio track upload box */}
                  <div>
                    <span className="mb-2 block text-sm font-medium text-foreground">
                      Audio track
                    </span>
                    {!song.file ? (
                      <label className="flex flex-col items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed border-border hover:border-primary/60 bg-elevated/20 hover:bg-elevated/40 p-6 sm:p-8 text-center cursor-pointer transition-colors">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-primary">
                          <UploadCloud size={24} />
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            Upload song audio file
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Requires WAV or FLAC (16-bit / 44.1 kHz stereo minimum)
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
                          {isValidatingAudio[i] ? "Validating audio…" : "Choose audio file"}
                        </span>
                        <input
                          type="file"
                          accept=".wav,.flac,audio/wav,audio/flac,audio/x-wav,audio/x-flac"
                          className="sr-only"
                          disabled={isValidatingAudio[i]}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            handleAudioFileSelect(i, file);
                          }}
                        />
                      </label>
                    ) : (
                      <div className="flex items-center justify-between gap-3 rounded-xl bg-elevated/40 p-3.5 sm:p-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                            <Music size={18} />
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="truncate text-sm font-medium text-foreground">
                                {song.file.name}
                              </p>
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                                <Check size={10} /> Validated
                              </span>
                              {audioValidationDetails[i] && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-mono font-medium text-primary">
                                  {audioValidationDetails[i].format?.toUpperCase()} ·{" "}
                                  {audioValidationDetails[i].sampleRate ? `${audioValidationDetails[i].sampleRate / 1000} kHz` : ""} ·{" "}
                                  {audioValidationDetails[i].bitDepth}-bit
                                  {audioValidationDetails[i].bitDepth && audioValidationDetails[i].bitDepth >= 24 ? " Master" : ""}
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {Math.round((song.file.size / (1024 * 1024)) * 10) / 10} MB ·{" "}
                              {formatDuration(song.durationSeconds)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <label className="cursor-pointer rounded-lg bg-elevated px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                            Replace
                            <input
                              type="file"
                              accept=".wav,.flac,audio/wav,audio/flac,audio/x-wav,audio/x-flac"
                              className="sr-only"
                              disabled={isValidatingAudio[i]}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                handleAudioFileSelect(i, file);
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              rawAudioFiles.current.delete(i);
                              patchSong(i, { file: null, durationSeconds: 0 });
                              setAudioValidationErrors((prev) => {
                                const copy = { ...prev };
                                delete copy[i];
                                return copy;
                              });
                              setAudioValidationDetails((prev) => {
                                const copy = { ...prev };
                                delete copy[i];
                                return copy;
                              });
                            }}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                            title="Remove audio track"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Requirement 3: Audio Requirements notice placed directly below/alongside audio file input */}
                    <AudioRequirementsNotice errorList={audioValidationErrors[i]} />
                  </div>


                  {/* Features & Producers with dynamic Plus button */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <CollaboratorField
                      key={`feat-${i}-${song.title || i}`}
                      label="Featured artists"
                      placeholderPrefix="Artist"
                      value={song.features}
                      onChange={(features) => patchSong(i, { features })}
                    />
                    <CollaboratorField
                      key={`prod-${i}-${song.title || i}`}
                      label="Producers"
                      placeholderPrefix="Producer"
                      value={song.producers}
                      onChange={(producers) => patchSong(i, { producers })}
                    />
                  </div>

                  {/* Lyrics Toggle & Textarea */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setOpenLyrics(openLyrics === i ? null : i)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <FileText size={13} />
                      {song.lyrics.trim() ? "Edit lyrics" : "+ Add lyrics"}
                    </button>
                    {openLyrics === i ? (
                      <div className="mt-3">
                        <textarea
                          value={song.lyrics}
                          onChange={(e) => patchSong(i, { lyrics: e.target.value })}
                          rows={5}
                          className={inputClass}
                          placeholder="Let the listeners sing along..."
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                          Lyrics display in the player and on your song page while it plays.
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            <Button variant="subtle" onClick={addSong}>
              <Plus size={15} /> Add song
            </Button>

            {/* Song requirements checklist for EP / Album */}
            <div className="rounded-xl bg-elevated/30 p-4">
              <p className="text-eyebrow">Song requirements</p>
              <ul className="mt-3 space-y-2">
                {epAlbumSongRequirements.map((r) => (
                  <li key={r.label} className="flex items-center gap-2 text-sm">
                    <span
                      className={cn(
                        "flex h-4 w-4 items-center justify-center rounded-full",
                        r.done ? "bg-primary text-primary-foreground" : "bg-elevated",
                      )}
                    >
                      {r.done ? <Check size={11} /> : null}
                    </span>
                    <span className={r.done ? "" : "text-muted-foreground"}>{r.label}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">
                {readySongs.length} song{readySongs.length === 1 ? "" : "s"} ready ·{" "}
                {formatDuration(totalSeconds)} total
              </p>
            </div>
          </>
        ) : null}

        {/* Step 2: EP / Album - Project Details ("EP Detail" / "Album Detail") */}
        {step === 2 && !isSingle ? (
          <>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                {type === "EP" ? "EP Details" : "Album Details"}
              </p>
              <p className="text-xs text-muted-foreground">
                Provide the release title, cover artwork, description, and label for this {type}.
              </p>
            </div>

            <Field label={type === "EP" ? "EP title" : "Album title"}>
              <input
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className={inputClass}
                placeholder={type === "EP" ? "Lakeside Gold EP" : "Lakeside Gold"}
              />
            </Field>

            <GenreCheckboxGroup
              label={`${type === "EP" ? "EP" : "Album"} primary genres`}
              value={genre}
              onChange={setGenre}
              hint={`Select up to 2 primary genres that define this ${type}.`}
            />

            <CoverArtworkField
              coverPreview={coverPreview}
              coverFile={coverFile}
              coverInputRef={coverInputRef}
              onFileSelect={handleCoverSelect}
              onRemove={handleCoverRemove}
            />

            <Field
              label="Description"
              hint={`Tell listeners the story behind this ${type === "EP" ? "EP" : "album"}.`}
            >
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className={inputClass}
                placeholder={`what is this ${type === "EP" ? "EP" : "album"} about..`}
              />
            </Field>

            <RecordLabelField
              labelStatus={labelStatus}
              setLabelStatus={setLabelStatus}
              labelName={labelName}
              setLabelName={setLabelName}
              customImprint={customImprint}
              setCustomImprint={setCustomImprint}
            />

            {/* Minimum requirements for EP / Album Details */}
            <div className="rounded-xl bg-elevated/30 p-4">
              <p className="text-eyebrow">{type === "EP" ? "EP" : "Album"} requirements</p>
              <ul className="mt-3 space-y-2">
                {epAlbumDetailRequirements.map((r) => (
                  <li key={r.label} className="flex items-center gap-2 text-sm">
                    <span
                      className={cn(
                        "flex h-4 w-4 items-center justify-center rounded-full",
                        r.done ? "bg-primary text-primary-foreground" : "bg-elevated",
                      )}
                    >
                      {r.done ? <Check size={11} /> : null}
                    </span>
                    <span className={r.done ? "" : "text-muted-foreground"}>{r.label}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
                <span>Configured songs: {readySongs.length}</span>
                <span>Total time: {formatDuration(totalSeconds)}</span>
              </div>
            </div>
          </>
        ) : null}

        {/* Final Step: "Release" (Step 2 for Single, Step 3 for EP / Album) */}
        {(isSingle && step === 2) || (!isSingle && step === 3) ? (
          <>
            <Field label="Release date">
              <PluggDatePicker value={releaseDate} onChange={setReleaseDate} />
            </Field>

            {/* Goes live box */}
            <div className="rounded-xl bg-surface/50 p-4 text-sm flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Clock size={16} />
              </span>
              <p className="font-semibold text-foreground">Goes live {formatDateTime(goLive)}</p>
            </div>

            <div className="rounded-xl bg-elevated/30 p-4 text-sm space-y-3">
              <p className="text-eyebrow">Summary</p>
              <div className="flex items-start gap-3">
                {coverPreview ? (
                  <img
                    src={art(coverPreview)}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-lg object-cover"
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-base text-foreground">
                    {title || (isSingle ? songs[0]?.title : "Untitled release")}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground capitalize">
                    {type} · {songs[0]?.genre || genre} · {effectiveLabel}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {readySongs.length} song{readySongs.length === 1 ? "" : "s"} ·{" "}
                    {formatDuration(totalSeconds)}
                  </p>
                </div>
              </div>

              {!isSingle && readySongs.length > 0 ? (
                <div className="border-t border-border pt-3 space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground">Tracklist</p>
                  <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                    {readySongs.map((s, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-elevated/40"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-muted-foreground tabular-nums">{idx + 1}.</span>
                          <span className="font-medium text-foreground truncate">{s.title}</span>
                          {s.features ? (
                            <span className="text-muted-foreground text-[11px] truncate">
                              (feat. {s.features})
                            </span>
                          ) : null}
                        </div>
                        <span className="text-muted-foreground tabular-nums shrink-0 ml-2">
                          {formatDuration(s.durationSeconds)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            {uploadPercent !== null ? (
              <div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    Uploading {readySongs.length} song{readySongs.length === 1 ? "" : "s"}…
                  </span>
                  <span className="tabular-nums">{uploadPercent}%</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-elevated">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-200"
                    style={{ width: `${uploadPercent}%` }}
                  />
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      <div className="flex justify-between">
        <Button
          variant="ghost"
          onClick={handleBack}
          disabled={step === 0}
        >
          Back
        </Button>
        {step === 0 ? (
          <Button onClick={() => chooseType(type)}>
            Continue
          </Button>
        ) : step < steps.length - 1 ? (
          <Button onClick={handleContinue} disabled={!canContinue}>
            Continue
          </Button>
        ) : (
          <Button disabled={!canContinue || uploadPercent !== null} onClick={handleSubmit}>
            {uploadPercent !== null ? "Uploading…" : "Schedule release"}
          </Button>
        )}
      </div>
    </div>
  );
}
