"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { StatusPill } from "@/components/Badges";
import { myOrderIds } from "@/components/CartProvider";
import { ChevronRight, ReceiptText } from "@/components/icons";
import { StoreLogo } from "@/components/StoreLogo";
import { formatKobo, timeAgo } from "@/lib/format";
import type { Order } from "@/lib/types";

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    const ids = myOrderIds();
    if (ids.length === 0) {
      setOrders([]);
      return;
    }
    fetch(`/api/orders?ids=${ids.join(",")}`)
      .then((r) => r.json())
      .then((d) => setOrders(d.orders ?? []))
      .catch(() => setOrders([]));
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Orders</h1>
      {orders === null ? (
        <div className="h-40 animate-pulse rounded-xl bg-white" />
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-white ring-1 ring-line">
            <ReceiptText className="size-6 text-muted" />
          </span>
          <p className="mt-4 font-semibold text-ink">No orders on this device yet</p>
          <p className="mt-1 text-sm text-muted">Orders you place will show up here.</p>
          <Link href="/" className="btn-primary mt-6">
            Start shopping
          </Link>
        </div>
      ) : (
        <ul className="card divide-y divide-line">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/orders/${o.id}`} className="flex items-center gap-3 p-4 hover:bg-canvas/60">
                <StoreLogo id={o.storeId} name={o.storeName} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-medium text-ink">{o.storeName}</p>
                    <p className="shrink-0 text-sm font-semibold tabular-nums text-ink">{formatKobo(o.totalKobo)}</p>
                  </div>
                  <p className="truncate text-sm text-muted">{o.items.map((i) => `${i.qty} × ${i.name}`).join(", ")}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <StatusPill status={o.status} />
                    <span className="text-xs text-muted">{timeAgo(o.createdAt)}</span>
                  </div>
                </div>
                <ChevronRight className="size-5 shrink-0 text-muted/60" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
