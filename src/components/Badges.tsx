import { STATUS_LABELS } from "@/lib/campus";
import type { OrderStatus, Store } from "@/lib/types";
import { BadgeCheck, Clock3, ShieldCheck, CircleX } from "./icons";

/** Inline verified tick shown after a store name. */
export function VerifiedTick({ store }: { store: Pick<Store, "verification"> }) {
  if (store.verification.status !== "verified") return null;
  return <BadgeCheck className="size-[18px] shrink-0 fill-mint text-white" aria-label="Verified" />;
}

/** One-line description of how a store was verified. */
export function VerificationLabel({ store, className = "" }: { store: Pick<Store, "vendorType" | "verification">; className?: string }) {
  const v = store.verification;
  if (v.status === "pending")
    return (
      <span className={`inline-flex items-center gap-1.5 text-sm text-[#b54708] ${className}`}>
        <Clock3 className="size-4" /> Verification pending
      </span>
    );
  if (v.status === "rejected")
    return (
      <span className={`inline-flex items-center gap-1.5 text-sm text-[#b42318] ${className}`}>
        <CircleX className="size-4" /> Not verified
      </span>
    );
  return store.vendorType === "on_campus_student" ? (
    <span className={`inline-flex items-center gap-1.5 text-sm text-subtle ${className}`}>
      <BadgeCheck className="size-4 text-mint" /> Verified LCU student · business permit
    </span>
  ) : (
    <span className={`inline-flex items-center gap-1.5 text-sm text-subtle ${className}`}>
      <ShieldCheck className="size-4 text-grape" /> Off-campus provider · LCU security cleared
    </span>
  );
}

export function OpenStatus({ isOpen }: { isOpen: boolean }) {
  return isOpen ? <span className="font-semibold text-mint">Open</span> : <span className="font-medium text-muted">Closed</span>;
}

const TONES = {
  amber: "bg-[#fffaeb] text-[#b54708] ring-[#fedf89]",
  red: "bg-[#fef3f2] text-[#b42318] ring-[#fecdca]",
  green: "bg-[#ecfdf3] text-[#067647] ring-[#abefc6]",
  blue: "bg-[#f3e8ff] text-[#5b21b6] ring-[#e1cdfd]",
  slate: "bg-canvas text-subtle ring-line",
};

export function StatusPill({ status }: { status: OrderStatus }) {
  const s = STATUS_LABELS[status];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${TONES[s.tone]}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  );
}
