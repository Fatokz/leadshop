import { Marketplace } from "@/components/Marketplace";
import { DEFAULT_CAMPUS_ID } from "@/lib/campus";
import { repo, toPublicStore } from "@/lib/server/repo";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const [stores, products] = await Promise.all([repo.listStores(DEFAULT_CAMPUS_ID), repo.listProducts(DEFAULT_CAMPUS_ID)]);
  const verified = stores.filter((s) => s.verification.status === "verified").map(toPublicStore);
  const ids = new Set(verified.map((s) => s.id));
  return (
    <Marketplace
      key={`${sp.q ?? ""}|${sp.category ?? ""}`}
      stores={verified}
      products={products.filter((p) => ids.has(p.storeId))}
      initialCategory={typeof sp.category === "string" ? sp.category : undefined}
      initialQuery={typeof sp.q === "string" ? sp.q : undefined}
    />
  );
}
