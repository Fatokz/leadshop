"use client";
import { useCallback, useEffect, useState } from "react";
import { categoryLabel, describeLogistics } from "@/lib/campus";
import { formatKobo, timeAgo } from "@/lib/format";
import type { GatePass, OrderStatus, Store, VendorOrder } from "@/lib/types";
import { useAuth } from "../AuthProvider";
import { StatusPill, VerificationLabel } from "../Badges";
import { Check, CircleCheck, CircleX, Database, FileImage, GraduationCap, Lock, LogOut, ScanLine, ShieldCheck } from "../icons";
import { Segmented } from "../Marketplace";
import { SignInCard } from "../SignInCard";
import { StoreLogo } from "../StoreLogo";

interface Overview {
  mode: "firebase" | "demo";
  stores: Store[];
  orders: VendorOrder[];
}

type Tab = "verify" | "gate" | "orders";

export function AdminPortal() {
  const { user, ready, authFetch, signOut } = useAuth();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("verify");

  const reload = useCallback(async () => {
    const r = await authFetch("/api/admin/overview");
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    setError("");
    setData(d);
  }, [authFetch]);

  useEffect(() => {
    if (user) reload().catch((e) => setError(e.message));
  }, [user, reload]);

  if (!ready) return null;
  if (!user)
    return (
      <div className="py-6">
        <SignInCard title="LCU Admin & Security" subtitle="For Student Affairs and campus security: verify vendors and check gate passes." demoHint="Use admin@leadshop.demo for admin access." />
      </div>
    );

  if (error)
    return (
      <div className="mx-auto flex max-w-sm flex-col items-center py-16 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-white ring-1 ring-line">
          <Lock className="size-6 text-muted" />
        </span>
        <p className="mt-4 font-semibold text-ink">{error}</p>
        <p className="mt-1 text-sm text-muted">Signed in as {user.email}.</p>
        <button onClick={signOut} className="btn-secondary mt-6">
          Switch account
        </button>
      </div>
    );
  if (!data) return <div className="h-48 animate-pulse rounded-xl bg-white" />;

  const pending = data.stores.filter((s) => s.verification.status === "pending");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Admin</h1>
          <p className="text-sm text-muted">
            {user.email} · {data.mode === "demo" ? "Demo data" : "Live data"}
          </p>
        </div>
        <div className="flex gap-2">
          <SeedButton onDone={reload} />
          <button onClick={signOut} className="btn-ghost btn-sm">
            <LogOut /> Sign out
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat bg="#12b886" label="Verified stores" value={String(data.stores.filter((s) => s.verification.status === "verified").length)} />
        <Stat bg="#ffb627" dark label="Awaiting review" value={String(pending.length)} attention={pending.length > 0} />
        <Stat bg="#7b3fe4" label="Held in escrow" value={formatKobo(data.orders.filter((o) => o.status === "paid_escrow").reduce((s, o) => s + o.totalKobo, 0))} />
      </div>

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          ["verify", `Verifications${pending.length ? ` (${pending.length})` : ""}`],
          ["gate", "Gate check"],
          ["orders", "Orders"],
        ]}
      />

      {tab === "verify" && <VerifyTab stores={data.stores} reload={reload} />}
      {tab === "gate" && <GateTab />}
      {tab === "orders" && <OrdersTab orders={data.orders} />}
    </div>
  );
}

function Stat({ label, value, attention, bg, dark }: { label: string; value: string; attention?: boolean; bg: string; dark?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 ${dark ? "text-[#4a2a00]" : "text-white"}`} style={{ backgroundColor: bg }}>
      <p className="flex items-center gap-1.5 text-xs opacity-85">
        {attention && <span className="size-1.5 animate-pulse rounded-full bg-current" />}
        {label}
      </p>
      <p className="mt-1 truncate text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}

function SeedButton({ onDone }: { onDone(): Promise<void> }) {
  const { authFetch } = useAuth();
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      className="btn-secondary btn-sm"
      onClick={async () => {
        if (!confirm("Load the LCU demo stores and items? Existing demo records are overwritten.")) return;
        setBusy(true);
        const r = await authFetch("/api/admin/seed", { method: "POST" });
        const d = await r.json();
        setBusy(false);
        alert(r.ok ? `Loaded ${d.stores} stores and ${d.products} items.` : d.error);
        await onDone();
      }}
    >
      <Database /> {busy ? "Loading…" : "Load demo data"}
    </button>
  );
}

function VerifyTab({ stores, reload }: { stores: Store[]; reload(): Promise<void> }) {
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const list = stores.filter((s) => filter === "all" || s.verification.status === "pending").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(["pending", "all"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`chip ${filter === f ? "chip-on" : "chip-off"}`}>
            {f === "pending" ? "Awaiting review" : "All stores"}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <div className="card flex flex-col items-center p-10 text-center">
          <CircleCheck className="size-8 text-[#12b76a]" />
          <p className="mt-3 font-medium text-ink">All caught up</p>
          <p className="text-sm text-muted">No vendors waiting for review.</p>
        </div>
      ) : (
        list.map((s) => <ReviewCard key={s.id} store={s} reload={reload} />)
      )}
    </div>
  );
}

function ReviewCard({ store, reload }: { store: Store; reload(): Promise<void> }) {
  const { authFetch } = useAuth();
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const v = store.verification;
  const student = store.vendorType === "on_campus_student";

  async function decide(decision: "verified" | "rejected") {
    setBusy(true);
    const r = await authFetch(`/api/admin/stores/${store.id}/review`, { method: "POST", body: JSON.stringify({ decision, notes }) });
    if (!r.ok) alert((await r.json()).error);
    setBusy(false);
    await reload();
  }

  return (
    <div className="card">
      <div className="flex flex-wrap items-start gap-3 p-4">
        <StoreLogo id={store.id} name={store.name} category={store.categories[0]} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-ink">{store.name}</p>
          <p className="text-xs text-muted">
            {store.ownerName} · {store.categories.map(categoryLabel).join(", ")} · applied {timeAgo(store.createdAt)}
          </p>
        </div>
        <VerificationLabel store={store} />
      </div>
      <dl className="grid gap-3 border-t border-line p-4 text-sm sm:grid-cols-3">
        <KV k="Type" v={student ? "LCU student" : "Off-campus provider"} Icon={student ? GraduationCap : ShieldCheck} />
        <KV k={student ? "Matric number" : "ID"} v={student ? v.matricNumber ?? "—" : `${v.externalIdType ?? "—"} ending ${v.externalIdLast4 ?? "—"}`} />
        <KV k="WhatsApp · pickup" v={`${store.whatsapp} · ${store.pickupZone}`} />
        {v.gatePassCode && <KV k="Standing gate pass" v={v.gatePassCode} mono />}
      </dl>
      <div className="grid grid-cols-2 gap-3 px-4 pb-4">
        <Doc label={student ? "Student ID" : "Government ID"} url={v.studentIdUrl} />
        <Doc label={student ? "LCU business permit" : "LCU security clearance"} url={v.clearanceDocUrl} />
      </div>
      <div className="flex flex-wrap gap-2 border-t border-line p-4">
        <input className="input h-10 flex-1 text-sm" placeholder="Note to vendor (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        {v.status !== "verified" && (
          <button disabled={busy} onClick={() => decide("verified")} className="btn bg-[#079455] text-white hover:bg-[#067647]">
            <Check /> Approve{!student && " and issue pass"}
          </button>
        )}
        {v.status !== "rejected" && (
          <button disabled={busy} onClick={() => decide("rejected")} className="btn-secondary text-[#b42318]">
            <CircleX /> {v.status === "verified" ? "Revoke" : "Reject"}
          </button>
        )}
      </div>
    </div>
  );
}

function KV({ k, v, Icon, mono }: { k: string; v: string; Icon?: React.ComponentType<{ className?: string }>; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-muted">{k}</dt>
      <dd className={`mt-0.5 flex items-center gap-1.5 break-words font-medium text-ink ${mono ? "font-mono" : ""}`}>
        {Icon && <Icon className="size-4 text-muted" />}
        {v}
      </dd>
    </div>
  );
}

function Doc({ label, url }: { label: string; url?: string }) {
  return (
    <div>
      <p className="mb-1.5 text-xs text-muted">{label}</p>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg ring-1 ring-line">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={label} className="h-32 w-full bg-canvas object-contain" />
        </a>
      ) : (
        <div className="grid h-32 place-items-center rounded-lg bg-canvas text-xs text-muted ring-1 ring-line">
          <span className="flex flex-col items-center gap-1">
            <FileImage className="size-5" /> Not provided
          </span>
        </div>
      )}
    </div>
  );
}

interface GateResult {
  kind: "booking" | "provider" | "unknown";
  valid: boolean;
  reason: string;
  pass?: GatePass;
  orderStatus?: OrderStatus;
  buyerName?: string;
  store?: { name: string; ownerName: string; verification: Store["verification"] };
}

function GateTab() {
  const { authFetch } = useAuth();
  const [code, setCode] = useState("");
  const [result, setResult] = useState<GateResult | null>(null);
  const [busy, setBusy] = useState(false);

  async function check(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await authFetch("/api/gate/check", { method: "POST", body: JSON.stringify({ code }) });
    const d = await r.json();
    setBusy(false);
    setResult(r.ok ? d : { kind: "unknown", valid: false, reason: d.error });
  }

  return (
    <div className="max-w-xl space-y-3">
      <form onSubmit={check} className="card p-5">
        <label className="label" htmlFor="pass">
          Pass code
        </label>
        <p className="mb-3 text-xs text-muted">
          A booking pass (<span className="font-mono">LCU-GP-…</span>) or a provider&apos;s standing pass (<span className="font-mono">LCU-PASS-…</span>).
        </p>
        <div className="flex gap-2">
          <input id="pass" className="input font-mono uppercase tracking-wider" value={code} onChange={(e) => setCode(e.target.value)} placeholder="LCU-GP-A1B2C3" required />
          <button className="btn-primary h-11" disabled={busy}>
            <ScanLine /> {busy ? "Checking" : "Check"}
          </button>
        </div>
      </form>
      {result && (
        <div className={`card overflow-hidden ${result.valid ? "border-[#abefc6]" : "border-[#fecdca]"}`}>
          <div className={`flex items-center gap-3 p-4 ${result.valid ? "bg-[#ecfdf3]" : "bg-[#fef3f2]"}`}>
            {result.valid ? <CircleCheck className="size-7 text-[#079455]" /> : <CircleX className="size-7 text-[#d92d20]" />}
            <div>
              <p className={`text-lg font-semibold ${result.valid ? "text-[#067647]" : "text-[#b42318]"}`}>{result.valid ? "Allow entry" : "Do not allow entry"}</p>
              <p className="text-sm text-subtle">{result.reason}</p>
            </div>
          </div>
          {(result.store || result.pass) && (
            <dl className="grid gap-3 p-4 text-sm sm:grid-cols-2">
              {result.store && <KV k="Provider" v={`${result.store.ownerName} · ${result.store.name}`} />}
              {result.store && <KV k="ID on file" v={`${result.store.verification.externalIdType ?? "—"} ending ${result.store.verification.externalIdLast4 ?? "—"}`} />}
              {result.pass && <KV k="Visiting" v={`${result.buyerName} · ${result.pass.destination}`} />}
              {result.pass && <KV k="Date" v={result.pass.validOn} />}
              {result.orderStatus && (
                <div>
                  <dt className="text-xs text-muted">Booking</dt>
                  <dd className="mt-1">
                    <StatusPill status={result.orderStatus} />
                  </dd>
                </div>
              )}
            </dl>
          )}
        </div>
      )}
    </div>
  );
}

function OrdersTab({ orders }: { orders: VendorOrder[] }) {
  if (orders.length === 0) return <div className="card p-8 text-center text-sm text-muted">No orders yet.</div>;
  return (
    <ul className="card divide-y divide-line">
      {orders.map((o) => (
        <li key={o.id} className="flex flex-wrap items-center gap-3 p-4 text-sm">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-ink">
              {o.storeName} <span className="font-normal text-muted">from {o.buyer.name}</span>
            </p>
            <p className="truncate text-xs text-muted">
              {describeLogistics(o)} · {timeAgo(o.createdAt)}
              {o.interswitch && ` · ${o.interswitch.txnRef}`}
              {o.gatePass && ` · ${o.gatePass.code}`}
            </p>
          </div>
          <p className="font-semibold tabular-nums text-ink">{formatKobo(o.totalKobo)}</p>
          <StatusPill status={o.status} />
        </li>
      ))}
    </ul>
  );
}
