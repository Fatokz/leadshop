"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FULFILLMENT_LABELS, needsGatePass } from "@/lib/campus";
import { formatKobo } from "@/lib/format";
import { ISW_MODE } from "@/lib/interswitch";
import { loadInterswitch, openInterswitchCheckout } from "@/lib/interswitch-client";
import type { Campus, FulfillmentMode, Order, PaymentMethod, Store } from "@/lib/types";
import { rememberOrder, useCart } from "./CartProvider";
import { CreditCard, FULFILLMENT_ICONS, LoaderCircle, LockKeyhole, MessageCircle, Minus, Plus, ShieldCheck, ShoppingBag, Trash2 } from "./icons";
import { ProductImage } from "./ProductCard";

const BUYER_KEY = "leadshop:buyer";
/** The unpaid order this device last started paying for, so a retry reuses it. */
const PENDING_KEY = "leadshop:pending-checkout";

function readPending(): { orderId: string; signature: string } | null {
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY) ?? "null");
  } catch {
    return null;
  }
}

function writePending(v: { orderId: string; signature: string } | null) {
  try {
    if (v) localStorage.setItem(PENDING_KEY, JSON.stringify(v));
    else localStorage.removeItem(PENDING_KEY);
  } catch {}
}

/** Asks the server for a fresh payment attempt on an existing unpaid order, or null if it can't be reused. */
async function resumeUnpaid(orderId: string): Promise<Order | null> {
  try {
    const r = await fetch(`/api/orders/${orderId}/pay`, { method: "POST" });
    return r.ok ? (await r.json()).order : null;
  } catch {
    return null;
  }
}

export function CartCheckout() {
  const cart = useCart();
  const router = useRouter();
  const [store, setStore] = useState<Store | null>(null);
  const [campus, setCampus] = useState<Campus | null>(null);
  const [loadError, setLoadError] = useState("");

  const [mode, setMode] = useState<FulfillmentMode | null>(null);
  const [dropoffPoint, setDropoffPoint] = useState("");
  const [address, setAddress] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [note, setNote] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [payment, setPayment] = useState<PaymentMethod>("interswitch_webpay");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const b = JSON.parse(localStorage.getItem(BUYER_KEY) ?? "{}");
      if (b.name) setName(b.name);
      if (b.phone) setPhone(b.phone);
      if (b.address) setAddress(b.address);
    } catch {}
  }, []);

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!cart.storeId) return;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    setLoadError("");
    fetch(`/api/stores/${cart.storeId}`, { signal: controller.signal })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        setStore(data.store);
        setCampus(data.campus);
        setMode((m) => (m && data.store.fulfillmentModes.includes(m) ? m : data.store.fulfillmentModes[0]));
        setDropoffPoint((d) => d || data.campus.shuttleHubs[0]);
      })
      .catch((e) => {
        if (controller.signal.aborted) setLoadError("This is taking too long. Check your connection and try again.");
        else setLoadError(e.message || "Couldn't load this store's delivery options.");
      })
      .finally(() => clearTimeout(timer));
    loadInterswitch().catch(() => {}); // warm up so the payment window opens instantly
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [cart.storeId, attempt]);

  if (cart.lines.length === 0) {
    return (
      <div className="mx-auto flex max-w-sm flex-col items-center py-16 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-white ring-1 ring-line">
          <ShoppingBag className="size-6 text-muted" />
        </span>
        <h1 className="mt-4 text-lg font-semibold text-ink">Your cart is empty</h1>
        <p className="mt-1 text-sm text-muted">Find food, thrift, printing and more from verified campus vendors.</p>
        <Link href="/" className="btn-primary mt-6">
          Browse stores
        </Link>
      </div>
    );
  }

  const fee = campus && mode ? campus.fees[mode] : 0;
  const total = cart.subtotalKobo + fee;
  const needsAddress = mode === "direct_room" || mode === "in_room_service" || mode === "off_campus_shuttle" || mode === "custom_location";
  const gatePass = store?.vendorType === "off_campus_service" && mode !== null && needsGatePass(mode);

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!store || !mode) return;
    setError("");
    setBusy("Creating your order…");
    try {
      localStorage.setItem(BUYER_KEY, JSON.stringify({ name, phone, address }));
    } catch {}

    try {
      const body = {
        storeId: store.id,
        items: cart.lines.map((l) => ({ productId: l.productId, qty: l.qty })),
        buyer: { name, phone },
        logistics: {
          mode,
          dropoffPoint: mode === "campus_shuttle" ? dropoffPoint : undefined,
          address: needsAddress ? address : undefined,
          note,
          preferredTime,
        },
        paymentMethod: payment,
      };
      const signature = JSON.stringify(body);

      // Don't create duplicates: if this exact checkout already has an unpaid order, resume it.
      // If the cart changed, cancel the old unpaid order before creating the new one.
      let order: Order | null = null;
      const pending = readPending();
      if (pending && payment === "interswitch_webpay") {
        if (pending.signature === signature) {
          order = await resumeUnpaid(pending.orderId);
        } else {
          await fetch(`/api/orders/${pending.orderId}/cancel`, { method: "POST" }).catch(() => {});
        }
        if (!order) writePending(null);
      }

      if (!order) {
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: signature,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        order = data.order as Order;
        if (order.paymentMethod === "interswitch_webpay") writePending({ orderId: order.id, signature });
      }
      rememberOrder(order.id);

      if (order.paymentMethod === "whatsapp_handoff") {
        cart.clear();
        router.push(`/orders/${order.id}?sent=whatsapp`);
        return;
      }

      setBusy("Opening Interswitch…");
      await openInterswitchCheckout({
        txnRef: order.interswitch!.txnRef,
        amountKobo: order.totalKobo,
        customerName: name,
        customerId: phone,
        redirectUrl: `${location.origin}/orders/${order.id}`,
      });
      setBusy("Confirming payment…");
      await fetch(`/api/orders/${order.id}/verify-payment`, { method: "POST" }).catch(() => {});
      // The order now exists (and can be retried or cancelled from its page), so the cart is done.
      writePending(null);
      cart.clear();
      router.push(`/orders/${order.id}`);
    } catch (err) {
      setError((err as Error).message || "Couldn't place your order.");
      setBusy(null);
    }
  }

  return (
    <form onSubmit={placeOrder} className="grid gap-6 lg:grid-cols-[1fr_380px] lg:gap-8">
      <div className="space-y-6">
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Checkout</h1>
          <Link href={`/store/${cart.storeSlug}`} className="truncate text-sm font-medium text-brand-600 hover:text-brand-700">
            Add more from {cart.storeName}
          </Link>
        </div>

        <Section title="Your items">
          <ul className="divide-y divide-line">
            {cart.lines.map((l) => (
              <li key={l.productId} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <ProductImage product={l} className="size-14 shrink-0 rounded-lg" iconClass="size-5" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{l.name}</p>
                  <p className="text-sm text-muted">{formatKobo(l.priceKobo)}</p>
                </div>
                <div className="flex items-center rounded-lg border border-line">
                  <button type="button" className="grid size-8 place-items-center text-subtle hover:text-ink" onClick={() => cart.setQty(l.productId, l.qty - 1)} aria-label="Decrease quantity">
                    {l.qty === 1 ? <Trash2 className="size-3.5" /> : <Minus className="size-3.5" />}
                  </button>
                  <span className="w-6 text-center text-sm font-medium tabular-nums">{l.qty}</span>
                  <button type="button" className="grid size-8 place-items-center text-subtle hover:text-ink" onClick={() => cart.setQty(l.productId, l.qty + 1)} aria-label="Increase quantity">
                    <Plus className="size-3.5" />
                  </button>
                </div>
                <p className="hidden w-24 text-right text-sm font-semibold tabular-nums text-ink sm:block">{formatKobo(l.priceKobo * l.qty)}</p>
              </li>
            ))}
          </ul>
        </Section>

        {loadError && (
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#fef3f2] p-3 text-sm text-[#b42318]">
            <span>{loadError}</span>
            <button type="button" onClick={() => setAttempt((n) => n + 1)} className="btn-secondary btn-sm shrink-0">
              Try again
            </button>
          </div>
        )}
        {!store && !loadError && (
          <div className="card flex items-center gap-3 p-5 text-sm text-muted">
            <LoaderCircle className="size-4 animate-spin text-brand-600" /> Loading delivery options…
          </div>
        )}

        {store && campus && (
          <Section title="Delivery">
            <div className="grid gap-2 sm:grid-cols-2">
              {store.fulfillmentModes.map((m) => {
                const Icon = FULFILLMENT_ICONS[m];
                const on = mode === m;
                return (
                  <label
                    key={m}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${on ? "border-brand-600 bg-brand-50/50 ring-1 ring-brand-600" : "border-line hover:border-muted/40"}`}
                  >
                    <input type="radio" name="mode" className="sr-only" checked={on} onChange={() => setMode(m)} />
                    <Icon className={`mt-0.5 size-5 shrink-0 ${on ? "text-brand-600" : "text-muted"}`} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2 text-sm font-medium text-ink">
                        {FULFILLMENT_LABELS[m].label}
                        <span className="shrink-0 text-sm tabular-nums text-subtle">{campus.fees[m] ? formatKobo(campus.fees[m]) : "Free"}</span>
                      </span>
                      <span className="block text-xs text-muted">{m === "vendor_pickup" ? `At ${store.pickupZone}` : FULFILLMENT_LABELS[m].desc}</span>
                    </span>
                  </label>
                );
              })}
            </div>

            {mode === "campus_shuttle" && (
              <div className="mt-4">
                <span className="label">Shuttle drop-off point</span>
                <div className="flex flex-wrap gap-2">
                  {campus.shuttleHubs.map((h) => (
                    <button type="button" key={h} onClick={() => setDropoffPoint(h)} className={`chip ${dropoffPoint === h ? "chip-on" : "chip-off"}`}>
                      {h}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {needsAddress && (
                <Field id="address" label={mode === "off_campus_shuttle" ? "Off-campus address" : mode === "custom_location" ? "Location on campus" : "Hostel and room"} wide={!(mode === "in_room_service" || store.vendorType === "off_campus_service")}>
                  <input
                    id="address"
                    className="input"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder={mode === "off_campus_shuttle" ? "12 Toll Gate Rd, Apete" : mode === "custom_location" ? "Faculty of Law, LT 2" : "Girls Hostel B, Room 214"}
                  />
                </Field>
              )}
              {(mode === "in_room_service" || store.vendorType === "off_campus_service") && (
                <Field id="time" label="Preferred date and time">
                  <input id="time" className="input" value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)} placeholder="Sat 23 Nov, 10am" />
                </Field>
              )}
              <Field id="note" label="Note for the vendor" optional wide>
                <input id="note" className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Call when you get to the gate" />
              </Field>
            </div>

            {gatePass && (
              <p className="mt-4 flex gap-2.5 rounded-lg bg-canvas p-3 text-sm text-subtle">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand-600" />
                <span>
                  {store.ownerName} is an off-campus provider. We&apos;ll issue a one-time LCU gate pass for this booking, active once it&apos;s paid or accepted.
                </span>
              </p>
            )}
          </Section>
        )}

        <Section title="Contact details">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="name" label="Full name">
              <input id="name" className="input" required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field id="phone" label="WhatsApp number">
              <input id="phone" className="input" required type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="080…" />
            </Field>
          </div>
        </Section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <Section title="Payment">
          <div className="space-y-2">
            <PayOption
              checked={payment === "interswitch_webpay"}
              onSelect={() => setPayment("interswitch_webpay")}
              title="Card, transfer or USSD"
              sub="via Interswitch · protected"
              desc="Your money is held until you confirm delivery with your PIN."
              Icon={CreditCard}
            />
            <PayOption
              checked={payment === "whatsapp_handoff"}
              onSelect={() => setPayment("whatsapp_handoff")}
              title="Arrange on WhatsApp"
              sub="no payment protection"
              desc="We send your order to the vendor; you agree payment with them."
              Icon={MessageCircle}
            />
          </div>
        </Section>

        <div className="card p-5">
          <dl className="space-y-2 text-sm">
            <Row label="Subtotal" value={formatKobo(cart.subtotalKobo)} />
            <Row label="Delivery" value={fee ? formatKobo(fee) : "Free"} />
            <div className="flex items-center justify-between border-t border-line pt-3">
              <dt className="font-semibold text-ink">Total</dt>
              <dd className="text-lg font-semibold tabular-nums text-ink">{formatKobo(total)}</dd>
            </div>
          </dl>
          {payment === "interswitch_webpay" && <p className="mt-2 text-xs text-muted">Interswitch may add a small processing fee.</p>}
          {error && <p className="mt-3 rounded-lg bg-[#fef3f2] p-2.5 text-sm text-[#b42318]">{error}</p>}
          <button disabled={!store || !mode || Boolean(busy)} className="btn-primary btn-lg mt-4 w-full">
            {busy || !store ? <LoaderCircle className="animate-spin" /> : payment === "interswitch_webpay" && <LockKeyhole />}
            {busy ?? (!store ? (loadError ? "Delivery options unavailable" : "Loading delivery options…") : payment === "whatsapp_handoff" ? "Continue to WhatsApp" : `Pay ${formatKobo(total)}`)}
          </button>
          <p className="mt-3 text-center text-xs text-muted">Payments processed securely by Interswitch</p>
          {ISW_MODE === "TEST" && payment === "interswitch_webpay" && (
            <p className="mt-3 rounded-xl bg-[#fff3d6] p-2.5 text-center text-xs text-[#7f5600]">
              <b className="font-semibold">Test mode:</b> use Interswitch test cards. No real money is charged.
            </p>
          )}
        </div>
      </aside>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <h2 className="mb-4 text-sm font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}

function Field({ id, label, optional, wide, children }: { id: string; label: string; optional?: boolean; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <label className="label" htmlFor={id}>
        {label} {optional && <span className="font-normal text-muted">(optional)</span>}
      </label>
      {children}
    </div>
  );
}

function PayOption(props: { checked: boolean; onSelect(): void; title: string; sub: string; desc: string; Icon: React.ComponentType<{ className?: string }> }) {
  const { Icon } = props;
  return (
    <label
      className={`flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors ${props.checked ? "border-brand-600 bg-brand-50/50 ring-1 ring-brand-600" : "border-line hover:border-muted/40"}`}
    >
      <input type="radio" name="payment" className="sr-only" checked={props.checked} onChange={props.onSelect} />
      <Icon className={`mt-0.5 size-5 shrink-0 ${props.checked ? "text-brand-600" : "text-muted"}`} />
      <span>
        <span className="block text-sm font-medium text-ink">
          {props.title} <span className="font-normal text-muted">{props.sub}</span>
        </span>
        <span className="mt-0.5 block text-xs text-muted">{props.desc}</span>
      </span>
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className="tabular-nums text-ink">{value}</dd>
    </div>
  );
}
