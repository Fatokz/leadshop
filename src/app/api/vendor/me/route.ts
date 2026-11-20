import { handle, json, requireUser } from "@/lib/server/http";
import { forVendor } from "@/lib/server/orders";
import { repo } from "@/lib/server/repo";

export const GET = handle(async (req: Request) => {
  const user = await requireUser(req);
  const store = await repo.getStoreByOwner(user.uid);
  if (!store) return json({ user, store: null, products: [], orders: [] });
  const [products, orders] = await Promise.all([
    repo.listProducts(store.campusId, store.id),
    repo.listOrders({ storeId: store.id }),
  ]);
  return json({ user, store, products, orders: orders.map(forVendor) });
});
