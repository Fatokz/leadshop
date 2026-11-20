// Monogram logo for stores, coloured from the store's category palette.
import { swatchFor } from "@/lib/palette";
import type { CategorySlug } from "@/lib/types";

export function initials(name: string) {
  const words = name.replace(/[^\p{L}\p{N}\s&']/gu, "").split(/\s+/).filter((w) => w && w !== "&");
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase() || "LS";
}

export function StoreLogo({
  id,
  name,
  category,
  size = "md",
}: {
  id: string;
  name: string;
  category?: CategorySlug;
  size?: "sm" | "md" | "lg";
}) {
  const dims = { sm: "size-10 text-sm rounded-xl", md: "size-14 text-base rounded-2xl", lg: "size-20 text-2xl rounded-3xl" }[size];
  const sw = swatchFor(category, id);
  return (
    <span className={`grid shrink-0 place-items-center font-bold tracking-tight ${dims}`} style={{ backgroundColor: sw.c, color: "#fff" }} aria-hidden>
      {initials(name)}
    </span>
  );
}
