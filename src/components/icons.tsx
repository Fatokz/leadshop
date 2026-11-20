// Single place for the app's icon set (Lucide), plus domain → icon mappings.
import {
  BadgeCheck,
  BookOpen,
  Bus,
  ConciergeBell,
  DoorOpen,
  GraduationCap,
  LayoutGrid,
  MapPin,
  Navigation,
  Printer,
  Scissors,
  Shirt,
  Bike,
  Smartphone,
  Footprints,
  Handbag,
  Watch,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import type { CategorySlug, FulfillmentMode } from "@/lib/types";

export * from "lucide-react";

export const CATEGORY_ICONS: Record<CategorySlug, LucideIcon> = {
  "food-pastries": UtensilsCrossed,
  "female-thrift": Handbag,
  "mens-fashion": Shirt,
  shoes: Footprints,
  accessories: Watch,
  "hair-beauty": Scissors,
  "printing-errands": Printer,
  gadgets: Smartphone,
};

export const FULFILLMENT_ICONS: Record<FulfillmentMode, LucideIcon> = {
  vendor_pickup: MapPin,
  campus_shuttle: Bus,
  direct_room: DoorOpen,
  in_room_service: ConciergeBell,
  off_campus_shuttle: Bike,
  custom_location: Navigation,
};

export const PEAK_ICONS = { all: LayoutGrid, fresher: GraduationCap, exam: BookOpen } as const;

export const VerifiedIcon = BadgeCheck;
