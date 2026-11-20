import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OpenStatus, VerificationLabel, VerifiedTick } from "@/components/Badges";
import { ArrowLeft, Clock3, FULFILLMENT_ICONS, MapPin, MessageCircle, ShieldCheck, Star, UserRound } from "@/components/icons";
import { ProductCard } from "@/components/ProductCard";
import { ShareStore } from "@/components/ShareStore";
import { StoreLogo } from "@/components/StoreLogo";
import { FULFILLMENT_LABELS, categoryLabel } from "@/lib/campus";
import { whatsappLink } from "@/lib/format";
import { repo, toPublicStore } from "@/lib/server/repo";
import { categoryColor } from "@/lib/palette";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/store/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const store = await repo.getStoreBySlug(slug);
  return store ? { title: store.name, description: store.tagline } : { title: "Store not found" };
}

export default async function StorePage({ params }: PageProps<"/store/[slug]">) {
  const { slug } = await params;
  const found = await repo.getStoreBySlug(slug);
  if (!found || found.verification.status !== "verified") notFound();
  const store = toPublicStore(found);
  const products = (await repo.listProducts(store.campusId, store.id)).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const isOffCampus = store.vendorType === "off_campus_service";
  const services = products.filter((p) => p.kind === "service");
  const goods = products.filter((p) => p.kind === "product");
  const color = categoryColor(store.categories[0]);

  return (
    <div className="space-y-8">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> All stores
      </Link>

      <section className="relative grid grid-cols-1 gap-6 overflow-hidden rounded-3xl p-5 sm:p-7 lg:grid-cols-[1fr_320px]" style={{ backgroundColor: color.t }}>
        <span className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full opacity-25" style={{ backgroundColor: color.c }} />
        <span className="pointer-events-none absolute -bottom-12 right-24 size-24 rounded-full opacity-15" style={{ backgroundColor: color.c }} />
        <div className="relative flex gap-4">
          <StoreLogo id={store.id} name={store.name} category={store.categories[0]} size="lg" />
          <div className="min-w-0 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <h1 className="text-2xl font-semibold tracking-tight text-ink">{store.name}</h1>
              <VerifiedTick store={store} />
            </div>
            <p className="text-subtle">{store.tagline}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
              {store.reviewCount > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Star className="size-4 fill-marigold text-marigold" />
                  <b className="font-semibold text-ink">{store.rating.toFixed(1)}</b> ({store.reviewCount} orders)
                </span>
              )}
              <OpenStatus isOpen={store.isOpen} />
              {store.categories.map((c) => (
                <span key={c} className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-semibold" style={{ color: categoryColor(c).d }}>
                  {categoryLabel(c)}
                </span>
              ))}
            </div>
            <VerificationLabel store={store} />
          </div>
        </div>

        <div className="relative flex gap-2 lg:flex-col lg:justify-center">
          <a className="btn btn-lg flex-1 bg-[#25D366] text-white hover:bg-[#1ebe5a] lg:flex-none" href={whatsappLink(store.whatsapp, `Hi ${store.name}, I found you on Lead Shop.`)} target="_blank" rel="noreferrer">
            <MessageCircle /> WhatsApp
          </a>
          <ShareStore name={store.name} slug={store.slug} tagline={store.tagline} className="btn-lg flex-1 lg:flex-none" />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="card divide-y divide-line">
          {store.bio && <p className="p-4 text-sm leading-relaxed text-subtle">{store.bio}</p>}
          <dl className="grid grid-cols-1 gap-4 p-4 text-sm sm:grid-cols-3">
            <Meta Icon={UserRound} label="Run by" value={`${store.ownerName}${isOffCampus ? " (off-campus)" : ""}`} />
            <Meta Icon={MapPin} label="Pickup spot" value={store.pickupZone} />
            <Meta Icon={Clock3} label="Hours" value={store.openingHours || "Not set"} />
          </dl>
        </div>
        <div className="card p-4">
          <p className="mb-3 text-sm font-semibold text-ink">Delivery options</p>
          <ul className="space-y-2.5">
            {store.fulfillmentModes.map((m) => {
              const Icon = FULFILLMENT_ICONS[m];
              return (
                <li key={m} className="flex items-center gap-2.5 text-sm text-subtle">
                  <span className="grid size-7 place-items-center rounded-lg" style={{ backgroundColor: color.t, color: color.c }}>
                    <Icon className="size-4" />
                  </span>
                  {FULFILLMENT_LABELS[m].label}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {isOffCampus && store.verification.gatePassCode && (
        <section className="flex items-start gap-3 rounded-2xl bg-[#ece5ff] p-4 text-sm">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-grape" />
          <p className="text-[#3f1db3]">
            <b className="font-semibold">Cleared by LCU Security.</b> Standing pass <span className="font-mono">{store.verification.gatePassCode}</span>. Every in-room
            booking also gets a one-time gate pass that hostel security can check.
          </p>
        </section>
      )}

      {products.length === 0 ? (
        <div className="card p-8 text-center text-sm text-muted">This store hasn&apos;t listed anything yet.</div>
      ) : (
        <>
          {services.length > 0 && <Grid title="Services" products={services} store={store} />}
          {goods.length > 0 && <Grid title={services.length ? "Products" : "Items"} products={goods} store={store} />}
        </>
      )}
    </div>
  );
}

function Grid({ title, products, store }: { title: string; products: Parameters<typeof ProductCard>[0]["product"][]; store: Parameters<typeof ProductCard>[0]["store"] }) {
  return (
    <section className="space-y-3">
      <h2 className="section-title">
        {title} <span className="font-normal text-muted">({products.length})</span>
      </h2>
      <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
        {products.map((p, i) => (
          <ProductCard key={p.id} index={i} product={p} store={store} />
        ))}
      </div>
    </section>
  );
}

function Meta({ Icon, label, value }: { Icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted" />
      <div>
        <dt className="text-xs text-muted">{label}</dt>
        <dd className="font-medium text-ink">{value}</dd>
      </div>
    </div>
  );
}
