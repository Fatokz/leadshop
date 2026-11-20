import Link from "next/link";
import { categoryLabel } from "@/lib/campus";
import { categoryColor } from "@/lib/palette";
import type { Store } from "@/lib/types";
import { OpenStatus, VerifiedTick } from "./Badges";
import { ChevronRight, MapPin, ShieldCheck, Star } from "./icons";
import { StoreLogo } from "./StoreLogo";

export function StoreCard({ store }: { store: Store }) {
  return (
    <Link href={`/store/${store.slug}`} className="card group flex items-center gap-3.5 p-3.5 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-[0_6px_20px_-8px_rgba(242,92,31,0.35)]">
      <StoreLogo id={store.id} name={store.name} category={store.categories[0]} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <h3 className="truncate font-semibold text-ink">{store.name}</h3>
          <VerifiedTick store={store} />
        </div>
        <p className="truncate text-sm text-muted">{store.tagline}</p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {store.categories.slice(0, 2).map((c) => {
            const col = categoryColor(c);
            return (
              <span key={c} className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: col.t, color: col.d }}>
                {categoryLabel(c)}
              </span>
            );
          })}
        </div>
        <div className="mt-1.5 flex items-center gap-x-2 truncate text-xs text-muted">
          {store.reviewCount > 0 && (
            <span className="inline-flex items-center gap-1 font-medium text-ink">
              <Star className="size-3.5 fill-marigold text-marigold" />
              {store.rating.toFixed(1)}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" />
            {store.pickupZone}
          </span>
          <span aria-hidden>·</span>
          <OpenStatus isOpen={store.isOpen} />
          {store.vendorType === "off_campus_service" && (
            <span className="hidden items-center gap-1 sm:inline-flex">
              <span aria-hidden>·</span>
              <ShieldCheck className="size-3.5" /> Off-campus
            </span>
          )}
        </div>
      </div>
      <ChevronRight className="size-5 shrink-0 text-muted/60 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
