import { HttpError, handle, json } from "@/lib/server/http";
import { repo, toPublicStore } from "@/lib/server/repo";

/** Public store info + campus logistics config, used by the cart/checkout. */
export const GET = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const store = await repo.getStore(id);
  if (!store || store.verification.status !== "verified") throw new HttpError(404, "Store not found.");
  const campus = await repo.getCampus(store.campusId);
  return json({ store: toPublicStore(store), campus });
});
