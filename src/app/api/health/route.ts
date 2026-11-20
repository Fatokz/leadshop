// Deployment check: reports which settings are present (never their values)
// and whether the database can be reached, with the error message if not.
export const dynamic = "force-dynamic";

const has = (k: string) => Boolean(process.env[k]?.trim());

export async function GET() {
  const key = process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? "";
  const env = {
    NEXT_PUBLIC_FIREBASE_API_KEY: has("NEXT_PUBLIC_FIREBASE_API_KEY"),
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: has("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
    FIREBASE_ADMIN_PROJECT_ID: has("FIREBASE_ADMIN_PROJECT_ID"),
    FIREBASE_ADMIN_CLIENT_EMAIL: has("FIREBASE_ADMIN_CLIENT_EMAIL"),
    FIREBASE_ADMIN_PRIVATE_KEY: Boolean(key),
    privateKeyLooksValid: key.includes("BEGIN PRIVATE KEY") && key.includes("END PRIVATE KEY"),
    AUTO_SEED_DEMO: process.env.AUTO_SEED_DEMO ?? null,
    NEXT_PUBLIC_ISW_MODE: process.env.NEXT_PUBLIC_ISW_MODE ?? null,
  };

  let database: Record<string, unknown>;
  try {
    const { repo } = await import("@/lib/server/repo");
    const { firebaseAdminEnabled } = await import("@/lib/server/firebase-admin");
    const stores = await repo.listStores("lcu_ibadan");
    database = { ok: true, source: firebaseAdminEnabled ? "firestore" : "demo-memory", stores: stores.length };
  } catch (err) {
    const e = err as Error;
    database = { ok: false, error: e?.message ?? String(err), at: e?.stack?.split("\n").slice(0, 4) };
  }

  return Response.json({ env, database }, { headers: { "Cache-Control": "no-store" } });
}
