"use client";
import { useCallback, useEffect, useState } from "react";
import type { Product, Store, VendorOrder } from "@/lib/types";
import { useAuth } from "../AuthProvider";
import { BadgeCheck, LogOut, Share2, WalletCards } from "../icons";
import { SignInCard } from "../SignInCard";
import { OnboardingForm } from "./OnboardingForm";
import { VendorDashboard } from "./VendorDashboard";

export interface VendorData {
  store: Store | null;
  products: Product[];
  orders: VendorOrder[];
}

export function VendorPortal() {
  const { user, ready, authFetch, signOut } = useAuth();
  const [data, setData] = useState<VendorData | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);

  const reload = useCallback(async () => {
    const r = await authFetch("/api/vendor/me");
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    setData(d);
  }, [authFetch]);

  useEffect(() => {
    if (!user) {
      setData(null);
      return;
    }
    reload().catch((e) => setError(e.message));
  }, [user, reload]);

  if (!ready) return null;

  if (!user) {
    return (
      <div className="grid items-start gap-8 lg:grid-cols-[1fr_440px] lg:gap-12">
        <div className="space-y-6 lg:pt-6">
          <div>
            <p className="text-sm font-medium text-brand-600">For LCU vendors and service providers</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Sell to the whole campus. Free.</h1>
            <p className="mt-3 max-w-lg text-subtle">
              Get a verified storefront you can share on WhatsApp status, take bookings and payments, and get paid when the buyer confirms delivery.
            </p>
          </div>
          <ul className="space-y-4">
            <Point Icon={Share2} title="Your own store link" desc="Share it on WhatsApp status and in group chats. No listing fees." />
            <Point Icon={BadgeCheck} title="Verified badge" desc="Student ID and LCU business permit, or LCU security clearance for off-campus providers." />
            <Point Icon={WalletCards} title="Protected payments" desc="Buyers pay with Interswitch. Funds release when they give you their delivery PIN." />
          </ul>
        </div>
        <SignInCard title="Sign in to sell" subtitle="Use your email to manage your store." />
      </div>
    );
  }

  if (error) return <p className="card p-6 text-sm text-[#b42318]">{error}</p>;
  if (!data) return <div className="h-48 animate-pulse rounded-xl bg-white" />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 text-sm text-muted">
        <span className="truncate">
          Signed in as <span className="font-medium text-ink">{user.email}</span>
        </span>
        <button onClick={signOut} className="btn-ghost btn-sm">
          <LogOut /> Sign out
        </button>
      </div>
      {!data.store || editing ? (
        <OnboardingForm
          existing={data.store}
          onSaved={async () => {
            setEditing(false);
            await reload();
          }}
          onCancel={data.store ? () => setEditing(false) : undefined}
        />
      ) : (
        <VendorDashboard data={data} reload={reload} onEdit={() => setEditing(true)} />
      )}
    </div>
  );
}

function Point({ Icon, title, desc }: { Icon: React.ComponentType<{ className?: string }>; title: string; desc: string }) {
  return (
    <li className="flex gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-white text-brand-600 ring-1 ring-line">
        <Icon className="size-5" />
      </span>
      <span>
        <span className="block font-medium text-ink">{title}</span>
        <span className="block text-sm text-muted">{desc}</span>
      </span>
    </li>
  );
}
