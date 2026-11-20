import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { CartProvider } from "@/components/CartProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { BottomNav } from "@/components/BottomNav";
import { ServiceWorker } from "@/components/ServiceWorker";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Lead Shop · LCU campus marketplace", template: "%s · Lead Shop" },
  description:
    "Discover verified student vendors and cleared service providers at Lead City University. Pay safely with Interswitch escrow.",
  applicationName: "Lead Shop",
  appleWebApp: { capable: true, title: "Lead Shop", statusBarStyle: "default" },
  icons: { icon: "/icons/192", apple: "/icons/180" },
};

export const viewport: Viewport = {
  themeColor: "#fff7ee",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <AuthProvider>
          <CartProvider>
            <SiteHeader />
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-5 md:pb-16 md:pt-8">{children}</main>
            <BottomNav />
            <ServiceWorker />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
