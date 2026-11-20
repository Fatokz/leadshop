import { nairaToKobo } from "@/lib/format";
import { HttpError, handle, json, optStr, readJson, requireUser, str } from "@/lib/server/http";
import { newId } from "@/lib/server/ids";
import { repo } from "@/lib/server/repo";
import * as v from "@/lib/server/validate";
import type { PeakTag, Product } from "@/lib/types";

export const POST = handle(async (req: Request) => {
  const user = await requireUser(req);
  const store = await repo.getStoreByOwner(user.uid);
  if (!store) throw new HttpError(404, "Set up your store first.");
  const b = await readJson<Record<string, unknown>>(req);

  const priceNaira = Number(b.priceNaira);
  if (!(priceNaira >= 50 && priceNaira <= 2_000_000)) throw new HttpError(400, "Price must be between ₦50 and ₦2,000,000.");
  const tags = (Array.isArray(b.tags) ? b.tags : []).filter((t): t is PeakTag => t === "fresher" || t === "exam");
  const duration = Number(b.durationMins);

  const product: Product = {
    id: newId("pr"),
    storeId: store.id,
    campusId: store.campusId,
    name: str(b.name, "Item name", { min: 2, max: 80 }),
    description: optStr(b.description, 300) ?? "",
    priceKobo: nairaToKobo(priceNaira),
    kind: b.kind === "service" ? "service" : "product",
    category: store.categories.includes(b.category as never) ? v.category(b.category) : store.categories[0],
    emoji: optStr(b.emoji, 8) ?? store.emoji,
    imageUrl: v.fileUrl(b.imageUrl, "Item photo", false),
    tags: [...new Set(tags)],
    ...(duration > 0 ? { durationMins: Math.min(duration, 720) } : {}),
    inStock: true,
    createdAt: new Date().toISOString(),
  };
  await repo.saveProduct(product);
  return json({ product }, 201);
});
