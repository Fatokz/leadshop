// Shared domain types for Lead Shop. Money is always stored in kobo (minor units).

export type VendorType = "on_campus_student" | "off_campus_service";

export type FulfillmentMode =
  | "vendor_pickup"
  | "direct_room"
  | "campus_shuttle"
  | "off_campus_shuttle"
  | "in_room_service"
  | "custom_location";

export type VerificationStatus = "pending" | "verified" | "rejected";

export type CategorySlug =
  | "female-thrift"
  | "mens-fashion"
  | "shoes"
  | "accessories"
  | "food-pastries"
  | "printing-errands"
  | "hair-beauty"
  | "gadgets";

export type PeakTag = "fresher" | "exam";

export interface Campus {
  id: string;
  name: string;
  shortName: string;
  city: string;
  shuttleHubs: string[];
  /** Delivery fee per fulfillment mode, in kobo. */
  fees: Record<FulfillmentMode, number>;
}

export interface StoreVerification {
  status: VerificationStatus;
  /** On-campus students only. */
  matricNumber?: string;
  /** Off-campus providers only, e.g. "NIN", "Driver's licence". */
  externalIdType?: string;
  externalIdLast4?: string;
  studentIdUrl?: string;
  clearanceDocUrl?: string;
  /** Issued by LCU admin to verified off-campus providers. */
  gatePassCode?: string;
  reviewedAt?: string;
  notes?: string;
}

export interface Store {
  id: string;
  slug: string;
  campusId: string;
  name: string;
  tagline: string;
  bio: string;
  vendorType: VendorType;
  categories: CategorySlug[];
  ownerUid?: string;
  ownerName: string;
  whatsapp: string;
  pickupZone: string;
  fulfillmentModes: FulfillmentMode[];
  isOpen: boolean;
  openingHours: string;
  rating: number;
  reviewCount: number;
  emoji: string;
  /** Tailwind gradient classes for the cover. */
  cover: string;
  verification: StoreVerification;
  createdAt: string;
}

export interface Product {
  id: string;
  storeId: string;
  campusId: string;
  name: string;
  description: string;
  priceKobo: number;
  kind: "product" | "service";
  category: CategorySlug;
  emoji: string;
  imageUrl?: string;
  tags: PeakTag[];
  durationMins?: number;
  inStock: boolean;
  createdAt: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  priceKobo: number;
  qty: number;
  emoji: string;
}

export type PaymentMethod = "interswitch_webpay" | "whatsapp_handoff";

export type OrderStatus =
  | "awaiting_payment" // Interswitch order created, not yet confirmed
  | "payment_failed"
  | "paid_escrow" // Interswitch confirmed server-side, funds held
  | "whatsapp_pending" // WhatsApp handoff, vendor yet to accept
  | "accepted" // Vendor accepted a WhatsApp order
  | "completed" // Buyer's PIN confirmed at handover, escrow released
  | "cancelled"; // Cancelled by the buyer before payment / acceptance

export interface Logistics {
  mode: FulfillmentMode;
  dropoffPoint?: string;
  address?: string;
  note?: string;
  preferredTime?: string;
}

export interface GatePass {
  code: string;
  providerName: string;
  storeName: string;
  destination: string;
  validOn: string;
  issuedAt: string;
}

export interface InterswitchInfo {
  txnRef: string;
  amountKobo: number;
  responseCode?: string;
  responseDescription?: string;
  paymentReference?: string;
  verifiedAt?: string;
  lastCheckedAt?: string;
}

export interface Order {
  id: string;
  campusId: string;
  storeId: string;
  storeName: string;
  storeSlug: string;
  storeWhatsapp: string;
  items: OrderItem[];
  subtotalKobo: number;
  deliveryFeeKobo: number;
  totalKobo: number;
  buyer: { name: string; phone: string };
  logistics: Logistics;
  paymentMethod: PaymentMethod;
  interswitch?: InterswitchInfo;
  /** 4-digit code the buyer gives the vendor at handover. Never sent to vendors. */
  deliveryPin: string;
  /** Wrong PIN entries by the vendor; confirmation locks after 5. */
  pinAttempts?: number;
  gatePass?: GatePass;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

/** Order as shown to a vendor: PIN removed. */
export type VendorOrder = Omit<Order, "deliveryPin">;

export interface SessionUser {
  uid: string;
  email: string;
  isAdmin: boolean;
}
