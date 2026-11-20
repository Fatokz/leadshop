import { handle, json } from "@/lib/server/http";
import { newPaymentAttempt } from "@/lib/server/orders";

// Issues a fresh Interswitch txn_ref for a retry.
export const POST = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const order = await newPaymentAttempt(id);
  return json({ order });
});
