import type { Metadata } from "next";
import { VendorPortal } from "@/components/vendor/VendorPortal";

export const metadata: Metadata = { title: "Vendor & clearance portal" };

export default function VendorPage() {
  return <VendorPortal />;
}
