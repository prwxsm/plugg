import c1 from "@/assets/cover-1.jpg";
import c2 from "@/assets/cover-2.jpg";
import c3 from "@/assets/cover-3.jpg";
import c4 from "@/assets/cover-4.jpg";
import c5 from "@/assets/cover-5.jpg";
import c6 from "@/assets/cover-6.jpg";
import c7 from "@/assets/cover-7.jpg";
import c8 from "@/assets/cover-8.jpg";
import b1 from "@/assets/banner-1.jpg";
import b2 from "@/assets/banner-2.jpg";

import logo from "@/assets/logo.png";

import genreAfrobeats from "@/assets/01_afrobeats.png";
import genreDancehall from "@/assets/02_dancehall.png";
import genreDj from "@/assets/03_dj.png";
import genreGospel from "@/assets/04_gospel.png";
import genreRnb from "@/assets/05_rnb.png";
import genreHiphop from "@/assets/06_hiphop.png";

/**
 * Artwork is referenced by key throughout the mock data so that a real
 * media URL can later replace a key without touching any component.
 */
export const artwork: Record<string, string> = {
  c1,
  c2,
  c3,
  c4,
  c5,
  c6,
  c7,
  c8,
  b1,
  b2,
  logo,
  default_playlist: logo,
  plugg_logo: logo,
  genre_afrobeats: genreAfrobeats,
  genre_dancehall: genreDancehall,
  genre_dj: genreDj,
  genre_gospel: genreGospel,
  genre_hiphop: genreHiphop,
  genre_rnb: genreRnb,
  afrobeats: genreAfrobeats,
  dancehall: genreDancehall,
  dj: genreDj,
  gospel: genreGospel,
  "hip-hop": genreHiphop,
  hiphop: genreHiphop,
  rnb: genreRnb,
};

export function isDefaultPlaylistCover(key?: string): boolean {
  if (!key) return true;
  return key === "default_playlist" || key === "logo" || key === "plugg_logo";
}

export function art(key?: string): string {
  if (!key) return c1;
  if (key === "default_playlist" || key === "logo" || key === "plugg_logo") {
    return logo;
  }
  if (
    key.startsWith("http://") ||
    key.startsWith("https://") ||
    key.startsWith("/") ||
    key.startsWith("blob:") ||
    key.startsWith("data:")
  ) {
    return key;
  }
  return artwork[key] ?? c1;
}
