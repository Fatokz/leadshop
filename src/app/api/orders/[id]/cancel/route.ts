import { handle, json } from "@/lib/server/http";
import { cancelOrder } from "@/lib/server/orders";

// Buyer cancels an unpaid / unaccepted order. The order ID is the buyer's access key.
export const POST = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const order = await cancelOrder(id);
  return json({ order });
});
