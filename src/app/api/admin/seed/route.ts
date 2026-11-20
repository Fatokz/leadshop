import { handle, json, requireAdmin } from "@/lib/server/http";
import { repo } from "@/lib/server/repo";

/** Loads the LCU demo stores and products (overwrites the seeded documents only). */
export const POST = handle(async (req: Request) => {
  await requireAdmin(req);
  const result = await repo.seed();
  return json({ ok: true, mode: repo.mode, ...result });
});
