"use client";
import Link from "next/link";
import { useState } from "react";
import { formatKobo } from "@/lib/format";
import type { CategorySlug, Product, Store } from "@/lib/types";
import { useCart } from "./CartProvider";
import { swatchFor } from "@/lib/palette";
import { CATEGORY_ICONS, Check, Clock3, Plus } from "./icons";

/** Product photo, or a neutral placeholder with the category icon. */
export function ProductImage({
  product,
  className = "",
  iconClass = "size-8",
  index,
}: {
  product: { imageUrl?: string; name: string; category?: CategorySlug };
  /** Position in a grid: rotates colours so neighbours differ. */
  index?: number;
  className?: string;
  iconClass?: string;
}) {
  if (product.imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={product.imageUrl} alt={product.name} loading="lazy" className={`bg-canvas object-cover ${className}`} />;
  }
  const Icon = CATEGORY_ICONS[product.category ?? "food-pastries"];
  const sw = swatchFor(product.category, index ?? product.name);
  return (
    <div className={`grid place-items-center ${className}`} style={{ backgroundColor: sw.t }}>
      <Icon className={iconClass} style={{ color: sw.c }} strokeWidth={1.6} />
    </div>
  );
}

export function ProductCard({
  product,
  store,
  showStore = false,
  index,
}: {
  index?: number;
  product: Product;
  store: Pick<Store, "id" | "name" | "slug" | "isOpen">;
  showStore?: boolean;
}) {
  const cart = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const inCart = cart.storeId === store.id ? cart.lines.find((l) => l.productId === product.id)?.qty ?? 0 : 0;
  const unavailable = !product.inStock || !store.isOpen;

  function add() {
    if (cart.storeId && cart.storeId !== store.id && cart.lines.length > 0) {
      if (!confirm(`Your cart has items from ${cart.storeName}. Start a new cart for ${store.name}?`)) return;
    }
    cart.add(store, {
      productId: product.id,
      name: product.name,
      priceKobo: product.priceKobo,
      emoji: product.emoji,
      imageUrl: product.imageUrl,
      category: product.category,
      kind: product.kind,
    });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  }

  return (
    <div className="group flex flex-col">
      <div className="relative overflow-hidden rounded-2xl">
        <ProductImage product={product} index={index} className="aspect-square w-full" />
        {unavailable && (
          <span className="absolute left-2 top-2 rounded-md bg-white/95 px-2 py-0.5 text-xs font-medium text-subtle">
            {store.isOpen ? "Sold out" : "Store closed"}
          </span>
        )}
        {!unavailable && (
          <button
            onClick={add}
            className={`absolute bottom-2 right-2 grid size-9 place-items-center rounded-full shadow-sm ring-1 transition-colors ${
              justAdded || inCart ? "bg-plum text-white ring-plum" : "bg-brand-600 text-white ring-brand-600 hover:bg-brand-700"
            }`}
            aria-label={`Add ${product.name} to cart`}
          >
            {justAdded ? <Check className="size-4" /> : inCart ? <span className="text-xs font-semibold">{inCart}</span> : <Plus className="size-4" />}
          </button>
        )}
      </div>
      <div className="pt-2">
        <p className="text-[15px] font-semibold text-ink">{formatKobo(product.priceKobo)}</p>
        <h4 className="line-clamp-2 text-sm leading-snug text-subtle">{product.name}</h4>
        {showStore && (
          <Link href={`/store/${store.slug}`} className="mt-0.5 block truncate text-xs font-medium text-muted hover:text-brand-600">
            {store.name}
          </Link>
        )}
        {product.kind === "service" && product.durationMins && (
          <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted">
            <Clock3 className="size-3" /> about {product.durationMins >= 60 ? `${Math.round(product.durationMins / 6) / 10} hr` : `${product.durationMins} min`}
          </p>
        )}
      </div>
    </div>
  );
}
