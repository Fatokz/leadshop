import Link from "next/link";
import { Compass } from "@/components/icons";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center py-20 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-white ring-1 ring-line">
        <Compass className="size-6 text-muted" />
      </span>
      <h1 className="mt-4 text-lg font-semibold text-ink">We couldn&apos;t find that page</h1>
      <p className="mt-1 text-sm text-muted">The store may still be under verification, or the link is wrong.</p>
      <Link href="/" className="btn-primary mt-6">
        Back to Lead Shop
      </Link>
    </div>
  );
}
