"use client";
import Link from "next/link";
import { useState } from "react";
import { CATEGORIES, categoryLabel, describeLogistics } from "@/lib/campus";
import { formatKobo, timeAgo } from "@/lib/format";
import type { CategorySlug, PeakTag, VendorOrder } from "@/lib/types";
import { useAuth } from "../AuthProvider";
import { StatusPill, VerificationLabel, VerifiedTick } from "../Badges";
import { AlertCircle, Clock3, CreditCard, ExternalLink, FULFILLMENT_ICONS, MessageCircle, Pencil, Plus, StickyNote, Ticket, Trash2 } from "../icons";
import { ImageUpload } from "../ImageUpload";
import { Segmented } from "../Marketplace";
import { ProductImage } from "../ProductCard";
import { ShareStore } from "../ShareStore";
import { StoreLogo } from "../StoreLogo";
import type { VendorData } from "./VendorPortal";

export function VendorDashboard({ data, reload, onEdit }: { data: VendorData; reload(): Promise<void>; onEdit(): void }) {
  const store = data.store!;
  const { authFetch } = useAuth();
  const [tab, setTab] = useState<"orders" | "items">("orders");
  const v = store.verification;
  const live = v.status === "verified";
  const active = data.orders.filter((o) => ["paid_escrow", "whatsapp_pending", "accepted"].includes(o.status));
  const escrow = data.orders.filter((o) => o.status === "paid_escrow").reduce((s, o) => s + o.totalKobo, 0);
  const earned = data.orders.filter((o) => o.status === "completed").reduce((s, o) => s + o.totalKobo, 0);

  async function toggleOpen() {
    await authFetch("/api/vendor/store", { method: "PATCH", body: JSON.stringify({ isOpen: !store.isOpen }) });
    await reload();
  }

  return (
    <div className="space-y-5">
      <section className="card p-5">
        <div className="flex flex-wrap items-start gap-4">
          <StoreLogo id={store.id} name={store.name} category={store.categories[0]} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h1 className="truncate text-xl font-semibold tracking-tight text-ink">{store.name}</h1>
              <VerifiedTick store={store} />
            </div>
            <VerificationLabel store={store} className="mt-0.5" />
          </div>
          <div className="flex items-center gap-2">
            {live && (
              <label className="flex cursor-pointer items-center gap-2 text-sm text-subtle">
                <span className={store.isOpen ? "font-medium text-[#067647]" : ""}>{store.isOpen ? "Open" : "Closed"}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={store.isOpen}
                  onClick={toggleOpen}
                  className={`relative h-6 w-11 rounded-full transition-colors ${store.isOpen ? "bg-[#12b76a]" : "bg-[#f1ddd0]"}`}
                >
                  <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${store.isOpen ? "left-[22px]" : "left-0.5"}`} />
                </button>
              </label>
            )}
            <button onClick={onEdit} className="btn-secondary btn-sm">
              <Pencil /> Edit
            </button>
          </div>
        </div>

        {v.status === "pending" && (
          <Notice tone="amber">
            <b className="font-medium">Under review by LCU admin.</b> Add your items now. Your store goes live as soon as it&apos;s verified.
          </Notice>
        )}
        {v.status === "rejected" && (
          <Notice tone="red">
            <b className="font-medium">Verification not approved.</b> {v.notes || "Please check your documents and resubmit."}{" "}
            <button onClick={onEdit} className="font-medium underline">
              Update documents
            </button>
          </Notice>
        )}

        {live && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
            <Link href={`/store/${store.slug}`} className="btn-secondary btn-sm">
              <ExternalLink /> View store
            </Link>
            <ShareStore name={store.name} slug={store.slug} tagline={store.tagline} className="btn-sm" />
            {store.vendorType === "off_campus_service" && v.gatePassCode && (
              <span className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-canvas px-3 font-mono text-xs text-subtle">
                <Ticket className="size-3.5" /> {v.gatePassCode}
              </span>
            )}
          </div>
        )}
      </section>

      <section className="grid grid-cols-3 gap-3">
        <Stat label="Open orders" value={String(active.length)} bg="#f25c1f" />
        <Stat label="Held in escrow" value={formatKobo(escrow)} bg="#7b3fe4" />
        <Stat label="Completed" value={formatKobo(earned)} bg="#12b886" />
      </section>

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          ["orders", `Orders${active.length ? ` (${active.length})` : ""}`],
          ["items", `Items (${data.products.length})`],
        ]}
      />

      {tab === "orders" ? <OrdersTab orders={data.orders} reload={reload} /> : <ItemsTab data={data} reload={reload} />}
    </div>
  );
}

function Notice({ tone, children }: { tone: "amber" | "red"; children: React.ReactNode }) {
  const cls = tone === "amber" ? "bg-[#fffaeb] text-[#93370d]" : "bg-[#fef3f2] text-[#912018]";
  return (
    <p className={`mt-4 flex gap-2 rounded-lg p-3 text-sm ${cls}`}>
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

function Stat({ label, value, bg }: { label: string; value: string; bg: string }) {
  return (
    <div className="rounded-2xl p-4 text-white" style={{ backgroundColor: bg }}>
      <p className="text-xs opacity-85">{label}</p>
      <p className="mt-1 truncate text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}

function OrdersTab({ orders, reload }: { orders: VendorOrder[]; reload(): Promise<void> }) {
  if (orders.length === 0)
    return <div className="card p-8 text-center text-sm text-muted">No orders yet. Share your store link on WhatsApp status to get your first one.</div>;
  return (
    <div className="space-y-3">
      {orders.map((o) => (
        <VendorOrderCard key={o.id} order={o} reload={reload} />
      ))}
    </div>
  );
}

function VendorOrderCard({ order, reload }: { order: VendorOrder; reload(): Promise<void> }) {
  const { authFetch } = useAuth();
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const ModeIcon = FULFILLMENT_ICONS[order.logistics.mode];

  async function act(action: "accept" | "complete") {
    setBusy(true);
    setMsg("");
    try {
      const r = await authFetch(`/api/orders/${order.id}/vendor-action`, { method: "POST", body: JSON.stringify({ action, pin }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      await reload();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3 p-4">
        <div>
          <p className="font-medium text-ink">{order.buyer.name}</p>
          <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-muted">
            {order.paymentMethod === "interswitch_webpay" ? <CreditCard className="size-3.5" /> : <MessageCircle className="size-3.5" />}
            {order.paymentMethod === "interswitch_webpay" ? "Interswitch" : "WhatsApp"} · {formatKobo(order.totalKobo)} · {timeAgo(order.createdAt)}
          </p>
        </div>
        <StatusPill status={order.status} />
      </div>
      <div className="space-y-2 border-t border-line px-4 py-3 text-sm text-subtle">
        <p className="text-ink">{order.items.map((i) => `${i.qty} × ${i.name}`).join(", ")}</p>
        <p className="flex items-start gap-2">
          <ModeIcon className="mt-0.5 size-4 shrink-0 text-muted" /> {describeLogistics(order)}
        </p>
        {order.logistics.preferredTime && (
          <p className="flex items-start gap-2">
            <Clock3 className="mt-0.5 size-4 shrink-0 text-muted" /> {order.logistics.preferredTime}
          </p>
        )}
        {order.logistics.note && (
          <p className="flex items-start gap-2">
            <StickyNote className="mt-0.5 size-4 shrink-0 text-muted" /> {order.logistics.note}
          </p>
        )}
        {order.gatePass && (
          <p className="flex items-start gap-2">
            <Ticket className="mt-0.5 size-4 shrink-0 text-muted" /> Gate pass <span className="font-mono font-medium text-ink">{order.gatePass.code}</span>
          </p>
        )}
      </div>

      {order.status === "whatsapp_pending" && (
        <div className="border-t border-line p-4">
          <button disabled={busy} onClick={() => act("accept")} className="btn-primary w-full">
            Accept order
          </button>
        </div>
      )}
      {(order.status === "paid_escrow" || order.status === "accepted") && (
        <div className="border-t border-line bg-canvas/60 p-4">
          <p className="mb-2.5 text-xs text-muted">
            {order.status === "paid_escrow"
              ? `${formatKobo(order.totalKobo)} is held for you. At handover, ask the buyer for their 4-digit PIN to release it.`
              : "At handover, ask the buyer for their 4-digit PIN to confirm delivery."}
          </p>
          <div className="flex gap-2">
            <input
              className="input w-32 text-center font-mono text-lg tracking-[0.4em]"
              inputMode="numeric"
              maxLength={4}
              placeholder="0000"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              aria-label="Buyer's delivery PIN"
            />
            <button disabled={busy || pin.length !== 4} onClick={() => act("complete")} className="btn-primary h-11 flex-1">
              Confirm delivery
            </button>
          </div>
        </div>
      )}
      {msg && <p className="px-4 pb-4 text-sm text-[#b42318]">{msg}</p>}
    </div>
  );
}

function ItemsTab({ data, reload }: { data: VendorData; reload(): Promise<void> }) {
  const { authFetch } = useAuth();
  const store = data.store!;
  const [open, setOpen] = useState(data.products.length === 0);

  async function patch(id: string, body: object | null) {
    await authFetch(`/api/vendor/products/${id}`, body ? { method: "PATCH", body: JSON.stringify(body) } : { method: "DELETE" });
    await reload();
  }

  return (
    <div className="space-y-3">
      {open ? (
        <AddItemForm
          categories={store.categories}
          onDone={async () => {
            setOpen(false);
            await reload();
          }}
          onCancel={() => setOpen(false)}
        />
      ) : (
        <button onClick={() => setOpen(true)} className="btn-primary">
          <Plus /> Add item or service
        </button>
      )}
      {data.products.length > 0 && (
        <ul className="card divide-y divide-line">
          {data.products.map((p) => (
            <li key={p.id} className="flex items-center gap-3 p-3">
              <ProductImage product={p} className="size-12 shrink-0 rounded-lg" iconClass="size-5" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{p.name}</p>
                <p className="text-xs text-muted">
                  {formatKobo(p.priceKobo)} · {categoryLabel(p.category)}
                </p>
              </div>
              <button
                onClick={() => patch(p.id, { inStock: !p.inStock })}
                className={`rounded-md px-2 py-1 text-xs font-medium ${p.inStock ? "bg-[#ecfdf3] text-[#067647]" : "bg-canvas text-muted"}`}
              >
                {p.inStock ? "In stock" : "Sold out"}
              </button>
              <button onClick={() => confirm(`Delete ${p.name}?`) && patch(p.id, null)} className="grid size-8 place-items-center rounded-md text-muted hover:bg-canvas hover:text-[#b42318]" aria-label={`Delete ${p.name}`}>
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AddItemForm({ categories, onDone, onCancel }: { categories: CategorySlug[]; onDone(): void; onCancel(): void }) {
  const { authFetch } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [kind, setKind] = useState<"product" | "service">("product");
  const [category, setCategory] = useState<CategorySlug>(categories[0]);
  const [tags, setTags] = useState<PeakTag[]>([]);
  const [imageUrl, setImageUrl] = useState<string>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await authFetch("/api/vendor/products", {
        method: "POST",
        body: JSON.stringify({ name, description, priceNaira: Number(price), kind, category, tags, imageUrl }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
      <h3 className="text-sm font-semibold text-ink sm:col-span-2">New item</h3>
      <div className="sm:col-span-2">
        <span className="label">Name</span>
        <input className="input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Jollof rice and chicken" />
      </div>
      <div className="sm:col-span-2">
        <span className="label">
          Description <span className="font-normal text-muted">(optional)</span>
        </span>
        <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div>
        <span className="label">Price (₦)</span>
        <input className="input" required type="number" min={50} step={50} inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="2500" />
      </div>
      <div>
        <span className="label">Type</span>
        <select className="input" value={kind} onChange={(e) => setKind(e.target.value as "product" | "service")}>
          <option value="product">Product</option>
          <option value="service">Service or booking</option>
        </select>
      </div>
      {categories.length > 1 && (
        <div>
          <span className="label">Category</span>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value as CategorySlug)}>
            {CATEGORIES.filter((c) => categories.includes(c.slug)).map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <span className="label">Feature in</span>
        <div className="flex gap-2">
          {(
            [
              ["fresher", "Fresher essentials"],
              ["exam", "Exam week"],
            ] as const
          ).map(([t, l]) => (
            <button type="button" key={t} onClick={() => setTags((x) => (x.includes(t) ? x.filter((y) => y !== t) : [...x, t]))} className={`chip ${tags.includes(t) ? "chip-on" : "chip-off"}`}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <div className="sm:col-span-2">
        <ImageUpload folder="products" label="Photo" hint="Compressed automatically to save data." value={imageUrl} onChange={setImageUrl} />
      </div>
      {error && <p className="rounded-lg bg-[#fef3f2] p-2.5 text-sm text-[#b42318] sm:col-span-2">{error}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button className="btn-primary flex-1" disabled={busy}>
          {busy ? "Saving…" : "Add item"}
        </button>
      </div>
    </form>
  );
}
