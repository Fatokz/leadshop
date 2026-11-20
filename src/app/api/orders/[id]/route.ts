import { HttpError, handle, json } from "@/lib/server/http";
import { repo } from "@/lib/server/repo";

export const GET = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const order = await repo.getOrder(id);
  if (!order) throw new HttpError(404, "Order not found.");
  return json({ order });
});
