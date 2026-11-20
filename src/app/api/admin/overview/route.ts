import { DEFAULT_CAMPUS_ID } from "@/lib/campus";
import { handle, json, requireAdmin } from "@/lib/server/http";
import { forVendor } from "@/lib/server/orders";
import { repo } from "@/lib/server/repo";

export const GET = handle(async (req: Request) => {
  const user = await requireAdmin(req);
  const [stores, orders] = await Promise.all([
    repo.listStores(DEFAULT_CAMPUS_ID),
    repo.listOrders({ campusId: DEFAULT_CAMPUS_ID }),
  ]);
  return json({ user, mode: repo.mode, stores, orders: orders.map(forVendor) });
});
