"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { CategorySlug } from "@/lib/types";

export interface CartLine {
  productId: string;
  name: string;
  priceKobo: number;
  emoji: string;
  imageUrl?: string;
  category?: CategorySlug;
  kind: "product" | "service";
  qty: number;
}

export interface CartState {
  storeId: string | null;
  storeName: string;
  storeSlug: string;
  lines: CartLine[];
}

interface CartCtx extends CartState {
  count: number;
  subtotalKobo: number;
  add(store: { id: string; name: string; slug: string }, line: Omit<CartLine, "qty">): "added" | "replaced";
  setQty(productId: string, qty: number): void;
  clear(): void;
}

const EMPTY: CartState = { storeId: null, storeName: "", storeSlug: "", lines: [] };
const KEY = "leadshop:cart";
const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartState>(EMPTY);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setCart(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(cart));
    } catch {}
  }, [cart, loaded]);

  // One store per order (multi-vendor splitting is out of scope for the MVP).
  const add = useCallback<CartCtx["add"]>(
    (store, line) => {
      const replacing = cart.storeId !== null && cart.storeId !== store.id && cart.lines.length > 0;
      setCart((c) => {
        const base = c.storeId === store.id ? c : { storeId: store.id, storeName: store.name, storeSlug: store.slug, lines: [] };
        const existing = base.lines.find((l) => l.productId === line.productId);
        const lines = existing
          ? base.lines.map((l) => (l.productId === line.productId ? { ...l, qty: Math.min(50, l.qty + 1) } : l))
          : [...base.lines, { ...line, qty: 1 }];
        return { ...base, lines };
      });
      return replacing ? "replaced" : "added";
    },
    [cart.storeId, cart.lines.length],
  );

  const setQty = useCallback((productId: string, qty: number) => {
    setCart((c) => {
      const lines = c.lines
        .map((l) => (l.productId === productId ? { ...l, qty: Math.min(50, qty) } : l))
        .filter((l) => l.qty > 0);
      return lines.length ? { ...c, lines } : EMPTY;
    });
  }, []);

  const clear = useCallback(() => setCart(EMPTY), []);

  const value = useMemo<CartCtx>(
    () => ({
      ...cart,
      count: cart.lines.reduce((s, l) => s + l.qty, 0),
      subtotalKobo: cart.lines.reduce((s, l) => s + l.qty * l.priceKobo, 0),
      add,
      setQty,
      clear,
    }),
    [cart, add, setQty, clear],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}

// "My orders" lives in this browser: order IDs are the buyer's access keys.
const ORDERS_KEY = "leadshop:my-orders";

export function rememberOrder(id: string) {
  try {
    const ids: string[] = JSON.parse(localStorage.getItem(ORDERS_KEY) ?? "[]");
    localStorage.setItem(ORDERS_KEY, JSON.stringify([id, ...ids.filter((x) => x !== id)].slice(0, 30)));
  } catch {}
}

export function myOrderIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(ORDERS_KEY) ?? "[]");
  } catch {
    return [];
  }
}
