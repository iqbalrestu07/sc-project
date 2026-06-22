// Product types — aligned with backend Go model

// API model for product category (from /product-categories endpoint)
export interface ProductCategory {
  id: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ProductCategorySlug = 'skincare' | 'consumable' | 'consumables' | 'equipment' | 'medication' | 'supplements' | 'other';

export interface Product {
  id: string;
  name: string;
  description?: string | null;
  category?: ProductCategory | string | null;
  sku?: string | null;
  supplier?: string | null;
  purchase_price?: number | null;
  selling_price?: number | null;
  current_stock?: number | null;
  minimum_stock?: number | null;
  unit?: string | null;
  expiry_date?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ProductInsert = Omit<Product, 'id' | 'created_at' | 'updated_at'>;
export type ProductUpdate = Partial<ProductInsert>;

export interface ProductFormData {
  name: string;
  description?: string;
  category?: ProductCategory | string;
  sku?: string;
  supplier?: string;
  purchase_price?: number;
  selling_price?: number;
  current_stock?: number;
  minimum_stock?: number;
  unit?: string;
  expiry_date?: string;
}

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
