import "server-only";
import { CATEGORIES, FULFILLMENT_LABELS } from "../campus";
import type { CategorySlug, FulfillmentMode } from "../types";
import { HttpError } from "./http";
import { firebaseAdminEnabled } from "./firebase-admin";

export function categories(v: unknown): CategorySlug[] {
  const valid = CATEGORIES.map((c) => c.slug);
  const list = Array.isArray(v) ? v.filter((x): x is CategorySlug => valid.includes(x)) : [];
  if (list.length === 0) throw new HttpError(400, "Pick at least one category.");
  return [...new Set(list)].slice(0, 3);
}

export function category(v: unknown): CategorySlug {
  return categories([v])[0];
}

export function fulfillmentModes(v: unknown): FulfillmentMode[] {
  const valid = Object.keys(FULFILLMENT_LABELS) as FulfillmentMode[];
  const list = Array.isArray(v) ? v.filter((x): x is FulfillmentMode => valid.includes(x)) : [];
  if (list.length === 0) throw new HttpError(400, "Pick at least one delivery option.");
  return [...new Set(list)];
}

/** Accepts Firebase Storage URLs, or small data: images in demo mode. */
export function fileUrl(v: unknown, field: string, required: boolean): string | undefined {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) {
    if (required) throw new HttpError(400, `${field} is required.`);
    return undefined;
  }
  if (s.startsWith("https://firebasestorage.googleapis.com/")) return s;
  if (!firebaseAdminEnabled && s.startsWith("data:image/") && s.length < 600_000) return s;
  throw new HttpError(400, `${field} upload is invalid. Please upload it again.`);
}

export function nigerianPhone(v: unknown) {
  const digits = String(v ?? "").replace(/\D/g, "");
  if (!/^(0\d{10}|234\d{10})$/.test(digits)) throw new HttpError(400, "Enter a valid Nigerian WhatsApp number.");
  return digits;
}
