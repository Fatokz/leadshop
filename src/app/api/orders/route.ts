import { createOrder, type CreateOrderInput } from "@/lib/server/orders";
import { handle, json, readJson } from "@/lib/server/http";
import { repo } from "@/lib/server/repo";

export const POST = handle(async (req: Request) => {
  const body = await readJson<CreateOrderInput>(req);
  const order = await createOrder(body);
  return json({ order }, 201);
});

/** Buyer's "My orders": order IDs are unguessable, so knowing one is the access key. */
export const GET = handle(async (req: Request) => {
  const ids = (new URL(req.url).searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 30);
  const orders = await repo.listOrders({ ids });
  return json({ orders });
});
