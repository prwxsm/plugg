import type { Track } from "./types";

type Seed = [
  id: string,
  artistId: string,
  releaseId: string,
  title: string,
  genre: string,
  coverUrl: string,
  durationSeconds: number,
  playCount: number,
  releaseDate: string,
  published?: boolean,
];

const seeds: Seed[] = [
  ["t1", "a1", "r1", "Lakeside Gold", "Afro-fusion", "c1", 212, 1840220, "2026-07-18"],
  ["t2", "a1", "r1", "Kisumu Blue", "Afro-fusion", "c1", 236, 962110, "2026-07-18"],
  ["t3", "a1", "r1", "Matatu Hymn", "Afro-fusion", "c1", 198, 741905, "2026-07-18"],
  ["t4", "a1", "r2", "Nyota", "Afro-pop", "c2", 224, 2410770, "2026-02-06"],
  ["t5", "a2", "r3", "Mikocheni Nights", "Bongo Flava", "c3", 241, 4120880, "2026-05-22"],
  ["t6", "a2", "r3", "Pole Pole", "Bongo Flava", "c3", 205, 3280140, "2026-05-22"],
  ["t7", "a2", "r3", "Bahari Yangu", "Bongo Flava", "c3", 258, 1980430, "2026-05-22"],
  ["t8", "a2", "r3", "Dala Dala", "Bongo Flava", "c3", 189, 1440960, "2026-05-22"],
  ["t9", "a3", "r4", "Soft Power", "R&B", "c4", 227, 412300, "2026-06-30"],
  ["t10", "a3", "r4", "Benga Lullaby", "R&B", "c4", 251, 298440, "2026-06-30"],
  ["t11", "a3", "r4", "Kondele Rain", "Afro-soul", "c4", 214, 187220, "2026-06-30"],
  ["t12", "a4", "r5", "Log Drum Letters", "Amapiano", "c6", 296, 2874100, "2026-08-14"],
  ["t13", "a4", "r5", "Kampala 3AM", "Amapiano", "c6", 312, 1994520, "2026-08-14"],
  ["t14", "a4", "r5", "Church Keys", "Amapiano", "c6", 274, 1120380, "2026-08-14"],
  ["t15", "a5", "r6", "Coastline Riddim", "Dancehall", "c5", 187, 884210, "2026-04-11"],
  ["t16", "a5", "r6", "Ferry Queue (Dub)", "Dancehall", "c5", 203, 402180, "2026-04-11"],
  ["t17", "a6", "r7", "Accra Motion", "Afrobeats", "c8", 208, 6820440, "2026-03-27"],
  ["t18", "a6", "r7", "Osu Sunday", "Afrobeats", "c8", 219, 4410990, "2026-03-27"],
  ["t19", "a6", "r7", "Two Phones", "Afrobeats", "c8", 195, 3120670, "2026-03-27"],
  ["t20", "a6", "r7", "Highlife Interlude", "Afro-fusion", "c8", 142, 1210330, "2026-03-27"],
  ["t21", "a7", "r8", "Roots in Concrete", "Alternative", "c7", 264, 214880, "2026-08-29"],
  ["t22", "a7", "r8", "Taarab Horns", "Alternative", "c7", 289, 132440, "2026-08-29"],
  ["t23", "a7", "r8", "Ngong Road Tape", "Alternative", "c7", 231, 98120, "2026-08-29"],
  ["t24", "a8", "r9", "Arusha Tape", "Hip-Hop", "c7", 216, 1120450, "2026-01-24"],
  ["t25", "a8", "r9", "Mji Mdogo", "Hip-Hop", "c7", 232, 806210, "2026-01-24"],
  ["t26", "a8", "r9", "Nyumbani Freestyle", "Trap", "c7", 178, 512900, "2026-01-24"],
  ["t27", "a1", "r10", "Sunrise Over Naivasha", "Afro-fusion", "c5", 244, 0, "2026-10-02", false],
  ["t28", "a1", "r11", "Untitled Session", "Afro-fusion", "c4", 201, 0, "2026-11-20", false],
];

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const tracks: Track[] = seeds.map(
  ([id, artistId, releaseId, title, genre, coverUrl, durationSeconds, playCount, releaseDate, published = true]) => ({
    id,
    artistId,
    releaseId,
    title,
    slug: slugify(title),
    genre,
    coverUrl,
    audioUrl: null,
    durationSeconds,
    playCount,
    downloadCount: playCount > 0 ? Math.max(14, Math.floor(playCount * 0.15)) : 14,
    likeCount: playCount > 0 ? Math.max(5, Math.floor(playCount * 0.065)) : 0,
    published,
    releaseDate,
  }),
);

export { slugify };
