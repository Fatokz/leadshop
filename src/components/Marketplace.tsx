"use client";
import { useMemo, useState } from "react";
import { CATEGORIES, PEAK_TABS, categoryLabel } from "@/lib/campus";
import type { CategorySlug, PeakTag, Product, Store } from "@/lib/types";
import { BRAND_PALETTE, categoryColor, type Swatch } from "@/lib/palette";
import { CATEGORY_ICONS, Check, LayoutGrid, LockKeyhole, PEAK_ICONS, Search, X } from "./icons";
import { ProductCard } from "./ProductCard";
import { StoreCard } from "./StoreCard";

type Peak = "all" | PeakTag;
type VendorFilter = "all" | Store["vendorType"];

export function Marketplace({
  stores,
  products,
  initialCategory,
  initialQuery,
}: {
  stores: Store[];
  products: Product[];
  initialCategory?: string;
  initialQuery?: string;
}) {
  const [peak, setPeak] = useState<Peak>("all");
  const [category, setCategory] = useState<CategorySlug | "all">(
    CATEGORIES.some((c) => c.slug === initialCategory) ? (initialCategory as CategorySlug) : "all",
  );
  const [query, setQuery] = useState(initialQuery ?? "");
  const [vendorType, setVendorType] = useState<VendorFilter>("all");

  const storeById = useMemo(() => new Map(stores.map((s) => [s.id, s])), [stores]);
  const q = query.trim().toLowerCase();

  const filteredProducts = useMemo(
    () =>
      products.filter((p) => {
        const s = storeById.get(p.storeId);
        if (!s) return false;
        if (peak !== "all" && !p.tags.includes(peak)) return false;
        if (category !== "all" && p.category !== category) return false;
        if (vendorType !== "all" && s.vendorType !== vendorType) return false;
        if (q && !`${p.name} ${p.description} ${s.name}`.toLowerCase().includes(q)) return false;
        return true;
      }),
    [products, storeById, peak, category, vendorType, q],
  );

  // Store-first discovery: stores matching the filters directly or through their items.
  const filteredStores = useMemo(() => {
    const viaItems = new Set(filteredProducts.map((p) => p.storeId));
    return stores
      .filter((s) => {
        if (vendorType !== "all" && s.vendorType !== vendorType) return false;
        if (category !== "all" && !s.categories.includes(category)) return false;
        if (peak !== "all" && !viaItems.has(s.id)) return false;
        if (q && !`${s.name} ${s.tagline}`.toLowerCase().includes(q) && !viaItems.has(s.id)) return false;
        return true;
      })
      .sort((a, b) => Number(b.isOpen) - Number(a.isOpen) || b.rating - a.rating);
  }, [stores, filteredProducts, category, vendorType, peak, q]);

  const activePeak = PEAK_TABS.find((t) => t.id === peak)!;
  const filtered = category !== "all" || peak !== "all" || vendorType !== "all" || q;

  return (
    <div className="space-y-7">
      {/* Intro + search */}
      <section className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-4xl">
            What do you need on <span className="text-brand-600">campus</span> today?
          </h1>
          <p className="mt-1 text-sm text-muted sm:text-base">
            {stores.length} verified student vendors and cleared service providers at Lead City University.
          </p>
        </div>
        <div className="relative md:max-w-xl">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search food, braids, printing, power banks…"
            className="input h-12 pl-11 pr-10"
            aria-label="Search Lead Shop"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted hover:bg-canvas" aria-label="Clear search">
              <X className="size-4" />
            </button>
          )}
        </div>
      </section>

      {/* Peak-period cards */}
      <section className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 sm:grid sm:grid-cols-3 sm:overflow-visible">
        {PEAK_TABS.map((t) => {
          const Icon = PEAK_ICONS[t.id];
          const on = peak === t.id;
          const look = PEAK_LOOK[t.id];
          return (
            <button
              key={t.id}
              onClick={() => setPeak(t.id)}
              className={`relative flex w-[220px] shrink-0 items-start gap-3 overflow-hidden rounded-2xl p-4 text-left transition sm:w-auto ${on ? "scale-[1.01] shadow-lg" : "opacity-90 hover:opacity-100"}`}
              style={{ backgroundColor: look.bg, color: look.fg, boxShadow: on ? `0 10px 24px -12px ${look.bg}` : undefined }}
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: look.chip }}>
                <Icon className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold">{t.id === "all" ? "Everything" : t.label}</span>
                <span className="block text-xs opacity-85">{t.hint}</span>
              </span>
              {on && (
                <span className="absolute right-3 top-3 grid size-5 place-items-center rounded-full bg-white/90" style={{ color: look.bg }}>
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
              )}
              <span className="pointer-events-none absolute -bottom-6 -right-4 size-16 rounded-full" style={{ backgroundColor: look.chip }} />
            </button>
          );
        })}
      </section>

      {/* Categories */}
      <section aria-label="Categories">
        <div className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 sm:grid sm:grid-cols-9 sm:gap-2 sm:overflow-visible">
          <CategoryButton active={category === "all"} onClick={() => setCategory("all")} label="All stores" Icon={LayoutGrid} color={BRAND_PALETTE[0]} />
          {CATEGORIES.map((c) => (
            <CategoryButton
              key={c.slug}
              active={category === c.slug}
              onClick={() => setCategory(category === c.slug ? "all" : c.slug)}
              label={c.label}
              Icon={CATEGORY_ICONS[c.slug]}
              color={categoryColor(c.slug)}
            />
          ))}
        </div>
      </section>

      {/* Trust strip */}
      {!filtered && (
        <section className="flex items-start gap-3 rounded-2xl bg-[#dcf7ee] p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-mint text-white">
            <LockKeyhole className="size-5" />
          </span>
          <div className="text-sm">
            <p className="font-semibold text-[#0a6b4e]">Pay safely with Interswitch</p>
            <p className="text-[#2f6f5b]">
              Your payment is held until you receive your order and give the vendor your 4-digit delivery PIN.
            </p>
          </div>
        </section>
      )}

      {/* Stores first */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="section-title flex items-center gap-2">
              {category !== "all" && <span className="size-3 rounded-full" style={{ backgroundColor: categoryColor(category).c }} />}
              {category !== "all" ? categoryLabel(category) : peak !== "all" ? activePeak.label : "Stores"}
            </h2>
            <p className="text-sm text-muted">
              {filteredStores.length} {filteredStores.length === 1 ? "store" : "stores"}
              {peak !== "all" ? ` · ${activePeak.hint.toLowerCase()}` : ""}
            </p>
          </div>
          <Segmented
            value={vendorType}
            onChange={setVendorType}
            options={[
              ["all", "All"],
              ["on_campus_student", "Students"],
              ["off_campus_service", "Off-campus"],
            ]}
          />
        </div>
        {filteredStores.length === 0 ? (
          <Empty text="No stores match these filters." />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredStores.map((s) => (
              <StoreCard key={s.id} store={s} />
            ))}
          </div>
        )}
      </section>

      {/* Then items */}
      <section className="space-y-3">
        <h2 className="section-title">{q ? `Results for “${query.trim()}”` : peak !== "all" ? `${activePeak.label} picks` : "Popular items"}</h2>
        {filteredProducts.length === 0 ? (
          <Empty text="No items match these filters." />
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
            {filteredProducts.slice(0, 20).map((p, i) => (
              <ProductCard key={p.id} index={i} product={p} store={storeById.get(p.storeId)!} showStore />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CategoryButton({
  active,
  onClick,
  label,
  Icon,
  color,
}: {
  active: boolean;
  onClick(): void;
  label: string;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number; style?: React.CSSProperties }>;
  color: Swatch;
}) {
  return (
    <button onClick={onClick} className="group flex w-[78px] shrink-0 flex-col items-center gap-2 py-1 sm:w-auto">
      <span
        className={`grid size-14 place-items-center rounded-2xl transition ${active ? "scale-105 shadow-md" : "group-hover:-translate-y-0.5"}`}
        style={{ backgroundColor: active ? color.c : color.t, color: active ? "#fff" : color.c }}
      >
        <Icon className="size-6" strokeWidth={1.9} />
      </span>
      <span className="text-center text-xs font-medium leading-tight" style={{ color: active ? color.d : undefined }}>
        {label}
      </span>
    </button>
  );
}

const PEAK_LOOK = {
  all: { bg: "#f25c1f", fg: "#ffffff", chip: "rgba(255,255,255,0.22)" },
  fresher: { bg: "#7b3fe4", fg: "#ffffff", chip: "rgba(255,255,255,0.2)" },
  exam: { bg: "#ffb627", fg: "#4a2a00", chip: "rgba(255,255,255,0.45)" },
} as const;

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: NoInfer<T>) => void; options: readonly (readonly [NoInfer<T>, string])[] }) {
  return (
    <div className="inline-flex rounded-xl bg-brand-50 p-1 text-sm">
      {options.map(([v, l]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${value === v ? "bg-brand-600 text-white shadow-sm" : "text-brand-800/70 hover:text-brand-800"}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="card p-8 text-center text-sm text-muted">{text}</div>;
}
