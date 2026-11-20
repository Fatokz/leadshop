// Playful colour system. Every category has its own 4-colour palette; the app
// rotates through it (per item / per store) so grids feel lively but on-theme.
import type { CategorySlug } from "./types";

export interface Swatch {
  /** Solid colour (icons, active states). */
  c: string;
  /** Soft tint (tiles, placeholders). */
  t: string;
  /** Deep shade for text on the tint. */
  d: string;
}

const s = (c: string, t: string, d: string): Swatch => ({ c, t, d });

export const CATEGORY_PALETTES: Record<CategorySlug, Swatch[]> = {
  // Women's clothing (thrift & new): purple, marigold, pink, green
  "female-thrift": [s("#8E44EC", "#F3E8FF", "#5B21B6"), s("#F5A300", "#FFF4D6", "#7A5000"), s("#FF4F9A", "#FFE4F0", "#A3195B"), s("#22B573", "#DDF7EA", "#0F6B42")],
  // Men's clothing: blue, gray, rust, purple
  "mens-fashion": [s("#2F6FED", "#E3EDFF", "#1B4BB0"), s("#6B7A90", "#EAEEF4", "#3E4A5C"), s("#C4562A", "#FBE7DE", "#84341A"), s("#7A4FD8", "#EEE7FD", "#4C2A9E")],
  // Shoes: tangerine, teal, magenta, chartreuse
  shoes: [s("#FF6A13", "#FFE8D9", "#A63E00"), s("#00A8A8", "#D6F5F5", "#006262"), s("#E0218A", "#FDE1F0", "#8E0F55"), s("#8DBF14", "#EEF8D6", "#4F6E05")],
  // Accessories: terracotta, rust, green, amber
  accessories: [s("#E2725B", "#FCE6E0", "#9A3E2C"), s("#B7472A", "#F8E1D9", "#7A2C19"), s("#3E9C5B", "#E1F3E6", "#23613A"), s("#FFB000", "#FFF3D1", "#805800")],
  // Hair & beauty: berry, coral, lilac, peach
  "hair-beauty": [s("#C2185B", "#FCE3EE", "#7E0F3A"), s("#FF6F61", "#FFE6E3", "#A63A30"), s("#B57EDC", "#F4EAFB", "#6E3F99"), s("#FF9E6D", "#FFEDE3", "#A3532A")],
  // Gadgets: electric violet, aqua, lime, orange
  gadgets: [s("#6C3BFF", "#ECE5FF", "#3F1DB3"), s("#00B3C7", "#D9F7FA", "#006E7A"), s("#7CC41F", "#EEF8DD", "#4A7A0A"), s("#FF7A00", "#FFEEDD", "#A04C00")],
  // Food: tomato, mustard, leaf, chili
  "food-pastries": [s("#F2542D", "#FEE5DE", "#9E2E12"), s("#E8A317", "#FCF1D6", "#7F5604"), s("#4CAF50", "#E3F4E4", "#2C6B2F"), s("#D7263D", "#FBE0E3", "#8C1424")],
  // Printing & errands: turquoise, sunflower, magenta, olive
  "printing-errands": [s("#14B8A6", "#D9F7F3", "#0B6E63"), s("#FFC300", "#FFF6D1", "#7F6100"), s("#D63AF9", "#F9E3FE", "#84179E"), s("#8A9A2B", "#F1F4DD", "#545E14")],
};

/** Brand fallback palette (tangerine, plum, marigold, mint). */
export const BRAND_PALETTE: Swatch[] = [s("#F25C1F", "#FFE7DA", "#A8380D"), s("#6B2C7E", "#F3E4F7", "#4A1A58"), s("#FFB627", "#FFF3D6", "#7F5600"), s("#12B886", "#DCF7EE", "#0A6B4E")];

export function hashString(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function categoryColor(slug: CategorySlug): Swatch {
  return CATEGORY_PALETTES[slug][0];
}

/** Stable colour from a category palette, picked by a key (item or store id). */
export function swatchFor(slug: CategorySlug | undefined, key: string | number): Swatch {
  const palette = slug ? CATEGORY_PALETTES[slug] : BRAND_PALETTE;
  const n = typeof key === "number" ? key : hashString(key);
  return palette[n % palette.length];
}
