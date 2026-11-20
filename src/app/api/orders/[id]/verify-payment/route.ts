import { handle, json } from "@/lib/server/http";
import { verifyOrderPayment } from "@/lib/server/orders";

// Called after the Interswitch popup closes. The server asks Interswitch directly.
export const POST = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const { order, message } = await verifyOrderPayment(id);
  return json({ order, message });
});
