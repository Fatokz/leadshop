"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "./CartProvider";
import { MapPin, Search, ShoppingBag } from "./icons";
import { Wordmark } from "./Logo";

const LINKS = [
  { href: "/orders", label: "Orders" },
  { href: "/vendor", label: "Sell" },
];

export function SiteHeader() {
  const { count } = useCart();
  const path = usePathname();
  const router = useRouter();
  const [q, setQ] = useState("");

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
        <Link href="/" aria-label="Lead Shop home">
          <Wordmark />
        </Link>

        <span className="hidden items-center gap-1.5 text-sm text-muted lg:flex">
          <MapPin className="size-4 text-brand-600" /> Lead City University, Ibadan
        </span>

        {/* The home page has its own big search, so only show this one elsewhere. */}
        {path !== "/" && (
        <form
          className="relative ml-auto hidden w-full max-w-sm md:block"
          onSubmit={(e) => {
            e.preventDefault();
            router.push(q.trim() ? `/?q=${encodeURIComponent(q.trim())}` : "/");
          }}
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search stores and items" className="input h-10 pl-9 text-sm" aria-label="Search" />
        </form>
        )}

        <nav className={`ml-auto hidden items-center gap-1 md:flex ${path === "/" ? "" : "md:ml-0"}`}>
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-md px-3 py-2 text-sm font-medium ${path.startsWith(l.href) ? "text-ink" : "text-muted hover:text-ink"}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <Link href="/cart" className="relative ml-auto grid size-10 place-items-center rounded-xl bg-brand-600 text-white hover:bg-brand-700 md:ml-0" aria-label={`Cart, ${count} items`}>
          <ShoppingBag className="size-5" />
          {count > 0 && (
            <span className="absolute -right-1.5 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-plum px-1 text-[10px] font-semibold text-white ring-2 ring-canvas">
              {count}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
