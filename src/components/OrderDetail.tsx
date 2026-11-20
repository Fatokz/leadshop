"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { describeLogistics, gatePassIsActive } from "@/lib/campus";
import { formatKobo, orderWhatsAppMessage, whatsappLink } from "@/lib/format";
import { openInterswitchCheckout } from "@/lib/interswitch-client";
import type { Order } from "@/lib/types";
import { StatusPill } from "./Badges";
import { rememberOrder } from "./CartProvider";
import { AlertCircle, ArrowLeft, Ban, Check, Clock3, CreditCard, FULFILLMENT_ICONS, KeyRound, MessageCircle, RefreshCw, StickyNote, Ticket, UserRound } from "./icons";
import { ProductImage } from "./ProductCard";

export function OrderDetail({ id, sentVia, justPaid = false }: { id: string; sentVia?: "whatsapp"; justPaid?: boolean }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [celebrate, setCelebrate] = useState(justPaid);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const r = await fetch(`/api/orders/${id}`, { cache: "no-store" });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);
    setOrder(data.order);
    return data.order as Order;
  }, [id]);

  useEffect(() => {
    rememberOrder(id);
    load().catch((e) => setError(e.message || "Couldn't load this order."));
  }, [id, load]);

  // Interswitch may redirect here instead of calling onComplete: confirm once on arrival.
  useEffect(() => {
    if (order?.status === "awaiting_payment" && order.interswitch && !order.interswitch.lastCheckedAt) verify(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id]);

  async function verify(silent = false) {
    if (!silent) setBusy("Checking with Interswitch…");
    try {
      const r = await fetch(`/api/orders/${id}/verify-payment`, { method: "POST" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setOrder(data.order);
      if (data.order.status === "paid_escrow") setCelebrate(true);
      else if (!silent) setMessage(data.message || "Payment not confirmed yet.");
    } catch (e) {
      if (!silent) setMessage((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function cancel() {
    if (!confirm("Cancel this order? You can place a new one any time.")) return;
    setMessage("");
    setBusy("Cancelling…");
    try {
      const r = await fetch(`/api/orders/${id}/cancel`, { method: "POST" });
      const data = await r.json();
      if (!r.ok) {
        await load().catch(() => {}); // e.g. Interswitch says it was actually paid
        throw new Error(data.error);
      }
      setOrder(data.order);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function payAgain() {
    if (!order) return;
    setMessage("");
    setBusy("Opening Interswitch…");
    try {
      const r = await fetch(`/api/orders/${id}/pay`, { method: "POST" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      const fresh: Order = data.order;
      await openInterswitchCheckout({
        txnRef: fresh.interswitch!.txnRef,
        amountKobo: fresh.totalKobo,
        customerName: fresh.buyer.name,
        customerId: fresh.buyer.phone,
        redirectUrl: location.href.split("?")[0],
      });
      await verify();
    } catch (e) {
      setMessage((e as Error).message);
      setBusy(null);
    }
  }

  if (error) {
    return (
      <div className="mx-auto flex max-w-sm flex-col items-center py-16 text-center">
        <AlertCircle className="size-8 text-muted" />
        <p className="mt-3 font-medium text-ink">{error}</p>
        <Link href="/orders" className="btn-secondary mt-5">
          My orders
        </Link>
      </div>
    );
  }
  if (!order) return <div className="mx-auto max-w-2xl animate-pulse space-y-4"><div className="h-32 rounded-xl bg-white" /><div className="h-48 rounded-xl bg-white" /></div>;

  const waText = orderWhatsAppMessage(order, typeof location !== "undefined" ? location.href.split("?")[0] : "");
  const showPin = order.status === "paid_escrow" || order.status === "accepted" || order.status === "whatsapp_pending";
  const awaiting = order.status === "awaiting_payment" || order.status === "payment_failed";
  const cancelled = order.status === "cancelled";
  const ModeIcon = FULFILLMENT_ICONS[order.logistics.mode];
  const passActive = gatePassIsActive(order);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/orders" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> My orders
      </Link>

      {celebrate && order.status === "paid_escrow" && (
        <section role="status" className="card flex items-center gap-4 border-mint/30 bg-mint/10 p-5">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-mint text-white">
            <Check className="size-6" strokeWidth={3} />
          </span>
          <div className="min-w-0">
            <p className="text-lg font-bold text-ink">Payment successful</p>
            <p className="text-sm text-subtle">
              Interswitch confirmed {formatKobo(order.totalKobo)}. It&apos;s held safely until you get your order.
            </p>
          </div>
        </section>
      )}

      <section className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Order {order.id.slice(4, 12).toUpperCase()}</p>
            <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-ink">{order.storeName}</h1>
          </div>
          <StatusPill status={order.status} />
        </div>
        {cancelled ? (
          <p className="mt-4 flex items-center gap-2 rounded-xl bg-canvas p-3 text-sm text-subtle">
            <Ban className="size-4 shrink-0" /> You cancelled this order. Nothing was charged.
          </p>
        ) : (
          <Steps order={order} />
        )}
      </section>

      {awaiting && order.paymentMethod === "interswitch_webpay" && (
        <section className="card border-[#fedf89] p-5">
          <div className="flex gap-3">
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-[#b54708]" />
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <h2 className="font-semibold text-ink">{order.status === "payment_failed" ? "Payment not completed" : "Waiting for payment"}</h2>
                <p className="mt-0.5 text-sm text-muted">
                  {order.interswitch?.responseDescription
                    ? `Interswitch: ${order.interswitch.responseDescription}${order.interswitch.responseCode ? ` (${order.interswitch.responseCode})` : ""}`
                    : "If you've just paid, check again to confirm with Interswitch."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={payAgain} disabled={Boolean(busy)} className="btn-primary">
                  <CreditCard /> Pay {formatKobo(order.totalKobo)}
                </button>
                <button onClick={() => verify()} disabled={Boolean(busy)} className="btn-secondary">
                  <RefreshCw /> Check again
                </button>
                <button onClick={cancel} disabled={Boolean(busy)} className="btn-ghost text-[#b42318] hover:bg-[#fef3f2] hover:text-[#b42318]">
                  <Ban /> Cancel order
                </button>
              </div>
              {(busy || message) && <p className="text-sm text-subtle">{busy ?? message}</p>}
            </div>
          </div>
        </section>
      )}

      {showPin && (
        <section className="relative overflow-hidden rounded-2xl bg-grape p-5 text-white">
          <span className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-white/10" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-1.5 text-sm font-medium text-white/85">
                <KeyRound className="size-4" /> Delivery PIN
              </p>
              <p className="mt-2 font-mono text-4xl font-bold tracking-[0.35em]">{order.deliveryPin}</p>
            </div>
            {order.status === "paid_escrow" && (
              <span className="rounded-lg bg-marigold px-2 py-1 text-xs font-semibold text-[#4a2a00]">{formatKobo(order.totalKobo)} held</span>
            )}
          </div>
          <p className="relative mt-3 text-sm text-white/85">
            Give this to the vendor only after you&apos;ve received your order.
            {order.status === "paid_escrow" && " It releases your payment to them."}
          </p>
          {order.status === "paid_escrow" && order.interswitch && (
            <p className="relative mt-3 border-t border-white/20 pt-3 text-xs text-white/75">
              Paid via Interswitch · Ref <span className="font-mono">{order.interswitch.paymentReference ?? order.interswitch.txnRef}</span>
            </p>
          )}
        </section>
      )}

      {order.gatePass && (
        <section className="rounded-2xl bg-[#fff3d6] p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-1.5 text-sm font-medium text-subtle">
                <Ticket className="size-4" /> LCU gate pass
              </p>
              <p className="mt-1.5 font-mono text-xl font-semibold tracking-wider text-ink">{order.gatePass.code}</p>
            </div>
            <span
              className={`rounded-md px-2 py-1 text-xs font-medium ${passActive ? "bg-[#ecfdf3] text-[#067647]" : order.status === "completed" ? "bg-canvas text-muted" : "bg-[#fffaeb] text-[#b54708]"}`}
            >
              {passActive ? "Active" : order.status === "completed" ? "Used" : cancelled ? "Cancelled" : "Inactive until paid"}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted">
            {order.gatePass.providerName} ({order.gatePass.storeName}) may enter campus to reach {order.gatePass.destination} on {order.gatePass.validOn}.
          </p>
        </section>
      )}

      {order.status === "whatsapp_pending" && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-white p-4 text-sm">
          <span className="text-muted">Changed your mind? You can cancel until the vendor accepts.</span>
          <button onClick={cancel} disabled={Boolean(busy)} className="btn-ghost btn-sm text-[#b42318] hover:bg-[#fef3f2] hover:text-[#b42318]">
            <Ban /> Cancel order
          </button>
          {message && <p className="w-full text-[#b42318]">{message}</p>}
        </div>
      )}

      {!cancelled && (order.paymentMethod === "whatsapp_handoff" || sentVia) && (
        <section className="card p-5">
          <h2 className="font-semibold text-ink">{sentVia ? "Send your order to the vendor" : "Message the vendor"}</h2>
          <p className="mt-0.5 text-sm text-muted">The message is ready, with delivery details{order.gatePass ? " and gate pass" : ""}.</p>
          <a className="btn-whatsapp btn-lg mt-4 w-full" href={whatsappLink(order.storeWhatsapp, waText)} target="_blank" rel="noreferrer">
            <MessageCircle /> Open WhatsApp
          </a>
        </section>
      )}

      <section className="card">
        <ul className="divide-y divide-line">
          {order.items.map((i) => (
            <li key={i.productId} className="flex items-center gap-3 p-4">
              <ProductImage product={{ name: i.name }} className="size-11 shrink-0 rounded-lg" iconClass="size-4" />
              <span className="flex-1 text-sm text-ink">
                {i.name} <span className="text-muted">× {i.qty}</span>
              </span>
              <span className="text-sm font-medium tabular-nums">{formatKobo(i.priceKobo * i.qty)}</span>
            </li>
          ))}
        </ul>
        <dl className="space-y-1.5 border-t border-line p-4 text-sm">
          <div className="flex justify-between text-muted">
            <dt>Delivery</dt>
            <dd className="tabular-nums">{order.deliveryFeeKobo ? formatKobo(order.deliveryFeeKobo) : "Free"}</dd>
          </div>
          <div className="flex justify-between font-semibold text-ink">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatKobo(order.totalKobo)}</dd>
          </div>
        </dl>
        <ul className="space-y-2 border-t border-line p-4 text-sm text-subtle">
          <Info Icon={ModeIcon}>{describeLogistics(order)}</Info>
          {order.logistics.preferredTime && <Info Icon={Clock3}>{order.logistics.preferredTime}</Info>}
          {order.logistics.note && <Info Icon={StickyNote}>{order.logistics.note}</Info>}
          <Info Icon={UserRound}>
            {order.buyer.name} · {order.buyer.phone}
          </Info>
        </ul>
      </section>

      {order.paymentMethod === "interswitch_webpay" && !awaiting && !cancelled && (
        <a className="btn-secondary w-full" href={whatsappLink(order.storeWhatsapp, waText)} target="_blank" rel="noreferrer">
          <MessageCircle /> Message vendor about this order
        </a>
      )}
    </div>
  );
}

function Info({ Icon, children }: { Icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted" />
      <span>{children}</span>
    </li>
  );
}

function Steps({ order }: { order: Order }) {
  const interswitch = order.paymentMethod === "interswitch_webpay";
  const failed = order.status === "payment_failed";
  const steps = interswitch
    ? [
        { label: "Placed", done: true },
        { label: "Paid", done: ["paid_escrow", "completed"].includes(order.status), failed },
        { label: "Delivered", done: order.status === "completed" },
      ]
    : [
        { label: "Sent", done: true },
        { label: "Accepted", done: ["accepted", "completed"].includes(order.status) },
        { label: "Delivered", done: order.status === "completed" },
      ];
  return (
    <ol className="mt-5 flex items-center">
      {steps.map((s, i) => (
        <li key={s.label} className={`flex items-center ${i < steps.length - 1 ? "flex-1" : ""}`}>
          <span className="flex flex-col items-center gap-1.5">
            <span
              className={`grid size-7 place-items-center rounded-full text-xs font-semibold ${
                "failed" in s && s.failed ? "bg-[#fef3f2] text-[#b42318] ring-1 ring-[#fecdca]" : s.done ? "bg-brand-600 text-white" : "bg-white text-muted ring-1 ring-line"
              }`}
            >
              {"failed" in s && s.failed ? <AlertCircle className="size-4" /> : s.done ? <Check className="size-4" /> : i + 1}
            </span>
            <span className={`text-xs ${s.done ? "font-medium text-ink" : "text-muted"}`}>{s.label}</span>
          </span>
          {i < steps.length - 1 && <span className={`mx-2 mb-5 h-px flex-1 ${steps[i + 1].done ? "bg-brand-600" : "bg-line"}`} />}
        </li>
      ))}
    </ol>
  );
}
