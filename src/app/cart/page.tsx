import type { Metadata } from "next";
import { CartCheckout } from "@/components/CartCheckout";

export const metadata: Metadata = { title: "Cart & checkout" };

export default function CartPage() {
  return <CartCheckout />;
}
