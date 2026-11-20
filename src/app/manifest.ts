import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lead Shop · LCU Campus Marketplace",
    short_name: "Lead Shop",
    description: "Verified student vendors and cleared service providers at Lead City University.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fff7ee",
    theme_color: "#f25c1f",
    categories: ["shopping", "food", "lifestyle"],
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/512?maskable=1", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "My orders", url: "/orders" },
      { name: "Sell on Lead Shop", url: "/vendor" },
    ],
  };
}
