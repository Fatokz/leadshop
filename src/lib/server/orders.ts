import "server-only";
import { DEFAULT_CAMPUS_ID, deliveryFee, needsGatePass } from "../campus";
import type { FulfillmentMode, Logistics, Order, OrderItem, PaymentMethod, VendorOrder } from "../types";
import { HttpError, optStr, str } from "./http";
import { newId, newOrderGatePass, newPin, newTxnRef } from "./ids";
import { repo } from "./repo";
import { requeryTransaction } from "./interswitch-verify";

export interface CreateOrderInput {
  storeId: string;
  items: { productId: string; qty: number }[];
  buyer: { name: string; phone: string };
  logistics: Logistics;
  paymentMethod: PaymentMethod;
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const store = await repo.getStore(str(input.storeId, "Store"));
  if (!store || store.verification.status !== "verified") throw new HttpError(404, "Store not found.");
  if (!store.isOpen) throw new HttpError(400, `${store.name} is closed right now.`);

  if (!Array.isArray(input.items) || input.items.length === 0) throw new HttpError(400, "Your cart is empty.");
  const products = await repo.listProducts(store.campusId, store.id);

  // Prices always come from the database, never from the browser.
  const items: OrderItem[] = input.items.map(({ productId, qty }) => {
    const p = products.find((x) => x.id === productId);
    if (!p || !p.inStock) throw new HttpError(400, "An item in your cart is no longer available.");
    const n = Math.floor(Number(qty));
    if (!(n >= 1 && n <= 50)) throw new HttpError(400, "Invalid quantity.");
    return { productId: p.id, name: p.name, priceKobo: p.priceKobo, qty: n, emoji: p.emoji };
  });

  const mode = input.logistics?.mode as FulfillmentMode;
  if (!store.fulfillmentModes.includes(mode)) throw new HttpError(400, "This store doesn't offer that delivery option.");
  const campus = await repo.getCampus(store.campusId);

  const logistics: Logistics = {
    mode,
    dropoffPoint: optStr(input.logistics.dropoffPoint, 80),
    address: optStr(input.logistics.address, 200),
    note: optStr(input.logistics.note, 300),
    preferredTime: optStr(input.logistics.preferredTime, 80),
  };
  if (mode === "campus_shuttle" && !campus.shuttleHubs.includes(logistics.dropoffPoint ?? ""))
    throw new HttpError(400, "Pick a shuttle drop-off hub.");
  if (mode === "vendor_pickup") logistics.dropoffPoint = store.pickupZone;
  if (["direct_room", "in_room_service", "off_campus_shuttle", "custom_location"].includes(mode) && !logistics.address)
    throw new HttpError(400, "Tell us where to deliver.");

  const paymentMethod: PaymentMethod = input.paymentMethod === "whatsapp_handoff" ? "whatsapp_handoff" : "interswitch_webpay";
  const subtotalKobo = items.reduce((s, i) => s + i.priceKobo * i.qty, 0);
  const deliveryFeeKobo = deliveryFee(campus, mode);
  const totalKobo = subtotalKobo + deliveryFeeKobo;
  const now = new Date().toISOString();

  const order: Order = {
    id: newId("ord"),
    campusId: store.campusId || DEFAULT_CAMPUS_ID,
    storeId: store.id,
    storeName: store.name,
    storeSlug: store.slug,
    storeWhatsapp: store.whatsapp,
    items,
    subtotalKobo,
    deliveryFeeKobo,
    totalKobo,
    buyer: { name: str(input.buyer?.name, "Your name", { max: 80 }), phone: str(input.buyer?.phone, "Phone number", { min: 10, max: 20 }) },
    logistics,
    paymentMethod,
    deliveryPin: newPin(),
    status: paymentMethod === "interswitch_webpay" ? "awaiting_payment" : "whatsapp_pending",
    createdAt: now,
    updatedAt: now,
  };

  if (paymentMethod === "interswitch_webpay") {
    order.interswitch = { txnRef: newTxnRef(), amountKobo: totalKobo };
  }

  if (store.vendorType === "off_campus_service" && needsGatePass(mode)) {
    order.gatePass = {
      code: newOrderGatePass(),
      providerName: store.ownerName,
      storeName: store.name,
      destination: logistics.address ?? "LCU campus",
      validOn: logistics.preferredTime || new Date().toLocaleDateString("en-NG", { dateStyle: "medium" }),
      issuedAt: now,
    };
  }

  await repo.saveOrder(order);
  return order;
}

/** Re-checks an Interswitch order with Interswitch and moves it to escrow if approved. */
export async function verifyOrderPayment(orderId: string): Promise<{ order: Order; message: string }> {
  const order = await repo.getOrder(orderId);
  if (!order) throw new HttpError(404, "Order not found.");
  if (order.paymentMethod !== "interswitch_webpay" || !order.interswitch)
    throw new HttpError(400, "This order isn't paid through Interswitch.");
  if (order.status === "cancelled") return { order, message: "This order was cancelled." };
  if (order.status !== "awaiting_payment" && order.status !== "payment_failed")
    return { order, message: "Payment already confirmed." };

  const result = await requeryTransaction(order.interswitch.txnRef, order.totalKobo);
  const now = new Date().toISOString();
  order.interswitch = {
    ...order.interswitch,
    responseCode: result.responseCode,
    responseDescription: result.responseDescription,
    paymentReference: result.paymentReference ?? order.interswitch.paymentReference,
    lastCheckedAt: now,
  };

  if (result.ok) {
    order.status = "paid_escrow";
    order.interswitch.verifiedAt = now;
  } else if (result.reachable && result.responseCode && result.responseCode !== "Z0" && result.responseCode !== "09") {
    // Z0/09 mean "still in progress"; anything else is a definite failure.
    order.status = "payment_failed";
  }
  order.updatedAt = now;
  await repo.saveOrder(order);
  return { order, message: result.responseDescription ?? "" };
}

/** A fresh txn_ref is needed for each new attempt at Interswitch. */
export async function newPaymentAttempt(orderId: string): Promise<Order> {
  const order = await repo.getOrder(orderId);
  if (!order || order.paymentMethod !== "interswitch_webpay") throw new HttpError(404, "Order not found.");
  if (order.status === "cancelled") throw new HttpError(400, "This order was cancelled. Place a new order instead.");
  if (order.status !== "awaiting_payment" && order.status !== "payment_failed")
    throw new HttpError(400, "This order is already paid.");
  order.interswitch = { txnRef: newTxnRef(), amountKobo: order.totalKobo };
  order.status = "awaiting_payment";
  order.updatedAt = new Date().toISOString();
  await repo.saveOrder(order);
  return order;
}

/**
 * Buyer cancels an order that hasn't been paid (Interswitch) or accepted (WhatsApp).
 * For Interswitch, re-checks with Interswitch first so a paid order can't be cancelled.
 */
export async function cancelOrder(orderId: string): Promise<Order> {
  let order = await repo.getOrder(orderId);
  if (!order) throw new HttpError(404, "Order not found.");
  if (order.status === "cancelled") return order;

  if (order.paymentMethod === "interswitch_webpay") {
    if (order.status !== "awaiting_payment" && order.status !== "payment_failed")
      throw new HttpError(400, "This order is already paid and held in escrow, so it can't be cancelled here.");
    order = (await verifyOrderPayment(orderId)).order;
    if (order.status === "paid_escrow")
      throw new HttpError(409, "Interswitch shows this order as paid, so it can't be cancelled. It's now held in escrow.");
  } else if (order.status !== "whatsapp_pending") {
    throw new HttpError(400, "The vendor already accepted this order. Message them on WhatsApp to cancel.");
  }

  order.status = "cancelled";
  order.updatedAt = new Date().toISOString();
  await repo.saveOrder(order);
  return order;
}

export function forVendor(order: Order): VendorOrder {
  const { deliveryPin: _pin, ...rest } = order;
  void _pin;
  return rest;
}
