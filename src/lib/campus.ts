import type { Campus, CategorySlug, FulfillmentMode, GatePass, Order, OrderStatus, PeakTag } from "./types";

export const DEFAULT_CAMPUS_ID = "lcu_ibadan";

/** Bump when demo seed data changes, so AUTO_SEED_DEMO refreshes Firestore. */
export const SEED_VERSION = 3;

export const LCU_CAMPUS: Campus = {
  id: DEFAULT_CAMPUS_ID,
  name: "Lead City University",
  shortName: "LCU",
  city: "Ibadan",
  shuttleHubs: ["Enterprise", "Revelation", "Main Campus", "Clinic", "Library", "Girls Hostel", "Camp David"],
  fees: {
    vendor_pickup: 0,
    campus_shuttle: 20000,
    direct_room: 50000,
    in_room_service: 30000,
    custom_location: 60000,
    off_campus_shuttle: 80000,
  },
};

export const CATEGORIES: { slug: CategorySlug; label: string }[] = [
  { slug: "food-pastries", label: "Food & Pastries" },
  { slug: "female-thrift", label: "Women's Clothing" },
  { slug: "mens-fashion", label: "Men's Clothing" },
  { slug: "shoes", label: "Shoes" },
  { slug: "accessories", label: "Accessories" },
  { slug: "hair-beauty", label: "Hair & Beauty" },
  { slug: "gadgets", label: "Gadgets" },
  { slug: "printing-errands", label: "Printing & Errands" },
];

export const PEAK_TABS: { id: "all" | PeakTag; label: string; hint: string }[] = [
  { id: "all", label: "All", hint: "All verified campus stores" },
  { id: "fresher", label: "Fresher essentials", hint: "Settle in fast: room items, food, printing, hair" },
  { id: "exam", label: "Exam week", hint: "Late-night food, printing, quick fixes" },
];

export const FULFILLMENT_LABELS: Record<FulfillmentMode, { label: string; desc: string }> = {
  vendor_pickup: { label: "Pick up from vendor", desc: "Meet at the vendor's pickup spot" },
  campus_shuttle: { label: "LCU Shuttle drop-off", desc: "Collect at a shuttle hub" },
  direct_room: { label: "Direct room delivery", desc: "Delivered to your hostel room" },
  in_room_service: { label: "In-room service", desc: "Provider comes to your room (gate pass issued)" },
  off_campus_shuttle: { label: "Off-campus dispatch", desc: "Sent to an off-campus address" },
  custom_location: { label: "Custom location", desc: "Tell us where on campus" },
};

export const STATUS_LABELS: Record<OrderStatus, { label: string; tone: "amber" | "red" | "green" | "blue" | "slate" }> = {
  awaiting_payment: { label: "Awaiting payment", tone: "amber" },
  payment_failed: { label: "Payment not completed", tone: "red" },
  paid_escrow: { label: "Paid · held in escrow", tone: "blue" },
  whatsapp_pending: { label: "Sent via WhatsApp", tone: "amber" },
  accepted: { label: "Accepted by vendor", tone: "blue" },
  completed: { label: "Delivered · funds released", tone: "green" },
  cancelled: { label: "Cancelled", tone: "slate" },
};

export function categoryLabel(slug: CategorySlug) {
  return CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;
}

export function deliveryFee(campus: Campus, mode: FulfillmentMode) {
  return campus.fees[mode] ?? 0;
}

/** Modes that put an off-campus provider inside campus/hostel gates. */
export function needsGatePass(mode: FulfillmentMode) {
  return mode === "in_room_service" || mode === "direct_room";
}

export function describeLogistics(o: Pick<Order, "logistics">) {
  const l = o.logistics;
  const label = FULFILLMENT_LABELS[l.mode].label;
  const where = l.dropoffPoint || l.address;
  return where ? `${label} — ${where}` : label;
}

export function gatePassIsActive(o: Pick<Order, "status" | "gatePass">) {
  return Boolean(o.gatePass) && (o.status === "paid_escrow" || o.status === "accepted");
}

export function formatGatePass(g: GatePass) {
  return `${g.code} · ${g.providerName} → ${g.destination} (${g.validOn})`;
}
