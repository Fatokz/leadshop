import { HttpError, handle, json, readJson, requireUser } from "@/lib/server/http";
import { forVendor } from "@/lib/server/orders";
import { repo } from "@/lib/server/repo";

const MAX_PIN_ATTEMPTS = 5;

/**
 * Vendor actions on an order:
 * - "accept": accept a WhatsApp order (activates any gate pass)
 * - "complete": confirm handover with the buyer's 4-digit PIN (releases escrow)
 */
export const POST = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const user = await requireUser(req);
  const body = await readJson<{ action: "accept" | "complete"; pin?: string }>(req);

  const order = await repo.getOrder(id);
  if (!order) throw new HttpError(404, "Order not found.");
  const store = await repo.getStore(order.storeId);
  if (!store || store.ownerUid !== user.uid) throw new HttpError(403, "This isn't your store's order.");

  if (body.action === "accept") {
    if (order.status !== "whatsapp_pending") throw new HttpError(400, "Only new WhatsApp orders can be accepted.");
    order.status = "accepted";
  } else if (body.action === "complete") {
    if (order.status !== "paid_escrow" && order.status !== "accepted")
      throw new HttpError(400, "This order can't be completed yet.");
    if ((order.pinAttempts ?? 0) >= MAX_PIN_ATTEMPTS)
      throw new HttpError(429, "Too many wrong PINs. Contact Lead Shop support.");
    if (String(body.pin ?? "").trim() !== order.deliveryPin) {
      order.pinAttempts = (order.pinAttempts ?? 0) + 1;
      order.updatedAt = new Date().toISOString();
      await repo.saveOrder(order);
      const left = MAX_PIN_ATTEMPTS - order.pinAttempts;
      throw new HttpError(400, `Wrong PIN. ${left} attempt${left === 1 ? "" : "s"} left.`);
    }
    order.status = "completed";
  } else {
    throw new HttpError(400, "Unknown action.");
  }

  order.updatedAt = new Date().toISOString();
  await repo.saveOrder(order);
  return json({ order: forVendor(order) });
});
