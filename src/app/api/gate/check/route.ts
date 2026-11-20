import { gatePassIsActive } from "@/lib/campus";
import { handle, json, readJson, requireAdmin, str } from "@/lib/server/http";
import { repo } from "@/lib/server/repo";

/**
 * Gate security checks a pass code.
 * - LCU-PASS-xxx: a verified off-campus provider's standing clearance.
 * - LCU-GP-xxxxxx: a single booking's entry pass (valid while the order is paid/accepted).
 */
export const POST = handle(async (req: Request) => {
  await requireAdmin(req);
  const { code: raw } = await readJson<{ code: string }>(req);
  const code = str(raw, "Pass code", { max: 30 }).toUpperCase();

  const order = await repo.findOrderByGatePass(code);
  if (order?.gatePass) {
    const store = await repo.getStore(order.storeId);
    return json({
      kind: "booking",
      valid: gatePassIsActive(order) && store?.verification.status === "verified",
      reason:
        order.status === "completed"
          ? "Already used: service was completed."
          : gatePassIsActive(order)
            ? "Paid/accepted booking."
            : "Booking not yet paid or accepted.",
      pass: order.gatePass,
      orderStatus: order.status,
      buyerName: order.buyer.name,
      store: store && { name: store.name, ownerName: store.ownerName, verification: store.verification },
    });
  }

  const store = await repo.findStoreByGatePass(code);
  if (store) {
    return json({
      kind: "provider",
      valid: store.verification.status === "verified",
      reason: store.verification.status === "verified" ? "Cleared off-campus provider." : "Clearance revoked or pending.",
      store: { name: store.name, ownerName: store.ownerName, verification: store.verification },
    });
  }

  return json({ kind: "unknown", valid: false, reason: "No pass with this code." });
});
