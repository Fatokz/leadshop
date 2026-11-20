"use client";
import { useState } from "react";
import { CATEGORIES, FULFILLMENT_LABELS, LCU_CAMPUS } from "@/lib/campus";
import { MATRIC_REGEX } from "@/lib/format";
import type { CategorySlug, FulfillmentMode, Store, VendorType } from "@/lib/types";
import { useAuth } from "../AuthProvider";
import { CATEGORY_ICONS, FULFILLMENT_ICONS, GraduationCap, LockKeyhole, ShieldCheck } from "../icons";
import { ImageUpload } from "../ImageUpload";

const PICKUP_SPOTS = [...LCU_CAMPUS.shuttleHubs, "Main Gate", "Cafeteria", "Senate Building"];
const ID_TYPES = ["NIN", "Driver's licence", "Voter's card", "International passport"];

export function OnboardingForm({ existing, onSaved, onCancel }: { existing: Store | null; onSaved(): void; onCancel?: () => void }) {
  const { authFetch } = useAuth();
  const v = existing?.verification;
  const [vendorType, setVendorType] = useState<VendorType>(existing?.vendorType ?? "on_campus_student");
  const [f, setF] = useState({
    name: existing?.name ?? "",
    tagline: existing?.tagline ?? "",
    bio: existing?.bio ?? "",
    ownerName: existing?.ownerName ?? "",
    whatsapp: existing?.whatsapp ?? "",
    pickupZone: existing?.pickupZone ?? PICKUP_SPOTS[0],
    openingHours: existing?.openingHours ?? "",
    matricNumber: v?.matricNumber ?? "",
    externalIdType: v?.externalIdType ?? ID_TYPES[0],
    externalIdLast4: v?.externalIdLast4 ?? "",
  });
  const [categories, setCategories] = useState<CategorySlug[]>(existing?.categories ?? []);
  const [modes, setModes] = useState<FulfillmentMode[]>(existing?.fulfillmentModes ?? ["vendor_pickup", "campus_shuttle"]);
  const [studentIdUrl, setStudentIdUrl] = useState<string | undefined>(v?.studentIdUrl);
  const [clearanceDocUrl, setClearanceDocUrl] = useState<string | undefined>(v?.clearanceDocUrl);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const student = vendorType === "on_campus_student";
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));
  const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (student && !MATRIC_REGEX.test(f.matricNumber.trim())) return setError("Matric number should look like LCU/UG/22/12345.");
    if (!studentIdUrl) return setError(student ? "Upload a photo of your student ID card." : "Upload a photo of your government ID.");
    if (!student && !clearanceDocUrl) return setError("Upload your LCU security / hostel entry clearance.");
    if (categories.length === 0) return setError("Pick at least one category.");
    if (modes.length === 0) return setError("Pick at least one delivery option.");
    setBusy(true);
    try {
      const r = await authFetch("/api/vendor/store", {
        method: "POST",
        body: JSON.stringify({ ...f, vendorType, categories, fulfillmentModes: modes, studentIdUrl, clearanceDocUrl }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{existing ? "Edit store" : "Set up your store"}</h1>
        <p className="mt-1 text-sm text-muted">LCU admin reviews your documents before your store goes live. It usually takes a few hours.</p>
      </div>

      <Step n={1} title="Vendor type">
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ["on_campus_student", GraduationCap, "LCU student", "Student ID and LCU business permit"],
              ["off_campus_service", ShieldCheck, "Off-campus provider", "Hairdressers, barbers and others: government ID and LCU entry clearance"],
            ] as const
          ).map(([val, Icon, title, desc]) => {
            const on = vendorType === val;
            return (
              <label key={val} className={`flex cursor-pointer gap-3 rounded-lg border p-3.5 transition-colors ${on ? "border-brand-600 bg-brand-50/50 ring-1 ring-brand-600" : "border-line hover:border-muted/40"}`}>
                <input type="radio" className="sr-only" checked={on} onChange={() => setVendorType(val)} />
                <Icon className={`mt-0.5 size-5 shrink-0 ${on ? "text-brand-600" : "text-muted"}`} />
                <span>
                  <span className="block text-sm font-medium text-ink">{title}</span>
                  <span className="block text-xs text-muted">{desc}</span>
                </span>
              </label>
            );
          })}
        </div>
      </Step>

      <Step n={2} title="Store details">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Store name">
            <input className="input" required value={f.name} onChange={set("name")} placeholder="Mama Tee's Kitchen" />
          </Field>
          <Field label="Your name">
            <input className="input" required value={f.ownerName} onChange={set("ownerName")} placeholder="Tolulope Adeyemi" />
          </Field>
          <Field label="Tagline" wide>
            <input className="input" required value={f.tagline} onChange={set("tagline")} placeholder="Home-style jollof, swallow and late-night noodles" />
          </Field>
          <Field label="About" optional wide>
            <textarea className="input h-auto min-h-24 py-2.5" value={f.bio} onChange={set("bio")} placeholder="Where you operate, your hours, what you're known for" />
          </Field>
          <Field label="WhatsApp number">
            <input className="input" required type="tel" inputMode="tel" value={f.whatsapp} onChange={set("whatsapp")} placeholder="080…" />
          </Field>
          <Field label="Opening hours" optional>
            <input className="input" value={f.openingHours} onChange={set("openingHours")} placeholder="10am – 9pm" />
          </Field>
          <Field label="Pickup spot on campus">
            <select className="input" value={f.pickupZone} onChange={set("pickupZone")}>
              {PICKUP_SPOTS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="mt-5">
          <span className="label">Categories (up to 3)</span>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => {
              const Icon = CATEGORY_ICONS[c.slug];
              return (
                <button
                  type="button"
                  key={c.slug}
                  onClick={() => setCategories((l) => (l.includes(c.slug) || l.length < 3 ? toggle(l, c.slug) : l))}
                  className={`chip ${categories.includes(c.slug) ? "chip-on" : "chip-off"}`}
                >
                  <Icon /> {c.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-5">
          <span className="label">Delivery options you offer</span>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(FULFILLMENT_LABELS) as FulfillmentMode[]).map((m) => {
              const Icon = FULFILLMENT_ICONS[m];
              return (
                <button type="button" key={m} onClick={() => setModes((l) => toggle(l, m))} className={`chip ${modes.includes(m) ? "chip-on" : "chip-off"}`}>
                  <Icon /> {FULFILLMENT_LABELS[m].label}
                </button>
              );
            })}
          </div>
        </div>
      </Step>

      <Step n={3} title="Verification">
        <div className="grid gap-4 sm:grid-cols-2">
          {student ? (
            <Field label="Matric number" wide>
              <input className="input uppercase" required value={f.matricNumber} onChange={set("matricNumber")} placeholder="LCU/UG/22/12345" />
            </Field>
          ) : (
            <>
              <Field label="ID type">
                <select className="input" value={f.externalIdType} onChange={set("externalIdType")}>
                  {ID_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="Last 4 digits of ID">
                <input className="input" required inputMode="numeric" maxLength={4} value={f.externalIdLast4} onChange={set("externalIdLast4")} placeholder="1234" />
              </Field>
            </>
          )}
          <ImageUpload folder="docs" required label={student ? "Student ID card" : "Government ID"} hint="Clear photo with all corners visible." value={studentIdUrl} onChange={setStudentIdUrl} />
          <ImageUpload
            folder="docs"
            required={!student}
            label={student ? "LCU business permit" : "LCU security clearance"}
            hint={student ? "From Student Affairs, if you have one." : "Letter or pass from LCU Security."}
            value={clearanceDocUrl}
            onChange={setClearanceDocUrl}
          />
        </div>
        <p className="mt-4 flex items-center gap-2 text-xs text-muted">
          <LockKeyhole className="size-3.5" /> Documents are only visible to LCU admin reviewers, never to buyers.
        </p>
      </Step>

      {error && <p className="rounded-lg bg-[#fef3f2] p-3 text-sm text-[#b42318]">{error}</p>}
      <div className="flex gap-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-secondary btn-lg">
            Cancel
          </button>
        )}
        <button className="btn-primary btn-lg flex-1" disabled={busy}>
          {busy ? "Submitting…" : existing ? "Save changes" : "Submit for verification"}
        </button>
      </div>
    </form>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <h2 className="mb-4 flex items-center gap-2.5 text-sm font-semibold text-ink">
        <span className="grid size-6 place-items-center rounded-full bg-canvas text-xs text-subtle ring-1 ring-line">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({ label, optional, wide, children }: { label: string; optional?: boolean; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <span className="label">
        {label} {optional && <span className="font-normal text-muted">(optional)</span>}
      </span>
      {children}
    </div>
  );
}
