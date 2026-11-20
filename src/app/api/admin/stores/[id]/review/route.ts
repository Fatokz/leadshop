import { HttpError, handle, json, optStr, readJson, requireAdmin } from "@/lib/server/http";
import { newStoreGatePass } from "@/lib/server/ids";
import { repo } from "@/lib/server/repo";

/** LCU Student Affairs / Security approves or rejects a vendor's verification. */
export const POST = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireAdmin(req);
  const { id } = await params;
  const b = await readJson<{ decision: "verified" | "rejected"; notes?: string }>(req);
  if (b.decision !== "verified" && b.decision !== "rejected") throw new HttpError(400, "Invalid decision.");

  const store = await repo.getStore(id);
  if (!store) throw new HttpError(404, "Store not found.");

  store.verification = {
    ...store.verification,
    status: b.decision,
    notes: optStr(b.notes, 300),
    reviewedAt: new Date().toISOString(),
  };
  if (b.decision === "verified" && store.vendorType === "off_campus_service" && !store.verification.gatePassCode) {
    store.verification.gatePassCode = newStoreGatePass();
  }
  await repo.saveStore(store);
  return json({ store });
});
