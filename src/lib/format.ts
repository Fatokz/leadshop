import type { Order } from "./types";
import { describeLogistics } from "./campus";

const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

export function formatKobo(kobo: number) {
  return naira.format(Math.round(kobo) / 100);
}

export function nairaToKobo(naira: number) {
  return Math.round(naira * 100);
}

/** Normalises a Nigerian number to international format without "+", for wa.me links. */
export function toWhatsAppNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("234")) return digits;
  if (digits.startsWith("0")) return "234" + digits.slice(1);
  return digits;
}

export function whatsappLink(phone: string, text: string) {
  return `https://wa.me/${toWhatsAppNumber(phone)}?text=${encodeURIComponent(text)}`;
}

export function orderWhatsAppMessage(order: Order, orderUrl: string) {
  const lines = [
    `*Lead Shop order #${order.id.slice(4, 12).toUpperCase()}*`,
    `Store: ${order.storeName}`,
    "",
    ...order.items.map((i) => `- ${i.qty} x ${i.name}: ${formatKobo(i.priceKobo * i.qty)}`),
    "",
    `Subtotal: ${formatKobo(order.subtotalKobo)}`,
    `Delivery: ${formatKobo(order.deliveryFeeKobo)}`,
    `*Total: ${formatKobo(order.totalKobo)}*`,
    "",
    `Delivery: ${describeLogistics(order)}`,
  ];
  if (order.logistics.preferredTime) lines.push(`Preferred time: ${order.logistics.preferredTime}`);
  if (order.logistics.note) lines.push(`Note: ${order.logistics.note}`);
  if (order.gatePass) lines.push(`LCU gate pass: ${order.gatePass.code}`);
  lines.push(
    "",
    `Buyer: ${order.buyer.name} (${order.buyer.phone})`,
    order.paymentMethod === "interswitch_webpay" && order.status === "paid_escrow"
      ? "Paid via Interswitch, held in escrow until delivery PIN."
      : "Payment to be arranged with vendor.",
    `Track order: ${orderUrl}`,
  );
  return lines.join("\n");
}

export function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** LCU-style matric number check, e.g. LCU/UG/22/12345. Flexible on the middle segment. */
export const MATRIC_REGEX = /^LCU\/[A-Z]{2,5}\/\d{2}\/\d{3,6}$/i;
