import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Product = Tables<"products">;
export type ProductInsert = TablesInsert<"products">;
export type ProductUpdate = TablesUpdate<"products">;

export const PRODUCT_CATEGORIES = [
  { value: "skincare", label: "Skincare" },
  { value: "consumables", label: "Consumables" },
  { value: "equipment", label: "Equipment" },
  { value: "medication", label: "Medication" },
  { value: "supplements", label: "Supplements" },
  { value: "other", label: "Other" },
] as const;

export const PRODUCT_UNITS = [
  { value: "pcs", label: "Pieces" },
  { value: "ml", label: "Milliliters" },
  { value: "g", label: "Grams" },
  { value: "box", label: "Box" },
  { value: "bottle", label: "Bottle" },
  { value: "tube", label: "Tube" },
  { value: "pack", label: "Pack" },
] as const;
