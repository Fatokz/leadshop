import type { Metadata } from "next";
import { AdminPortal } from "@/components/admin/AdminPortal";

export const metadata: Metadata = { title: "LCU Admin & Gate Security" };

export default function AdminPage() {
  return <AdminPortal />;
}
