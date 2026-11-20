import { HttpError, handle, json, readJson, requireUser } from "@/lib/server/http";
import { repo } from "@/lib/server/repo";

async function ownedProduct(req: Request, id: string) {
  const user = await requireUser(req);
  const store = await repo.getStoreByOwner(user.uid);
  if (!store) throw new HttpError(404, "Set up your store first.");
  const product = (await repo.listProducts(store.campusId, store.id)).find((p) => p.id === id);
  if (!product) throw new HttpError(404, "Item not found.");
  return product;
}

export const PATCH = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const product = await ownedProduct(req, id);
  const b = await readJson<{ inStock?: boolean }>(req);
  if (typeof b.inStock === "boolean") product.inStock = b.inStock;
  await repo.saveProduct(product);
  return json({ product });
});

export const DELETE = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  await ownedProduct(req, id);
  await repo.deleteProduct(id);
  return json({ ok: true });
});
