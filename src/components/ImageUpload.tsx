"use client";
import { useState } from "react";
import { uploadImage } from "@/lib/upload";
import { useAuth } from "./AuthProvider";
import { ImagePlus, LoaderCircle } from "./icons";

export function ImageUpload({
  label,
  hint,
  value,
  onChange,
  folder,
  required,
}: {
  label: string;
  hint?: string;
  value?: string;
  onChange(url: string | undefined): void;
  folder: "docs" | "products";
  required?: boolean;
}) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    setError("");
    setBusy(true);
    try {
      onChange(await uploadImage(file, user.uid, folder));
    } catch (err) {
      setError((err as Error).message || "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <span className="label">
        {label} {!required && <span className="font-normal text-muted">(optional)</span>}
      </span>
      <div className="flex items-center gap-3 rounded-lg border border-dashed border-line bg-white p-3">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="size-14 rounded-md object-cover ring-1 ring-line" />
        ) : (
          <span className="grid size-14 place-items-center rounded-md bg-canvas text-muted">
            {busy ? <LoaderCircle className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
          </span>
        )}
        <div className="min-w-0 flex-1 text-xs text-muted">
          {hint && <p>{hint}</p>}
          {error && <p className="font-medium text-[#b42318]">{error}</p>}
          <div className="mt-1.5 flex items-center gap-3">
            <label className="cursor-pointer text-sm font-medium text-brand-600 hover:text-brand-700">
              {busy ? "Uploading…" : value ? "Replace" : "Upload photo"}
              <input type="file" accept="image/*" className="hidden" onChange={pick} disabled={busy} />
            </label>
            {value && (
              <button type="button" className="text-sm text-muted hover:text-ink" onClick={() => onChange(undefined)}>
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
