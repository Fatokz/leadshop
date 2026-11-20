"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "./CartProvider";
import { House, ReceiptText, ShoppingBag, Store } from "./icons";

const ITEMS = [
  { href: "/", label: "Home", Icon: House },
  { href: "/cart", label: "Cart", Icon: ShoppingBag },
  { href: "/orders", label: "Orders", Icon: ReceiptText },
  { href: "/vendor", label: "Sell", Icon: Store },
];

export function BottomNav() {
  const path = usePathname();
  const { count } = useCart();
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4">
        {ITEMS.map(({ href, label, Icon }) => {
          const active = href === "/" ? path === "/" || path.startsWith("/store") : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-col items-center gap-1 pb-2 pt-2.5 text-[11px] font-medium ${active ? "text-brand-600" : "text-muted"}`}
            >
              <Icon className="size-[22px]" strokeWidth={active ? 2.2 : 1.8} />
              {label}
              {href === "/cart" && count > 0 && (
                <span className="absolute left-1/2 top-1.5 ml-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-plum px-1 text-[10px] font-semibold text-white">
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
