import { DEFAULT_CAMPUS_ID } from "@/lib/campus";
import { MATRIC_REGEX, slugify } from "@/lib/format";
import { HttpError, handle, json, optStr, readJson, requireUser, str } from "@/lib/server/http";
import { newId } from "@/lib/server/ids";
import { repo } from "@/lib/server/repo";
import * as v from "@/lib/server/validate";
import type { Store, VendorType } from "@/lib/types";

const COVERS = [
  "from-orange-400 to-rose-500",
  "from-sky-500 to-indigo-600",
  "from-emerald-400 to-teal-600",
  "from-pink-400 to-fuchsia-600",
  "from-amber-300 to-orange-500",
  "from-violet-400 to-purple-600",
];

async function uniqueSlug(name: string, selfId?: string) {
  const base = slugify(name) || "store";
  for (let i = 0; i < 20; i++) {
    const slug = i === 0 ? base : `${base}-${i + 1}`;
    const existing = await repo.getStoreBySlug(slug);
    if (!existing || existing.id === selfId) return slug;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/** Create or update the signed-in vendor's store (onboarding + verification documents). */
export const POST = handle(async (req: Request) => {
  const user = await requireUser(req);
  const b = await readJson<Record<string, unknown>>(req);
  const existing = await repo.getStoreByOwner(user.uid);

  const vendorType: VendorType = b.vendorType === "off_campus_service" ? "off_campus_service" : "on_campus_student";
  const name = str(b.name, "Shop name", { min: 3, max: 60 });
  const now = new Date().toISOString();

  const verification: Store["verification"] = {
    status: "pending",
    studentIdUrl: v.fileUrl(b.studentIdUrl, vendorType === "on_campus_student" ? "Student ID card" : "Government ID", true),
    clearanceDocUrl: v.fileUrl(
      b.clearanceDocUrl,
      vendorType === "on_campus_student" ? "LCU business permit" : "LCU security clearance",
      vendorType === "off_campus_service",
    ),
  };
  if (vendorType === "on_campus_student") {
    const matric = str(b.matricNumber, "Matric number", { max: 30 }).toUpperCase();
    if (!MATRIC_REGEX.test(matric)) throw new HttpError(400, "Matric number should look like LCU/UG/22/12345.");
    verification.matricNumber = matric;
  } else {
    verification.externalIdType = str(b.externalIdType, "ID type", { max: 40 });
    const last4 = String(b.externalIdLast4 ?? "").replace(/\D/g, "");
    if (last4.length !== 4) throw new HttpError(400, "Enter the last 4 digits of your ID number.");
    verification.externalIdLast4 = last4;
  }

  const store: Store = {
    id: existing?.id ?? newId("st"),
    slug: await uniqueSlug(name, existing?.id),
    campusId: existing?.campusId ?? DEFAULT_CAMPUS_ID,
    name,
    tagline: str(b.tagline, "Tagline", { min: 3, max: 90 }),
    bio: optStr(b.bio, 400) ?? "",
    vendorType,
    categories: v.categories(b.categories),
    ownerUid: user.uid,
    ownerName: str(b.ownerName, "Your name", { max: 60 }),
    whatsapp: v.nigerianPhone(b.whatsapp),
    pickupZone: str(b.pickupZone, "Pickup spot", { max: 60 }),
    fulfillmentModes: v.fulfillmentModes(b.fulfillmentModes),
    isOpen: existing?.isOpen ?? true,
    openingHours: optStr(b.openingHours, 60) ?? "",
    rating: existing?.rating ?? 0,
    reviewCount: existing?.reviewCount ?? 0,
    emoji: optStr(b.emoji, 8) ?? existing?.emoji ?? "🛍️",
    cover: existing?.cover ?? COVERS[Math.floor(Math.random() * COVERS.length)],
    verification,
    createdAt: existing?.createdAt ?? now,
  };

  // Editing an already-verified store keeps its badge unless the identity documents changed.
  if (existing?.verification.status === "verified") {
    const ev = existing.verification;
    const same =
      existing.vendorType === vendorType &&
      ev.studentIdUrl === verification.studentIdUrl &&
      ev.clearanceDocUrl === verification.clearanceDocUrl &&
      ev.matricNumber === verification.matricNumber &&
      ev.externalIdLast4 === verification.externalIdLast4;
    if (same) store.verification = ev;
  }

  await repo.saveStore(store);
  return json({ store });
});

/** Quick toggles that don't need re-verification. */
export const PATCH = handle(async (req: Request) => {
  const user = await requireUser(req);
  const b = await readJson<{ isOpen?: boolean }>(req);
  const store = await repo.getStoreByOwner(user.uid);
  if (!store) throw new HttpError(404, "You don't have a store yet.");
  if (typeof b.isOpen === "boolean") store.isOpen = b.isOpen;
  await repo.saveStore(store);
  return json({ store });
});
